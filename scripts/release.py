# /// script
# requires-python = ">=3.11"
# dependencies = ["rich>=13.9,<15", "questionary>=2.1,<3"]
# ///
"""Build, verify and publish the Windows and macOS release."""

import argparse
import http.client
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
from urllib.parse import quote

from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TaskProgressColumn, TextColumn
import questionary

ROOT = Path(__file__).resolve().parent.parent
console = Console()


def run(*args, capture=False):
    result = subprocess.run(args, check=True, text=True, capture_output=capture)
    return result.stdout.strip() if capture else None


def next_version(current, change):
    number = r"(0|[1-9][0-9]*)"
    if not re.fullmatch(rf"{number}\.{number}\.{number}", current):
        raise ValueError(f"Expected a stable major.minor.patch version, got {current}")
    major, minor, patch = map(int, current.split("."))
    return {
        "major": f"{major + 1}.0.0",
        "minor": f"{major}.{minor + 1}.0",
        "patch": f"{major}.{minor}.{patch + 1}",
        "keep": current,
    }[change]


def select_version(current, change, skip_build):
    if change is None:
        if not sys.stdin.isatty():
            raise ValueError("Non-interactive runs require --version major|minor|patch|keep")
        choices = [
            questionary.Choice(
                f"{option.capitalize() if option != 'keep' else 'Keep current version'}: {next_version(current, option)}",
                value=option,
            )
            for option in ("major", "minor", "patch", "keep")
        ]
        change = questionary.select(
            "Version (↑/↓ to choose, Enter to confirm)",
            choices=choices,
            default="keep",
            style=questionary.Style([
                ("highlighted", "fg:ansigreen bold"),
                ("pointer", "fg:ansigreen bold"),
            ]),
        ).unsafe_ask()
        if change is None:
            raise KeyboardInterrupt
    if skip_build and change != "keep":
        raise ValueError("--skip-build requires keeping the version; existing artifacts cannot be relabeled")
    return next_version(current, change)


def github_token():
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token and Path(".env").is_file():
        for line in Path(".env").read_text().splitlines():
            if line.startswith("GITHUB_TOKEN="):
                token = line.partition("=")[2].strip().strip("\"'")
    if not token and shutil.which("gh"):
        result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True)
        if result.returncode == 0:
            token = result.stdout.strip()
    if not token:
        raise ValueError("No GitHub token; set GITHUB_TOKEN, use .env or run 'gh auth login'")
    return token


