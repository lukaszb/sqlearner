import type { CourseModule } from '../types.js'

export const joinsModule: CourseModule = {
  id: 'joins',
  level: 'intermediate',
  title: 'Combining tables',
  description:
    'Bring the Olist tables together with INNER JOIN and LEFT JOIN, follow the keys that link orders to customers, items, products and sellers, and answer questions no single table can answer on its own with subqueries and set operators.',
  lessons: [
    {
      id: 'joins-keys',
      title: 'Lesson 1 - Keys and relationships in the Olist schema',
      goal: 'Learn which column links each pair of Olist tables and how to write readable joins with table aliases.',
      tables: [
        'orders',
        'customers',
        'order_items',
        'products',
        'sellers',
        'order_payments',
        'order_reviews',
        'product_category_name_translation'
      ],
      blocks: [
        {
          kind: 'text',
          text: 'The Olist dataset is split across nine tables so that each fact is stored once. An order does not repeat the city of its customer, and an order line does not repeat the weight of the product. To answer a question that spans two tables you follow a key: a column in one table whose values point at a column in another table.'
        },
        {
          kind: 'list',
          title: 'The join keys you will use all module',
          items: [
            'orders.customer_id points to customers.customer_id - who placed the order.',
            'order_items.order_id points to orders.order_id - which order a line belongs to.',
            'order_items.product_id points to products.product_id - what was sold.',
            'order_items.seller_id points to sellers.seller_id - who sold it.',
            'order_payments.order_id points to orders.order_id - how the order was paid.',
            'order_reviews.order_id points to orders.order_id - what the buyer thought.',
            'products.product_category_name points to product_category_name_translation.product_category_name - the English label.'
          ]
        },
        {
          kind: 'note',
          text: 'customers.customer_id is not a person. Olist issues a fresh customer_id for every order, so it appears once in customers and once in orders. The column that identifies a human being across orders is customers.customer_unique_id. Count people with customer_unique_id and count orders with customer_id.'
        },
        {
          kind: 'sql',
          title: 'Join orders to customers with table aliases',
          sql: 'SELECT\n  o.order_id,\n  o.order_status,\n  c.customer_city,\n  c.customer_state\nFROM orders o\nJOIN customers c ON o.customer_id = c.customer_id\nLIMIT 10;',
          explanation: 'This is the shape of every join in the module: name the two tables, give each a short alias, and state the key equality in ON.',
          breakdown: [
            { part: 'SELECT o.order_id, o.order_status', meaning: 'Take two columns from the orders side of the join.' },
            { part: 'c.customer_city, c.customer_state', meaning: 'Take two more columns from the customers side.' },
            { part: 'FROM orders o', meaning: 'Read the orders table and call it o for the rest of the statement.' },
            { part: 'JOIN customers c', meaning: 'Add the customers table under the alias c; a bare JOIN means INNER JOIN.' },
            { part: 'ON o.customer_id = c.customer_id', meaning: 'Pair an order with the customers row that shares the same customer_id.' },
            { part: 'LIMIT 10', meaning: 'Return only the first ten paired rows while you are exploring.' }
          ]
        },
        {
          kind: 'text',
          text: 'An alias is just a short nickname for a table inside one statement. It saves typing, and it is required as soon as a column name exists in both tables: customer_id lives in orders and in customers, so o.customer_id and c.customer_id are the only unambiguous ways to name them.'
        },
        {
          kind: 'sql',
          title: 'Follow two keys out of order_items',
          sql: 'SELECT\n  i.order_id,\n  p.product_category_name,\n  s.seller_state,\n  CAST(i.price AS REAL) AS price\nFROM order_items i\nJOIN products p ON i.product_id = p.product_id\nJOIN sellers s ON i.seller_id = s.seller_id\nLIMIT 10;',
          explanation: 'order_items sits in the middle of the schema, so it can reach products and sellers in the same query.',
          breakdown: [
            { part: 'FROM order_items i', meaning: 'Start from the line-item table, aliased i.' },
            { part: 'JOIN products p ON i.product_id = p.product_id', meaning: 'Attach the product row described by each line.' },
            { part: 'JOIN sellers s ON i.seller_id = s.seller_id', meaning: 'Attach the seller row that shipped that line.' },
            { part: 'CAST(i.price AS REAL) AS price', meaning: 'Every column is stored as TEXT, so convert the price to a number before using it.' },
            { part: 'LIMIT 10', meaning: 'Keep the preview short.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Translate the category name',
          sql: 'SELECT\n  p.product_id,\n  p.product_category_name,\n  t.product_category_name_english\nFROM products p\nJOIN product_category_name_translation t\n  ON p.product_category_name = t.product_category_name\nLIMIT 10;',
          explanation: 'The key between these two tables is a text label rather than an id, but the join works exactly the same way.',
          breakdown: [
            { part: 'FROM products p', meaning: 'Read the products table under the alias p.' },
            { part: 'JOIN product_category_name_translation t', meaning: 'Add the lookup table of category translations under the alias t.' },
            { part: 'ON p.product_category_name = t.product_category_name', meaning: 'Match a product to the translation row carrying the same Portuguese label.' },
            { part: 'SELECT p.product_id, p.product_category_name, t.product_category_name_english', meaning: 'Show the product, its original label and the English label side by side.' }
          ]
        }
      ],
      practice: {
        task: 'Show order_id, order_status, customer_city and customer_state for ten orders, using the aliases o and c.',
        hint: 'FROM orders o JOIN customers c ON o.customer_id = c.customer_id, then pick the four columns.',
        solution:
          'SELECT o.order_id, o.order_status, c.customer_city, c.customer_state\nFROM orders o\nJOIN customers c ON o.customer_id = c.customer_id\nLIMIT 10;'
      },
      questions: [
        {
          id: 'joins-keys-q1',
          prompt: 'Which column in order_items points at the products table?',
          options: ['product_id', 'order_id', 'seller_id', 'order_item_id'],
          answer: 'product_id',
          explanation: 'order_items.product_id matches products.product_id; order_id and seller_id point at other tables.'
        },
        {
          id: 'joins-keys-q2',
          prompt: 'You want to count how many distinct people bought something. Which column identifies a person?',
          options: [
            'customers.customer_unique_id',
            'customers.customer_id',
            'orders.customer_id',
            'orders.order_id'
          ],
          answer: 'customers.customer_unique_id',
          explanation: 'Olist issues a new customer_id per order, so only customer_unique_id is stable across orders.'
        },
        {
          id: 'joins-keys-q3',
          prompt: 'Spot the mistake in this query.',
          code: 'SELECT order_id, customer_city\nFROM orders o\nJOIN customers c ON o.order_id = c.customer_id;',
          options: [
            'The ON condition joins the wrong columns; it should be o.customer_id = c.customer_id',
            'The aliases o and c are not allowed with JOIN',
            'customer_city has to be written as c.customer_city or the query fails',
            'JOIN must be spelled INNER JOIN when aliases are used'
          ],
          answer: 'The ON condition joins the wrong columns; it should be o.customer_id = c.customer_id',
          explanation: 'An order_id value never appears in customers.customer_id, so the join key is simply wrong.'
        },
        {
          id: 'joins-keys-q4',
          prompt: 'Which pair of tables is linked by a text label rather than by an id?',
          options: [
            'products and product_category_name_translation',
            'orders and customers',
            'order_items and sellers',
            'order_reviews and orders'
          ],
          answer: 'products and product_category_name_translation',
          explanation: 'They are joined on product_category_name, the Portuguese category label itself.'
        },
        {
          id: 'joins-keys-q5',
          prompt: 'Why do you have to write o.customer_id and c.customer_id instead of plain customer_id in that join?',
          options: [
            'Because the column name exists in both tables and would otherwise be ambiguous',
            'Because aliases make queries run faster',
            'Because SQLite forbids unqualified columns after FROM',
            'Because customer_id is a reserved word'
          ],
          answer: 'Because the column name exists in both tables and would otherwise be ambiguous',
          explanation: 'Qualifying with an alias tells SQLite which of the two customer_id columns you mean.'
        },
        {
          id: 'joins-keys-q6',
          prompt: 'Which query answers: what is the state of the seller who shipped each order line?',
          options: [
            'FROM order_items i JOIN sellers s ON i.seller_id = s.seller_id',
            'FROM order_items i JOIN customers c ON i.order_id = c.customer_id',
            'FROM sellers s JOIN orders o ON s.seller_id = o.order_id',
            'FROM order_items i JOIN products p ON i.product_id = p.product_id'
          ],
          answer: 'FROM order_items i JOIN sellers s ON i.seller_id = s.seller_id',
          explanation: 'seller_state lives in sellers, reached from order_items through seller_id.'
        }
      ]
    },
    {
      id: 'joins-inner',
      title: 'Lesson 2 - INNER JOIN: matching rows across tables',
      goal: 'Use INNER JOIN to keep only the rows that have a partner on both sides, and combine it with WHERE and GROUP BY.',
      tables: ['orders', 'customers', 'order_items', 'products', 'order_payments'],
      blocks: [
        {
          kind: 'text',
          text: 'An INNER JOIN walks the left table row by row and looks for rows on the right that satisfy the ON condition. A left row with no partner disappears from the result, and a left row with three partners appears three times. Writing JOIN on its own means INNER JOIN in SQLite.'
        },
        {
          kind: 'sql',
          title: 'One row per order line, with the product category',
          sql: 'SELECT\n  i.order_id,\n  i.order_item_id,\n  p.product_category_name,\n  CAST(i.price AS REAL) AS price\nFROM order_items i\nINNER JOIN products p ON i.product_id = p.product_id\nWHERE p.product_category_name = \'beleza_saude\'\nORDER BY price DESC\nLIMIT 10;',
          explanation: 'The join adds the category to each line, and WHERE then filters the joined rows.',
          breakdown: [
            { part: 'FROM order_items i', meaning: 'Start from the line items, aliased i.' },
            { part: 'INNER JOIN products p ON i.product_id = p.product_id', meaning: 'Keep only lines whose product exists in products, and attach that product row.' },
            { part: "WHERE p.product_category_name = 'beleza_saude'", meaning: 'Filter the joined rows down to the health and beauty category.' },
            { part: 'ORDER BY price DESC', meaning: 'Sort the surviving lines from the most expensive down.' },
            { part: 'LIMIT 10', meaning: 'Show only the ten most expensive lines.' }
          ]
        },
        {
          kind: 'note',
          text: 'A join changes the grain of your result. orders has one row per order, but orders joined to order_items has one row per line item, so an order with four products is counted four times. Use COUNT(DISTINCT o.order_id) when you still want to count orders.'
        },
        {
          kind: 'sql',
          title: 'Revenue per customer state',
          sql: 'SELECT\n  c.customer_state,\n  COUNT(DISTINCT o.order_id) AS orders,\n  ROUND(SUM(CAST(i.price AS REAL)), 2) AS revenue\nFROM orders o\nINNER JOIN customers c ON o.customer_id = c.customer_id\nINNER JOIN order_items i ON i.order_id = o.order_id\nWHERE o.order_status = \'delivered\'\nGROUP BY c.customer_state\nORDER BY revenue DESC;',
          explanation: 'Joining first and aggregating afterwards is the standard way to group facts from one table by an attribute stored in another.',
          breakdown: [
            { part: 'FROM orders o', meaning: 'Start from orders so that order_status is available for filtering.' },
            { part: 'INNER JOIN customers c ON o.customer_id = c.customer_id', meaning: 'Attach the customer so the state is known for each order.' },
            { part: 'INNER JOIN order_items i ON i.order_id = o.order_id', meaning: 'Expand each order into its individual product lines, which carry the price.' },
            { part: "WHERE o.order_status = 'delivered'", meaning: 'Keep only orders that actually reached the customer.' },
            { part: 'GROUP BY c.customer_state', meaning: 'Collapse the joined rows into one row per state.' },
            { part: 'COUNT(DISTINCT o.order_id) AS orders', meaning: 'Count each order once even though it produced several line rows.' },
            { part: 'ROUND(SUM(CAST(i.price AS REAL)), 2) AS revenue', meaning: 'Convert the TEXT price to a number, add it up per state and round to cents.' },
            { part: 'ORDER BY revenue DESC', meaning: 'Put the biggest states first.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Payment type by order status',
          sql: 'SELECT\n  o.order_status,\n  pay.payment_type,\n  COUNT(*) AS payments\nFROM orders o\nJOIN order_payments pay ON pay.order_id = o.order_id\nGROUP BY o.order_status, pay.payment_type\nORDER BY payments DESC\nLIMIT 15;',
          explanation: 'A join plus GROUP BY on two columns produces a small cross-tabulation of statuses and payment methods.',
          breakdown: [
            { part: 'FROM orders o', meaning: 'Read orders under the alias o.' },
            { part: 'JOIN order_payments pay ON pay.order_id = o.order_id', meaning: 'Attach every payment row belonging to that order; JOIN here means INNER JOIN.' },
            { part: 'GROUP BY o.order_status, pay.payment_type', meaning: 'Make one group for each combination of status and payment method.' },
            { part: 'COUNT(*) AS payments', meaning: 'Count the payment rows inside each group.' },
            { part: 'ORDER BY payments DESC', meaning: 'Show the most common combinations first.' },
            { part: 'LIMIT 15', meaning: 'Keep the output to fifteen rows.' }
          ]
        }
      ],
      practice: {
        task: 'Count how many delivered orders each seller state produced, using order_items and sellers.',
        hint: 'Join orders to order_items on order_id and order_items to sellers on seller_id, then GROUP BY s.seller_state with COUNT(DISTINCT o.order_id).',
        solution:
          "SELECT s.seller_state, COUNT(DISTINCT o.order_id) AS orders\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id\nJOIN sellers s ON s.seller_id = i.seller_id\nWHERE o.order_status = 'delivered'\nGROUP BY s.seller_state\nORDER BY orders DESC;"
      },
      questions: [
        {
          id: 'joins-inner-q1',
          prompt: 'What happens to an order that has no matching row in order_items when you write orders INNER JOIN order_items?',
          options: [
            'It is dropped from the result',
            'It appears once with NULL item columns',
            'The query fails with an error',
            'It appears once with zero in the item columns'
          ],
          answer: 'It is dropped from the result',
          explanation: 'INNER JOIN keeps only rows that have a partner on both sides.'
        },
        {
          id: 'joins-inner-q2',
          prompt: 'What does this query return?',
          code: 'SELECT COUNT(*)\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id;',
          options: [
            'The number of order lines that belong to an existing order',
            'The number of orders in the database',
            'The number of distinct products sold',
            'The number of orders that have no items'
          ],
          answer: 'The number of order lines that belong to an existing order',
          explanation: 'The join is at line grain, so COUNT(*) counts item rows, not orders.'
        },
        {
          id: 'joins-inner-q3',
          prompt: 'You joined orders to order_items and now want the number of orders, not lines. What do you use?',
          options: [
            'COUNT(DISTINCT o.order_id)',
            'COUNT(*)',
            'COUNT(i.order_item_id)',
            'SUM(o.order_id)'
          ],
          answer: 'COUNT(DISTINCT o.order_id)',
          explanation: 'DISTINCT collapses the repeated order rows created by the join back to one per order.'
        },
        {
          id: 'joins-inner-q4',
          prompt: 'Spot the mistake in this query.',
          code: 'SELECT c.customer_state, SUM(i.price)\nFROM orders o\nJOIN customers c ON o.customer_id = c.customer_id\nJOIN order_items i ON i.order_id = o.order_id\nGROUP BY c.customer_state;',
          options: [
            'price is stored as TEXT so it needs CAST(i.price AS REAL)',
            'You cannot join three tables in one query',
            'GROUP BY must list every joined table',
            'SUM cannot be used together with JOIN'
          ],
          answer: 'price is stored as TEXT so it needs CAST(i.price AS REAL)',
          explanation: 'Every Olist column is TEXT, so summing without a CAST gives an unreliable total.'
        },
        {
          id: 'joins-inner-q5',
          prompt: 'Which join type do you need to list only the products that have actually been sold at least once?',
          options: [
            'INNER JOIN between products and order_items',
            'LEFT JOIN from products to order_items',
            'A join with no ON condition',
            'UNION of products and order_items'
          ],
          answer: 'INNER JOIN between products and order_items',
          explanation: 'INNER JOIN drops products that never appear on a line, which is exactly the filter you want.'
        },
        {
          id: 'joins-inner-q6',
          prompt: 'Which query answers: which payment types are used most often on delivered orders?',
          options: [
            "FROM orders o JOIN order_payments pay ON pay.order_id = o.order_id WHERE o.order_status = 'delivered' GROUP BY pay.payment_type",
            'FROM order_payments pay GROUP BY pay.payment_type',
            "FROM orders o WHERE o.order_status = 'delivered' GROUP BY o.order_status",
            'FROM orders o JOIN order_payments pay ON pay.payment_type = o.order_status GROUP BY pay.payment_type'
          ],
          answer: "FROM orders o JOIN order_payments pay ON pay.order_id = o.order_id WHERE o.order_status = 'delivered' GROUP BY pay.payment_type",
          explanation: 'You need the status from orders and the payment type from order_payments, joined on order_id.'
        }
      ]
    },
    {
      id: 'joins-left',
      title: 'Lesson 3 - LEFT JOIN and finding what is missing',
      goal: 'Keep every row of the left table with LEFT JOIN, and use the IS NULL anti-join pattern to find rows that have no partner.',
      tables: ['orders', 'order_reviews', 'products', 'order_items', 'customers'],
      blocks: [
        {
          kind: 'text',
          text: 'A LEFT JOIN keeps every row of the left table. When the right table has no matching row, SQLite still emits the left row and fills every right-hand column with NULL. That single behaviour gives you two different tools: a safe way to attach optional information, and a way to find rows that are missing a partner.'
        },
        {
          kind: 'sql',
          title: 'Attach the review score, even when there is none',
          sql: 'SELECT\n  o.order_id,\n  o.order_status,\n  r.review_score\nFROM orders o\nLEFT JOIN order_reviews r ON r.order_id = o.order_id\nLIMIT 20;',
          explanation: 'Every order is listed; review_score is NULL for the orders nobody reviewed.',
          breakdown: [
            { part: 'FROM orders o', meaning: 'The left table: every one of its rows will survive.' },
            { part: 'LEFT JOIN order_reviews r', meaning: 'The right table is optional; missing matches do not remove the order.' },
            { part: 'ON r.order_id = o.order_id', meaning: 'Pair a review with the order it was written about.' },
            { part: 'SELECT r.review_score', meaning: 'Show the score, which is NULL whenever no review row matched.' },
            { part: 'LIMIT 20', meaning: 'Preview twenty rows.' }
          ]
        },
        {
          kind: 'sql',
          title: 'The anti-join: orders with no review at all',
          sql: 'SELECT\n  o.order_id,\n  o.order_status,\n  o.order_purchase_timestamp\nFROM orders o\nLEFT JOIN order_reviews r ON r.order_id = o.order_id\nWHERE r.order_id IS NULL;',
          explanation: 'Keeping only the rows where the right-hand key came back NULL leaves exactly the orders that have no review.',
          breakdown: [
            { part: 'FROM orders o', meaning: 'Start from every order.' },
            { part: 'LEFT JOIN order_reviews r ON r.order_id = o.order_id', meaning: 'Try to attach a review; unmatched orders keep NULL on the r side.' },
            { part: 'WHERE r.order_id IS NULL', meaning: 'Keep only the rows where the attempt failed, which means no review exists.' },
            { part: 'SELECT o.order_id, o.order_status, o.order_purchase_timestamp', meaning: 'Describe the orders that are missing feedback.' }
          ]
        },
        {
          kind: 'note',
          text: 'Test the right-hand key column for NULL, never a column that can legitimately be NULL by itself. review_comment_title is empty for many real reviews, so WHERE r.review_comment_title IS NULL would return matched rows too. The join key r.order_id can only be NULL when nothing matched.'
        },
        {
          kind: 'text',
          text: 'The other trap is putting a condition on the right table in WHERE instead of in ON. A LEFT JOIN followed by WHERE r.review_score = 5 throws away every unmatched row, because NULL = 5 is not true, and the query quietly behaves like an INNER JOIN. If the condition describes the match, write it in ON.'
        },
        {
          kind: 'sql',
          title: 'Products that were never ordered',
          sql: 'SELECT\n  p.product_id,\n  p.product_category_name\nFROM products p\nLEFT JOIN order_items i ON i.product_id = p.product_id\nWHERE i.product_id IS NULL;',
          explanation: 'The same anti-join pattern applied to the catalogue finds products that never appear on a single order line.',
          breakdown: [
            { part: 'FROM products p', meaning: 'Every product in the catalogue is the left side.' },
            { part: 'LEFT JOIN order_items i ON i.product_id = p.product_id', meaning: 'Look for any line item selling that product.' },
            { part: 'WHERE i.product_id IS NULL', meaning: 'Keep only products for which no line item was found.' },
            { part: 'SELECT p.product_id, p.product_category_name', meaning: 'Report the unsold product and its category.' }
          ]
        },
        {
          kind: 'note',
          text: 'Older versions of SQLite support LEFT JOIN but not RIGHT JOIN. The portable form is to swap the two tables and write a LEFT JOIN: A RIGHT JOIN B is the same result as B LEFT JOIN A with the same ON condition.'
        }
      ],
      practice: {
        task: 'List the order_id of every order that has no payment row in order_payments.',
        hint: 'LEFT JOIN order_payments to orders on order_id and keep the rows where the payment order_id is NULL.',
        solution:
          'SELECT o.order_id\nFROM orders o\nLEFT JOIN order_payments pay ON pay.order_id = o.order_id\nWHERE pay.order_id IS NULL;'
      },
      questions: [
        {
          id: 'joins-left-q1',
          prompt: 'What does a LEFT JOIN put in the right-hand columns when there is no matching row?',
          options: ['NULL', 'Zero', 'An empty string', 'The previous row value'],
          answer: 'NULL',
          explanation: 'Unmatched left rows are padded with NULL on every column of the right table.'
        },
        {
          id: 'joins-left-q2',
          prompt: 'What does this query return?',
          code: 'SELECT o.order_id\nFROM orders o\nLEFT JOIN order_reviews r ON r.order_id = o.order_id\nWHERE r.order_id IS NULL;',
          options: [
            'The orders that have no review',
            'The orders that have at least one review',
            'The reviews that have no order',
            'Every order in the database'
          ],
          answer: 'The orders that have no review',
          explanation: 'This is the anti-join pattern: the NULL key marks the left rows that found no partner.'
        },
        {
          id: 'joins-left-q3',
          prompt: 'Spot the mistake in this query, which is meant to list every order with its review score.',
          code: 'SELECT o.order_id, r.review_score\nFROM orders o\nLEFT JOIN order_reviews r ON r.order_id = o.order_id\nWHERE r.review_score >= 4;',
          options: [
            'The WHERE condition on the right table removes the unmatched orders, so the LEFT JOIN behaves like an INNER JOIN',
            'LEFT JOIN cannot be combined with WHERE',
            'review_score must be cast before it can be compared',
            'The aliases must be declared before the SELECT list'
          ],
          answer: 'The WHERE condition on the right table removes the unmatched orders, so the LEFT JOIN behaves like an INNER JOIN',
          explanation: 'NULL >= 4 is not true, so every order without a review is filtered out again.'
        },
        {
          id: 'joins-left-q4',
          prompt: 'Which join type do you need to list every customer together with the number of orders they placed, including customers with none?',
          options: ['LEFT JOIN from customers to orders', 'INNER JOIN', 'A join with no ON clause', 'EXCEPT'],
          answer: 'LEFT JOIN from customers to orders',
          explanation: 'Only a LEFT JOIN keeps the customers that have no matching order rows.'
        },
        {
          id: 'joins-left-q5',
          prompt: 'SQLite in older versions has no RIGHT JOIN. What is the portable way to write A RIGHT JOIN B?',
          options: [
            'B LEFT JOIN A with the same ON condition',
            'A LEFT JOIN B with the same ON condition',
            'A UNION B',
            'A INNER JOIN B and then ORDER BY'
          ],
          answer: 'B LEFT JOIN A with the same ON condition',
          explanation: 'Swapping the table order turns a right outer join into a left outer join.'
        },
        {
          id: 'joins-left-q6',
          prompt: 'In the anti-join pattern, which column should you test with IS NULL?',
          options: [
            'The join key of the right table',
            'Any nullable comment column of the right table',
            'The primary key of the left table',
            'A column of the left table used in ORDER BY'
          ],
          answer: 'The join key of the right table',
          explanation: 'The join key can only be NULL when no row matched, unlike columns that are often empty anyway.'
        }
      ]
    },
    {
      id: 'joins-multi',
      title: 'Lesson 4 - Joining several tables in one query',
      goal: 'Chain three or more joins in a sensible order and keep control of the grain and of the counts.',
      tables: [
        'orders',
        'customers',
        'order_items',
        'products',
        'sellers',
        'product_category_name_translation',
        'order_reviews'
      ],
      blocks: [
        {
          kind: 'text',
          text: 'A multi-table query is read from top to bottom: FROM names the first table, and each JOIN attaches one more table to the result built so far. Pick the table your question is really about as the starting point, then follow the keys outwards one hop at a time.'
        },
        {
          kind: 'list',
          title: 'A recipe that keeps long joins under control',
          items: [
            'Start FROM the table that defines the grain you want, usually orders or order_items.',
            'Add one JOIN per hop and give every table a two or three letter alias.',
            'Qualify every column with its alias, even the unambiguous ones.',
            'Use LEFT JOIN for any table that may be missing, such as order_reviews.',
            'Check the row count after each new join before adding the next one.'
          ]
        },
        {
          kind: 'sql',
          title: 'Four tables: sales by English category',
          sql: 'SELECT\n  t.product_category_name_english AS category,\n  COUNT(DISTINCT o.order_id) AS orders,\n  ROUND(SUM(CAST(i.price AS REAL)), 2) AS revenue\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id\nJOIN products p ON p.product_id = i.product_id\nJOIN product_category_name_translation t\n  ON t.product_category_name = p.product_category_name\nWHERE o.order_status = \'delivered\'\nGROUP BY t.product_category_name_english\nORDER BY revenue DESC\nLIMIT 10;',
          explanation: 'Each join is one hop along the schema: order to line, line to product, product to translation.',
          breakdown: [
            { part: 'FROM orders o', meaning: 'Start from orders so order_status is available.' },
            { part: 'JOIN order_items i ON i.order_id = o.order_id', meaning: 'First hop: expand each order into its priced lines.' },
            { part: 'JOIN products p ON p.product_id = i.product_id', meaning: 'Second hop: attach the product sold on each line.' },
            { part: 'JOIN product_category_name_translation t ON t.product_category_name = p.product_category_name', meaning: 'Third hop: translate the Portuguese category into English.' },
            { part: "WHERE o.order_status = 'delivered'", meaning: 'Restrict the whole joined set to completed orders.' },
            { part: 'GROUP BY t.product_category_name_english', meaning: 'One output row per English category.' },
            { part: 'COUNT(DISTINCT o.order_id) AS orders', meaning: 'Count orders once each despite the line-level grain.' },
            { part: 'ROUND(SUM(CAST(i.price AS REAL)), 2) AS revenue', meaning: 'Add up the numeric prices and round to two decimals.' },
            { part: 'ORDER BY revenue DESC LIMIT 10', meaning: 'Show the ten highest earning categories.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Mixing INNER and LEFT joins',
          sql: 'SELECT\n  o.order_id,\n  c.customer_state,\n  s.seller_state,\n  r.review_score\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nJOIN order_items i ON i.order_id = o.order_id\nJOIN sellers s ON s.seller_id = i.seller_id\nLEFT JOIN order_reviews r ON r.order_id = o.order_id\nWHERE c.customer_state <> s.seller_state\nLIMIT 20;',
          explanation: 'The required tables are joined with INNER JOIN while the optional review is attached with LEFT JOIN so unreviewed orders survive.',
          breakdown: [
            { part: 'FROM orders o', meaning: 'The order is the anchor of the question.' },
            { part: 'JOIN customers c ON c.customer_id = o.customer_id', meaning: 'Attach the buyer to read customer_state.' },
            { part: 'JOIN order_items i ON i.order_id = o.order_id', meaning: 'Go down to line grain so a seller can be identified.' },
            { part: 'JOIN sellers s ON s.seller_id = i.seller_id', meaning: 'Attach the seller to read seller_state.' },
            { part: 'LEFT JOIN order_reviews r ON r.order_id = o.order_id', meaning: 'Attach the review if there is one, keeping the row either way.' },
            { part: 'WHERE c.customer_state <> s.seller_state', meaning: 'Keep only the lines shipped across state borders.' },
            { part: 'LIMIT 20', meaning: 'Preview twenty of them.' }
          ]
        },
        {
          kind: 'note',
          text: 'Once a LEFT JOIN appears in the chain, every table joined after it should normally be joined with LEFT JOIN too. An INNER JOIN placed after a LEFT JOIN removes the NULL padded rows the LEFT JOIN just protected.'
        },
        {
          kind: 'sql',
          title: 'Average review score per seller state',
          sql: 'SELECT\n  s.seller_state,\n  COUNT(DISTINCT o.order_id) AS orders,\n  ROUND(AVG(CAST(r.review_score AS REAL)), 2) AS avg_score\nFROM orders o\nJOIN order_items i ON i.order_id = o.order_id\nJOIN sellers s ON s.seller_id = i.seller_id\nJOIN order_reviews r ON r.order_id = o.order_id\nGROUP BY s.seller_state\nHAVING COUNT(DISTINCT o.order_id) >= 100\nORDER BY avg_score DESC;',
          explanation: 'HAVING filters the groups after aggregation, so tiny states do not appear at the top on a handful of orders.',
          breakdown: [
            { part: 'FROM orders o JOIN order_items i ON i.order_id = o.order_id', meaning: 'Move from order grain down to line grain.' },
            { part: 'JOIN sellers s ON s.seller_id = i.seller_id', meaning: 'Attach the seller responsible for each line.' },
            { part: 'JOIN order_reviews r ON r.order_id = o.order_id', meaning: 'Attach the review; INNER JOIN here deliberately drops unreviewed orders.' },
            { part: 'GROUP BY s.seller_state', meaning: 'One row per seller state.' },
            { part: 'ROUND(AVG(CAST(r.review_score AS REAL)), 2)', meaning: 'Cast the TEXT score to a number, average it and round it.' },
            { part: 'HAVING COUNT(DISTINCT o.order_id) >= 100', meaning: 'Discard states with fewer than one hundred reviewed orders.' },
            { part: 'ORDER BY avg_score DESC', meaning: 'Rank the states by satisfaction.' }
          ]
        }
      ],
      practice: {
        task: 'For each customer state, show the number of distinct products bought, joining orders, order_items and customers.',
        hint: 'Start FROM orders, join customers on customer_id and order_items on order_id, then COUNT(DISTINCT i.product_id).',
        solution:
          'SELECT c.customer_state, COUNT(DISTINCT i.product_id) AS products\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nJOIN order_items i ON i.order_id = o.order_id\nGROUP BY c.customer_state\nORDER BY products DESC;'
      },
      questions: [
        {
          id: 'joins-multi-q1',
          prompt: 'How many joins do you need to get from orders to the English category name?',
          options: ['Three', 'One', 'Two', 'Four'],
          answer: 'Three',
          explanation: 'orders to order_items, order_items to products, products to product_category_name_translation.'
        },
        {
          id: 'joins-multi-q2',
          prompt: 'Spot the mistake in this query, which should keep orders even when they have no review.',
          code: 'FROM orders o\nLEFT JOIN order_reviews r ON r.order_id = o.order_id\nJOIN customers c ON c.customer_id = o.customer_id\nJOIN order_items i ON i.order_id = o.order_id',
          options: [
            'Nothing is wrong with the join order here, because the later INNER JOINs are on tables that always match',
            'A LEFT JOIN can never be followed by another join',
            'The customers join must come before FROM',
            'order_items cannot be joined after customers'
          ],
          answer: 'Nothing is wrong with the join order here, because the later INNER JOINs are on tables that always match',
          explanation: 'The danger of an INNER JOIN after a LEFT JOIN only bites when the later table can be missing.'
        },
        {
          id: 'joins-multi-q3',
          prompt: 'What does this query return?',
          code: 'SELECT s.seller_state, COUNT(DISTINCT i.order_id)\nFROM order_items i\nJOIN sellers s ON s.seller_id = i.seller_id\nGROUP BY s.seller_state;',
          options: [
            'The number of distinct orders handled by sellers in each state',
            'The number of sellers in each state',
            'The number of order lines in each state',
            'The total revenue per seller state'
          ],
          answer: 'The number of distinct orders handled by sellers in each state',
          explanation: 'COUNT(DISTINCT i.order_id) counts orders once per state, not lines and not sellers.'
        },
        {
          id: 'joins-multi-q4',
          prompt: 'Which table should you start FROM when the question is about revenue per product category?',
          options: [
            'order_items, because it carries the price',
            'customers, because it is the smallest table',
            'product_category_name_translation, because it holds the label',
            'geolocation, because it links every zip code'
          ],
          answer: 'order_items, because it carries the price',
          explanation: 'The grain of the answer is the priced line, so order_items is the natural anchor.'
        },
        {
          id: 'joins-multi-q5',
          prompt: 'Why is HAVING used instead of WHERE in the average review score example?',
          options: [
            'Because the condition tests an aggregate computed per group',
            'Because WHERE cannot be used with joins',
            'Because HAVING runs faster on grouped queries',
            'Because seller_state is a text column'
          ],
          answer: 'Because the condition tests an aggregate computed per group',
          explanation: 'WHERE filters individual rows before grouping; HAVING filters the groups afterwards.'
        },
        {
          id: 'joins-multi-q6',
          prompt: 'Which query answers: which sellers shipped to a state different from their own?',
          options: [
            'orders joined to customers and to order_items and to sellers, filtered on c.customer_state <> s.seller_state',
            'sellers joined to customers on seller_state = customer_state',
            'orders joined to sellers on order_id = seller_id',
            'order_items joined to geolocation on product_id'
          ],
          answer: 'orders joined to customers and to order_items and to sellers, filtered on c.customer_state <> s.seller_state',
          explanation: 'You need both states in one row, which takes the full chain from orders out to sellers.'
        }
      ]
    },
    {
      id: 'joins-subqueries',
      title: 'Lesson 5 - Subqueries: scalar, IN and EXISTS',
      goal: 'Nest a SELECT inside another query to compare against a computed value, filter by a list of keys or test for existence.',
      tables: ['order_items', 'orders', 'order_reviews', 'products', 'customers', 'sellers'],
      blocks: [
        {
          kind: 'text',
          text: 'A subquery is a SELECT written inside another statement. There are three shapes worth knowing. A scalar subquery returns exactly one value and can be used anywhere a number belongs. An IN subquery returns one column of values and is used as a list. An EXISTS subquery returns nothing at all; only the fact that it produced at least one row matters.'
        },
        {
          kind: 'sql',
          title: 'Scalar subquery: lines priced above the overall average',
          sql: 'SELECT\n  i.order_id,\n  i.product_id,\n  CAST(i.price AS REAL) AS price\nFROM order_items i\nWHERE CAST(i.price AS REAL) > (\n  SELECT AVG(CAST(price AS REAL))\n  FROM order_items\n)\nORDER BY price DESC\nLIMIT 10;',
          explanation: 'The inner SELECT collapses the whole table to a single average, which the outer WHERE then compares each line against.',
          breakdown: [
            { part: 'FROM order_items i', meaning: 'The outer query walks the line items.' },
            { part: 'SELECT AVG(CAST(price AS REAL)) FROM order_items', meaning: 'The inner query returns one number: the average price across all lines.' },
            { part: 'WHERE CAST(i.price AS REAL) > ( ... )', meaning: 'Keep only lines whose price beats that single value.' },
            { part: 'ORDER BY price DESC', meaning: 'Sort the expensive lines from the top.' },
            { part: 'LIMIT 10', meaning: 'Return ten rows.' }
          ]
        },
        {
          kind: 'note',
          text: 'A scalar subquery must return one row and one column. If it can return several rows, SQLite silently uses the first one, which is almost never what you meant; use IN or EXISTS instead.'
        },
        {
          kind: 'sql',
          title: 'IN subquery: orders that received a one-star review',
          sql: 'SELECT\n  o.order_id,\n  o.order_status,\n  o.order_purchase_timestamp\nFROM orders o\nWHERE o.order_id IN (\n  SELECT r.order_id\n  FROM order_reviews r\n  WHERE CAST(r.review_score AS INTEGER) = 1\n);',
          explanation: 'The inner query builds a list of order ids, and the outer query keeps the orders whose id appears in that list.',
          breakdown: [
            { part: 'FROM orders o', meaning: 'The outer query scans orders.' },
            { part: 'SELECT r.order_id FROM order_reviews r', meaning: 'The inner query returns a single column of order ids.' },
            { part: 'WHERE CAST(r.review_score AS INTEGER) = 1', meaning: 'Restrict that list to the worst reviews, casting the TEXT score first.' },
            { part: 'WHERE o.order_id IN ( ... )', meaning: 'Keep an order when its id is one of the ids the inner query produced.' }
          ]
        },
        {
          kind: 'note',
          text: 'Prefer NOT EXISTS over NOT IN when the inner column can contain NULL. If any value in the list is NULL, NOT IN returns no rows at all, which looks like an empty result rather than an error.'
        },
        {
          kind: 'sql',
          title: 'EXISTS and NOT EXISTS: sellers with and without sales',
          sql: 'SELECT\n  s.seller_id,\n  s.seller_state\nFROM sellers s\nWHERE NOT EXISTS (\n  SELECT 1\n  FROM order_items i\n  WHERE i.seller_id = s.seller_id\n);',
          explanation: 'A correlated EXISTS asks, for each seller, whether any line item mentions that seller, and NOT EXISTS keeps the ones where the answer is no.',
          breakdown: [
            { part: 'FROM sellers s', meaning: 'The outer query walks the seller list one row at a time.' },
            { part: 'SELECT 1 FROM order_items i', meaning: 'The inner query selects a constant because only the existence of a row matters.' },
            { part: 'WHERE i.seller_id = s.seller_id', meaning: 'The correlation: the inner query refers to the current outer row.' },
            { part: 'WHERE NOT EXISTS ( ... )', meaning: 'Keep the seller only when the inner query produced zero rows.' }
          ]
        },
        {
          kind: 'text',
          text: 'NOT EXISTS and the LEFT JOIN with IS NULL from lesson 3 answer the same question in two ways, and on this dataset they return the same rows. Use whichever reads better: the anti-join when you also want columns from the other table, NOT EXISTS when you only want to test a condition.'
        }
      ],
      practice: {
        task: 'List the product_id and product_category_name of products that have never been sold, using NOT EXISTS.',
        hint: 'SELECT from products and put a NOT EXISTS subquery over order_items correlated on product_id.',
        solution:
          'SELECT p.product_id, p.product_category_name\nFROM products p\nWHERE NOT EXISTS (\n  SELECT 1 FROM order_items i WHERE i.product_id = p.product_id\n);'
      },
      questions: [
        {
          id: 'joins-subqueries-q1',
          prompt: 'How many rows and columns must a scalar subquery return?',
          options: ['One row and one column', 'One row and any number of columns', 'Any number of rows and one column', 'At least one row'],
          answer: 'One row and one column',
          explanation: 'A scalar subquery stands in for a single value, so anything wider or taller is a mistake.'
        },
        {
          id: 'joins-subqueries-q2',
          prompt: 'What does this query return?',
          code: 'SELECT o.order_id\nFROM orders o\nWHERE o.order_id IN (\n  SELECT r.order_id FROM order_reviews r\n  WHERE CAST(r.review_score AS INTEGER) = 5\n);',
          options: [
            'The orders that received a five-star review',
            'The orders that received no review',
            'The five-star reviews themselves',
            'The average review score per order'
          ],
          answer: 'The orders that received a five-star review',
          explanation: 'The inner query lists the order ids with a top score and IN keeps those orders.'
        },
        {
          id: 'joins-subqueries-q3',
          prompt: 'Why does the inner query in an EXISTS test usually say SELECT 1?',
          options: [
            'Because only whether a row exists matters, not what it contains',
            'Because EXISTS can only read numeric columns',
            'Because 1 is the id of the first row',
            'Because SELECT * is not allowed inside EXISTS'
          ],
          answer: 'Because only whether a row exists matters, not what it contains',
          explanation: 'EXISTS evaluates to true or false, so the selected expression is irrelevant.'
        },
        {
          id: 'joins-subqueries-q4',
          prompt: 'Spot the mistake in this query.',
          code: 'SELECT i.order_id\nFROM order_items i\nWHERE CAST(i.price AS REAL) > (\n  SELECT CAST(price AS REAL) FROM order_items\n);',
          options: [
            'The subquery returns many rows where a single value is required, so it should aggregate with AVG or MAX',
            'CAST cannot appear inside a subquery',
            'The outer query is missing a GROUP BY',
            'A subquery cannot read the same table as the outer query'
          ],
          answer: 'The subquery returns many rows where a single value is required, so it should aggregate with AVG or MAX',
          explanation: 'A comparison with > needs a scalar, so the inner SELECT must collapse to one value.'
        },
        {
          id: 'joins-subqueries-q5',
          prompt: 'Which construct is safest when the inner query can produce NULL values?',
          options: ['NOT EXISTS', 'NOT IN', 'IN with DISTINCT', 'A scalar subquery'],
          answer: 'NOT EXISTS',
          explanation: 'A single NULL in the list makes NOT IN return nothing, while NOT EXISTS is unaffected.'
        },
        {
          id: 'joins-subqueries-q6',
          prompt: 'Which query answers: which customers placed an order that was cancelled?',
          options: [
            "SELECT customer_id FROM orders WHERE order_status = 'canceled'",
            "SELECT customer_id FROM customers WHERE order_status = 'canceled'",
            "SELECT order_id FROM orders WHERE customer_id IN (SELECT order_status FROM orders)",
            "SELECT customer_id FROM orders WHERE NOT EXISTS (SELECT 1 FROM orders)"
          ],
          answer: "SELECT customer_id FROM orders WHERE order_status = 'canceled'",
          explanation: 'The status and the customer key are both on orders, so no subquery is needed at all.'
        }
      ]
    },
    {
      id: 'joins-set-ops',
      title: 'Lesson 6 - UNION, UNION ALL, INTERSECT and EXCEPT',
      goal: 'Stack the results of two queries on top of each other and compare them with the four set operators.',
      tables: ['customers', 'sellers', 'orders', 'order_reviews', 'order_items', 'products'],
      blocks: [
        {
          kind: 'text',
          text: 'A join adds columns; a set operator adds rows. UNION, UNION ALL, INTERSECT and EXCEPT each take two complete SELECT statements and combine their result sets. Both sides must produce the same number of columns, in the same order, holding comparable values. The column names of the result come from the first SELECT.'
        },
        {
          kind: 'list',
          title: 'What each operator does',
          items: [
            'UNION - all rows from both sides, with duplicate rows removed.',
            'UNION ALL - all rows from both sides, keeping duplicates; faster because nothing is deduplicated.',
            'INTERSECT - only the rows that appear in both results.',
            'EXCEPT - the rows of the first result that do not appear in the second.'
          ]
        },
        {
          kind: 'sql',
          title: 'UNION ALL: one list of every city in the marketplace',
          sql: "SELECT customer_city AS city, customer_state AS state, 'customer' AS side\nFROM customers\nUNION ALL\nSELECT seller_city, seller_state, 'seller'\nFROM sellers\nLIMIT 20;",
          explanation: 'Two tables with the same shape of information are stacked into one result, with a literal column recording where each row came from.',
          breakdown: [
            { part: 'SELECT customer_city AS city, customer_state AS state', meaning: 'The first branch supplies the column names of the whole result.' },
            { part: "'customer' AS side", meaning: 'A literal tag so you can tell the two branches apart afterwards.' },
            { part: 'UNION ALL', meaning: 'Append the second result to the first without removing duplicates.' },
            { part: 'SELECT seller_city, seller_state, \'seller\' FROM sellers', meaning: 'The second branch, matching the first column for column.' },
            { part: 'LIMIT 20', meaning: 'The LIMIT applies to the combined result.' }
          ]
        },
        {
          kind: 'note',
          text: 'Use UNION ALL unless you actually need duplicates removed. UNION has to sort or hash the whole result to find duplicates, and it will also silently collapse legitimate repeated rows.'
        },
        {
          kind: 'sql',
          title: 'INTERSECT: states that host both customers and sellers',
          sql: 'SELECT DISTINCT customer_state AS state\nFROM customers\nINTERSECT\nSELECT DISTINCT seller_state\nFROM sellers\nORDER BY state;',
          explanation: 'INTERSECT keeps only the state codes that show up on both sides of the marketplace.',
          breakdown: [
            { part: 'SELECT DISTINCT customer_state AS state FROM customers', meaning: 'The set of states where buyers live.' },
            { part: 'INTERSECT', meaning: 'Keep only rows present in both result sets, removing duplicates.' },
            { part: 'SELECT DISTINCT seller_state FROM sellers', meaning: 'The set of states where sellers are based.' },
            { part: 'ORDER BY state', meaning: 'ORDER BY is written once, at the very end, and sorts the combined result.' }
          ]
        },
        {
          kind: 'sql',
          title: 'EXCEPT: orders that were never reviewed',
          sql: 'SELECT order_id\nFROM orders\nEXCEPT\nSELECT order_id\nFROM order_reviews;',
          explanation: 'EXCEPT subtracts the second set from the first, giving a third way to write the anti-join from lesson 3.',
          breakdown: [
            { part: 'SELECT order_id FROM orders', meaning: 'Every order id in the database.' },
            { part: 'EXCEPT', meaning: 'Remove from the first result every row that also appears in the second.' },
            { part: 'SELECT order_id FROM order_reviews', meaning: 'The order ids that do have a review.' }
          ]
        },
        {
          kind: 'text',
          text: 'EXCEPT, NOT EXISTS and LEFT JOIN with IS NULL all answer the missing-rows question. EXCEPT is the shortest when you only need the key column and both sides come from one column each; the join form is the one to reach for when you also want other columns in the output.'
        }
      ],
      practice: {
        task: 'Produce a single sorted list of the state codes that appear in customers or in sellers, with no duplicates.',
        hint: 'Two SELECTs of one column joined by UNION, with a single ORDER BY at the end.',
        solution:
          'SELECT customer_state AS state\nFROM customers\nUNION\nSELECT seller_state\nFROM sellers\nORDER BY state;'
      },
      questions: [
        {
          id: 'joins-set-ops-q1',
          prompt: 'What is the difference between UNION and UNION ALL?',
          options: [
            'UNION removes duplicate rows and UNION ALL keeps them',
            'UNION ALL removes duplicate rows and UNION keeps them',
            'UNION works on two tables and UNION ALL on three or more',
            'UNION sorts the result and UNION ALL reverses it'
          ],
          answer: 'UNION removes duplicate rows and UNION ALL keeps them',
          explanation: 'Deduplication is the only difference, and it is why UNION ALL is the faster option.'
        },
        {
          id: 'joins-set-ops-q2',
          prompt: 'What does this query return?',
          code: 'SELECT order_id FROM orders\nEXCEPT\nSELECT order_id FROM order_reviews;',
          options: [
            'The order ids that have no review',
            'The order ids that have a review',
            'Every order id twice',
            'The review ids with no order'
          ],
          answer: 'The order ids that have no review',
          explanation: 'EXCEPT subtracts the reviewed ids from the full list of order ids.'
        },
        {
          id: 'joins-set-ops-q3',
          prompt: 'Spot the mistake in this query.',
          code: 'SELECT customer_city, customer_state FROM customers\nUNION\nSELECT seller_city FROM sellers;',
          options: [
            'The two branches return a different number of columns',
            'UNION cannot be used on text columns',
            'The second branch is missing an ORDER BY',
            'Aliases are required on both branches'
          ],
          answer: 'The two branches return a different number of columns',
          explanation: 'Every branch of a set operation must have the same number of columns in the same order.'
        },
        {
          id: 'joins-set-ops-q4',
          prompt: 'Where does ORDER BY go in a query that uses UNION?',
          options: [
            'Once at the very end, applying to the combined result',
            'In each branch separately',
            'Immediately before the UNION keyword',
            'ORDER BY is not allowed with UNION'
          ],
          answer: 'Once at the very end, applying to the combined result',
          explanation: 'A set operation produces one result set, so it takes one trailing ORDER BY.'
        },
        {
          id: 'joins-set-ops-q5',
          prompt: 'Which operator do you need to list the states that have both customers and sellers?',
          options: ['INTERSECT', 'UNION', 'EXCEPT', 'UNION ALL'],
          answer: 'INTERSECT',
          explanation: 'INTERSECT returns only the rows that appear in both result sets.'
        },
        {
          id: 'joins-set-ops-q6',
          prompt: 'Which query answers: which product ids were sold but do not exist in the products table?',
          options: [
            'SELECT product_id FROM order_items EXCEPT SELECT product_id FROM products',
            'SELECT product_id FROM products EXCEPT SELECT product_id FROM order_items',
            'SELECT product_id FROM order_items INTERSECT SELECT product_id FROM products',
            'SELECT product_id FROM order_items UNION SELECT product_id FROM products'
          ],
          answer: 'SELECT product_id FROM order_items EXCEPT SELECT product_id FROM products',
          explanation: 'You subtract the known catalogue from the sold ids, so order_items must come first.'
        }
      ]
    }
  ]
}
