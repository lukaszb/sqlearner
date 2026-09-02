import type { CourseModule } from '../types.js'

export const aggregationModule: CourseModule = {
  id: 'aggregation',
  level: 'basics',
  title: 'Aggregation: summarising data',
  description:
    'Turn thousands of rows into a handful of numbers. Count, sum and average values, split the result into groups with GROUP BY, filter those groups with HAVING, and shape values with CASE WHEN and the SQLite date and text functions.',
  lessons: [
    {
      id: 'aggregation-count',
      title: 'Lesson 1 - Counting rows with COUNT',
      goal: 'Count rows, count non-empty values and count distinct values in a single table.',
      tables: ['orders', 'customers', 'order_items'],
      blocks: [
        {
          kind: 'text',
          text: 'An aggregate function reads many rows and returns one value. COUNT is the simplest of them: it answers the question how many. Without GROUP BY, an aggregate collapses the whole table into a single result row.'
        },
        {
          kind: 'sql',
          title: 'Count every row in a table',
          sql: 'SELECT COUNT(*) AS order_count\nFROM orders;',
          explanation: 'COUNT(*) counts rows and never looks at the values inside them, so it is the honest answer to how big is this table.',
          breakdown: [
            { part: 'SELECT COUNT(*)', meaning: 'Count the rows that survive the FROM and WHERE clauses.' },
            { part: 'AS order_count', meaning: 'Give the single output column a readable name.' },
            { part: 'FROM orders', meaning: 'Read the rows of the orders table.' }
          ]
        },
        {
          kind: 'note',
          text: 'COUNT(*) counts rows. COUNT(column) counts rows where that column is not NULL. The two differ whenever a column has missing values, which is common in the delivery timestamp columns.'
        },
        {
          kind: 'sql',
          title: 'Count rows, filled values and distinct values together',
          sql: 'SELECT\n  COUNT(*) AS rows_total,\n  COUNT(order_delivered_customer_date) AS delivered_known,\n  COUNT(DISTINCT customer_id) AS distinct_customers\nFROM orders;',
          explanation: 'Three aggregates in one SELECT read the same table once and return three numbers side by side.',
          breakdown: [
            { part: 'COUNT(*) AS rows_total', meaning: 'The number of rows in the table.' },
            { part: 'COUNT(order_delivered_customer_date) AS delivered_known', meaning: 'The number of rows where the delivery date is not NULL.' },
            { part: 'COUNT(DISTINCT customer_id) AS distinct_customers', meaning: 'The number of different customer_id values, counting repeats once.' },
            { part: 'FROM orders', meaning: 'All three aggregates read the orders table.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Count only the rows that match a condition',
          sql: "SELECT COUNT(*) AS delivered_orders\nFROM orders\nWHERE order_status = 'delivered';",
          explanation: 'WHERE runs before the aggregate, so COUNT only sees the rows that passed the filter.',
          breakdown: [
            { part: 'SELECT COUNT(*) AS delivered_orders', meaning: 'Count whatever rows reach the aggregate.' },
            { part: 'FROM orders', meaning: 'Start from every row of orders.' },
            { part: "WHERE order_status = 'delivered'", meaning: 'Keep only delivered orders before counting them.' }
          ]
        },
        {
          kind: 'list',
          title: 'The order SQLite works in',
          items: [
            'FROM picks the table.',
            'WHERE throws away rows one at a time.',
            'The aggregate function then summarises the rows that survived.',
            'SELECT names and aliases the output columns.'
          ]
        }
      ],
      practice: {
        task: 'Count how many different cities appear in the customers table.',
        hint: 'Put DISTINCT inside COUNT, in front of the column name.',
        solution: 'SELECT COUNT(DISTINCT customer_city) AS city_count\nFROM customers;'
      },
      questions: [
        {
          id: 'aggregation-count-q1',
          prompt: 'What does COUNT(*) return?',
          options: [
            'The number of rows',
            'The number of columns',
            'The number of non-NULL values in the first column',
            'The number of distinct rows'
          ],
          answer: 'The number of rows',
          explanation: 'COUNT(*) counts rows without inspecting any value.'
        },
        {
          id: 'aggregation-count-q2',
          prompt: 'What does this query return?',
          code: 'SELECT COUNT(order_approved_at) FROM orders;',
          options: [
            'The number of orders where order_approved_at is not NULL',
            'The number of rows in orders',
            'The number of distinct approval timestamps',
            'The latest approval timestamp'
          ],
          answer: 'The number of orders where order_approved_at is not NULL',
          explanation: 'COUNT of a column skips NULL values, so it counts filled values only.'
        },
        {
          id: 'aggregation-count-q3',
          prompt: 'Which query counts how many different sellers appear in order_items?',
          options: [
            'SELECT COUNT(DISTINCT seller_id) FROM order_items;',
            'SELECT DISTINCT COUNT(seller_id) FROM order_items;',
            'SELECT COUNT(*) FROM order_items;',
            'SELECT COUNT(seller_id) FROM order_items;'
          ],
          answer: 'SELECT COUNT(DISTINCT seller_id) FROM order_items;',
          explanation: 'DISTINCT belongs inside COUNT so repeated seller ids are counted once.'
        },
        {
          id: 'aggregation-count-q4',
          prompt: 'Spot the mistake in this query.',
          code: "SELECT COUNT(*) FROM orders WHERE COUNT(*) > 10;",
          options: [
            'WHERE cannot contain an aggregate function',
            'COUNT(*) needs a column name',
            'The table name is wrong',
            'The query needs a LIMIT clause'
          ],
          answer: 'WHERE cannot contain an aggregate function',
          explanation: 'WHERE filters individual rows before aggregation, so an aggregate has no meaning there.'
        },
        {
          id: 'aggregation-count-q5',
          prompt: 'Why can COUNT(*) and COUNT(order_delivered_customer_date) give different answers on orders?',
          options: [
            'Because some orders have no delivery date stored',
            'Because COUNT(*) ignores duplicate rows',
            'Because COUNT(*) only counts delivered orders',
            'Because the column is stored as TEXT'
          ],
          answer: 'Because some orders have no delivery date stored',
          explanation: 'Orders that were cancelled or are still shipping have a NULL delivery date, which COUNT of that column skips.'
        },
        {
          id: 'aggregation-count-q6',
          prompt: 'Which clause decides which rows the COUNT will see?',
          options: ['WHERE', 'SELECT', 'ORDER BY', 'LIMIT'],
          answer: 'WHERE',
          explanation: 'WHERE runs before aggregation, so it controls the rows that reach COUNT.'
        }
      ]
    },
    {
      id: 'aggregation-math',
      title: 'Lesson 2 - SUM, AVG, MIN and MAX',
      goal: 'Add up, average and bracket numeric columns, remembering that every column in this database is stored as TEXT.',
      tables: ['order_items', 'order_payments', 'order_reviews'],
      blocks: [
        {
          kind: 'text',
          text: 'SUM adds values, AVG returns their mean, MIN and MAX return the smallest and largest. They all ignore NULL values, so a missing value lowers neither the sum nor the average denominator.'
        },
        {
          kind: 'note',
          text: 'The importer stored every column as TEXT. Text sorts alphabetically, so MAX on a raw price column would rank the string 9 above the string 100. Always wrap a numeric column in CAST(column AS REAL) before doing maths with it.'
        },
        {
          kind: 'sql',
          title: 'Total and average item price',
          sql: 'SELECT\n  SUM(CAST(price AS REAL)) AS revenue,\n  AVG(CAST(price AS REAL)) AS average_price,\n  COUNT(*) AS item_count\nFROM order_items;',
          explanation: 'CAST turns the stored text into a real number so SUM and AVG do arithmetic instead of string handling.',
          breakdown: [
            { part: 'CAST(price AS REAL)', meaning: 'Convert the TEXT price into a floating point number.' },
            { part: 'SUM(...) AS revenue', meaning: 'Add every converted price into one total.' },
            { part: 'AVG(...) AS average_price', meaning: 'Divide that total by the number of non-NULL prices.' },
            { part: 'COUNT(*) AS item_count', meaning: 'Report how many rows produced those numbers.' },
            { part: 'FROM order_items', meaning: 'One row per product line inside an order.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Cheapest and most expensive item',
          sql: 'SELECT\n  MIN(CAST(price AS REAL)) AS cheapest,\n  MAX(CAST(price AS REAL)) AS most_expensive,\n  ROUND(AVG(CAST(freight_value AS REAL)), 2) AS average_freight\nFROM order_items;',
          explanation: 'MIN and MAX bracket the range of a column, and ROUND trims a long average to a readable number of decimals.',
          breakdown: [
            { part: 'MIN(CAST(price AS REAL))', meaning: 'The smallest numeric price in the table.' },
            { part: 'MAX(CAST(price AS REAL))', meaning: 'The largest numeric price in the table.' },
            { part: 'AVG(CAST(freight_value AS REAL))', meaning: 'The mean shipping cost per item line.' },
            { part: 'ROUND(..., 2)', meaning: 'Round that mean to two decimal places.' },
            { part: 'FROM order_items', meaning: 'Read every item line in the database.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Aggregate a filtered slice',
          sql: "SELECT\n  COUNT(*) AS card_payments,\n  ROUND(SUM(CAST(payment_value AS REAL)), 2) AS card_total\nFROM order_payments\nWHERE payment_type = 'credit_card';",
          explanation: 'Filtering first and aggregating second is the standard shape of a business question about one segment.',
          breakdown: [
            { part: 'FROM order_payments', meaning: 'One row per payment attached to an order.' },
            { part: "WHERE payment_type = 'credit_card'", meaning: 'Keep only the credit card payments.' },
            { part: 'COUNT(*) AS card_payments', meaning: 'How many such payments exist.' },
            { part: 'ROUND(SUM(CAST(payment_value AS REAL)), 2) AS card_total', meaning: 'Their total value, converted to a number and rounded.' }
          ]
        },
        {
          kind: 'list',
          title: 'Things worth remembering',
          items: [
            'SUM, AVG, MIN and MAX skip NULL values instead of treating them as zero.',
            'AVG divides by the count of non-NULL values, not by the number of rows.',
            'Without CAST, comparisons and MIN/MAX follow alphabetical text order.',
            'ROUND(value, 2) is the usual finishing touch on money columns.'
          ]
        }
      ],
      practice: {
        task: 'Return the average review score in order_reviews, rounded to two decimals.',
        hint: 'CAST review_score to REAL inside AVG, then wrap the whole thing in ROUND.',
        solution: 'SELECT ROUND(AVG(CAST(review_score AS REAL)), 2) AS average_score\nFROM order_reviews;'
      },
      questions: [
        {
          id: 'aggregation-math-q1',
          prompt: 'Why does this database need CAST before doing arithmetic?',
          options: [
            'Every column was imported as TEXT',
            'SQLite has no numeric types',
            'SUM only accepts integers',
            'The prices contain currency symbols'
          ],
          answer: 'Every column was imported as TEXT',
          explanation: 'The CSV importer stored all columns as TEXT, so numbers must be converted before maths.'
        },
        {
          id: 'aggregation-math-q2',
          prompt: 'How does AVG treat NULL values?',
          options: [
            'It ignores them entirely',
            'It counts them as zero',
            'It returns NULL for the whole column',
            'It replaces them with the column minimum'
          ],
          answer: 'It ignores them entirely',
          explanation: 'NULL rows are excluded from both the sum and the divisor of an average.'
        },
        {
          id: 'aggregation-math-q3',
          prompt: 'What does this query return?',
          code: 'SELECT MAX(CAST(payment_value AS REAL)) FROM order_payments;',
          options: [
            'The largest single payment value',
            'The total of all payment values',
            'The number of payments',
            'The most common payment value'
          ],
          answer: 'The largest single payment value',
          explanation: 'MAX returns the biggest value of the converted column.'
        },
        {
          id: 'aggregation-math-q4',
          prompt: 'Spot the mistake in this query.',
          code: 'SELECT SUM(price, freight_value) FROM order_items;',
          options: [
            'SUM takes one expression, so it should be SUM(CAST(price AS REAL) + CAST(freight_value AS REAL))',
            'SUM cannot be used on order_items',
            'The query is missing a GROUP BY clause',
            'SUM must always be wrapped in ROUND'
          ],
          answer: 'SUM takes one expression, so it should be SUM(CAST(price AS REAL) + CAST(freight_value AS REAL))',
          explanation: 'Aggregates take a single expression; add the two columns inside the call.'
        },
        {
          id: 'aggregation-math-q5',
          prompt: 'Which query answers what is the total amount customers paid by boleto?',
          options: [
            "SELECT SUM(CAST(payment_value AS REAL)) FROM order_payments WHERE payment_type = 'boleto';",
            "SELECT COUNT(*) FROM order_payments WHERE payment_type = 'boleto';",
            "SELECT AVG(CAST(payment_value AS REAL)) FROM order_payments;",
            "SELECT SUM(payment_type) FROM order_payments;"
          ],
          answer: "SELECT SUM(CAST(payment_value AS REAL)) FROM order_payments WHERE payment_type = 'boleto';",
          explanation: 'Filter to the payment type first, then sum the converted payment value.'
        },
        {
          id: 'aggregation-math-q6',
          prompt: 'What does ROUND(AVG(CAST(price AS REAL)), 2) do?',
          options: [
            'Averages the numeric prices and keeps two decimal places',
            'Rounds every price before averaging them',
            'Returns the two largest prices',
            'Converts the average into text'
          ],
          answer: 'Averages the numeric prices and keeps two decimal places',
          explanation: 'The inner AVG runs first and ROUND then trims its result to two decimals.'
        }
      ]
    },
    {
      id: 'aggregation-group-by',
      title: 'Lesson 3 - GROUP BY: one row per category',
      goal: 'Split a table into groups and return one summary row for each group.',
      tables: ['orders', 'customers', 'order_payments'],
      blocks: [
        {
          kind: 'text',
          text: 'GROUP BY takes the rows that survived WHERE, sorts them into buckets that share the same value, and runs the aggregate once per bucket. The result has one row per distinct group instead of one row for the whole table.'
        },
        {
          kind: 'sql',
          title: 'Count orders per status',
          sql: 'SELECT\n  order_status,\n  COUNT(*) AS order_count\nFROM orders\nGROUP BY order_status\nORDER BY order_count DESC;',
          explanation: 'One bucket is created per distinct order_status and COUNT reports how many rows landed in each.',
          breakdown: [
            { part: 'SELECT order_status', meaning: 'Show the value that defines each group.' },
            { part: 'COUNT(*) AS order_count', meaning: 'Count the rows inside the current group.' },
            { part: 'FROM orders', meaning: 'Read every order.' },
            { part: 'GROUP BY order_status', meaning: 'Put rows that share a status into the same bucket.' },
            { part: 'ORDER BY order_count DESC', meaning: 'Sort the summary rows from the largest group down.' }
          ]
        },
        {
          kind: 'note',
          text: 'Any column in the SELECT list that is not wrapped in an aggregate should also appear in GROUP BY. SQLite tolerates breaking this rule and picks an arbitrary row, which produces answers that look right and are not.'
        },
        {
          kind: 'sql',
          title: 'Group by more than one column',
          sql: 'SELECT\n  customer_state,\n  customer_city,\n  COUNT(*) AS customer_count\nFROM customers\nGROUP BY customer_state, customer_city\nORDER BY customer_count DESC\nLIMIT 10;',
          explanation: 'Listing two columns in GROUP BY creates one bucket per combination of state and city.',
          breakdown: [
            { part: 'GROUP BY customer_state, customer_city', meaning: 'A group is one distinct pair of state and city.' },
            { part: 'SELECT customer_state, customer_city', meaning: 'Both grouping columns are shown so each row is identifiable.' },
            { part: 'COUNT(*) AS customer_count', meaning: 'How many customers fall in that city.' },
            { part: 'ORDER BY customer_count DESC', meaning: 'Biggest cities first.' },
            { part: 'LIMIT 10', meaning: 'Keep only the top ten summary rows.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Filter rows, then group them',
          sql: "SELECT\n  payment_type,\n  COUNT(*) AS payment_count,\n  ROUND(AVG(CAST(payment_value AS REAL)), 2) AS average_value\nFROM order_payments\nWHERE CAST(payment_value AS REAL) > 0\nGROUP BY payment_type\nORDER BY average_value DESC;",
          explanation: 'WHERE removes unwanted rows before the buckets are formed, so zero-value payments never influence any group.',
          breakdown: [
            { part: 'FROM order_payments', meaning: 'One row per payment.' },
            { part: 'WHERE CAST(payment_value AS REAL) > 0', meaning: 'Drop zero and empty payments before grouping.' },
            { part: 'GROUP BY payment_type', meaning: 'One bucket per payment method.' },
            { part: 'COUNT(*) AS payment_count', meaning: 'How many payments used that method.' },
            { part: 'ROUND(AVG(CAST(payment_value AS REAL)), 2) AS average_value', meaning: 'The mean payment value in that bucket, rounded.' },
            { part: 'ORDER BY average_value DESC', meaning: 'Show the most valuable methods first.' }
          ]
        },
        {
          kind: 'list',
          title: 'Clause order in a grouped query',
          items: [
            'FROM chooses the table.',
            'WHERE filters individual rows.',
            'GROUP BY forms the buckets.',
            'The aggregates run once per bucket.',
            'ORDER BY and LIMIT arrange and trim the summary rows.'
          ]
        }
      ],
      practice: {
        task: 'Return the number of customers in each state, biggest state first.',
        hint: 'Group the customers table by customer_state and count the rows in each group.',
        solution: 'SELECT\n  customer_state,\n  COUNT(*) AS customer_count\nFROM customers\nGROUP BY customer_state\nORDER BY customer_count DESC;'
      },
      questions: [
        {
          id: 'aggregation-group-by-q1',
          prompt: 'How many rows does a GROUP BY query return?',
          options: [
            'One row per distinct group',
            'One row in total',
            'One row per row in the table',
            'One row per column in the SELECT list'
          ],
          answer: 'One row per distinct group',
          explanation: 'GROUP BY collapses each bucket of rows into a single summary row.'
        },
        {
          id: 'aggregation-group-by-q2',
          prompt: 'What does this query return?',
          code: 'SELECT customer_state, COUNT(*) FROM customers GROUP BY customer_state;',
          options: [
            'The number of customers in each state',
            'The number of states in the table',
            'The first customer of each state',
            'The total number of customers'
          ],
          answer: 'The number of customers in each state',
          explanation: 'Each state forms one bucket and COUNT reports its size.'
        },
        {
          id: 'aggregation-group-by-q3',
          prompt: 'Spot the mistake in this query.',
          code: 'SELECT payment_type, payment_value, COUNT(*) FROM order_payments GROUP BY payment_type;',
          options: [
            'payment_value is neither grouped nor aggregated',
            'COUNT(*) cannot be used with GROUP BY',
            'GROUP BY must come before FROM',
            'payment_type has to be aggregated'
          ],
          answer: 'payment_value is neither grouped nor aggregated',
          explanation: 'A bare column outside the GROUP BY list makes SQLite pick an arbitrary row from each bucket.'
        },
        {
          id: 'aggregation-group-by-q4',
          prompt: 'Which clause creates the buckets that the aggregate functions summarise?',
          options: ['GROUP BY', 'WHERE', 'ORDER BY', 'SELECT'],
          answer: 'GROUP BY',
          explanation: 'GROUP BY defines the groups; the aggregate then runs once per group.'
        },
        {
          id: 'aggregation-group-by-q5',
          prompt: 'What does GROUP BY customer_state, customer_city group on?',
          options: [
            'Each distinct combination of state and city',
            'State only, with city shown for information',
            'City only, ignoring the state',
            'Each row separately'
          ],
          answer: 'Each distinct combination of state and city',
          explanation: 'Multiple grouping columns create one bucket per combination of their values.'
        },
        {
          id: 'aggregation-group-by-q6',
          prompt: 'Which query answers how many orders exist for each order status?',
          options: [
            'SELECT order_status, COUNT(*) FROM orders GROUP BY order_status;',
            'SELECT order_status, COUNT(*) FROM orders;',
            'SELECT COUNT(DISTINCT order_status) FROM orders;',
            'SELECT order_status FROM orders GROUP BY COUNT(*);'
          ],
          answer: 'SELECT order_status, COUNT(*) FROM orders GROUP BY order_status;',
          explanation: 'Grouping by the status column returns one counted row per status.'
        }
      ]
    },
    {
      id: 'aggregation-having',
      title: 'Lesson 4 - Filtering groups with HAVING',
      goal: 'Keep only the groups that satisfy a condition on their aggregated values.',
      tables: ['customers', 'order_items', 'order_reviews'],
      blocks: [
        {
          kind: 'text',
          text: 'WHERE filters rows before they are grouped. HAVING filters the summary rows after the aggregates have been computed. If the condition mentions COUNT, SUM or AVG, it belongs in HAVING.'
        },
        {
          kind: 'sql',
          title: 'Keep only the busy cities',
          sql: 'SELECT\n  customer_city,\n  COUNT(*) AS customer_count\nFROM customers\nGROUP BY customer_city\nHAVING COUNT(*) >= 500\nORDER BY customer_count DESC;',
          explanation: 'Every city is grouped and counted first, and HAVING then discards the groups with fewer than 500 customers.',
          breakdown: [
            { part: 'FROM customers', meaning: 'Read every customer row.' },
            { part: 'GROUP BY customer_city', meaning: 'One bucket per city.' },
            { part: 'COUNT(*) AS customer_count', meaning: 'The size of each bucket.' },
            { part: 'HAVING COUNT(*) >= 500', meaning: 'Drop the buckets whose count is below 500.' },
            { part: 'ORDER BY customer_count DESC', meaning: 'Sort the surviving cities from largest to smallest.' }
          ]
        },
        {
          kind: 'sql',
          title: 'WHERE and HAVING in the same query',
          sql: "SELECT\n  seller_id,\n  COUNT(*) AS item_count,\n  ROUND(SUM(CAST(price AS REAL)), 2) AS revenue\nFROM order_items\nWHERE CAST(price AS REAL) >= 100\nGROUP BY seller_id\nHAVING COUNT(*) >= 20\nORDER BY revenue DESC\nLIMIT 10;",
          explanation: 'The two filters do different jobs: WHERE removes cheap item lines, HAVING removes sellers who sold too few of the remaining ones.',
          breakdown: [
            { part: 'FROM order_items', meaning: 'One row per product line sold.' },
            { part: 'WHERE CAST(price AS REAL) >= 100', meaning: 'Keep only item lines of 100 or more before grouping.' },
            { part: 'GROUP BY seller_id', meaning: 'One bucket per seller.' },
            { part: 'COUNT(*) AS item_count', meaning: 'How many qualifying lines that seller has.' },
            { part: 'ROUND(SUM(CAST(price AS REAL)), 2) AS revenue', meaning: 'The revenue from those lines, rounded.' },
            { part: 'HAVING COUNT(*) >= 20', meaning: 'Keep only sellers with at least twenty qualifying lines.' },
            { part: 'ORDER BY revenue DESC', meaning: 'Rank the surviving sellers by revenue.' },
            { part: 'LIMIT 10', meaning: 'Return the top ten of them.' }
          ]
        },
        {
          kind: 'note',
          text: 'HAVING may reuse a SELECT alias in SQLite, so HAVING item_count >= 20 also works. Repeating the aggregate expression is portable to other databases, so it is the safer habit.'
        },
        {
          kind: 'sql',
          title: 'Filter on an average instead of a count',
          sql: 'SELECT\n  order_id,\n  COUNT(*) AS review_count,\n  ROUND(AVG(CAST(review_score AS REAL)), 2) AS average_score\nFROM order_reviews\nGROUP BY order_id\nHAVING AVG(CAST(review_score AS REAL)) < 2\nORDER BY average_score ASC;',
          explanation: 'HAVING can test any aggregate, not just COUNT, which makes it the tool for questions about weak or strong groups.',
          breakdown: [
            { part: 'GROUP BY order_id', meaning: 'One bucket per reviewed order.' },
            { part: 'AVG(CAST(review_score AS REAL))', meaning: 'The mean score of that order, converted from text.' },
            { part: 'HAVING AVG(CAST(review_score AS REAL)) < 2', meaning: 'Keep only orders whose mean score is under two.' },
            { part: 'ORDER BY average_score ASC', meaning: 'Show the worst rated orders first.' }
          ]
        },
        {
          kind: 'list',
          title: 'Choosing between WHERE and HAVING',
          items: [
            'Condition about one row, such as a status or a single price: WHERE.',
            'Condition about a whole group, such as COUNT(*) or AVG(...): HAVING.',
            'Both may appear in one query, and WHERE always runs first.',
            'HAVING without GROUP BY treats the whole table as one group.'
          ]
        }
      ],
      practice: {
        task: 'List the customer states that have more than 2000 customers, largest first.',
        hint: 'Group customers by state, count them, then filter the counts with HAVING.',
        solution: 'SELECT\n  customer_state,\n  COUNT(*) AS customer_count\nFROM customers\nGROUP BY customer_state\nHAVING COUNT(*) > 2000\nORDER BY customer_count DESC;'
      },
      questions: [
        {
          id: 'aggregation-having-q1',
          prompt: 'What is the difference between WHERE and HAVING?',
          options: [
            'WHERE filters rows before grouping, HAVING filters groups after aggregation',
            'HAVING filters rows and WHERE filters columns',
            'They are interchangeable',
            'HAVING runs before GROUP BY'
          ],
          answer: 'WHERE filters rows before grouping, HAVING filters groups after aggregation',
          explanation: 'The two clauses act at different stages of the query pipeline.'
        },
        {
          id: 'aggregation-having-q2',
          prompt: 'What does this query return?',
          code: 'SELECT customer_city, COUNT(*) FROM customers GROUP BY customer_city HAVING COUNT(*) > 100;',
          options: [
            'Only the cities with more than 100 customers, and their counts',
            'The first 100 cities and their counts',
            'Every city, with counts above 100 highlighted',
            'The number of cities with more than 100 customers'
          ],
          answer: 'Only the cities with more than 100 customers, and their counts',
          explanation: 'HAVING discards the groups whose count is 100 or less.'
        },
        {
          id: 'aggregation-having-q3',
          prompt: 'Spot the mistake in this query.',
          code: "SELECT seller_id, COUNT(*) FROM order_items WHERE COUNT(*) > 5 GROUP BY seller_id;",
          options: [
            'The COUNT(*) condition should be in HAVING, not WHERE',
            'GROUP BY should come before WHERE',
            'COUNT(*) cannot be selected and filtered at once',
            'seller_id must be aggregated'
          ],
          answer: 'The COUNT(*) condition should be in HAVING, not WHERE',
          explanation: 'WHERE runs before the groups exist, so it cannot test an aggregate.'
        },
        {
          id: 'aggregation-having-q4',
          prompt: 'Which clause would you use to keep only product categories whose average price is above 200?',
          options: ['HAVING', 'WHERE', 'ORDER BY', 'LIMIT'],
          answer: 'HAVING',
          explanation: 'An average is a property of the group, so it is tested in HAVING.'
        },
        {
          id: 'aggregation-having-q5',
          prompt: 'Which query answers which sellers have sold at least 50 item lines?',
          options: [
            'SELECT seller_id, COUNT(*) FROM order_items GROUP BY seller_id HAVING COUNT(*) >= 50;',
            'SELECT seller_id, COUNT(*) FROM order_items HAVING COUNT(*) >= 50;',
            'SELECT seller_id FROM order_items WHERE COUNT(*) >= 50;',
            'SELECT seller_id, COUNT(*) FROM order_items GROUP BY COUNT(*);'
          ],
          answer: 'SELECT seller_id, COUNT(*) FROM order_items GROUP BY seller_id HAVING COUNT(*) >= 50;',
          explanation: 'Group by seller, count the lines, then keep the groups that reach fifty.'
        },
        {
          id: 'aggregation-having-q6',
          prompt: 'In a query with WHERE, GROUP BY and HAVING, which runs first?',
          options: ['WHERE', 'HAVING', 'GROUP BY', 'They run at the same time'],
          answer: 'WHERE',
          explanation: 'Rows are filtered by WHERE, then grouped, and only then filtered again by HAVING.'
        }
      ]
    },
    {
      id: 'aggregation-case',
      title: 'Lesson 5 - CASE WHEN: conditional logic inside a query',
      goal: 'Label rows with your own categories and count or sum them conditionally.',
      tables: ['order_items', 'orders', 'order_reviews'],
      blocks: [
        {
          kind: 'text',
          text: 'CASE WHEN is the SQL version of if and else. It walks its conditions in order, returns the THEN value of the first one that is true, and falls back to ELSE when none match. It produces a value, so it can sit anywhere a column can.'
        },
        {
          kind: 'sql',
          title: 'Bucket item prices into bands',
          sql: "SELECT\n  CASE\n    WHEN CAST(price AS REAL) < 50 THEN 'budget'\n    WHEN CAST(price AS REAL) < 200 THEN 'mid'\n    ELSE 'premium'\n  END AS price_band,\n  COUNT(*) AS item_count\nFROM order_items\nGROUP BY price_band\nORDER BY item_count DESC;",
          explanation: 'The CASE expression invents a category column that does not exist in the table, and GROUP BY then summarises by it.',
          breakdown: [
            { part: "WHEN CAST(price AS REAL) < 50 THEN 'budget'", meaning: 'Items under 50 are labelled budget.' },
            { part: "WHEN CAST(price AS REAL) < 200 THEN 'mid'", meaning: 'Of the remaining items, those under 200 are labelled mid.' },
            { part: "ELSE 'premium'", meaning: 'Everything that matched no condition is labelled premium.' },
            { part: 'END AS price_band', meaning: 'Close the expression and name the invented column.' },
            { part: 'GROUP BY price_band', meaning: 'Create one bucket per label produced by the CASE.' },
            { part: 'COUNT(*) AS item_count', meaning: 'Count the item lines inside each band.' }
          ]
        },
        {
          kind: 'note',
          text: 'Conditions are tested top to bottom and the first match wins, so order them from the narrowest to the broadest. A CASE with no ELSE returns NULL when nothing matches.'
        },
        {
          kind: 'sql',
          title: 'Conditional counting with SUM and CASE',
          sql: "SELECT\n  COUNT(*) AS orders_total,\n  SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,\n  SUM(CASE WHEN order_status = 'canceled' THEN 1 ELSE 0 END) AS canceled\nFROM orders;",
          explanation: 'Putting a CASE inside SUM counts only the rows that match a condition, which lets several counts share one pass over the table.',
          breakdown: [
            { part: 'COUNT(*) AS orders_total', meaning: 'The size of the whole table.' },
            { part: "CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END", meaning: 'Yields 1 for a delivered order and 0 for anything else.' },
            { part: 'SUM(...) AS delivered', meaning: 'Adding those ones and zeros counts the delivered orders.' },
            { part: "SUM(CASE WHEN order_status = 'canceled' THEN 1 ELSE 0 END) AS canceled", meaning: 'The same trick for cancelled orders, in the same result row.' },
            { part: 'FROM orders', meaning: 'All three numbers come from a single scan of orders.' }
          ]
        },
        {
          kind: 'sql',
          title: 'A conditional share per group',
          sql: "SELECT\n  review_score,\n  COUNT(*) AS review_count,\n  ROUND(\n    100.0 * SUM(CASE WHEN review_comment_message IS NULL OR review_comment_message = '' THEN 1 ELSE 0 END) / COUNT(*),\n    1\n  ) AS pct_without_comment\nFROM order_reviews\nGROUP BY review_score\nORDER BY review_score;",
          explanation: 'Dividing a conditional sum by the group count turns a count into a percentage of the group.',
          breakdown: [
            { part: 'GROUP BY review_score', meaning: 'One bucket per score from 1 to 5.' },
            { part: "CASE WHEN review_comment_message IS NULL OR review_comment_message = '' THEN 1 ELSE 0 END", meaning: 'Marks reviews that carry no written comment.' },
            { part: 'SUM(...)', meaning: 'Counts the marked reviews inside the group.' },
            { part: '100.0 * ... / COUNT(*)', meaning: 'Converts that count into a percentage of the group; the 100.0 forces real division.' },
            { part: 'ROUND(..., 1)', meaning: 'Keeps one decimal place.' },
            { part: 'ORDER BY review_score', meaning: 'Present the scores in their natural order.' }
          ]
        }
      ],
      practice: {
        task: 'Count how many orders have a delivery date recorded and how many do not, in a single result row.',
        hint: 'Use two SUM(CASE WHEN ... THEN 1 ELSE 0 END) expressions and test order_delivered_customer_date with IS NULL.',
        solution: 'SELECT\n  SUM(CASE WHEN order_delivered_customer_date IS NULL THEN 1 ELSE 0 END) AS missing_delivery,\n  SUM(CASE WHEN order_delivered_customer_date IS NOT NULL THEN 1 ELSE 0 END) AS has_delivery\nFROM orders;'
      },
      questions: [
        {
          id: 'aggregation-case-q1',
          prompt: 'What does a CASE expression return when no WHEN condition matches and there is no ELSE?',
          options: ['NULL', 'Zero', 'An empty string', 'An error'],
          answer: 'NULL',
          explanation: 'Without an ELSE branch an unmatched CASE evaluates to NULL.'
        },
        {
          id: 'aggregation-case-q2',
          prompt: 'What does this expression compute?',
          code: "SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END)",
          options: [
            'The number of delivered orders',
            'The number of orders of every status',
            'The share of delivered orders',
            'One if any order was delivered'
          ],
          answer: 'The number of delivered orders',
          explanation: 'Each delivered row contributes 1 and every other row contributes 0, so the sum is a count.'
        },
        {
          id: 'aggregation-case-q3',
          prompt: 'In a CASE with several WHEN branches, which branch wins?',
          options: [
            'The first one whose condition is true',
            'The last one whose condition is true',
            'The one with the largest THEN value',
            'All matching branches are combined'
          ],
          answer: 'The first one whose condition is true',
          explanation: 'Conditions are evaluated top to bottom and evaluation stops at the first match.'
        },
        {
          id: 'aggregation-case-q4',
          prompt: 'Spot the mistake in this query.',
          code: "SELECT CASE WHEN CAST(price AS REAL) < 50 THEN 'budget' ELSE 'premium' AS band FROM order_items;",
          options: [
            'The CASE expression is missing its END keyword',
            'ELSE is not allowed in a CASE expression',
            'An alias cannot be used on a CASE expression',
            'CAST cannot appear inside a WHEN condition'
          ],
          answer: 'The CASE expression is missing its END keyword',
          explanation: 'Every CASE must be closed with END before an alias can be attached.'
        },
        {
          id: 'aggregation-case-q5',
          prompt: 'Why is 100.0 written with a decimal point in a percentage calculation?',
          options: [
            'To force real division instead of integer division',
            'To round the result to one decimal',
            'Because SQLite rejects the integer 100',
            'To convert the result into text'
          ],
          answer: 'To force real division instead of integer division',
          explanation: 'A real operand makes SQLite compute a fractional result rather than truncating it.'
        },
        {
          id: 'aggregation-case-q6',
          prompt: 'Which query answers how many item lines fall into each price band?',
          options: [
            "SELECT CASE WHEN CAST(price AS REAL) < 50 THEN 'budget' ELSE 'premium' END AS band, COUNT(*) FROM order_items GROUP BY band;",
            "SELECT price, COUNT(*) FROM order_items GROUP BY price;",
            "SELECT COUNT(*) FROM order_items WHERE CAST(price AS REAL) < 50;",
            "SELECT CASE WHEN COUNT(*) < 50 THEN 'budget' ELSE 'premium' END FROM order_items;"
          ],
          answer: "SELECT CASE WHEN CAST(price AS REAL) < 50 THEN 'budget' ELSE 'premium' END AS band, COUNT(*) FROM order_items GROUP BY band;",
          explanation: 'The CASE creates the band label and GROUP BY counts the rows inside each label.'
        }
      ]
    },
    {
      id: 'aggregation-dates',
      title: 'Lesson 6 - Dates and text functions in SQLite',
      goal: 'Read the TEXT timestamps of this database, group by month, measure delivery time in days and tidy up text values.',
      tables: ['orders', 'customers', 'order_reviews'],
      blocks: [
        {
          kind: 'text',
          text: 'SQLite has no dedicated date type. Every timestamp in this database is TEXT in the format YYYY-MM-DD HH:MM:SS, for example 2017-10-02 10:56:33. That format sorts correctly as plain text, which is why comparing and ordering timestamps works without any conversion.'
        },
        {
          kind: 'sql',
          title: 'Cut the year and month out of a timestamp',
          sql: "SELECT\n  substr(order_purchase_timestamp, 1, 7) AS purchase_month,\n  COUNT(*) AS order_count\nFROM orders\nWHERE order_purchase_timestamp IS NOT NULL\nGROUP BY purchase_month\nORDER BY purchase_month;",
          explanation: 'Because the format is fixed, the first seven characters of the timestamp are always the year and month.',
          breakdown: [
            { part: 'substr(order_purchase_timestamp, 1, 7)', meaning: 'Take 7 characters starting at position 1, giving a value like 2017-10.' },
            { part: 'AS purchase_month', meaning: 'Name the derived column so GROUP BY and ORDER BY can reuse it.' },
            { part: 'WHERE order_purchase_timestamp IS NOT NULL', meaning: 'Skip rows with no purchase timestamp.' },
            { part: 'GROUP BY purchase_month', meaning: 'One bucket per calendar month.' },
            { part: 'COUNT(*) AS order_count', meaning: 'How many orders were placed that month.' },
            { part: 'ORDER BY purchase_month', meaning: 'Text order of YYYY-MM is also chronological order.' }
          ]
        },
        {
          kind: 'note',
          text: "strftime is the proper tool for the same job: strftime('%Y-%m', order_purchase_timestamp) returns 2017-10. Useful patterns are %Y for the year, %m for the month, %d for the day, %H for the hour and %w for the weekday, where 0 is Sunday."
        },
        {
          kind: 'sql',
          title: 'Group by month with strftime',
          sql: "SELECT\n  strftime('%Y-%m', order_purchase_timestamp) AS month,\n  COUNT(*) AS order_count,\n  COUNT(DISTINCT customer_id) AS customers\nFROM orders\nGROUP BY month\nHAVING COUNT(*) > 100\nORDER BY month;",
          explanation: 'strftime parses the text timestamp and formats it, so the same query can switch between year, month, day or hour by changing the pattern.',
          breakdown: [
            { part: "strftime('%Y-%m', order_purchase_timestamp)", meaning: 'Format the timestamp as year and month only.' },
            { part: 'COUNT(*) AS order_count', meaning: 'Orders placed in that month.' },
            { part: 'COUNT(DISTINCT customer_id) AS customers', meaning: 'How many different customers ordered that month.' },
            { part: 'GROUP BY month', meaning: 'One summary row per month.' },
            { part: 'HAVING COUNT(*) > 100', meaning: 'Drop the thin months at the very start of the dataset.' },
            { part: 'ORDER BY month', meaning: 'Present the months in chronological order.' }
          ]
        },
        {
          kind: 'list',
          title: 'The date helpers you will use most',
          items: [
            'date(timestamp) drops the time and returns YYYY-MM-DD.',
            "strftime(pattern, timestamp) formats a timestamp, for example strftime('%Y', ...) for the year alone.",
            'julianday(timestamp) returns a number of days, which is what makes subtraction possible.',
            "substr(text, start, length) slices a fixed-format string; positions start at 1."
          ]
        },
        {
          kind: 'sql',
          title: 'Average delivery time in days',
          sql: "SELECT\n  strftime('%Y-%m', order_purchase_timestamp) AS month,\n  COUNT(*) AS delivered_orders,\n  ROUND(\n    AVG(julianday(order_delivered_customer_date) - julianday(order_purchase_timestamp)),\n    1\n  ) AS avg_delivery_days\nFROM orders\nWHERE order_delivered_customer_date IS NOT NULL\nGROUP BY month\nORDER BY month;",
          explanation: 'julianday turns each timestamp into a day number, so subtracting one from the other gives the elapsed time in days.',
          breakdown: [
            { part: 'julianday(order_delivered_customer_date)', meaning: 'The delivery moment expressed as a day number.' },
            { part: 'julianday(order_purchase_timestamp)', meaning: 'The purchase moment expressed as a day number.' },
            { part: 'julianday(...) - julianday(...)', meaning: 'The difference is the delivery time in days, with fractions for the hours.' },
            { part: 'AVG(...)', meaning: 'Average that difference over the orders of the month.' },
            { part: 'ROUND(..., 1)', meaning: 'Keep one decimal place.' },
            { part: 'WHERE order_delivered_customer_date IS NOT NULL', meaning: 'Ignore orders that were never delivered.' },
            { part: "GROUP BY month", meaning: 'Report one average per calendar month.' }
          ]
        },
        {
          kind: 'text',
          text: "Text values need cleaning as often as dates do. upper(value) and lower(value) change case, trim(value) removes leading and trailing spaces, and length(value) returns the number of characters. Grouping on lower(trim(customer_city)) is a cheap way to stop Sao Paulo and sao paulo counting as two different cities."
        },
        {
          kind: 'sql',
          title: 'Normalise text before grouping',
          sql: "SELECT\n  upper(customer_state) AS state,\n  lower(trim(customer_city)) AS city,\n  COUNT(*) AS customer_count\nFROM customers\nWHERE length(trim(customer_city)) > 0\nGROUP BY state, city\nORDER BY customer_count DESC\nLIMIT 10;",
          explanation: 'Cleaning the text inside the GROUP BY list makes the buckets match on meaning rather than on spacing and capitalisation.',
          breakdown: [
            { part: 'upper(customer_state) AS state', meaning: 'Force the state code to upper case.' },
            { part: 'lower(trim(customer_city)) AS city', meaning: 'Strip surrounding spaces and lower the case of the city name.' },
            { part: 'WHERE length(trim(customer_city)) > 0', meaning: 'Drop rows whose city is blank or only spaces.' },
            { part: 'GROUP BY state, city', meaning: 'Bucket on the cleaned values, not the raw ones.' },
            { part: 'COUNT(*) AS customer_count', meaning: 'How many customers each cleaned city has.' },
            { part: 'ORDER BY customer_count DESC', meaning: 'Largest cities first.' },
            { part: 'LIMIT 10', meaning: 'Show only the top ten.' }
          ]
        }
      ],
      practice: {
        task: 'Count the reviews created in each year, using the review_creation_date column.',
        hint: "strftime('%Y', review_creation_date) gives the year; group by that alias.",
        solution: "SELECT\n  strftime('%Y', review_creation_date) AS year,\n  COUNT(*) AS review_count\nFROM order_reviews\nGROUP BY year\nORDER BY year;"
      },
      questions: [
        {
          id: 'aggregation-dates-q1',
          prompt: 'How are timestamps stored in this database?',
          options: [
            "As TEXT in the format YYYY-MM-DD HH:MM:SS",
            'As a dedicated DATETIME type',
            'As Unix epoch integers',
            'As DD/MM/YYYY text'
          ],
          answer: "As TEXT in the format YYYY-MM-DD HH:MM:SS",
          explanation: 'SQLite has no date type here, so timestamps are text in a sortable ISO style format.'
        },
        {
          id: 'aggregation-dates-q2',
          prompt: 'What does this expression return for the value 2017-10-02 10:56:33?',
          code: "substr(order_purchase_timestamp, 1, 7)",
          options: ['2017-10', '2017', '10-02 1', '2017-10-02'],
          answer: '2017-10',
          explanation: 'It takes seven characters from position one, which is the year, the dash and the month.'
        },
        {
          id: 'aggregation-dates-q3',
          prompt: 'Which function gives the number of days between two timestamps?',
          options: ['julianday', 'strftime', 'substr', 'length'],
          answer: 'julianday',
          explanation: 'julianday converts each timestamp to a day number so the two can be subtracted.'
        },
        {
          id: 'aggregation-dates-q4',
          prompt: 'What does date(order_purchase_timestamp) return?',
          options: [
            'The date part only, as YYYY-MM-DD',
            'The time part only',
            'The number of days since 2016',
            'The timestamp converted to a number'
          ],
          answer: 'The date part only, as YYYY-MM-DD',
          explanation: 'date drops the time of day and keeps the calendar date.'
        },
        {
          id: 'aggregation-dates-q5',
          prompt: 'Spot the mistake in this query.',
          code: "SELECT AVG(order_delivered_customer_date - order_purchase_timestamp) FROM orders;",
          options: [
            'Text timestamps cannot be subtracted, so each one needs julianday first',
            'AVG cannot be used on the orders table',
            'The query is missing a GROUP BY clause',
            'The two columns must be swapped'
          ],
          answer: 'Text timestamps cannot be subtracted, so each one needs julianday first',
          explanation: 'Subtracting text gives a meaningless result; julianday turns each timestamp into a day number first.'
        },
        {
          id: 'aggregation-dates-q6',
          prompt: 'Which query answers how many orders were placed in each month?',
          options: [
            "SELECT strftime('%Y-%m', order_purchase_timestamp) AS month, COUNT(*) FROM orders GROUP BY month;",
            "SELECT order_purchase_timestamp, COUNT(*) FROM orders GROUP BY order_purchase_timestamp;",
            "SELECT COUNT(*) FROM orders WHERE strftime('%m', order_purchase_timestamp) = '01';",
            "SELECT julianday(order_purchase_timestamp), COUNT(*) FROM orders GROUP BY 1;"
          ],
          answer: "SELECT strftime('%Y-%m', order_purchase_timestamp) AS month, COUNT(*) FROM orders GROUP BY month;",
          explanation: 'Formatting the timestamp down to year and month creates exactly one bucket per calendar month.'
        }
      ]
    }
  ]
}