class GitHub:
    def __init__(self, repo, token):
        self.repo = repo
        self.headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "User-Agent": "SQLearner-release"}

    def request(self, method, endpoint, payload=None):
        connection = http.client.HTTPSConnection("api.github.com", timeout=120)
        try:
            headers = {**self.headers, "Content-Type": "application/json"}
            connection.request(method, f"/repos/{self.repo}{endpoint}", json.dumps(payload) if payload is not None else None, headers)
            response = connection.getresponse()
            data = json.loads(response.read())
            if response.status >= 400:
                raise ValueError(f"GitHub {method} {endpoint}: HTTP {response.status}: {data.get('message', 'Request failed')}")
            return data
        finally:
            connection.close()

    def ensure_available(self, tag):
        page = 1
        while True:
            releases = self.request("GET", f"/releases?per_page=100&page={page}")
            if any(item["tag_name"] == tag for item in releases):
                raise ValueError(f"Release or draft {tag} already exists; publish/delete it or choose another version")
            if len(releases) < 100:
                break
            page += 1

    def upload(self, release_id, artifact, progress):
        size = artifact.stat().st_size
        task = progress.add_task(artifact.name, total=size)
        connection = http.client.HTTPSConnection("uploads.github.com", timeout=120)
        try:
            endpoint = f"/repos/{self.repo}/releases/{release_id}/assets?name={quote(artifact.name)}"
            connection.putrequest("POST", endpoint)
            for key, value in {**self.headers, "Content-Type": "application/octet-stream", "Content-Length": str(size)}.items():
                connection.putheader(key, value)
            connection.endheaders()
            with artifact.open("rb") as source:
                while chunk := source.read(1024 * 1024):
                    connection.send(chunk)
                    progress.advance(task, len(chunk))
            response = connection.getresponse()
            response.read()
            if response.status != 201:
                raise ValueError(f"Upload of {artifact.name} failed: HTTP {response.status}")
        finally:
            connection.close()
        assets = self.request("GET", f"/releases/{release_id}")["assets"]
        if not any(asset["name"] == artifact.name and asset["size"] == size for asset in assets):
            raise ValueError(f"Uploaded size mismatch for {artifact.name}")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build-only", action="store_true", help="Build local test artifacts without GitHub, commits or notarization")
    parser.add_argument("--draft", action="store_true", help="Leave the release unpublished")
    parser.add_argument("--skip-checks", action="store_true", help="Skip lint and tests")
    parser.add_argument("--skip-build", action="store_true", help="Reuse artifacts; requires keeping the version")
    parser.add_argument("--notes", type=Path, help="Markdown release notes")
    parser.add_argument("--repo", default="lukaszb/sqlearner")
    parser.add_argument("--version", choices=["major", "minor", "patch", "keep"], help="Choose without prompting")
    args = parser.parse_args()
    if args.build_only and (args.draft or args.notes or args.skip_build):
        parser.error("--build-only cannot be combined with --draft, --notes or --skip-build")
    return args


