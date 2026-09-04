import type { CourseModule } from '../types.js'

export const modifyingModule: CourseModule = {
  id: 'modifying',
  level: 'intermediate',
  title: 'Changing data safely',
  description:
    'Create your own tables and change rows with INSERT, UPDATE and DELETE in your session working copy, then wrap risky edits in transactions so a mistake can be undone.',
  changesData: true,
  lessons: [
    {
      id: 'modifying-sandbox',
      title: 'Lesson 1 - Your working copy and CREATE TABLE',
      goal: 'Understand where your changes go and create your first table with typed columns and constraints.',
      tables: ['orders'],
      blocks: [
        {
          kind: 'text',
          text: 'Every lesson so far only read data. From here on you will change data, and those changes are real. Everything in SQLearner - the table browser, the Queries tab and these lessons - runs against practice.sqlite, a writable working copy that the app builds during setup. The database created by the CSV import is kept aside untouched and is never queried; it exists only so the working copy can be rebuilt from it.'
        },
        {
          kind: 'note',
          text: 'Nothing you do here can be lost for good. The Database view has a Reset database button, repeated in the banner at the top of this lesson, that deletes the working copy and rebuilds it from the untouched import. Any table you create, any row you change and any mistake you make is undone by one click.'
        },
        {
          kind: 'sql',
          title: 'Confirm the working copy holds the imported data',
          sql: 'SELECT COUNT(*) AS order_rows\nFROM orders;',
          explanation: 'The working copy carries every Olist table with exactly the rows the import produced.',
          breakdown: [
            { part: 'SELECT COUNT(*)', meaning: 'Count every row the query produces instead of returning the rows themselves.' },
            { part: 'AS order_rows', meaning: 'Name the single result column so the output is readable.' },
            { part: 'FROM orders', meaning: 'Read from the orders table in your working copy.' }
          ]
        },
        {
          kind: 'list',
          title: 'House rules for this module',
          items: [
            'Never INSERT, UPDATE or DELETE directly in the imported Olist tables; they are your reference data.',
            'Build your own working tables with a my_ prefix, for example my_products and my_orders.',
            'Run a SELECT after every change to check that the change did what you expected.',
            'If anything goes wrong, press Reset database and start the lesson again.'
          ]
        },
        {
          kind: 'sql',
          title: 'Drop the table if an earlier attempt left one behind',
          sql: 'DROP TABLE IF EXISTS my_products;',
          explanation: 'Starting a lesson with a drop makes the whole lesson repeatable, because the create step never fails with a table already exists error.',
          breakdown: [
            { part: 'DROP TABLE', meaning: 'Remove a table and all of its rows from the database.' },
            { part: 'IF EXISTS', meaning: 'Do nothing instead of raising an error when the table is not there.' },
            { part: 'my_products', meaning: 'The name of the table to remove; only your own table is affected.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Create a table with types and constraints',
          sql: 'CREATE TABLE my_products (\n  product_id TEXT PRIMARY KEY,\n  category TEXT NOT NULL,\n  price REAL,\n  in_stock INTEGER\n);',
          explanation: 'CREATE TABLE defines the columns of a new empty table, the type of value each column holds and the rules each row must obey.',
          breakdown: [
            { part: 'CREATE TABLE my_products', meaning: 'Define a new empty table called my_products.' },
            { part: 'product_id TEXT PRIMARY KEY', meaning: 'A text column that identifies the row; values must be unique and SQLite builds an index on it automatically.' },
            { part: 'category TEXT NOT NULL', meaning: 'A text column that must always have a value, so a row without a category is rejected.' },
            { part: 'price REAL', meaning: 'A column for decimal numbers such as 59.9.' },
            { part: 'in_stock INTEGER', meaning: 'A column for whole numbers; SQLite has no boolean type, so 0 and 1 are used for false and true.' }
          ]
        },
        {
          kind: 'note',
          text: 'Columns you declare yourself get real types, unlike the imported Olist columns which are all TEXT. That is why the Olist examples still need CAST(price AS REAL) while your own price column can be compared with numbers directly.'
        },
        {
          kind: 'sql',
          title: 'Check the shape of the new table',
          sql: "SELECT name, type, [notnull], pk\nFROM pragma_table_info('my_products');",
          explanation: 'Verifying the structure right after creating it is the write equivalent of looking at the first rows of a table.',
          breakdown: [
            { part: 'SELECT name, type', meaning: 'Show each column name and the type you declared for it.' },
            { part: '[notnull]', meaning: 'Show 1 when the column carries a NOT NULL constraint; the brackets are needed because notnull is a keyword.' },
            { part: 'pk', meaning: 'Show 1 for the column that forms the primary key.' },
            { part: "FROM pragma_table_info('my_products')", meaning: 'Read the column metadata of your new table.' }
          ]
        }
      ],
      practice: {
        task: 'Create a table called my_sellers with seller_id as a TEXT primary key, seller_city as TEXT that cannot be null, and rating as an INTEGER. Drop it first so the lesson can be repeated.',
        hint: 'Two statements: DROP TABLE IF EXISTS first, then CREATE TABLE with the three column definitions separated by commas.',
        solution: 'DROP TABLE IF EXISTS my_sellers;\n\nCREATE TABLE my_sellers (\n  seller_id TEXT PRIMARY KEY,\n  seller_city TEXT NOT NULL,\n  rating INTEGER\n);'
      },
      questions: [
        {
          id: 'modifying-sandbox-q1',
          prompt: 'Where do the changes you make in this module actually go?',
          options: [
            'Into practice.sqlite, the working copy the whole app runs on',
            'Into the untouched database left behind by the CSV import',
            'Into the original Olist CSV files',
            'Nowhere; write statements are simulated'
          ],
          answer: 'Into practice.sqlite, the working copy the whole app runs on',
          explanation: 'Writes land in the working copy, so the database built by the import stays exactly as it was.'
        },
        {
          id: 'modifying-sandbox-q2',
          prompt: 'You created five tables and deleted rows you should have kept. What does the Reset database button do?',
          options: [
            'Rebuilds the working copy from the untouched import, undoing everything',
            'Undoes only the last statement you ran',
            'Downloads the Kaggle dataset and imports the CSV files again',
            'Reverses your DELETE statements but keeps the tables you created'
          ],
          answer: 'Rebuilds the working copy from the untouched import, undoing everything',
          explanation: 'Reset throws the whole copy away and makes a fresh one, so every change is gone.'
        },
        {
          id: 'modifying-sandbox-q3',
          prompt: 'Why does each lesson start with DROP TABLE IF EXISTS?',
          code: 'DROP TABLE IF EXISTS my_products;',
          options: [
            'So the CREATE TABLE that follows never fails because the table already exists',
            'Because SQLite forgets tables between statements',
            'Because DROP TABLE is required before every INSERT',
            'To free disk space before a query runs'
          ],
          answer: 'So the CREATE TABLE that follows never fails because the table already exists',
          explanation: 'IF EXISTS makes the drop harmless when the table is missing, which makes the lesson repeatable.'
        },
        {
          id: 'modifying-sandbox-q4',
          prompt: 'What does NOT NULL on the category column do?',
          options: [
            'Rejects any row that does not supply a category value',
            'Replaces missing categories with an empty string',
            'Makes category values unique across rows',
            'Sorts the table by category'
          ],
          answer: 'Rejects any row that does not supply a category value',
          explanation: 'NOT NULL is a constraint: the insert or update fails instead of storing a missing value.'
        },
        {
          id: 'modifying-sandbox-q5',
          prompt: 'What is the risk of running UPDATE orders SET order_status = ? in your working copy?',
          options: [
            'It changes your reference data, so later lessons read wrong values until you reset',
            'It corrupts the untouched import',
            'It is blocked by SQLite because orders is imported',
            'Nothing at all, orders is protected'
          ],
          answer: 'It changes your reference data, so later lessons read wrong values until you reset',
          explanation: 'The working copy is fully writable, so the Olist tables can be damaged there; that is why you work in my_ tables.'
        },
        {
          id: 'modifying-sandbox-q6',
          prompt: 'Which declaration gives a column that holds decimal prices such as 59.9?',
          options: ['price REAL', 'price INTEGER', 'price TEXT NOT NULL', 'price PRIMARY KEY'],
          answer: 'price REAL',
          explanation: 'REAL stores floating point numbers; INTEGER would truncate the decimal part.'
        }
      ]
    },
    {
      id: 'modifying-insert',
      title: 'Lesson 2 - INSERT: adding rows',
      goal: 'Add rows to your own table by typing values and by copying rows out of the Olist tables.',
      tables: ['products', 'order_items'],
      blocks: [
        {
          kind: 'text',
          text: 'INSERT adds new rows. It comes in two shapes: INSERT INTO ... VALUES writes rows you type out yourself, and INSERT INTO ... SELECT writes rows produced by a query. The second shape is how analysts build small working tables out of large ones.'
        },
        {
          kind: 'sql',
          title: 'Insert several rows in one statement',
          sql: "INSERT INTO my_products (product_id, category, price, in_stock)\nVALUES\n  ('demo-001', 'cama_mesa_banho', 59.9, 1),\n  ('demo-002', 'beleza_saude', 129.5, 0),\n  ('demo-003', 'informatica_acessorios', 42.0, 1);",
          explanation: 'One INSERT can carry many rows, which is faster and easier to read than three separate statements.',
          breakdown: [
            { part: 'INSERT INTO my_products', meaning: 'Add rows to the my_products table.' },
            { part: '(product_id, category, price, in_stock)', meaning: 'The column list: it fixes the order of the values that follow, so the table can change later without breaking this statement.' },
            { part: 'VALUES', meaning: 'Announce that literal rows follow rather than a query.' },
            { part: "('demo-001', 'cama_mesa_banho', 59.9, 1)", meaning: 'One row; each value lines up with the column in the same position, and text is written in single quotes.' },
            { part: ', (...), (...)', meaning: 'Further rows separated by commas, all inserted by the same statement.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Verify what landed in the table',
          sql: 'SELECT *\nFROM my_products\nORDER BY product_id;',
          explanation: 'A SELECT after every change is the habit that catches mistakes while they are still cheap to fix.',
          breakdown: [
            { part: 'SELECT *', meaning: 'Return every column so you can see the values exactly as stored.' },
            { part: 'FROM my_products', meaning: 'Read from the table you just wrote to.' },
            { part: 'ORDER BY product_id', meaning: 'Sort the rows so repeated runs are easy to compare.' }
          ]
        },
        {
          kind: 'note',
          text: 'Omitting the column list, as in INSERT INTO my_products VALUES (...), forces you to supply every column in the exact order they were declared. Always write the column list; it is the difference between a statement that survives a schema change and one that silently puts prices into the wrong column.'
        },
        {
          kind: 'sql',
          title: 'Insert rows produced by a query',
          sql: "INSERT INTO my_products (product_id, category, price, in_stock)\nSELECT\n  p.product_id,\n  p.product_category_name,\n  ROUND(AVG(CAST(oi.price AS REAL)), 2),\n  1\nFROM products AS p\nJOIN order_items AS oi ON oi.product_id = p.product_id\nWHERE p.product_category_name IS NOT NULL\nGROUP BY p.product_id, p.product_category_name\nLIMIT 20;",
          explanation: 'INSERT INTO ... SELECT copies the result of any query into a table, so you can snapshot an aggregate and work on it later.',
          breakdown: [
            { part: 'INSERT INTO my_products (...)', meaning: 'The target table and the columns to fill, exactly as with VALUES.' },
            { part: 'SELECT p.product_id, ...', meaning: 'The query that produces the rows; its columns must match the target column list in number, order and meaning.' },
            { part: 'ROUND(AVG(CAST(oi.price AS REAL)), 2)', meaning: 'The average sold price of the product, cast to a number first because imported columns are TEXT, then rounded to two decimals.' },
            { part: '1', meaning: 'A constant: every inserted row gets the value 1 in in_stock.' },
            { part: 'JOIN order_items AS oi ON oi.product_id = p.product_id', meaning: 'Attach the sale lines of each product so there is a price to average.' },
            { part: 'WHERE p.product_category_name IS NOT NULL', meaning: 'Skip products with no category, because the category column is declared NOT NULL and those rows would be rejected.' },
            { part: 'GROUP BY p.product_id, p.product_category_name', meaning: 'One output row per product, which matches the primary key of the target table.' },
            { part: 'LIMIT 20', meaning: 'Keep the working table small enough to inspect by eye.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Count what the table holds now',
          sql: "SELECT COUNT(*) AS rows_total,\n       SUM(CASE WHEN product_id LIKE 'demo-%' THEN 1 ELSE 0 END) AS typed_rows\nFROM my_products;",
          explanation: 'Counting before and after a write tells you immediately whether the statement added what you expected.',
          breakdown: [
            { part: 'COUNT(*) AS rows_total', meaning: 'The total number of rows now in the table.' },
            { part: "SUM(CASE WHEN product_id LIKE 'demo-%' THEN 1 ELSE 0 END)", meaning: 'Count only the three rows you typed by hand, by adding 1 for each match and 0 otherwise.' },
            { part: 'FROM my_products', meaning: 'Both figures come from your working table.' }
          ]
        },
        {
          kind: 'note',
          text: 'Inserting a product_id that is already in the table fails, because a PRIMARY KEY must be unique. INSERT OR REPLACE INTO ... overwrites the existing row instead of failing, and INSERT OR IGNORE skips it; use them deliberately, because both hide errors you might want to see.'
        }
      ],
      practice: {
        task: 'Create a table my_sellers_top with seller_id TEXT PRIMARY KEY and line_count INTEGER, then fill it with the ten sellers that appear on the most order_items rows.',
        hint: 'Create the table first, then INSERT INTO ... SELECT seller_id, COUNT(*) FROM order_items GROUP BY seller_id ORDER BY COUNT(*) DESC LIMIT 10.',
        solution: 'DROP TABLE IF EXISTS my_sellers_top;\n\nCREATE TABLE my_sellers_top (\n  seller_id TEXT PRIMARY KEY,\n  line_count INTEGER\n);\n\nINSERT INTO my_sellers_top (seller_id, line_count)\nSELECT seller_id, COUNT(*)\nFROM order_items\nGROUP BY seller_id\nORDER BY COUNT(*) DESC\nLIMIT 10;\n\nSELECT * FROM my_sellers_top ORDER BY line_count DESC;'
      },
      questions: [
        {
          id: 'modifying-insert-q1',
          prompt: 'How many rows does this statement add?',
          code: "INSERT INTO my_products (product_id, category)\nVALUES ('a', 'x'), ('b', 'y'), ('c', 'z');",
          options: ['Three', 'One', 'Three separate statements are required', 'Zero, the syntax is invalid'],
          answer: 'Three',
          explanation: 'A single INSERT can list many rows after VALUES, separated by commas.'
        },
        {
          id: 'modifying-insert-q2',
          prompt: 'What must be true of the SELECT used in INSERT INTO target (a, b, c) SELECT ...?',
          options: [
            'It must return three columns in the same order as a, b, c',
            'It must return the columns with the same names as a, b, c',
            'It must read from the same table as the target',
            'It must include an ORDER BY'
          ],
          answer: 'It must return three columns in the same order as a, b, c',
          explanation: 'Values are matched by position, not by name, so the count and order have to line up.'
        },
        {
          id: 'modifying-insert-q3',
          prompt: 'The category column is declared NOT NULL. What happens to this statement?',
          code: "INSERT INTO my_products (product_id, price)\nVALUES ('demo-009', 10.0);",
          options: [
            'It fails, because category would be NULL',
            'It succeeds and stores an empty string in category',
            'It succeeds and stores 0 in category',
            'It succeeds but the row is invisible to SELECT'
          ],
          answer: 'It fails, because category would be NULL',
          explanation: 'A column left out of the column list gets NULL, which a NOT NULL constraint rejects.'
        },
        {
          id: 'modifying-insert-q4',
          prompt: 'Why does the example include WHERE p.product_category_name IS NOT NULL?',
          options: [
            'Because rows with a missing category would violate the NOT NULL constraint',
            'Because NULL categories make the join slow',
            'Because AVG ignores NULL categories anyway',
            'Because SQLite cannot compare NULL to text'
          ],
          answer: 'Because rows with a missing category would violate the NOT NULL constraint',
          explanation: 'The whole INSERT would fail on the first offending row, so the filter removes them up front.'
        },
        {
          id: 'modifying-insert-q5',
          prompt: 'You omit the column list and the table columns are (product_id, category, price, in_stock). What is the danger?',
          code: "INSERT INTO my_products VALUES ('demo-010', 25.0, 'beleza_saude', 1);",
          options: [
            'The price lands in category and the category in price, or the statement fails outright',
            'SQLite matches the values to the right columns by type',
            'The row is silently skipped',
            'Nothing, the order of values does not matter'
          ],
          answer: 'The price lands in category and the category in price, or the statement fails outright',
          explanation: 'Without a column list, values are assigned strictly by declaration order.'
        },
        {
          id: 'modifying-insert-q6',
          prompt: 'Which statement copies the rows of a query into an existing table?',
          options: [
            'INSERT INTO my_products (product_id) SELECT product_id FROM products LIMIT 5;',
            'CREATE TABLE my_products SELECT product_id FROM products;',
            'UPDATE my_products SELECT product_id FROM products;',
            'SELECT product_id INTO my_products FROM products;'
          ],
          answer: 'INSERT INTO my_products (product_id) SELECT product_id FROM products LIMIT 5;',
          explanation: 'INSERT INTO ... SELECT is the SQLite form; SELECT INTO is not supported.'
        }
      ]
    },
    {
      id: 'modifying-update',
      title: 'Lesson 3 - UPDATE: changing existing rows',
      goal: 'Change column values in the rows you choose, and understand why the WHERE clause is the most important part of the statement.',
      tables: ['products'],
      blocks: [
        {
          kind: 'text',
          text: 'UPDATE rewrites values in rows that already exist. It never adds or removes rows. The pattern that keeps you out of trouble is always the same: run the SELECT with your WHERE clause first, look at the rows it returns, then run the UPDATE with that identical WHERE clause.'
        },
        {
          kind: 'sql',
          title: 'Step one: see exactly which rows you are about to change',
          sql: "SELECT product_id, category, price\nFROM my_products\nWHERE category = 'beleza_saude';",
          explanation: 'The SELECT is a dry run of the UPDATE, because both statements select rows with the same WHERE clause.',
          breakdown: [
            { part: 'SELECT product_id, category, price', meaning: 'Show the key and the values you are about to touch.' },
            { part: 'FROM my_products', meaning: 'Your own working table, never the imported Olist tables.' },
            { part: "WHERE category = 'beleza_saude'", meaning: 'The exact filter you will reuse in the UPDATE; every row shown here will be changed.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Step two: change those rows',
          sql: "UPDATE my_products\nSET price = ROUND(price * 1.1, 2),\n    in_stock = 1\nWHERE category = 'beleza_saude';",
          explanation: 'One UPDATE can set several columns at once, and the new value of a column may be computed from its old value.',
          breakdown: [
            { part: 'UPDATE my_products', meaning: 'Name the table whose rows will be rewritten.' },
            { part: 'SET price = ROUND(price * 1.1, 2)', meaning: 'Raise the price by ten percent; the price on the right is the value stored before this statement ran.' },
            { part: ', in_stock = 1', meaning: 'A second assignment, separated by a comma; both columns change in the same pass.' },
            { part: "WHERE category = 'beleza_saude'", meaning: 'Restrict the change to the matching rows; without this clause every row in the table would be rewritten.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Step three: verify the result',
          sql: "SELECT product_id, category, price, in_stock\nFROM my_products\nWHERE category = 'beleza_saude'\nORDER BY product_id;",
          explanation: 'Reading the rows back is the only proof that the statement did what you intended.',
          breakdown: [
            { part: 'SELECT product_id, category, price, in_stock', meaning: 'Show the columns the UPDATE touched together with the key.' },
            { part: "WHERE category = 'beleza_saude'", meaning: 'Look at the same rows you targeted so the before and after values line up.' },
            { part: 'ORDER BY product_id', meaning: 'Stable ordering makes comparing two runs easy.' }
          ]
        },
        {
          kind: 'note',
          text: 'UPDATE my_products SET price = 0; is valid SQL and changes every row in the table. SQLite does not warn you and there is no confirmation prompt. The two defences are the WHERE clause and, when the edit is risky, a transaction as shown in Lesson 6. Here you have a third: press Reset database.'
        },
        {
          kind: 'sql',
          title: 'Choose the rows with a subquery',
          sql: 'UPDATE my_products\nSET in_stock = 0\nWHERE product_id IN (\n  SELECT product_id\n  FROM products\n  WHERE CAST(product_weight_g AS REAL) > 5000\n);',
          explanation: 'The WHERE clause of an UPDATE can use a subquery, so rows in your table are selected by facts stored in another table.',
          breakdown: [
            { part: 'UPDATE my_products', meaning: 'The table being changed is still only your own.' },
            { part: 'SET in_stock = 0', meaning: 'Mark the matching products as out of stock.' },
            { part: 'WHERE product_id IN (...)', meaning: 'Keep only rows whose product_id appears in the list the subquery returns.' },
            { part: 'SELECT product_id FROM products', meaning: 'The subquery reads the reference table; it only reads, so products is unchanged.' },
            { part: 'WHERE CAST(product_weight_g AS REAL) > 5000', meaning: 'Heavy products only; the cast is needed because every imported column is TEXT and text comparison would order 900 after 5000.' }
          ]
        }
      ],
      practice: {
        task: 'In my_products, set price to 0 and in_stock to 0 for every row whose product_id starts with demo-, then prove with a SELECT that exactly those rows changed.',
        hint: "Use WHERE product_id LIKE 'demo-%' in both the UPDATE and the SELECT that follows it.",
        solution: "UPDATE my_products\nSET price = 0,\n    in_stock = 0\nWHERE product_id LIKE 'demo-%';\n\nSELECT product_id, price, in_stock\nFROM my_products\nWHERE product_id LIKE 'demo-%'\nORDER BY product_id;"
      },
      questions: [
        {
          id: 'modifying-update-q1',
          prompt: 'What does this statement do to a table of 23 rows?',
          code: 'UPDATE my_products SET price = 0;',
          options: [
            'Sets price to 0 in all 23 rows',
            'Fails, because UPDATE requires a WHERE clause',
            'Sets price to 0 in the first row only',
            'Does nothing until a COMMIT is issued'
          ],
          answer: 'Sets price to 0 in all 23 rows',
          explanation: 'A missing WHERE means every row matches, and SQLite gives no warning before rewriting them.'
        },
        {
          id: 'modifying-update-q2',
          prompt: 'Which habit best protects you from an UPDATE that hits too many rows?',
          options: [
            'Run the same WHERE clause in a SELECT first and look at the rows',
            'Add LIMIT 1 to every UPDATE',
            'Run the UPDATE twice and compare',
            'Use SET on one column at a time'
          ],
          answer: 'Run the same WHERE clause in a SELECT first and look at the rows',
          explanation: 'The SELECT is a free dry run: whatever it returns is exactly what the UPDATE will change.'
        },
        {
          id: 'modifying-update-q3',
          prompt: 'In SET price = price * 1.1, which value does the price on the right refer to?',
          options: [
            'The value stored before the statement ran',
            'The value after the multiplication, so it loops',
            'The average price in the table',
            'NULL, because a column cannot reference itself'
          ],
          answer: 'The value stored before the statement ran',
          explanation: 'Each row is computed from its old values, so self-referencing assignments are safe.'
        },
        {
          id: 'modifying-update-q4',
          prompt: 'How do you change two columns in a single UPDATE?',
          options: [
            'SET price = 10, in_stock = 1',
            'SET price = 10 AND in_stock = 1',
            'SET price = 10 SET in_stock = 1',
            'SET (price, in_stock) VALUES (10, 1)'
          ],
          answer: 'SET price = 10, in_stock = 1',
          explanation: 'Assignments in a SET clause are separated by commas; AND would be read as a boolean expression.'
        },
        {
          id: 'modifying-update-q5',
          prompt: 'Does the subquery example change anything in the products table?',
          code: 'UPDATE my_products SET in_stock = 0\nWHERE product_id IN (SELECT product_id FROM products WHERE CAST(product_weight_g AS REAL) > 5000);',
          options: [
            'No, products is only read; only my_products is written',
            'Yes, matching rows in products are also set to 0',
            'Yes, products rows are deleted',
            'It depends on whether products has a primary key'
          ],
          answer: 'No, products is only read; only my_products is written',
          explanation: 'The table named right after UPDATE is the only table that changes.'
        },
        {
          id: 'modifying-update-q6',
          prompt: 'How many rows does an UPDATE add to a table?',
          options: ['None, UPDATE only rewrites existing rows', 'One per matching row', 'One per SET assignment', 'As many as the WHERE clause matches'],
          answer: 'None, UPDATE only rewrites existing rows',
          explanation: 'Adding rows is the job of INSERT; UPDATE changes values in rows that are already there.'
        }
      ]
    },
    {
      id: 'modifying-delete',
      title: 'Lesson 4 - DELETE: removing rows',
      goal: 'Remove exactly the rows you mean to remove, and tell the difference between emptying a table and dropping it.',
      tables: ['order_items'],
      blocks: [
        {
          kind: 'text',
          text: 'DELETE removes whole rows. You never name columns in a DELETE, because a row is removed or kept as a unit; the only question the statement answers is which rows. That question is answered by WHERE, and a DELETE without WHERE empties the table.'
        },
        {
          kind: 'sql',
          title: 'Count the rows the delete will remove',
          sql: 'SELECT COUNT(*) AS about_to_delete\nFROM my_products\nWHERE in_stock = 0;',
          explanation: 'Turning the WHERE clause into a COUNT first tells you the size of the damage before you do it.',
          breakdown: [
            { part: 'SELECT COUNT(*) AS about_to_delete', meaning: 'Report how many rows the filter matches, named so the number is unambiguous.' },
            { part: 'FROM my_products', meaning: 'The table you are about to delete from.' },
            { part: 'WHERE in_stock = 0', meaning: 'The exact filter the DELETE will use; if this number surprises you, stop and fix the filter.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Delete the matching rows',
          sql: 'DELETE FROM my_products\nWHERE in_stock = 0;',
          explanation: 'DELETE FROM removes every row that satisfies the WHERE clause and leaves the table itself in place.',
          breakdown: [
            { part: 'DELETE FROM my_products', meaning: 'Remove rows from this table; there is no column list because entire rows go.' },
            { part: 'WHERE in_stock = 0', meaning: 'Only rows marked out of stock are removed; every other row survives untouched.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Verify the table afterwards',
          sql: 'SELECT COUNT(*) AS rows_left,\n       SUM(in_stock) AS in_stock_rows\nFROM my_products;',
          explanation: 'Reading the counts back confirms both that the right rows went and that the wrong rows stayed.',
          breakdown: [
            { part: 'COUNT(*) AS rows_left', meaning: 'How many rows remain in the table.' },
            { part: 'SUM(in_stock) AS in_stock_rows', meaning: 'Because in_stock holds 0 or 1, the sum counts the surviving in-stock rows and should equal rows_left.' },
            { part: 'FROM my_products', meaning: 'Both figures come from the table you just changed.' }
          ]
        },
        {
          kind: 'list',
          title: 'Three ways to make a table go away, and what each one leaves behind',
          items: [
            'DELETE FROM my_products WHERE ... - removes the matching rows, keeps the table and its structure.',
            'DELETE FROM my_products; - removes every row, keeps the empty table so you can insert into it again.',
            'DROP TABLE my_products; - removes the rows and the table definition, so a later INSERT fails with no such table.'
          ]
        },
        {
          kind: 'note',
          text: 'The classic accident is selecting the WHERE clause in the editor and running only DELETE FROM my_products. It succeeds, it reports no error, and the table is empty. Count first, and for anything you cannot rebuild, wrap the delete in a transaction as shown in Lesson 6.'
        },
        {
          kind: 'sql',
          title: 'Delete rows chosen by another table',
          sql: 'DELETE FROM my_products\nWHERE product_id NOT IN (\n  SELECT product_id\n  FROM order_items\n);',
          explanation: 'A subquery in the WHERE clause lets you delete the rows of your working table that have no match in a reference table.',
          breakdown: [
            { part: 'DELETE FROM my_products', meaning: 'Rows leave your working table only.' },
            { part: 'WHERE product_id NOT IN (...)', meaning: 'Keep a row only when its product_id is absent from the list the subquery returns, so products that never sold are removed.' },
            { part: 'SELECT product_id FROM order_items', meaning: 'Every product that appears on at least one order line; order_items is read, never written.' }
          ]
        }
      ],
      practice: {
        task: 'Remove from my_products every row whose product_id starts with demo-, counting them before and after so you can prove the change.',
        hint: "Run SELECT COUNT(*) FROM my_products WHERE product_id LIKE 'demo-%'; then the DELETE with the same WHERE, then the count again.",
        solution: "SELECT COUNT(*) AS about_to_delete\nFROM my_products\nWHERE product_id LIKE 'demo-%';\n\nDELETE FROM my_products\nWHERE product_id LIKE 'demo-%';\n\nSELECT COUNT(*) AS still_there\nFROM my_products\nWHERE product_id LIKE 'demo-%';"
      },
      questions: [
        {
          id: 'modifying-delete-q1',
          prompt: 'What is the result of this statement?',
          code: 'DELETE FROM my_products;',
          options: [
            'Every row is removed and the empty table remains',
            'The table and its rows are removed',
            'An error, because DELETE needs a WHERE clause',
            'Only the first row is removed'
          ],
          answer: 'Every row is removed and the empty table remains',
          explanation: 'Without WHERE every row matches; the table definition itself is only removed by DROP TABLE.'
        },
        {
          id: 'modifying-delete-q2',
          prompt: 'Which statement removes the table definition as well as the rows?',
          options: ['DROP TABLE my_products;', 'DELETE FROM my_products;', 'TRUNCATE my_products;', 'UPDATE my_products SET price = NULL;'],
          answer: 'DROP TABLE my_products;',
          explanation: 'After a DROP the name no longer exists, so a later INSERT fails with no such table.'
        },
        {
          id: 'modifying-delete-q3',
          prompt: 'Why does a DELETE never list columns?',
          options: [
            'Because it removes whole rows, not individual values',
            'Because SQLite deletes all columns by default',
            'Because the columns are taken from the primary key',
            'Because column lists are only allowed in INSERT'
          ],
          answer: 'Because it removes whole rows, not individual values',
          explanation: 'Clearing a single value is an UPDATE that sets the column to NULL.'
        },
        {
          id: 'modifying-delete-q4',
          prompt: 'What is the best dry run for a DELETE?',
          options: [
            'SELECT COUNT(*) with the same WHERE clause',
            'Running the DELETE and reading the row count afterwards',
            'DROP TABLE and rebuild it',
            'Adding LIMIT 1 to the DELETE'
          ],
          answer: 'SELECT COUNT(*) with the same WHERE clause',
          explanation: 'The count tells you how many rows would go while nothing has changed yet.'
        },
        {
          id: 'modifying-delete-q5',
          prompt: 'Does this statement change the order_items table?',
          code: 'DELETE FROM my_products WHERE product_id NOT IN (SELECT product_id FROM order_items);',
          options: [
            'No, order_items is only read by the subquery',
            'Yes, the matching order_items rows are deleted too',
            'Yes, because NOT IN cascades',
            'Only if order_items has a foreign key'
          ],
          answer: 'No, order_items is only read by the subquery',
          explanation: 'The table named after DELETE FROM is the only one that loses rows.'
        },
        {
          id: 'modifying-delete-q6',
          prompt: 'You ran DELETE FROM my_products; by accident. What is the quickest full recovery?',
          options: [
            'Press Reset database to rebuild the working copy from the untouched import',
            'Run an UNDO statement',
            'Run the DELETE again to reverse it',
            'Nothing can be done, the imported data is lost'
          ],
          answer: 'Press Reset database to rebuild the working copy from the untouched import',
          explanation: 'The working copy is disposable by design; the database built by the import was never touched.'
        }
      ]
    },
    {
      id: 'modifying-ctas',
      title: 'Lesson 5 - CREATE TABLE AS SELECT, ALTER TABLE and views',
      goal: 'Build a working table straight from a query, change its shape afterwards, and save a query as a view.',
      tables: ['orders', 'order_items'],
      blocks: [
        {
          kind: 'text',
          text: 'Writing CREATE TABLE by hand and then filling it with INSERT is two steps. CREATE TABLE AS SELECT, usually shortened to CTAS, does both at once: it takes the result of a query and stores it as a new table, with column names and a row for every row the query returned.'
        },
        {
          kind: 'sql',
          title: 'Create a table from a query',
          sql: 'CREATE TABLE my_orders AS\nSELECT\n  o.order_id,\n  o.customer_id,\n  o.order_status,\n  ROUND(SUM(CAST(oi.price AS REAL)), 2) AS order_total,\n  COUNT(*) AS item_count\nFROM orders AS o\nJOIN order_items AS oi ON oi.order_id = o.order_id\nGROUP BY o.order_id, o.customer_id, o.order_status\nLIMIT 500;',
          explanation: 'CTAS snapshots the result of an aggregation into a small table you can then query, index and change cheaply.',
          breakdown: [
            { part: 'CREATE TABLE my_orders AS', meaning: 'Create a new table whose columns are the columns of the query that follows.' },
            { part: 'SELECT o.order_id, o.customer_id, o.order_status', meaning: 'Three columns copied straight from orders; their names become the column names of the new table.' },
            { part: 'ROUND(SUM(CAST(oi.price AS REAL)), 2) AS order_total', meaning: 'The order value; the alias is required because a computed column needs a name to be stored under.' },
            { part: 'COUNT(*) AS item_count', meaning: 'How many item lines the order has.' },
            { part: 'JOIN order_items AS oi ON oi.order_id = o.order_id', meaning: 'Attach the item lines so there is something to sum and count.' },
            { part: 'GROUP BY o.order_id, o.customer_id, o.order_status', meaning: 'One row per order, which is the grain of the new table.' },
            { part: 'LIMIT 500', meaning: 'Keep the working table small; drop this once you trust the query.' }
          ]
        },
        {
          kind: 'note',
          text: 'A CTAS table copies the data and the column names but not the rules: no primary key, no NOT NULL, no index. Run SELECT * FROM my_orders LIMIT 5; now to see what you got, and declare the table by hand instead when the constraints matter.'
        },
        {
          kind: 'sql',
          title: 'Add a column to an existing table',
          sql: 'ALTER TABLE my_orders\nADD COLUMN reviewed INTEGER;',
          explanation: 'ALTER TABLE ADD COLUMN appends a new column to a table that already holds rows, filling it with NULL in every existing row.',
          breakdown: [
            { part: 'ALTER TABLE my_orders', meaning: 'Change the definition of this table rather than its rows.' },
            { part: 'ADD COLUMN reviewed INTEGER', meaning: 'Append a whole-number column called reviewed; every existing row gets NULL, so an UPDATE is usually the next step.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Rename a table',
          sql: 'ALTER TABLE my_orders\nRENAME TO my_order_totals;',
          explanation: 'RENAME TO changes the name of a table in place, keeping all of its rows and columns.',
          breakdown: [
            { part: 'ALTER TABLE my_orders', meaning: 'The table as it is called right now.' },
            { part: 'RENAME TO my_order_totals', meaning: 'Its new name; the old name stops working immediately, so any saved query that used it must be updated.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Save a query as a view',
          sql: 'CREATE VIEW my_big_orders AS\nSELECT\n  order_id,\n  customer_id,\n  order_total,\n  item_count\nFROM my_order_totals\nWHERE order_total >= 500\nORDER BY order_total DESC;',
          explanation: 'A view is a stored query that you can select from as if it were a table, without copying any data.',
          breakdown: [
            { part: 'CREATE VIEW my_big_orders AS', meaning: 'Store the following query under a name; nothing is written to disk except the definition.' },
            { part: 'SELECT order_id, customer_id, order_total, item_count', meaning: 'The columns anyone selecting from the view will see.' },
            { part: 'FROM my_order_totals', meaning: 'The view reads the renamed table every time it is used, so it always shows current values.' },
            { part: 'WHERE order_total >= 500', meaning: 'The filter is baked into the view, which is the point: the rule lives in one place.' },
            { part: 'ORDER BY order_total DESC', meaning: 'A default ordering for the view; a query on the view can still impose its own.' }
          ]
        },
        {
          kind: 'list',
          title: 'Table or view',
          items: [
            'A table stores rows on disk; a view stores only the text of a query.',
            'A CTAS table is a snapshot and goes stale when the source changes; a view re-runs its query and is always current.',
            'Selecting from a big view costs as much as running the query behind it; selecting from a snapshot table is fast.',
            'Remove them with different statements: DROP TABLE for a table, DROP VIEW for a view.',
            'You cannot INSERT, UPDATE or DELETE through a plain view; change the underlying table instead.'
          ]
        },
        {
          kind: 'note',
          text: 'Verify each step as you go: SELECT * FROM my_order_totals LIMIT 5; after the rename, and SELECT COUNT(*) FROM my_big_orders; after creating the view.'
        }
      ],
      practice: {
        task: 'Build a table my_state_sales holding one row per customer state with the number of orders, using CREATE TABLE AS SELECT over orders and customers, then create a view my_busy_states that shows only the states with at least 1000 orders.',
        hint: 'Join orders to customers on customer_id, GROUP BY customer_state, and alias COUNT(*) so the computed column has a name to be stored under.',
        solution: 'DROP TABLE IF EXISTS my_state_sales;\n\nCREATE TABLE my_state_sales AS\nSELECT\n  c.customer_state,\n  COUNT(*) AS order_count\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nGROUP BY c.customer_state;\n\nCREATE VIEW my_busy_states AS\nSELECT customer_state, order_count\nFROM my_state_sales\nWHERE order_count >= 1000;\n\nSELECT * FROM my_busy_states ORDER BY order_count DESC;'
      },
      questions: [
        {
          id: 'modifying-ctas-q1',
          prompt: 'What does CREATE TABLE AS SELECT produce?',
          options: [
            'A new table holding the rows the query returned',
            'An empty table with the column names of the query',
            'A stored query that runs again on each use',
            'A copy of the source table including its primary key'
          ],
          answer: 'A new table holding the rows the query returned',
          explanation: 'CTAS copies both structure and data, but not constraints or indexes.'
        },
        {
          id: 'modifying-ctas-q2',
          prompt: 'A computed column in a CTAS has no alias. What is the problem?',
          code: 'CREATE TABLE my_orders AS\nSELECT order_id, SUM(CAST(price AS REAL))\nFROM order_items GROUP BY order_id;',
          options: [
            'The stored column gets an awkward generated name that is hard to query',
            'The statement deletes order_items',
            'SQLite stores the column as NULL',
            'The GROUP BY is ignored'
          ],
          answer: 'The stored column gets an awkward generated name that is hard to query',
          explanation: 'Always alias computed columns in a CTAS so the new table has usable column names.'
        },
        {
          id: 'modifying-ctas-q3',
          prompt: 'You add a column to a table that already holds 500 rows. What is in the new column?',
          code: 'ALTER TABLE my_orders ADD COLUMN reviewed INTEGER;',
          options: ['NULL in every existing row', '0 in every existing row', 'The column is empty and the rows are deleted', 'An error, the table must be empty'],
          answer: 'NULL in every existing row',
          explanation: 'ADD COLUMN cannot invent values, so existing rows get NULL until you UPDATE them.'
        },
        {
          id: 'modifying-ctas-q4',
          prompt: 'The source table gains new rows after you built a snapshot with CTAS. What happens to the snapshot?',
          options: [
            'It keeps the old rows and goes stale until you rebuild it',
            'It updates itself automatically',
            'It becomes unreadable',
            'It updates only if the source has a primary key'
          ],
          answer: 'It keeps the old rows and goes stale until you rebuild it',
          explanation: 'A table stores data; only a view re-reads the source on every query.'
        },
        {
          id: 'modifying-ctas-q5',
          prompt: 'What is the main difference between a view and a table?',
          options: [
            'A view stores only a query definition, a table stores rows',
            'A view is faster because it caches its rows',
            'A view can hold more columns than a table',
            'A view cannot be used inside another SELECT'
          ],
          answer: 'A view stores only a query definition, a table stores rows',
          explanation: 'Selecting from a view runs the stored query, so the result is always current.'
        },
        {
          id: 'modifying-ctas-q6',
          prompt: 'You renamed my_orders to my_order_totals. What happens to a saved report that still selects from my_orders?',
          options: [
            'It fails with no such table until it is updated',
            'It keeps working through an automatic alias',
            'It returns an empty result set',
            'It recreates my_orders as an empty table'
          ],
          answer: 'It fails with no such table until it is updated',
          explanation: 'RENAME TO retires the old name at once, which is why renames need a search through existing queries and views.'
        }
      ]
    },
    {
      id: 'modifying-transactions',
      title: 'Lesson 6 - Transactions, constraints and indexes',
      goal: 'Make a risky change undoable with a transaction, let the database reject bad rows with constraints, and speed up lookups with an index.',
      tables: ['orders', 'order_items'],
      blocks: [
        {
          kind: 'text',
          text: 'A transaction groups several statements into one unit of work. Nothing inside it is permanent until you say COMMIT, and ROLLBACK throws the whole group away as if it never ran. This is the professional version of the Reset database button: it works on a real database, and it protects one specific change instead of throwing the entire copy away.'
        },
        {
          kind: 'sql',
          title: 'Open a transaction',
          sql: 'BEGIN TRANSACTION;',
          explanation: 'BEGIN starts a unit of work; every change after it is provisional until the transaction ends.',
          breakdown: [
            { part: 'BEGIN', meaning: 'Start a transaction on the current connection.' },
            { part: 'TRANSACTION', meaning: 'An optional keyword that makes the intent obvious; BEGIN alone does the same thing.' },
            { part: '(what follows)', meaning: 'Every INSERT, UPDATE and DELETE you run from now on is held open until you COMMIT or ROLLBACK.' }
          ]
        },
        {
          kind: 'list',
          title: 'The safe-edit sequence, one Run click per line',
          items: [
            'BEGIN TRANSACTION; - open the unit of work.',
            'DELETE FROM my_order_totals WHERE order_total < 50; - make the risky change.',
            'SELECT COUNT(*) FROM my_order_totals; - inspect the result inside the transaction, where it is still reversible.',
            'ROLLBACK; if the count looks wrong, or COMMIT; if it looks right.'
          ]
        },
        {
          kind: 'sql',
          title: 'Undo everything since BEGIN',
          sql: 'ROLLBACK;',
          explanation: 'ROLLBACK discards every change made since BEGIN, leaving the database exactly as it was.',
          breakdown: [
            { part: 'ROLLBACK', meaning: 'End the transaction and throw away its changes; the deleted rows come back.' },
            { part: '(the alternative)', meaning: 'COMMIT ends the transaction and writes the changes permanently; after a COMMIT there is nothing left to roll back.' }
          ]
        },
        {
          kind: 'note',
          text: 'A transaction lives on the connection, so it stays open across Run clicks until you end it. If you leave one open, later statements are still provisional and other connections can be blocked, so always finish with COMMIT or ROLLBACK.'
        },
        {
          kind: 'text',
          text: 'Transactions protect you from your own statements. Constraints protect the table from bad data in the first place, by making the database refuse a row that breaks a rule instead of storing it and letting you find out months later.'
        },
        {
          kind: 'sql',
          title: 'Declare the rules with the table',
          sql: 'CREATE TABLE my_price_alerts (\n  alert_id INTEGER PRIMARY KEY,\n  product_id TEXT NOT NULL UNIQUE,\n  threshold REAL NOT NULL,\n  note_text TEXT\n);',
          explanation: 'Constraints written into CREATE TABLE are enforced on every INSERT and UPDATE from then on.',
          breakdown: [
            { part: 'alert_id INTEGER PRIMARY KEY', meaning: 'The row identifier; in SQLite an INTEGER PRIMARY KEY fills itself in automatically when you leave it out of an INSERT.' },
            { part: 'product_id TEXT NOT NULL UNIQUE', meaning: 'Two rules on one column: a value is required, and no two rows may carry the same product_id, so a duplicate alert is rejected.' },
            { part: 'threshold REAL NOT NULL', meaning: 'A decimal number that must always be supplied; an alert without a threshold is meaningless.' },
            { part: 'note_text TEXT', meaning: 'No constraint at all, so this column may be left NULL.' }
          ]
        },
        {
          kind: 'list',
          title: 'What each rule rejects',
          items: [
            'NOT NULL - an INSERT or UPDATE that would leave the column empty.',
            'UNIQUE - a second row carrying a value that is already stored in that column.',
            'PRIMARY KEY - both of the above at once, and it is the row identifier other tables refer to.',
            'A rejected statement fails with an error and changes nothing, which is exactly what you want.'
          ]
        },
        {
          kind: 'sql',
          title: 'Speed up a repeated lookup with an index',
          sql: 'CREATE INDEX idx_my_order_totals_customer\nON my_order_totals (customer_id);',
          explanation: 'An index is a sorted lookup structure that lets SQLite find matching rows without reading the whole table.',
          breakdown: [
            { part: 'CREATE INDEX idx_my_order_totals_customer', meaning: 'Build a new index under a name; the table_column naming convention keeps a schema readable.' },
            { part: 'ON my_order_totals (customer_id)', meaning: 'Index this column of this table, so filters, joins and ORDER BY on customer_id can jump straight to the rows.' },
            { part: '(the cost)', meaning: 'The index is extra storage and must be kept up to date on every INSERT, UPDATE and DELETE, so index the columns you search by, not every column.' }
          ]
        },
        {
          kind: 'note',
          text: 'An index helps WHERE customer_id = ..., a join on customer_id and ORDER BY customer_id. It does nothing for WHERE UPPER(customer_id) = ... because the stored order no longer matches what you are comparing.'
        }
      ],
      practice: {
        task: 'Inside a transaction, delete from my_order_totals every row with fewer than two items, check the remaining count, then roll the change back and confirm the original count is restored.',
        hint: 'Four separate Run clicks: BEGIN TRANSACTION; then the DELETE; then SELECT COUNT(*); then ROLLBACK; and finally a count again.',
        solution: 'BEGIN TRANSACTION;\n\nDELETE FROM my_order_totals\nWHERE item_count < 2;\n\nSELECT COUNT(*) AS rows_inside_transaction\nFROM my_order_totals;\n\nROLLBACK;\n\nSELECT COUNT(*) AS rows_after_rollback\nFROM my_order_totals;'
      },
      questions: [
        {
          id: 'modifying-transactions-q1',
          prompt: 'You ran BEGIN TRANSACTION, then a DELETE that removed far too many rows. What do you run?',
          options: ['ROLLBACK;', 'COMMIT;', 'UNDO;', 'DROP TABLE;'],
          answer: 'ROLLBACK;',
          explanation: 'ROLLBACK discards every change made since BEGIN, so the rows come back.'
        },
        {
          id: 'modifying-transactions-q2',
          prompt: 'What does COMMIT do?',
          options: [
            'Ends the transaction and makes its changes permanent',
            'Ends the transaction and discards its changes',
            'Saves the changes but keeps them reversible',
            'Starts a new transaction'
          ],
          answer: 'Ends the transaction and makes its changes permanent',
          explanation: 'After COMMIT the changes are written for good and cannot be rolled back.'
        },
        {
          id: 'modifying-transactions-q3',
          prompt: 'You committed the transaction and only then noticed the DELETE was wrong. What can you still do?',
          options: [
            'Nothing through ROLLBACK; you have to restore or rebuild the data',
            'Run ROLLBACK, it reverses the last commit',
            'Run BEGIN followed by ROLLBACK',
            'Run the DELETE again to reverse it'
          ],
          answer: 'Nothing through ROLLBACK; you have to restore or rebuild the data',
          explanation: 'COMMIT is the point of no return, which is why you inspect the result before committing.'
        },
        {
          id: 'modifying-transactions-q4',
          prompt: 'product_id is declared TEXT NOT NULL UNIQUE. What happens on the second insert?',
          code: "INSERT INTO my_price_alerts (product_id, threshold) VALUES ('p1', 10.0);\nINSERT INTO my_price_alerts (product_id, threshold) VALUES ('p1', 20.0);",
          options: [
            'The second insert fails and the table keeps one row',
            'Both rows are stored',
            'The second insert overwrites the first',
            'Both inserts fail'
          ],
          answer: 'The second insert fails and the table keeps one row',
          explanation: 'UNIQUE rejects the duplicate value; a rejected statement changes nothing.'
        },
        {
          id: 'modifying-transactions-q5',
          prompt: 'Which query benefits from CREATE INDEX idx ON my_order_totals (customer_id)?',
          options: [
            "SELECT * FROM my_order_totals WHERE customer_id = 'abc';",
            'SELECT * FROM my_order_totals WHERE order_total > 100;',
            "SELECT * FROM my_order_totals WHERE UPPER(customer_id) = 'ABC';",
            'SELECT COUNT(*) FROM my_order_totals;'
          ],
          answer: "SELECT * FROM my_order_totals WHERE customer_id = 'abc';",
          explanation: 'An index helps when the indexed column is compared directly; wrapping it in a function defeats it.'
        },
        {
          id: 'modifying-transactions-q6',
          prompt: 'What is the cost of adding an index to a table?',
          options: [
            'Extra storage and slower INSERT, UPDATE and DELETE',
            'Slower SELECT statements',
            'The table loses its primary key',
            'None, indexes are free'
          ],
          answer: 'Extra storage and slower INSERT, UPDATE and DELETE',
          explanation: 'Every write has to maintain the index, so index the columns you actually search by.'
        }
      ]
    }
  ]
}
