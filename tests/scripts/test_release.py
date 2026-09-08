"""Run with: uv run --with rich --with questionary python -m unittest discover -s tests/scripts."""

import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("release", Path(__file__).resolve().parents[2] / "scripts/release.py")
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def test_semver_resets_lower_components(self):
        for change, expected in (("major", "2.0.0"), ("minor", "1.3.0"), ("patch", "1.2.4"), ("keep", "1.2.3")):
            with self.subTest(change=change):
                self.assertEqual(release.next_version("1.2.3", change), expected)

    def test_rejects_invalid_stable_versions(self):
        for version in ("01.2.3", "1.2", "1.2.3-beta", "1.2.3.4"):
            with self.assertRaises(ValueError):
                release.next_version(version, "patch")

    def test_skip_build_cannot_change_version(self):
        for change in ("major", "minor", "patch"):
            with self.assertRaisesRegex(ValueError, "--skip-build"):
                release.select_version("1.2.3", change, True)
        self.assertEqual(release.select_version("1.2.3", "keep", True), "1.2.3")

    def test_arrow_keys_select_each_version(self):
        from prompt_toolkit.input import create_pipe_input
        from prompt_toolkit.output import DummyOutput

        select = release.questionary.select
        for keys, expected in (("\r", "1.2.3"), ("\x1b[A\r", "1.2.4"), ("\x1b[A\x1b[A\r", "1.3.0"), ("\x1b[A\x1b[A\x1b[A\r", "2.0.0"), ("\x1b[A\x1b[B\r", "1.2.3")):
            with self.subTest(keys=repr(keys)), create_pipe_input() as pipe:
                pipe.send_text(keys)
                with patch.object(release.sys.stdin, "isatty", return_value=True), patch.object(release.questionary, "select", side_effect=lambda *args, **kwargs: select(*args, **kwargs, input=pipe, output=DummyOutput())):
                    self.assertEqual(release.select_version("1.2.3", None, False), expected)

    def test_menu_ctrl_c_cancels(self):
        from prompt_toolkit.input import create_pipe_input
        from prompt_toolkit.output import DummyOutput

        select = release.questionary.select
        with create_pipe_input() as pipe:
            pipe.send_text("\x03")
            with patch.object(release.sys.stdin, "isatty", return_value=True), patch.object(release.questionary, "select", side_effect=lambda *args, **kwargs: select(*args, **kwargs, input=pipe, output=DummyOutput())):
                with self.assertRaises(KeyboardInterrupt):
                    release.select_version("1.2.3", None, False)

    def test_noninteractive_requires_explicit_choice(self):
        with patch.object(release.sys.stdin, "isatty", return_value=False):
            with self.assertRaisesRegex(ValueError, "--version"):
                release.select_version("1.2.3", None, False)

    def test_finds_draft_on_later_page(self):
        api = release.GitHub("owner/repo", "fake")
        with patch.object(api, "request", side_effect=[[{"tag_name": "v0.0.1"}] * 100, [{"tag_name": "v1.2.3", "draft": True}]]):
            with self.assertRaisesRegex(ValueError, "already exists"):
                api.ensure_available("v1.2.3")

    def test_upload_failure_is_not_accepted(self):
        api = release.GitHub("owner/repo", "fake")
        from tempfile import TemporaryDirectory
        from unittest.mock import MagicMock
        with TemporaryDirectory() as directory:
            artifact = Path(directory) / "app.zip"
            artifact.write_bytes(b"test")
            with patch.object(release.http.client, "HTTPSConnection") as connection:
                connection.return_value.getresponse.return_value.status = 500
                with self.assertRaisesRegex(ValueError, "Upload.*failed"):
                    api.upload(123, artifact, MagicMock())
                connection.return_value.close.assert_called_once()

    def test_build_only_produces_local_artifacts_without_github_or_git(self):
        import os
        from tempfile import TemporaryDirectory

        previous = Path.cwd()
        try:
            with TemporaryDirectory() as directory:
                root = Path(directory)
                (root / "package.json").write_text('{"version": "1.2.3"}')

                def build(*command, **kwargs):
                    if command == ("npm", "run", "build"):
                        output = root / "release"
                        output.mkdir()
                        (output / "SQLearner-1.2.3-windows-x64.exe").touch()
                        (output / "SQLearner-1.2.3-mac-arm64.zip").touch()
                        asar = output / "mac-arm64/SQLearner.app/Contents/Resources/app.asar"
                        asar.parent.mkdir(parents=True)
                        asar.touch()

                with patch.object(release, "ROOT", root), patch.object(release.sys, "argv", ["release", "--build-only", "--version", "keep"]), patch.object(release.shutil, "which", return_value="tool"), patch.object(release.platform, "system", return_value="Darwin"), patch.object(release, "github_token") as token, patch.object(release, "GitHub") as github, patch.object(release, "run", side_effect=build) as run:
                    release.main()
                    token.assert_not_called()
                    github.assert_not_called()
                    commands = [call.args for call in run.call_args_list]
                    self.assertFalse(any(command[0] in ("git", "spctl", "xcrun") for command in commands))
                    self.assertIn(("npm", "run", "lint"), commands)
                    self.assertIn(("npm", "test"), commands)
                    self.assertEqual(sum(command[0] == "node" for command in commands), 2)
                    packaging = [command for command in commands if "electron-builder" in command]
                    self.assertEqual(len(packaging), 2)
                    self.assertTrue(all(command[-2:] == ("--publish", "never") for command in packaging))
                    self.assertIn("-c.mac.notarize=false", packaging[1])
        finally:
            os.chdir(previous)

    def test_build_only_rejects_release_only_options(self):
        for option in (["--draft"], ["--notes", "notes.md"], ["--skip-build"]):
            with patch.object(release.sys, "argv", ["release", "--build-only", *option]), patch.object(release.sys, "stderr"):
                with self.assertRaises(SystemExit) as error:
                    release.parse_args()
                self.assertEqual(error.exception.code, 2)