def main():
    args = parse_args()
    os.chdir(ROOT)
    notes = args.notes.read_text() if args.notes else None
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repo):
        raise ValueError("--repo must be owner/name")
    required_tools = ("node", "npm", "codesign") if args.build_only else ("node", "npm", "git", "codesign", "spctl", "xcrun")
    for tool in required_tools:
        if not shutil.which(tool):
            raise ValueError(f"{tool} is required on PATH")
    if platform.system() != "Darwin":
        raise ValueError("macOS is required to verify and build the Mac artifact")
    if not args.build_only:
        api = GitHub(args.repo, github_token())
        if run("git", "status", "--porcelain", capture=True):
            raise ValueError("Working tree is dirty; commit or stash first")
        branch = run("git", "symbolic-ref", "--short", "HEAD", capture=True)
        run("git", "fetch", "--quiet", "origin", branch)
        commit = run("git", "rev-parse", "HEAD", capture=True)
        if commit != run("git", "rev-parse", f"origin/{branch}", capture=True):
            raise ValueError(f"{branch} differs from origin/{branch}; push or pull first")
    current = json.loads(Path("package.json").read_text())["version"]
    version = select_version(current, args.version, args.skip_build)
    tag = f"v{version}"
    if not args.build_only:
        api.ensure_available(tag)
        if run("git", "tag", "--list", tag, capture=True) or run("git", "ls-remote", "--tags", "origin", f"refs/tags/{tag}", capture=True):
            raise ValueError(f"Tag {tag} already exists")
        console.print(f"{args.repo} • {branch} • {current} → {version}", markup=False)
    else:
        console.print(f"Local test build • {current} → {version}", markup=False)
    changed = version != current
    if changed and not args.build_only:
        console.print("The version will be committed and pushed after successful verification.")
    release_id = None
    with Progress(SpinnerColumn(), TextColumn("{task.description}"), BarColumn(), TaskProgressColumn(), console=console) as progress:
        task = progress.add_task("Preparing version", total=5 if args.build_only else 8)
        if changed:
            run("npm", "version", version, "--no-git-tag-version", "--ignore-scripts")
        progress.advance(task)
        progress.update(task, description="Cleaning build outputs")
        if not args.skip_build:
            for directory in ("dist", "release"):
                if Path(directory).exists():
                    shutil.rmtree(directory)
            for path in Path(".").glob("*.tsbuildinfo"):
                path.unlink()
        progress.advance(task)
        progress.update(task, description="Running lint and tests")
        if not args.skip_checks:
            run("npm", "run", "lint")
            run("npm", "test")
        progress.advance(task)
        progress.update(task, description="Building Windows and macOS apps")
        if not args.skip_build:
            if args.build_only:
                run("npm", "run", "build")
                run("npm", "exec", "--", "electron-builder", "--win", "portable", "--x64", "--publish", "never")
                run("npm", "exec", "--", "electron-builder", "--mac", "zip", "-c.mac.identity=-", "-c.mac.hardenedRuntime=false", "-c.mac.notarize=false", "--publish", "never")
            else:
                run("npm", "run", "build:release")
        windows = Path(f"release/SQLearner-{version}-windows-x64.exe")
        macs = list(Path("release").glob(f"SQLearner-{version}-mac-*.zip"))
        if not windows.is_file() or len(macs) != 1:
            raise ValueError("Expected one Windows executable and exactly one macOS ZIP for the selected version")
        progress.advance(task)
        progress.update(task, description="Verifying archives and local signature" if args.build_only else "Verifying archives, signature and notarization")
        run("node", "scripts/verify-asar.mjs", "release/win-unpacked/resources/app.asar")
        asars = list(Path("release").glob("mac*/SQLearner.app/Contents/Resources/app.asar"))
        if len(asars) != 1:
            raise ValueError("Expected exactly one packaged macOS app.asar")
        run("node", "scripts/verify-asar.mjs", str(asars[0]))
        app = str(asars[0].parents[2])
        run("codesign", "--verify", "--deep", "--strict", "--verbose=2", app)
        if args.build_only:
            progress.update(task, description="Test builds ready", advance=1)
            console.print(f"Windows: {windows.resolve()}", markup=False)
            console.print(f"macOS: {macs[0].resolve()}", markup=False)
            console.print("The macOS build is ad-hoc signed for local testing and is not notarized.")
            return
        run("spctl", "--assess", "--type", "execute", "--verbose=2", app)
        run("xcrun", "stapler", "validate", app)
        progress.advance(task)
        progress.update(task, description="Recording release version")
        if changed:
            run("git", "add", "--", "package.json", "package-lock.json")
            run("git", "commit", "-m", f"Bump version to {version}")
            run("git", "push", "origin", f"HEAD:refs/heads/{branch}")
            commit = run("git", "rev-parse", "HEAD", capture=True)
        progress.advance(task)
        progress.update(task, description=f"Creating draft {tag}")
        payload = {"tag_name": tag, "target_commitish": commit, "name": f"SQLearner {version}", "draft": True, "prerelease": False, "generate_release_notes": notes is None}
        if notes is not None:
            payload["body"] = notes
        release_id = api.request("POST", "/releases", payload)["id"]
        console.print(f"Draft created: https://github.com/{args.repo}/releases/{release_id}")
        progress.advance(task)
        progress.update(task, description="Uploading and verifying artifacts")
        try:
            for artifact in (windows, macs[0]):
                api.upload(release_id, artifact, progress)
            if not args.draft:
                api.request("PATCH", f"/releases/{release_id}", {"draft": False, "make_latest": "true"})
        except Exception:
            console.print(f"Release {tag} may remain a draft; inspect GitHub before retrying.")
            raise
        progress.update(task, description="Draft ready" if args.draft else "Published", advance=1)
    console.print(f"https://github.com/{args.repo}/releases" + (f"/{release_id}" if args.draft else f"/tag/{tag}"))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError, http.client.HTTPException) as error:
        console.print(f"Release failed: {error}", style="red", markup=False)
        console.print("Version changes and completed commits are preserved. Inspect git status before retrying.")
        sys.exit(1)
    except (KeyboardInterrupt, EOFError):
        console.print("Release cancelled. Inspect git status before retrying.")
        sys.exit(130)
