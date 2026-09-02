# SQL course for data analysts

The course is built into SQLearner and runs against the Olist dataset imported into every session. Lessons can be taken in any order.

- 5 modules, 33 lessons, 198 question variants.
- Every lesson ends with 3 questions drawn at random; a single wrong answer draws a new set and the lesson stays unfinished.
- Every module ends with an exam of at least 10 questions, at least 2 from each lesson of the module.
- The content lives in `src/shared/course/modules/`; this outline is a summary of it.

## Module 1 - Foundations: reading the database (Basics)

Get to know the Olist e-commerce dataset and learn the clauses every analyst uses every day: SELECT, WHERE, ORDER BY and LIMIT.

- **Lesson 1 - Meet the Olist database** - Understand which tables exist, what each one stores and how to inspect a table you have never seen before.
- **Lesson 2 - SELECT: choosing and renaming columns** - Return exactly the columns you need and rename them with aliases.
- **Lesson 3 - Sorting and limiting results with ORDER BY and LIMIT** - Sort rows in either direction and take the top or bottom slice of a result.
- **Lesson 4 - Filtering rows with WHERE** - Keep only the rows you care about using comparisons, AND and OR, IN, BETWEEN and LIKE.
- **Lesson 5 - Missing values: NULL, empty text and COALESCE** - Recognise missing data, test for it correctly and substitute a default value.
- **Lesson 6 - Everything is TEXT: data types and CAST** - Understand SQLite storage classes and convert text columns to numbers before doing arithmetic.
- **Lesson 7 - DISTINCT values and calculated columns** - Remove duplicate rows from a result and build new columns with arithmetic and string expressions.
- **Module exam** - 14 questions drawn from every lesson above.

## Module 2 - Aggregation: summarising data (Basics)

Turn thousands of rows into a handful of numbers. Count, sum and average values, split the result into groups with GROUP BY, filter those groups with HAVING, and shape values with CASE WHEN and the SQLite date and text functions.

- **Lesson 1 - Counting rows with COUNT** - Count rows, count non-empty values and count distinct values in a single table.
- **Lesson 2 - SUM, AVG, MIN and MAX** - Add up, average and bracket numeric columns, remembering that every column in this database is stored as TEXT.
- **Lesson 3 - GROUP BY: one row per category** - Split a table into groups and return one summary row for each group.
- **Lesson 4 - Filtering groups with HAVING** - Keep only the groups that satisfy a condition on their aggregated values.
- **Lesson 5 - CASE WHEN: conditional logic inside a query** - Label rows with your own categories and count or sum them conditionally.
- **Lesson 6 - Dates and text functions in SQLite** - Read the TEXT timestamps of this database, group by month, measure delivery time in days and tidy up text values.
- **Module exam** - 12 questions drawn from every lesson above.

## Module 3 - Combining tables (Intermediate)

Bring the Olist tables together with INNER JOIN and LEFT JOIN, follow the keys that link orders to customers, items, products and sellers, and answer questions no single table can answer on its own with subqueries and set operators.

- **Lesson 1 - Keys and relationships in the Olist schema** - Learn which column links each pair of Olist tables and how to write readable joins with table aliases.
- **Lesson 2 - INNER JOIN: matching rows across tables** - Use INNER JOIN to keep only the rows that have a partner on both sides, and combine it with WHERE and GROUP BY.
- **Lesson 3 - LEFT JOIN and finding what is missing** - Keep every row of the left table with LEFT JOIN, and use the IS NULL anti-join pattern to find rows that have no partner.
- **Lesson 4 - Joining several tables in one query** - Chain three or more joins in a sensible order and keep control of the grain and of the counts.
- **Lesson 5 - Subqueries: scalar, IN and EXISTS** - Nest a SELECT inside another query to compare against a computed value, filter by a list of keys or test for existence.
- **Lesson 6 - UNION, UNION ALL, INTERSECT and EXCEPT** - Stack the results of two queries on top of each other and compare them with the four set operators.
- **Module exam** - 12 questions drawn from every lesson above.

## Module 4 - Changing data safely (Intermediate)

Create your own tables and change rows with INSERT, UPDATE and DELETE inside a writable practice sandbox, then wrap risky edits in transactions so a mistake can be undone. Runs against `practice.sqlite`, not the imported session database.

- **Lesson 1 - The practice sandbox and CREATE TABLE** - Understand where your changes go and create your first table with typed columns and constraints.
- **Lesson 2 - INSERT: adding rows** - Add rows to your own table by typing values and by copying rows out of the Olist tables.
- **Lesson 3 - UPDATE: changing existing rows** - Change column values in the rows you choose, and understand why the WHERE clause is the most important part of the statement.
- **Lesson 4 - DELETE: removing rows** - Remove exactly the rows you mean to remove, and tell the difference between emptying a table and dropping it.
- **Lesson 5 - CREATE TABLE AS SELECT, ALTER TABLE and views** - Build a working table straight from a query, change its shape afterwards, and save a query as a view.
- **Lesson 6 - Transactions, constraints and indexes** - Make a risky change undoable with a transaction, let the database reject bad rows with constraints, and speed up lookups with an index.
- **Module exam** - 12 questions drawn from every lesson above.

## Module 5 - Analyst toolkit (Advanced)

Answer real marketplace questions with CTEs, window functions, cohorts and segmentation, then assemble everything into a single KPI report on the Olist data.

- **Lesson 1 - Readable queries with CTEs (WITH)** - Break a long analytical question into named steps with WITH so the query reads from top to bottom like a recipe.
- **Lesson 2 - Window functions: ROW_NUMBER, RANK and DENSE_RANK** - Rank rows inside groups with OVER (PARTITION BY ... ORDER BY ...) without collapsing the detail the way GROUP BY does.
- **Lesson 3 - Running totals, moving averages, LAG and LEAD** - Use window frames to accumulate values over time and use LAG and LEAD to compare a row with its neighbours.
- **Lesson 4 - Monthly trends and month-over-month growth** - Turn a raw order log into a monthly trend table with growth percentages an executive can read.
- **Lesson 5 - Customer cohorts and repeat purchase rate** - Group people by the month of their first purchase and measure how many of them ever come back.
- **Lesson 6 - RFM segmentation with NTILE** - Score customers on recency, frequency and monetary value with NTILE and turn the scores into named segments.
- **Lesson 7 - Delivery performance and data quality checks** - Measure delivery lateness, connect it to review scores, and audit the data before trusting any of it.
- **Lesson 8 - Putting it together: a marketplace KPI report** - Assemble CTEs, window functions and conditional aggregation into one report that a marketplace manager could read every Monday.
- **Module exam** - 16 questions drawn from every lesson above.
