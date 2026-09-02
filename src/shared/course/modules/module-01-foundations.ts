import type { CourseModule } from '../types.js'

export const foundationsModule: CourseModule = {
  id: 'foundations',
  level: 'basics',
  title: 'Foundations: reading the database',
  description:
    'Get to know the Olist e-commerce dataset and learn the clauses every analyst uses every day: SELECT, WHERE, ORDER BY and LIMIT.',
  lessons: [
    {
      id: 'foundations-tour',
      title: 'Lesson 1 - Meet the Olist database',
      goal: 'Understand which tables exist, what each one stores and how to inspect a table you have never seen before.',
      tables: ['orders', 'customers', 'order_items', 'products'],
      blocks: [
        {
          kind: 'text',
          text: 'Your session database is a snapshot of the public Olist Brazilian e-commerce dataset: around 100k orders placed on a marketplace between 2016 and 2018. Every CSV file was imported into its own table.'
        },
        {
          kind: 'list',
          title: 'The nine tables',
          items: [
            'orders - one row per order: status and the timestamps of the delivery journey.',
            'order_items - one row per product inside an order, with price and freight_value.',
            'order_payments - one row per payment attached to an order; an order can be split across payments.',
            'order_reviews - the review score and comment a customer left for an order.',
            'customers - one row per customer key used by an order, with city, state and a customer_unique_id.',
            'products - product dimensions, weight, photo count and the Portuguese category name.',
            'sellers - the seller city, state and zip prefix.',
            'geolocation - latitude and longitude points per zip code prefix.',
            'product_category_name_translation - Portuguese category name mapped to English.'
          ]
        },
        {
          kind: 'sql',
          title: 'List every table in the database',
          sql: "SELECT name\nFROM sqlite_master\nWHERE type = 'table'\nORDER BY name;",
          explanation: 'SQLite keeps a catalogue of everything it stores in a system table called sqlite_master, so you can query the structure of the database with plain SQL.',
          breakdown: [
            { part: 'SELECT name', meaning: 'Return only the name column of the catalogue.' },
            { part: 'FROM sqlite_master', meaning: 'Read from the built-in catalogue of tables, indexes and views.' },
            { part: "WHERE type = 'table'", meaning: 'Keep catalogue rows that describe tables and drop indexes and views.' },
            { part: 'ORDER BY name', meaning: 'Sort the result alphabetically so it is easy to scan.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Inspect the columns of one table',
          sql: "SELECT name, type\nFROM pragma_table_info('orders');",
          explanation: 'PRAGMA functions expose metadata. pragma_table_info returns one row per column of the table you name.',
          breakdown: [
            { part: "pragma_table_info('orders')", meaning: 'A table-valued function that describes the columns of the orders table.' },
            { part: 'SELECT name, type', meaning: 'Show the column name and its declared type.' }
          ]
        },
        {
          kind: 'note',
          text: 'The importer stores every column as TEXT, so the type column reads TEXT everywhere. Lesson 6 shows how to convert values to numbers.'
        },
        {
          kind: 'sql',
          title: 'Look at the first rows of a table',
          sql: 'SELECT *\nFROM orders\nLIMIT 5;',
          explanation: 'The fastest way to understand a table is to look at a handful of rows.',
          breakdown: [
            { part: 'SELECT *', meaning: 'Return every column of the table.' },
            { part: 'FROM orders', meaning: 'Read rows from the orders table.' },
            { part: 'LIMIT 5', meaning: 'Stop after five rows instead of scanning the whole table.' }
          ]
        }
      ],
      practice: {
        task: 'Show the columns of the order_items table.',
        hint: 'Reuse the pragma_table_info example and change the table name.',
        solution: "SELECT name, type\nFROM pragma_table_info('order_items');"
      },
      questions: [
        {
          id: 'foundations-tour-q1',
          prompt: 'Which table stores the price paid for a single product inside an order?',
          options: ['order_items', 'orders', 'order_payments', 'products'],
          answer: 'order_items',
          explanation: 'orders holds one row per order; the per-product price and freight live in order_items.'
        },
        {
          id: 'foundations-tour-q2',
          prompt: 'Which table would you query to find the review score a customer gave an order?',
          options: ['order_reviews', 'customers', 'orders', 'order_payments'],
          answer: 'order_reviews',
          explanation: 'order_reviews contains review_score together with the optional title and message.'
        },
        {
          id: 'foundations-tour-q3',
          prompt: 'What does this query return?',
          code: "SELECT name FROM sqlite_master WHERE type = 'table';",
          options: [
            'The names of the tables in the database',
            'The names of the columns in every table',
            'The number of rows in every table',
            'The names of the databases on disk'
          ],
          answer: 'The names of the tables in the database',
          explanation: "sqlite_master is the catalogue; filtering type = 'table' leaves only tables."
        },
        {
          id: 'foundations-tour-q4',
          prompt: 'Which table maps a Portuguese category name to English?',
          options: ['product_category_name_translation', 'products', 'geolocation', 'sellers'],
          answer: 'product_category_name_translation',
          explanation: 'products stores the Portuguese name only; the translation table provides the English label.'
        },
        {
          id: 'foundations-tour-q5',
          prompt: 'What is the safest first query to run against a table you have never seen?',
          options: [
            'SELECT * FROM table_name LIMIT 5;',
            'SELECT * FROM table_name;',
            'DELETE FROM table_name;',
            'DROP TABLE table_name;'
          ],
          answer: 'SELECT * FROM table_name LIMIT 5;',
          explanation: 'LIMIT keeps the result small and fast, and SELECT never changes the data.'
        },
        {
          id: 'foundations-tour-q6',
          prompt: 'Which table tells you the state a customer lives in?',
          options: ['customers', 'orders', 'sellers', 'order_items'],
          answer: 'customers',
          explanation: 'customers holds customer_city and customer_state; sellers holds the seller side.'
        }
      ]
    },
    {
      id: 'foundations-select',
      title: 'Lesson 2 - SELECT: choosing and renaming columns',
      goal: 'Return exactly the columns you need and rename them with aliases.',
      tables: ['customers', 'orders'],
      blocks: [
        {
          kind: 'text',
          text: 'SELECT describes the shape of the result: which columns come back and what they are called. FROM says where the rows come from. Every other clause is a refinement of those two.'
        },
        {
          kind: 'sql',
          title: 'Select specific columns',
          sql: 'SELECT customer_id, customer_city, customer_state\nFROM customers\nLIMIT 10;',
          explanation: 'Naming columns explicitly is faster than SELECT * and makes the query self-documenting.',
          breakdown: [
            { part: 'SELECT customer_id, customer_city, customer_state', meaning: 'Return these three columns, in this order.' },
            { part: 'FROM customers', meaning: 'Take the rows from the customers table.' },
            { part: 'LIMIT 10', meaning: 'Return at most ten rows.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Rename columns with AS',
          sql: 'SELECT\n  customer_id AS id,\n  customer_city AS city,\n  customer_state AS state\nFROM customers\nLIMIT 10;',
          explanation: 'An alias renames a column in the result only; the stored table is untouched.',
          breakdown: [
            { part: 'customer_city AS city', meaning: 'Return customer_city but label the output column city.' },
            { part: 'AS', meaning: 'Optional keyword that introduces an alias; SQLite also accepts the alias without it.' }
          ]
        },
        {
          kind: 'note',
          text: 'Use double quotes when an alias contains spaces, for example customer_city AS "Customer city".'
        }
      ],
      practice: {
        task: 'Return the order_id and order_status of ten orders, labelled id and status.',
        hint: 'Two aliases and a LIMIT are all you need.',
        solution: 'SELECT order_id AS id, order_status AS status\nFROM orders\nLIMIT 10;'
      },
      questions: [
        {
          id: 'foundations-select-q1',
          prompt: 'What does SELECT * do?',
          options: [
            'Returns every column of the table',
            'Returns every row but only the first column',
            'Multiplies the columns together',
            'Returns only the primary key'
          ],
          answer: 'Returns every column of the table',
          explanation: 'The star is a wildcard for all columns of the sources listed in FROM.'
        },
        {
          id: 'foundations-select-q2',
          prompt: 'What is the name of the output column?',
          code: 'SELECT customer_city AS city FROM customers;',
          options: ['city', 'customer_city', 'AS', 'customers.city'],
          answer: 'city',
          explanation: 'AS renames the column in the result set.'
        },
        {
          id: 'foundations-select-q3',
          prompt: 'Which clause decides where the rows come from?',
          options: ['FROM', 'SELECT', 'ORDER BY', 'LIMIT'],
          answer: 'FROM',
          explanation: 'SELECT chooses columns, FROM chooses the source of the rows.'
        },
        {
          id: 'foundations-select-q4',
          prompt: 'Does an alias change the column name inside the table?',
          options: [
            'No, it only renames the column in the result',
            'Yes, the table column is renamed permanently',
            'Yes, but only until the session ends',
            'Only when you write ALTER before it'
          ],
          answer: 'No, it only renames the column in the result',
          explanation: 'Aliases are presentation only; renaming a stored column needs ALTER TABLE.'
        },
        {
          id: 'foundations-select-q5',
          prompt: 'Which query returns only the seller city and state?',
          options: [
            'SELECT seller_city, seller_state FROM sellers;',
            'SELECT * FROM sellers;',
            'SELECT sellers FROM seller_city, seller_state;',
            'FROM sellers SELECT seller_city, seller_state;'
          ],
          answer: 'SELECT seller_city, seller_state FROM sellers;',
          explanation: 'Columns follow SELECT, the table follows FROM, in that order.'
        },
        {
          id: 'foundations-select-q6',
          prompt: 'Why is naming columns usually better than SELECT *?',
          options: [
            'It returns less data and shows the intent of the query',
            'It makes SQLite validate the data types',
            'It automatically removes duplicate rows',
            'It is required whenever you use LIMIT'
          ],
          answer: 'It returns less data and shows the intent of the query',
          explanation: 'Explicit column lists are cheaper to transfer and survive schema changes better.'
        }
      ]
    },
    {
      id: 'foundations-order-limit',
      title: 'Lesson 3 - Sorting and limiting results with ORDER BY and LIMIT',
      goal: 'Sort rows in either direction and take the top or bottom slice of a result.',
      tables: ['order_items', 'orders'],
      blocks: [
        {
          kind: 'text',
          text: 'Rows in a table have no guaranteed order. If you want a predictable result - and every top-N answer needs one - you must ask for it with ORDER BY.'
        },
        {
          kind: 'sql',
          title: 'Ten most expensive order items',
          sql: 'SELECT order_id, product_id, price\nFROM order_items\nORDER BY CAST(price AS REAL) DESC\nLIMIT 10;',
          explanation: 'Sort the items from the highest price down and keep the first ten rows.',
          breakdown: [
            { part: 'ORDER BY CAST(price AS REAL)', meaning: 'Sort by price as a number; price is stored as TEXT, so a plain sort would compare strings.' },
            { part: 'DESC', meaning: 'Sort from the largest value to the smallest; ASC, the default, does the opposite.' },
            { part: 'LIMIT 10', meaning: 'Return only the first ten rows of the sorted result.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Paging with OFFSET',
          sql: 'SELECT order_id, order_purchase_timestamp\nFROM orders\nORDER BY order_purchase_timestamp DESC\nLIMIT 10 OFFSET 10;',
          explanation: 'OFFSET skips rows before LIMIT starts counting, which is how result pages are built.',
          breakdown: [
            { part: 'ORDER BY order_purchase_timestamp DESC', meaning: 'Newest orders first; the timestamp text sorts correctly because it is YYYY-MM-DD HH:MM:SS.' },
            { part: 'LIMIT 10 OFFSET 10', meaning: 'Skip the first ten rows and return the next ten, that is the second page.' }
          ]
        },
        {
          kind: 'note',
          text: 'LIMIT without ORDER BY gives you an arbitrary sample, not the top rows. Always pair them when the ranking matters.'
        }
      ],
      practice: {
        task: 'Find the ten cheapest order items.',
        hint: 'Same query as the example, but sorted ascending.',
        solution: 'SELECT order_id, product_id, price\nFROM order_items\nORDER BY CAST(price AS REAL) ASC\nLIMIT 10;'
      },
      questions: [
        {
          id: 'foundations-order-limit-q1',
          prompt: 'Which keyword sorts from the largest value to the smallest?',
          options: ['DESC', 'ASC', 'TOP', 'REVERSE'],
          answer: 'DESC',
          explanation: 'ASC is the default ascending order; DESC reverses it.'
        },
        {
          id: 'foundations-order-limit-q2',
          prompt: 'What does this query return?',
          code: 'SELECT order_id FROM orders ORDER BY order_purchase_timestamp DESC LIMIT 5;',
          options: [
            'The five most recent orders',
            'The five oldest orders',
            'Five random orders',
            'The five orders with the largest order_id'
          ],
          answer: 'The five most recent orders',
          explanation: 'Sorting the purchase timestamp descending puts the newest orders first.'
        },
        {
          id: 'foundations-order-limit-q3',
          prompt: 'What does LIMIT 10 OFFSET 20 return?',
          options: [
            'Rows 21 to 30 of the sorted result',
            'Rows 10 to 20 of the sorted result',
            'The first 10 rows only',
            'The last 20 rows'
          ],
          answer: 'Rows 21 to 30 of the sorted result',
          explanation: 'OFFSET skips 20 rows, then LIMIT returns the following 10.'
        },
        {
          id: 'foundations-order-limit-q4',
          prompt: 'Why does the example cast price to REAL before sorting?',
          options: [
            'Because price is stored as TEXT and text sorts alphabetically',
            'Because ORDER BY only accepts numbers',
            'Because CAST makes the query faster',
            'Because price contains NULL values'
          ],
          answer: 'Because price is stored as TEXT and text sorts alphabetically',
          explanation: "Without the cast '9.90' would sort after '100.00', because '9' is greater than '1' as text."
        },
        {
          id: 'foundations-order-limit-q5',
          prompt: 'Is the row order of a table guaranteed without ORDER BY?',
          options: [
            'No, the database may return rows in any order',
            'Yes, rows always come back in insertion order',
            'Yes, rows are always sorted by the first column',
            'Only when the table has fewer than 1000 rows'
          ],
          answer: 'No, the database may return rows in any order',
          explanation: 'Only ORDER BY makes the order deterministic.'
        },
        {
          id: 'foundations-order-limit-q6',
          prompt: 'Which clause is written last in a SELECT statement?',
          options: ['LIMIT', 'ORDER BY', 'WHERE', 'FROM'],
          answer: 'LIMIT',
          explanation: 'The order is SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.'
        }
      ]
    },
    {
      id: 'foundations-where',
      title: 'Lesson 4 - Filtering rows with WHERE',
      goal: 'Keep only the rows you care about using comparisons, AND and OR, IN, BETWEEN and LIKE.',
      tables: ['orders', 'customers', 'order_items'],
      blocks: [
        {
          kind: 'text',
          text: 'WHERE is evaluated once per row and the row survives when the condition is true. Almost every analysis starts with a good filter.'
        },
        {
          kind: 'sql',
          title: 'A single condition',
          sql: "SELECT order_id, order_status\nFROM orders\nWHERE order_status = 'delivered'\nLIMIT 10;",
          explanation: 'Keep only delivered orders.',
          breakdown: [
            { part: "WHERE order_status = 'delivered'", meaning: 'Compare the column with a text literal; string literals use single quotes.' },
            { part: 'LIMIT 10', meaning: 'Show a small sample of the filtered rows.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Combining conditions',
          sql: "SELECT customer_id, customer_city\nFROM customers\nWHERE customer_state = 'SP'\n  AND customer_city IN ('sao paulo', 'campinas')\nLIMIT 20;",
          explanation: 'AND requires both conditions to hold; IN is a shorthand for several OR comparisons on the same column.',
          breakdown: [
            { part: "customer_state = 'SP'", meaning: 'Only customers from Sao Paulo state.' },
            { part: 'AND', meaning: 'Both sides must be true for the row to survive.' },
            { part: "customer_city IN ('sao paulo', 'campinas')", meaning: "Equivalent to customer_city = 'sao paulo' OR customer_city = 'campinas'." }
          ]
        },
        {
          kind: 'sql',
          title: 'Ranges and patterns',
          sql: 'SELECT order_id, price\nFROM order_items\nWHERE CAST(price AS REAL) BETWEEN 100 AND 200\nLIMIT 10;',
          explanation: 'BETWEEN is inclusive on both ends and reads better than two comparisons.',
          breakdown: [
            { part: 'BETWEEN 100 AND 200', meaning: 'The same as price >= 100 AND price <= 200.' },
            { part: 'CAST(price AS REAL)', meaning: 'Compare numerically instead of alphabetically.' }
          ]
        },
        {
          kind: 'note',
          text: "LIKE matches patterns: % stands for any number of characters and _ for exactly one. WHERE customer_city LIKE 'sao%' finds every city starting with sao."
        }
      ],
      practice: {
        task: 'Find orders whose status is neither delivered nor shipped.',
        hint: 'NOT IN is the opposite of IN.',
        solution: "SELECT order_id, order_status\nFROM orders\nWHERE order_status NOT IN ('delivered', 'shipped')\nLIMIT 20;"
      },
      questions: [
        {
          id: 'foundations-where-q1',
          prompt: 'Which rows does this query keep?',
          code: "SELECT * FROM orders WHERE order_status = 'canceled';",
          options: [
            'Only orders whose status is exactly canceled',
            'Orders whose status contains the word canceled',
            'All orders except canceled ones',
            'Nothing, because status values are uppercase'
          ],
          answer: 'Only orders whose status is exactly canceled',
          explanation: 'The = operator is an exact comparison.'
        },
        {
          id: 'foundations-where-q2',
          prompt: "What is the equivalent of WHERE state IN ('SP', 'RJ')?",
          options: [
            "WHERE state = 'SP' OR state = 'RJ'",
            "WHERE state = 'SP' AND state = 'RJ'",
            "WHERE state LIKE 'SPRJ'",
            "WHERE state BETWEEN 'SP' AND 'RJ'"
          ],
          answer: "WHERE state = 'SP' OR state = 'RJ'",
          explanation: 'IN is shorthand for a list of OR comparisons on one column.'
        },
        {
          id: 'foundations-where-q3',
          prompt: 'Is BETWEEN 100 AND 200 inclusive?',
          options: [
            'Yes, both 100 and 200 are kept',
            'No, both bounds are excluded',
            'Only the lower bound is included',
            'Only the upper bound is included'
          ],
          answer: 'Yes, both 100 and 200 are kept',
          explanation: 'BETWEEN a AND b means value >= a AND value <= b.'
        },
        {
          id: 'foundations-where-q4',
          prompt: 'Which pattern finds every city name starting with rio?',
          options: ["LIKE 'rio%'", "LIKE '%rio'", "LIKE '_rio'", "= 'rio%'"],
          answer: "LIKE 'rio%'",
          explanation: 'A trailing % allows any characters after the prefix.'
        },
        {
          id: 'foundations-where-q5',
          prompt: 'Which query returns orders that are not delivered?',
          options: [
            "SELECT * FROM orders WHERE order_status <> 'delivered';",
            "SELECT * FROM orders WHERE order_status = NOT 'delivered';",
            'SELECT * FROM orders WHERE NOT order_status;',
            'SELECT * FROM orders WHERE order_status != delivered;'
          ],
          answer: "SELECT * FROM orders WHERE order_status <> 'delivered';",
          explanation: 'The not-equal operator is <> or !=, and text literals need quotes.'
        },
        {
          id: 'foundations-where-q6',
          prompt: 'Which rows survive a WHERE clause that combines two conditions with AND?',
          options: [
            'Only rows where both conditions are true',
            'Rows where at least one condition is true',
            'All rows, AND only affects sorting',
            'Rows where exactly one condition is true'
          ],
          answer: 'Only rows where both conditions are true',
          explanation: 'AND is a logical conjunction; OR keeps rows matching either side.'
        }
      ]
    },
    {
      id: 'foundations-nulls',
      title: 'Lesson 5 - Missing values: NULL, empty text and COALESCE',
      goal: 'Recognise missing data, test for it correctly and substitute a default value.',
      tables: ['orders', 'order_reviews'],
      blocks: [
        {
          kind: 'text',
          text: 'NULL means unknown. It is not zero and not an empty string. Any comparison with NULL returns NULL, which is why NULL = NULL is never true.'
        },
        {
          kind: 'sql',
          title: 'Orders that were never delivered to the customer',
          sql: "SELECT order_id, order_status, order_delivered_customer_date\nFROM orders\nWHERE order_delivered_customer_date IS NULL\n   OR order_delivered_customer_date = ''\nLIMIT 20;",
          explanation: 'CSV imports produce both real NULLs and empty strings, so a robust filter checks for both.',
          breakdown: [
            { part: 'IS NULL', meaning: 'The only correct way to test for a missing value; = NULL never matches.' },
            { part: "OR order_delivered_customer_date = ''", meaning: 'Also catch cells that were imported as empty text.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Replace missing text with a default',
          sql: "SELECT review_id,\n       COALESCE(NULLIF(review_comment_title, ''), 'no title') AS title\nFROM order_reviews\nLIMIT 20;",
          explanation: 'NULLIF turns an empty string into NULL, and COALESCE returns the first argument that is not NULL.',
          breakdown: [
            { part: "NULLIF(review_comment_title, '')", meaning: 'Return NULL when the title is an empty string, otherwise the title.' },
            { part: "COALESCE(..., 'no title')", meaning: 'Return the first non-NULL argument, so missing titles become the text no title.' }
          ]
        },
        {
          kind: 'note',
          text: 'Aggregates such as COUNT(column) and AVG(column) silently skip NULLs, while COUNT(*) counts rows regardless.'
        }
      ],
      practice: {
        task: 'Count how many orders have no delivery date recorded.',
        hint: 'COUNT(*) with the IS NULL or empty string filter.',
        solution: "SELECT COUNT(*) AS missing_delivery_date\nFROM orders\nWHERE order_delivered_customer_date IS NULL\n   OR order_delivered_customer_date = '';"
      },
      questions: [
        {
          id: 'foundations-nulls-q1',
          prompt: 'How do you test whether a column has no value?',
          options: ['WHERE column IS NULL', 'WHERE column = NULL', 'WHERE column == NULL', 'WHERE NULL(column)'],
          answer: 'WHERE column IS NULL',
          explanation: 'Comparing anything with NULL using = yields NULL, which is not true, so the row never matches.'
        },
        {
          id: 'foundations-nulls-q2',
          prompt: 'What does COALESCE(a, b, c) return?',
          options: [
            'The first argument that is not NULL',
            'The last argument that is not NULL',
            'The sum of the arguments',
            'NULL if any argument is NULL'
          ],
          answer: 'The first argument that is not NULL',
          explanation: 'COALESCE scans its arguments left to right and returns the first non-NULL one.'
        },
        {
          id: 'foundations-nulls-q3',
          prompt: "What does NULLIF(x, '') do?",
          options: [
            'Returns NULL when x is an empty string, otherwise x',
            'Returns an empty string when x is NULL',
            'Removes rows where x is empty',
            'Always returns NULL'
          ],
          answer: 'Returns NULL when x is an empty string, otherwise x',
          explanation: 'NULLIF(a, b) returns NULL when a equals b, otherwise a.'
        },
        {
          id: 'foundations-nulls-q4',
          prompt: 'Is NULL the same as 0 or an empty string?',
          options: [
            'No, NULL means the value is unknown',
            'Yes, NULL equals 0 for numbers',
            'Yes, NULL equals an empty string for text',
            'Only inside aggregates'
          ],
          answer: 'No, NULL means the value is unknown',
          explanation: 'Zero and the empty string are known values; NULL is the absence of one.'
        },
        {
          id: 'foundations-nulls-q5',
          prompt: 'Which aggregate ignores NULL values in the column it receives?',
          options: ['COUNT(column)', 'COUNT(*)', 'Neither of them', 'Both count NULLs the same way'],
          answer: 'COUNT(column)',
          explanation: 'COUNT(column) counts non-NULL values, while COUNT(*) counts rows.'
        },
        {
          id: 'foundations-nulls-q6',
          prompt: 'Why does the delivery filter also compare with an empty string?',
          options: [
            'Because a CSV import can produce empty text instead of NULL',
            'Because SQLite converts NULL to an empty string',
            'Because IS NULL does not work on TEXT columns',
            'Because empty strings are faster to compare'
          ],
          answer: 'Because a CSV import can produce empty text instead of NULL',
          explanation: 'Missing cells in the Olist CSVs land as empty strings, so both checks are needed.'
        }
      ]
    },
    {
      id: 'foundations-types',
      title: 'Lesson 6 - Everything is TEXT: data types and CAST',
      goal: 'Understand SQLite storage classes and convert text columns to numbers before doing arithmetic.',
      tables: ['order_items', 'order_payments'],
      blocks: [
        {
          kind: 'text',
          text: 'SQLearner imports every CSV column as TEXT, exactly as the file provides it. That keeps the import lossless, but it means you convert values yourself before comparing or summing them.'
        },
        {
          kind: 'sql',
          title: 'See how a value is stored',
          sql: 'SELECT price, typeof(price) AS stored_as, CAST(price AS REAL) AS as_number\nFROM order_items\nLIMIT 5;',
          explanation: 'typeof reports the storage class of a value; CAST converts it for the duration of the query.',
          breakdown: [
            { part: 'typeof(price)', meaning: 'Returns text, integer, real, blob or null for the stored value.' },
            { part: 'CAST(price AS REAL)', meaning: 'Interprets the text as a floating point number.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Text sorting versus numeric sorting',
          sql: 'SELECT price\nFROM order_items\nORDER BY price DESC\nLIMIT 5;',
          explanation: 'Run this, then run it again with ORDER BY CAST(price AS REAL) DESC and compare - the text version puts 99.90 above 1000.00.',
          breakdown: [
            { part: 'ORDER BY price DESC', meaning: 'Sorts the TEXT column character by character, so 9 beats 1.' }
          ]
        },
        {
          kind: 'note',
          text: 'CAST(x AS INTEGER) truncates towards zero, so CAST(9.99 AS INTEGER) is 9. Use ROUND when you want the nearest value.'
        }
      ],
      practice: {
        task: 'Return the payment_value column as a number rounded to two decimals.',
        hint: 'Combine ROUND and CAST.',
        solution: 'SELECT payment_value,\n       ROUND(CAST(payment_value AS REAL), 2) AS value_number\nFROM order_payments\nLIMIT 10;'
      },
      questions: [
        {
          id: 'foundations-types-q1',
          prompt: 'How are the Olist columns stored in this database?',
          options: ['All as TEXT', 'Numbers as REAL and dates as DATE', 'All as BLOB', 'SQLite decides per row'],
          answer: 'All as TEXT',
          explanation: 'The CSV importer creates every column with the TEXT type.'
        },
        {
          id: 'foundations-types-q2',
          prompt: 'What does this expression return?',
          code: "SELECT CAST('19.90' AS REAL) + 10;",
          options: ['29.9', "'19.9010'", '10', 'An error'],
          answer: '29.9',
          explanation: 'The cast turns the text into the number 19.9, then the addition is numeric.'
        },
        {
          id: 'foundations-types-q3',
          prompt: 'Why can sorting a TEXT price column give the wrong ranking?',
          options: [
            "Because text is compared character by character, so '9.9' sorts above '100'",
            'Because TEXT columns cannot be sorted at all',
            'Because ORDER BY ignores TEXT columns',
            'Because the prices contain commas'
          ],
          answer: "Because text is compared character by character, so '9.9' sorts above '100'",
          explanation: 'Lexicographic comparison looks at the first character first.'
        },
        {
          id: 'foundations-types-q4',
          prompt: 'What does typeof(price) return in this database?',
          options: ['text', 'real', 'integer', 'null'],
          answer: 'text',
          explanation: 'Values were inserted as strings, so the storage class is text.'
        },
        {
          id: 'foundations-types-q5',
          prompt: 'What is CAST(9.99 AS INTEGER)?',
          options: ['9', '10', '9.99', 'An error'],
          answer: '9',
          explanation: 'Casting to INTEGER truncates toward zero rather than rounding.'
        },
        {
          id: 'foundations-types-q6',
          prompt: 'Which expression rounds a text price to two decimal places?',
          options: [
            'ROUND(CAST(price AS REAL), 2)',
            'ROUND(price, 2, REAL)',
            'CAST(ROUND(price) AS 2)',
            'price::REAL'
          ],
          answer: 'ROUND(CAST(price AS REAL), 2)',
          explanation: 'Cast first so ROUND receives a number, then give ROUND the number of decimals.'
        }
      ]
    },
    {
      id: 'foundations-distinct',
      title: 'Lesson 7 - DISTINCT values and calculated columns',
      goal: 'Remove duplicate rows from a result and build new columns with arithmetic and string expressions.',
      tables: ['orders', 'order_items', 'customers'],
      blocks: [
        {
          kind: 'sql',
          title: 'The vocabulary of a column',
          sql: 'SELECT DISTINCT order_status\nFROM orders\nORDER BY order_status;',
          explanation: 'DISTINCT removes duplicate rows from the result, which is the quickest way to learn which values a column actually uses.',
          breakdown: [
            { part: 'DISTINCT order_status', meaning: 'Return each status value once, no matter how many orders use it.' },
            { part: 'ORDER BY order_status', meaning: 'Sort the vocabulary alphabetically.' }
          ]
        },
        {
          kind: 'text',
          text: 'DISTINCT applies to the whole result row, not to a single column. SELECT DISTINCT customer_city, customer_state returns unique city and state pairs.'
        },
        {
          kind: 'sql',
          title: 'A calculated column',
          sql: 'SELECT order_id,\n       CAST(price AS REAL) AS price,\n       CAST(freight_value AS REAL) AS freight,\n       ROUND(CAST(price AS REAL) + CAST(freight_value AS REAL), 2) AS item_total\nFROM order_items\nLIMIT 10;',
          explanation: 'Any expression can appear in the SELECT list and the result behaves like a normal column.',
          breakdown: [
            { part: 'CAST(price AS REAL) + CAST(freight_value AS REAL)', meaning: 'Add the two numeric values together per row.' },
            { part: 'ROUND(..., 2)', meaning: 'Round the sum to two decimals so it reads like money.' },
            { part: 'AS item_total', meaning: 'Give the calculated column a name.' }
          ]
        },
        {
          kind: 'note',
          text: "The || operator concatenates text, so customer_city || ', ' || customer_state produces sao paulo, SP."
        }
      ],
      practice: {
        task: 'List the unique customer states, sorted alphabetically.',
        hint: 'DISTINCT plus ORDER BY.',
        solution: 'SELECT DISTINCT customer_state\nFROM customers\nORDER BY customer_state;'
      },
      questions: [
        {
          id: 'foundations-distinct-q1',
          prompt: 'What does SELECT DISTINCT order_status FROM orders return?',
          options: [
            'Each status value once',
            'The number of orders per status',
            'All orders sorted by status',
            'Only the most frequent status'
          ],
          answer: 'Each status value once',
          explanation: 'DISTINCT collapses duplicate result rows.'
        },
        {
          id: 'foundations-distinct-q2',
          prompt: 'What does DISTINCT apply to when you select two columns?',
          options: [
            'The combination of both columns',
            'Only the first column',
            'Only the second column',
            'Each column separately'
          ],
          answer: 'The combination of both columns',
          explanation: 'DISTINCT deduplicates whole result rows.'
        },
        {
          id: 'foundations-distinct-q3',
          prompt: 'Which operator joins two text values in SQLite?',
          options: ['||', '+', 'CONCAT', '&'],
          answer: '||',
          explanation: 'SQLite uses || for string concatenation; + is numeric addition.'
        },
        {
          id: 'foundations-distinct-q4',
          prompt: 'What is the result column called?',
          code: 'SELECT ROUND(CAST(price AS REAL), 2) AS clean_price FROM order_items;',
          options: ['clean_price', 'price', 'ROUND', 'CAST'],
          answer: 'clean_price',
          explanation: 'The alias names the calculated column.'
        },
        {
          id: 'foundations-distinct-q5',
          prompt: 'Which query gives every unique city and state pair of customers?',
          options: [
            'SELECT DISTINCT customer_city, customer_state FROM customers;',
            'SELECT customer_city, DISTINCT customer_state FROM customers;',
            'SELECT DISTINCT(customer_city), customer_state FROM customers;',
            'SELECT customer_city, customer_state DISTINCT FROM customers;'
          ],
          answer: 'SELECT DISTINCT customer_city, customer_state FROM customers;',
          explanation: 'DISTINCT is written once, directly after SELECT.'
        },
        {
          id: 'foundations-distinct-q6',
          prompt: 'Can a calculated column be used in the ORDER BY of the same query?',
          options: [
            'Yes, you can sort by its alias',
            'No, aliases are invisible to ORDER BY',
            'Only if you repeat the whole expression',
            'Only inside a subquery'
          ],
          answer: 'Yes, you can sort by its alias',
          explanation: 'ORDER BY is evaluated after the SELECT list, so its aliases are available.'
        }
      ]
    }
  ]
}
