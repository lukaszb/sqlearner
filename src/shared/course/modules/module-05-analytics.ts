import type { CourseModule } from '../types.js'

export const analyticsModule: CourseModule = {
  id: 'analytics',
  level: 'advanced',
  title: 'Analyst toolkit',
  description:
    'Answer real marketplace questions with CTEs, window functions, cohorts and segmentation, then assemble everything into a single KPI report on the Olist data.',
  lessons: [
    {
      id: 'analytics-cte',
      title: 'Lesson 1 - Readable queries with CTEs (WITH)',
      goal: 'Break a long analytical question into named steps with WITH so the query reads from top to bottom like a recipe.',
      tables: ['orders', 'order_items', 'customers'],
      blocks: [
        {
          kind: 'text',
          text: 'A common table expression, or CTE, is a named result set defined with WITH and used later in the same statement. Analysts reach for CTEs constantly because a business question is rarely one aggregation: you usually shape the rows, then aggregate them, then compare the aggregate against a benchmark. Each of those is a step, and each step gets a name.'
        },
        {
          kind: 'list',
          title: 'Why analysts prefer CTEs over nested subqueries',
          items: [
            'The steps read in the order you think about them instead of inside out.',
            'Every step gets a name, so the query documents its own logic.',
            'A CTE can be referenced more than once in the same statement.',
            'You can run the query with the final SELECT replaced by SELECT * FROM one_step to debug a single stage.'
          ]
        },
        {
          kind: 'sql',
          title: 'One CTE: revenue per order, then the average order value',
          sql: 'WITH order_revenue AS (\n  SELECT\n    order_id,\n    SUM(CAST(price AS REAL)) AS revenue\n  FROM order_items\n  GROUP BY order_id\n)\nSELECT\n  COUNT(*) AS orders_measured,\n  ROUND(AVG(revenue), 2) AS avg_order_revenue\nFROM order_revenue;',
          explanation: 'The CTE turns item rows into one row per order, and the outer query then averages those order totals, which is the correct way to compute average order value.',
          breakdown: [
            { part: 'WITH order_revenue AS (', meaning: 'Start a named step called order_revenue that the final SELECT can read like a table.' },
            { part: 'SELECT order_id, SUM(CAST(price AS REAL)) AS revenue', meaning: 'Inside the step, add up the item prices of each order; CAST is needed because price is stored as TEXT.' },
            { part: 'FROM order_items', meaning: 'The step reads the one-row-per-item table.' },
            { part: 'GROUP BY order_id', meaning: 'Collapse the items of one order into a single row carrying that order total.' },
            { part: ')', meaning: 'Close the step definition.' },
            { part: 'SELECT COUNT(*) AS orders_measured', meaning: 'In the outer query, count how many orders the step produced.' },
            { part: 'ROUND(AVG(revenue), 2) AS avg_order_revenue', meaning: 'Average the per-order totals and round to two decimals.' },
            { part: 'FROM order_revenue', meaning: 'Read the rows produced by the CTE instead of the raw item table.' }
          ]
        },
        {
          kind: 'note',
          text: 'Averaging price directly from order_items would give the average item price, not the average order value. The CTE is what makes the grain of the calculation explicit.'
        },
        {
          kind: 'sql',
          title: 'Two CTEs chained: revenue by customer state for delivered orders',
          sql: "WITH delivered_orders AS (\n  SELECT\n    o.order_id AS order_id,\n    c.customer_state AS state\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE o.order_status = 'delivered'\n),\nstate_revenue AS (\n  SELECT\n    d.state AS state,\n    SUM(CAST(oi.price AS REAL)) AS revenue,\n    COUNT(DISTINCT d.order_id) AS orders\n  FROM delivered_orders AS d\n  JOIN order_items AS oi ON oi.order_id = d.order_id\n  GROUP BY d.state\n)\nSELECT\n  state,\n  orders,\n  ROUND(revenue, 2) AS revenue,\n  ROUND(revenue / orders, 2) AS avg_order_value\nFROM state_revenue\nORDER BY revenue DESC\nLIMIT 10;",
          explanation: 'The first step decides which orders count and where they belong, the second step aggregates money onto that skeleton, and the final SELECT only formats and ranks.',
          breakdown: [
            { part: 'WITH delivered_orders AS (', meaning: 'Define the first step: the set of orders that actually reached the customer.' },
            { part: 'SELECT o.order_id AS order_id, c.customer_state AS state', meaning: 'Keep only the two facts later steps need: the order key and the buyer state.' },
            { part: 'JOIN customers AS c ON c.customer_id = o.customer_id', meaning: 'Attach the customer row so the order inherits a state; customer_id is the per-order customer key.' },
            { part: "WHERE o.order_status = 'delivered'", meaning: 'Exclude cancelled and unavailable orders so the revenue figure is real money.' },
            { part: '),', meaning: 'Close the first step; the comma announces another CTE rather than a new statement.' },
            { part: 'state_revenue AS (', meaning: 'Define the second step, which is allowed to read the first one.' },
            { part: 'SUM(CAST(oi.price AS REAL)) AS revenue', meaning: 'Add up item prices for the surviving orders.' },
            { part: 'COUNT(DISTINCT d.order_id) AS orders', meaning: 'Count orders, not items, so multi-item orders are not counted twice.' },
            { part: 'GROUP BY d.state', meaning: 'Produce one row per Brazilian state.' },
            { part: 'ORDER BY revenue DESC', meaning: 'Rank the states by money, largest first.' },
            { part: 'LIMIT 10', meaning: 'Show only the ten largest markets.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Referencing one CTE twice: orders above the average order value',
          sql: 'WITH order_revenue AS (\n  SELECT\n    order_id,\n    SUM(CAST(price AS REAL)) AS revenue\n  FROM order_items\n  GROUP BY order_id\n),\nbenchmark AS (\n  SELECT AVG(revenue) AS avg_revenue\n  FROM order_revenue\n)\nSELECT\n  COUNT(*) AS orders_above_average,\n  ROUND((SELECT avg_revenue FROM benchmark), 2) AS average_order_value\nFROM order_revenue\nWHERE revenue > (SELECT avg_revenue FROM benchmark);',
          explanation: 'Comparing rows against an aggregate of the same rows is the classic case where a CTE saves you from computing the same subquery twice.',
          breakdown: [
            { part: 'WITH order_revenue AS ( ... )', meaning: 'Step one produces one row per order with its total value.' },
            { part: 'benchmark AS (SELECT AVG(revenue) AS avg_revenue FROM order_revenue)', meaning: 'Step two collapses step one into a single number, the average order value.' },
            { part: 'FROM order_revenue', meaning: 'The final SELECT reads step one again, at order grain.' },
            { part: 'WHERE revenue > (SELECT avg_revenue FROM benchmark)', meaning: 'Compare each order against the single benchmark value; a scalar subquery on a one-row CTE is safe here.' },
            { part: 'COUNT(*) AS orders_above_average', meaning: 'Count how many orders cleared the benchmark.' },
            { part: 'ROUND((SELECT avg_revenue FROM benchmark), 2)', meaning: 'Show the benchmark itself next to the count so the number has context.' }
          ]
        }
      ],
      practice: {
        task: 'Using CTEs, report total freight paid per customer state for delivered orders, showing the five states with the highest freight bill.',
        hint: 'Step one: delivered orders joined to customers. Step two: join that to order_items and SUM(CAST(freight_value AS REAL)) grouped by state.',
        solution: "WITH delivered_orders AS (\n  SELECT o.order_id AS order_id, c.customer_state AS state\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE o.order_status = 'delivered'\n),\nstate_freight AS (\n  SELECT d.state AS state, SUM(CAST(oi.freight_value AS REAL)) AS freight\n  FROM delivered_orders AS d\n  JOIN order_items AS oi ON oi.order_id = d.order_id\n  GROUP BY d.state\n)\nSELECT state, ROUND(freight, 2) AS freight\nFROM state_freight\nORDER BY freight DESC\nLIMIT 5;"
      },
      questions: [
        {
          id: 'analytics-cte-q1',
          prompt: 'What does the WITH keyword introduce?',
          options: [
            'A named result set that the rest of the statement can read like a table',
            'A permanent table stored in the database file',
            'A temporary index used to speed up the join',
            'A transaction that must be committed'
          ],
          answer: 'A named result set that the rest of the statement can read like a table',
          explanation: 'A CTE exists only for the duration of the statement that defines it.'
        },
        {
          id: 'analytics-cte-q2',
          prompt: 'How do you define a second CTE after the first one?',
          options: [
            'Close the first with a parenthesis, add a comma, then name_two AS ( ... )',
            'Write the word WITH again before the second name',
            'Separate the two definitions with a semicolon',
            'Nest the second definition inside the first'
          ],
          answer: 'Close the first with a parenthesis, add a comma, then name_two AS ( ... )',
          explanation: 'WITH appears once; every further step is separated by a comma.'
        },
        {
          id: 'analytics-cte-q3',
          prompt: 'Why does the average order value query aggregate inside a CTE first?',
          options: [
            'Because AVG over order_items would return the average item price, not the average order total',
            'Because AVG cannot be used in an outer query',
            'Because order_items has no order_id column',
            'Because CAST only works inside a CTE'
          ],
          answer: 'Because AVG over order_items would return the average item price, not the average order total',
          explanation: 'The CTE changes the grain from one row per item to one row per order before averaging.'
        },
        {
          id: 'analytics-cte-q4',
          prompt: 'Spot the mistake in this fragment.',
          code: 'WITH a AS (SELECT 1 AS x);\nSELECT * FROM a;',
          options: [
            'The semicolon after the CTE ends the statement, so the SELECT can no longer see a',
            'A CTE cannot select a constant',
            'The alias x is not allowed',
            'SELECT * is not allowed on a CTE'
          ],
          answer: 'The semicolon after the CTE ends the statement, so the SELECT can no longer see a',
          explanation: 'A CTE and the query that uses it must be one single statement.'
        },
        {
          id: 'analytics-cte-q5',
          prompt: 'In the state revenue query, why is COUNT(DISTINCT d.order_id) used instead of COUNT(*)?',
          options: [
            'Because the join to order_items repeats an order once per item',
            'Because COUNT(*) ignores NULL values',
            'Because order_id is stored as TEXT',
            'Because DISTINCT makes the query faster'
          ],
          answer: 'Because the join to order_items repeats an order once per item',
          explanation: 'After joining to items the grain is one row per item, so counting rows would overstate order volume.'
        },
        {
          id: 'analytics-cte-q6',
          prompt: 'A colleague wants to see only the intermediate step delivered_orders while debugging. What is the quickest change?',
          options: [
            'Keep the WITH block and replace the final SELECT with SELECT * FROM delivered_orders LIMIT 20',
            'Delete every CTE except the last one',
            'Wrap the whole query in another CTE',
            'Add LIMIT 20 inside the delivered_orders definition and run it as is'
          ],
          answer: 'Keep the WITH block and replace the final SELECT with SELECT * FROM delivered_orders LIMIT 20',
          explanation: 'Because each step is named, you can point the final SELECT at any stage to inspect it.'
        }
      ]
    },
    {
      id: 'analytics-window',
      title: 'Lesson 2 - Window functions: ROW_NUMBER, RANK and DENSE_RANK',
      goal: 'Rank rows inside groups with OVER (PARTITION BY ... ORDER BY ...) without collapsing the detail the way GROUP BY does.',
      tables: ['order_items', 'orders', 'sellers', 'products', 'customers'],
      blocks: [
        {
          kind: 'text',
          text: 'GROUP BY answers how much in total. Window functions answer where does this row sit compared to its neighbours. A window function runs after the grouping and filtering, looks at a window of related rows, and returns one value per row without removing any rows. The window is described by OVER: PARTITION BY splits the rows into independent groups and ORDER BY decides the sequence inside each group.'
        },
        {
          kind: 'list',
          title: 'The three ranking functions',
          items: [
            'ROW_NUMBER() gives 1, 2, 3, 4 with no ties ever; two equal values still get different numbers.',
            'RANK() gives 1, 2, 2, 4: ties share a rank and the next rank skips the gap.',
            'DENSE_RANK() gives 1, 2, 2, 3: ties share a rank and no gap is left behind.',
            'Use ROW_NUMBER when you need exactly one winner per group, RANK when a tie should count as a shared position, DENSE_RANK when you want the top three distinct values.'
          ]
        },
        {
          kind: 'sql',
          title: 'The business question: who are the top three sellers in each state?',
          sql: "WITH seller_revenue AS (\n  SELECT\n    s.seller_state AS state,\n    oi.seller_id AS seller_id,\n    SUM(CAST(oi.price AS REAL)) AS revenue\n  FROM order_items AS oi\n  JOIN sellers AS s ON s.seller_id = oi.seller_id\n  JOIN orders AS o ON o.order_id = oi.order_id\n  WHERE o.order_status = 'delivered'\n  GROUP BY s.seller_state, oi.seller_id\n),\nranked AS (\n  SELECT\n    state,\n    seller_id,\n    revenue,\n    ROW_NUMBER() OVER (PARTITION BY state ORDER BY revenue DESC) AS rank_in_state\n  FROM seller_revenue\n)\nSELECT\n  state,\n  rank_in_state,\n  seller_id,\n  ROUND(revenue, 2) AS revenue\nFROM ranked\nWHERE rank_in_state <= 3\nORDER BY state, rank_in_state;",
          explanation: 'Aggregate first to one row per seller per state, then number those rows inside each state and keep the first three.',
          breakdown: [
            { part: 'WITH seller_revenue AS (', meaning: 'Step one builds the grain the ranking needs: one row per seller per state.' },
            { part: 'JOIN sellers AS s ON s.seller_id = oi.seller_id', meaning: 'Attach the seller record so each item row carries a seller state.' },
            { part: "JOIN orders AS o ... WHERE o.order_status = 'delivered'", meaning: 'Restrict to delivered orders so cancelled sales do not inflate a seller.' },
            { part: 'GROUP BY s.seller_state, oi.seller_id', meaning: 'Collapse items into one revenue total per seller within a state.' },
            { part: 'ranked AS (', meaning: 'Step two adds the ranking column without changing the number of rows.' },
            { part: 'ROW_NUMBER() OVER (', meaning: 'Number the rows of the window; the parentheses after OVER describe that window.' },
            { part: 'PARTITION BY state', meaning: 'Restart the numbering for every state, so each state has its own 1, 2, 3.' },
            { part: 'ORDER BY revenue DESC', meaning: 'Inside a state, the largest revenue is numbered 1.' },
            { part: ') AS rank_in_state', meaning: 'Close the window definition and name the resulting column.' },
            { part: 'WHERE rank_in_state <= 3', meaning: 'Filter in the outer query, because a window function cannot be used in the WHERE of the query that computes it.' },
            { part: 'ORDER BY state, rank_in_state', meaning: 'Present the leaderboard state by state, best seller first.' }
          ]
        },
        {
          kind: 'note',
          text: 'You cannot write WHERE ROW_NUMBER() OVER (...) <= 3 in the same SELECT. Window functions are evaluated after WHERE, so the ranking must be computed in a CTE or subquery and filtered one level up.'
        },
        {
          kind: 'sql',
          title: 'Comparing the three functions side by side',
          sql: "WITH category_revenue AS (\n  SELECT\n    p.product_category_name AS category,\n    SUM(CAST(oi.price AS REAL)) AS revenue\n  FROM order_items AS oi\n  JOIN products AS p ON p.product_id = oi.product_id\n  WHERE NULLIF(p.product_category_name, '') IS NOT NULL\n  GROUP BY p.product_category_name\n)\nSELECT\n  category,\n  ROUND(revenue, 2) AS revenue,\n  ROW_NUMBER() OVER (ORDER BY revenue DESC) AS row_number_rank,\n  RANK() OVER (ORDER BY revenue DESC) AS rank_with_gaps,\n  DENSE_RANK() OVER (ORDER BY revenue DESC) AS dense_rank_no_gaps\nFROM category_revenue\nORDER BY revenue DESC\nLIMIT 15;",
          explanation: 'Putting the three functions next to each other on the same window makes the tie behaviour obvious.',
          breakdown: [
            { part: 'WITH category_revenue AS ( ... )', meaning: 'Build one revenue row per product category.' },
            { part: "WHERE NULLIF(p.product_category_name, '') IS NOT NULL", meaning: 'Drop products whose category is an empty string, which is how the import stores a missing value.' },
            { part: 'ROW_NUMBER() OVER (ORDER BY revenue DESC)', meaning: 'A window with no PARTITION BY covers the whole result, so this numbers every category once.' },
            { part: 'RANK() OVER (ORDER BY revenue DESC)', meaning: 'Same window, but equal revenues share a rank and the following rank jumps.' },
            { part: 'DENSE_RANK() OVER (ORDER BY revenue DESC)', meaning: 'Same window again, but the sequence never skips a number after a tie.' },
            { part: 'ORDER BY revenue DESC', meaning: 'The final ORDER BY controls the display order and is separate from the window ORDER BY.' },
            { part: 'LIMIT 15', meaning: 'Show the top of the list only.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Picking exactly one row per group: the first order of each customer',
          sql: "WITH customer_orders AS (\n  SELECT\n    c.customer_unique_id AS person,\n    o.order_id AS order_id,\n    o.order_purchase_timestamp AS purchased_at,\n    ROW_NUMBER() OVER (\n      PARTITION BY c.customer_unique_id\n      ORDER BY o.order_purchase_timestamp\n    ) AS purchase_seq\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n)\nSELECT person, order_id, purchased_at\nFROM customer_orders\nWHERE purchase_seq = 1\nLIMIT 20;",
          explanation: 'Numbering each person orders by date and keeping number one is the standard way to isolate a first event per entity.',
          breakdown: [
            { part: 'JOIN customers AS c ON c.customer_id = o.customer_id', meaning: 'orders stores the per-order customer_id, so the join is required to reach the person identifier.' },
            { part: 'PARTITION BY c.customer_unique_id', meaning: 'Restart the numbering for every real person, not for every order-level customer key.' },
            { part: 'ORDER BY o.order_purchase_timestamp', meaning: 'Order the person orders oldest first; the timestamp text sorts correctly because it is written year first.' },
            { part: 'AS purchase_seq', meaning: 'Name the sequence column so the outer query can filter on it.' },
            { part: "WHERE NULLIF(o.order_purchase_timestamp, '') IS NOT NULL", meaning: 'Exclude rows with a missing timestamp so they cannot land in position one.' },
            { part: 'WHERE purchase_seq = 1', meaning: 'Keep only the earliest order of each person.' }
          ]
        }
      ],
      practice: {
        task: 'List the two highest priced items ever sold in each product category, showing the category, the product_id and the price.',
        hint: 'Join order_items to products, add ROW_NUMBER() OVER (PARTITION BY product_category_name ORDER BY CAST(price AS REAL) DESC) in a CTE, then filter the numbering in the outer query.',
        solution: "WITH item_rank AS (\n  SELECT\n    p.product_category_name AS category,\n    oi.product_id AS product_id,\n    CAST(oi.price AS REAL) AS price,\n    ROW_NUMBER() OVER (\n      PARTITION BY p.product_category_name\n      ORDER BY CAST(oi.price AS REAL) DESC\n    ) AS price_rank\n  FROM order_items AS oi\n  JOIN products AS p ON p.product_id = oi.product_id\n  WHERE NULLIF(p.product_category_name, '') IS NOT NULL\n)\nSELECT category, price_rank, product_id, price\nFROM item_rank\nWHERE price_rank <= 2\nORDER BY category, price_rank;"
      },
      questions: [
        {
          id: 'analytics-window-q1',
          prompt: 'What does PARTITION BY do inside an OVER clause?',
          options: [
            'It splits the rows into independent groups so the function restarts in each group',
            'It removes duplicate rows from the result',
            'It sorts the final output',
            'It stores the result in separate tables'
          ],
          answer: 'It splits the rows into independent groups so the function restarts in each group',
          explanation: 'PARTITION BY is the window equivalent of GROUP BY, except the detail rows survive.'
        },
        {
          id: 'analytics-window-q2',
          prompt: 'Four sellers have revenues 900, 800, 800 and 700. What does RANK() return for the seller with 700?',
          options: ['4', '3', '2', '1'],
          answer: '4',
          explanation: 'RANK shares position 2 for the tie and then skips position 3, so the next value is 4.'
        },
        {
          id: 'analytics-window-q3',
          prompt: 'For the same four values, what does DENSE_RANK() return for the seller with 700?',
          options: ['3', '4', '2', '1'],
          answer: '3',
          explanation: 'DENSE_RANK never leaves a gap after a tie, so the sequence is 1, 2, 2, 3.'
        },
        {
          id: 'analytics-window-q4',
          prompt: 'Spot the mistake.',
          code: 'SELECT state, seller_id,\n  ROW_NUMBER() OVER (PARTITION BY state ORDER BY revenue DESC) AS r\nFROM seller_revenue\nWHERE r <= 3;',
          options: [
            'WHERE runs before window functions, so r does not exist yet and the ranking must be filtered one level up',
            'ROW_NUMBER needs a PARTITION BY on seller_id as well',
            'OVER cannot contain ORDER BY',
            'The alias r must be written in double quotes'
          ],
          answer: 'WHERE runs before window functions, so r does not exist yet and the ranking must be filtered one level up',
          explanation: 'Wrap the ranking in a CTE or subquery and apply the filter in the enclosing query.'
        },
        {
          id: 'analytics-window-q5',
          prompt: 'Which function guarantees exactly one row per group when you filter on the value 1?',
          options: ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'NTILE(1)'],
          answer: 'ROW_NUMBER()',
          explanation: 'RANK and DENSE_RANK can both return 1 for several tied rows, while ROW_NUMBER never ties.'
        },
        {
          id: 'analytics-window-q6',
          prompt: 'Why does the first-order query partition by customer_unique_id rather than customer_id?',
          options: [
            'customer_id identifies a customer within one order, while customer_unique_id identifies the person across orders',
            'customer_id is not indexed',
            'customer_unique_id is stored in the orders table',
            'customer_id contains empty strings'
          ],
          answer: 'customer_id identifies a customer within one order, while customer_unique_id identifies the person across orders',
          explanation: 'Partitioning by customer_id would make every order look like a first order.'
        }
      ]
    },
    {
      id: 'analytics-running',
      title: 'Lesson 3 - Running totals, moving averages, LAG and LEAD',
      goal: 'Use window frames to accumulate values over time and use LAG and LEAD to compare a row with its neighbours.',
      tables: ['orders', 'order_items', 'customers'],
      blocks: [
        {
          kind: 'text',
          text: 'When a window has an ORDER BY, every row also gets a frame: the slice of the partition that the aggregate actually sees. The default frame runs from the start of the partition to the current row, which is exactly what a running total needs. Change the frame and the same SUM or AVG becomes a moving average.'
        },
        {
          kind: 'list',
          title: 'Frame vocabulary worth memorising',
          items: [
            'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW - everything so far, the running total frame.',
            'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW - the current row plus the two before it, a three point moving average.',
            'ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING - the rest of the partition, useful for remaining backlog.',
            'LAG(col, 1) - the value of col one row earlier in the window; LEAD(col, 1) - one row later.'
          ]
        },
        {
          kind: 'sql',
          title: 'Running total of monthly revenue',
          sql: "WITH monthly AS (\n  SELECT\n    strftime('%Y-%m', o.order_purchase_timestamp) AS month,\n    SUM(CAST(oi.price AS REAL)) AS revenue\n  FROM orders AS o\n  JOIN order_items AS oi ON oi.order_id = o.order_id\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY month\n)\nSELECT\n  month,\n  ROUND(revenue, 2) AS revenue,\n  ROUND(\n    SUM(revenue) OVER (\n      ORDER BY month\n      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n    ),\n    2\n  ) AS revenue_to_date\nFROM monthly\nORDER BY month;",
          explanation: 'The CTE reduces the data to one row per month and the window then accumulates those months into a cumulative revenue curve.',
          breakdown: [
            { part: "strftime('%Y-%m', o.order_purchase_timestamp) AS month", meaning: 'Cut the text timestamp down to a year-month label such as 2017-05.' },
            { part: "WHERE o.order_status = 'delivered'", meaning: 'Only delivered orders count as revenue.' },
            { part: "AND NULLIF(o.order_purchase_timestamp, '') IS NOT NULL", meaning: 'Skip rows whose timestamp is an empty string, which would otherwise produce a NULL month bucket.' },
            { part: 'GROUP BY month', meaning: 'One row per calendar month.' },
            { part: 'SUM(revenue) OVER (', meaning: 'Aggregate across rows of the window instead of collapsing them.' },
            { part: 'ORDER BY month', meaning: 'Inside the window, walk the months in chronological order.' },
            { part: 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', meaning: 'The frame for each month is every earlier month plus this one, which is what makes the total cumulative.' },
            { part: ') AS revenue_to_date', meaning: 'Name the cumulative column.' },
            { part: 'ORDER BY month', meaning: 'The outer ORDER BY sorts the printed report; the window has its own ordering.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Three month moving average of order volume',
          sql: "WITH monthly AS (\n  SELECT\n    strftime('%Y-%m', order_purchase_timestamp) AS month,\n    COUNT(*) AS orders\n  FROM orders\n  WHERE NULLIF(order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY month\n)\nSELECT\n  month,\n  orders,\n  ROUND(\n    AVG(orders) OVER (\n      ORDER BY month\n      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW\n    ),\n    1\n  ) AS moving_avg_3m\nFROM monthly\nORDER BY month;",
          explanation: 'A moving average smooths the spiky monthly counts so the underlying growth trend becomes visible.',
          breakdown: [
            { part: 'COUNT(*) AS orders', meaning: 'Count orders per month; the orders table is already one row per order.' },
            { part: 'AVG(orders) OVER (', meaning: 'Average across a moving slice of months rather than the whole series.' },
            { part: 'ORDER BY month', meaning: 'Define what preceding means: the previous month labels in ascending order.' },
            { part: 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW', meaning: 'Each row averages itself and the two months before it, giving a three month window.' },
            { part: 'ROUND(..., 1)', meaning: 'One decimal is enough precision for a smoothed count.' },
            { part: 'ORDER BY month', meaning: 'Print the series in date order so the trend reads left to right.' }
          ]
        },
        {
          kind: 'note',
          text: 'The first two rows of a three month moving average are computed from fewer months, so they are not comparable to the rest. Analysts usually drop or annotate those warm-up rows.'
        },
        {
          kind: 'sql',
          title: 'LAG and LEAD: days between a customer consecutive orders',
          sql: "WITH person_orders AS (\n  SELECT\n    c.customer_unique_id AS person,\n    o.order_purchase_timestamp AS purchased_at\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n),\ngaps AS (\n  SELECT\n    person,\n    purchased_at,\n    LAG(purchased_at) OVER (PARTITION BY person ORDER BY purchased_at) AS previous_purchase,\n    LEAD(purchased_at) OVER (PARTITION BY person ORDER BY purchased_at) AS next_purchase\n  FROM person_orders\n)\nSELECT\n  person,\n  previous_purchase,\n  purchased_at,\n  ROUND(julianday(purchased_at) - julianday(previous_purchase), 1) AS days_since_previous\nFROM gaps\nWHERE previous_purchase IS NOT NULL\nORDER BY days_since_previous DESC\nLIMIT 20;",
          explanation: 'LAG pulls the previous purchase date onto the current row so the gap between two events becomes a simple subtraction.',
          breakdown: [
            { part: 'JOIN customers AS c ON c.customer_id = o.customer_id', meaning: 'Reach customer_unique_id so several orders by the same person land in one partition.' },
            { part: 'LAG(purchased_at) OVER (', meaning: 'Look one row backwards inside the window and copy that value onto this row.' },
            { part: 'PARTITION BY person', meaning: 'Never look back past the boundary into another person history.' },
            { part: 'ORDER BY purchased_at', meaning: 'Backwards means earlier in time, so the window must be ordered by date.' },
            { part: 'LEAD(purchased_at) OVER (PARTITION BY person ORDER BY purchased_at)', meaning: 'The mirror image: the next purchase date, useful for churn and next-event analysis.' },
            { part: 'julianday(purchased_at) - julianday(previous_purchase)', meaning: 'Convert both text timestamps to day numbers and subtract to get a gap in days.' },
            { part: 'WHERE previous_purchase IS NOT NULL', meaning: 'A person first order has no predecessor, so LAG returns NULL and the row is dropped.' },
            { part: 'ORDER BY days_since_previous DESC', meaning: 'Show the longest dormancy gaps first.' }
          ]
        }
      ],
      practice: {
        task: 'Build a monthly series of delivered order counts with a running total of orders placed to date.',
        hint: 'Aggregate to month in a CTE, then apply COUNT in the CTE and SUM(...) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) outside.',
        solution: "WITH monthly AS (\n  SELECT\n    strftime('%Y-%m', order_purchase_timestamp) AS month,\n    COUNT(*) AS orders\n  FROM orders\n  WHERE order_status = 'delivered'\n    AND NULLIF(order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY month\n)\nSELECT\n  month,\n  orders,\n  SUM(orders) OVER (\n    ORDER BY month\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n  ) AS orders_to_date\nFROM monthly\nORDER BY month;"
      },
      questions: [
        {
          id: 'analytics-running-q1',
          prompt: 'What does the frame ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW produce with SUM?',
          options: [
            'A running total that accumulates from the first row of the partition to the current row',
            'The grand total repeated on every row',
            'The sum of the next rows only',
            'The average of the whole partition'
          ],
          answer: 'A running total that accumulates from the first row of the partition to the current row',
          explanation: 'The frame grows one row at a time, which is exactly a cumulative sum.'
        },
        {
          id: 'analytics-running-q2',
          prompt: 'Which frame gives a three month moving average?',
          options: [
            'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW',
            'ROWS BETWEEN 3 PRECEDING AND CURRENT ROW',
            'ROWS BETWEEN CURRENT ROW AND 3 FOLLOWING',
            'ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING'
          ],
          answer: 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW',
          explanation: 'Two preceding rows plus the current row is three rows in total.'
        },
        {
          id: 'analytics-running-q3',
          prompt: 'What does LAG(purchased_at) OVER (PARTITION BY person ORDER BY purchased_at) return for a person first order?',
          options: ['NULL', 'The same purchase date', 'Zero', 'The last order date of the previous person'],
          answer: 'NULL',
          explanation: 'There is no earlier row inside that partition, so LAG has nothing to fetch.'
        },
        {
          id: 'analytics-running-q4',
          prompt: 'Why is julianday used to measure the gap between two timestamps?',
          options: [
            'It converts a text timestamp to a number of days so the two values can be subtracted',
            'It rounds a timestamp to the nearest month',
            'It converts a timestamp to a Unix epoch in seconds',
            'It is required by every window function'
          ],
          answer: 'It converts a text timestamp to a number of days so the two values can be subtracted',
          explanation: 'Subtracting the raw TEXT values would not produce a meaningful number.'
        },
        {
          id: 'analytics-running-q5',
          prompt: 'Spot the mistake.',
          code: "SELECT month, SUM(revenue) OVER (ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS revenue_to_date\nFROM monthly;",
          options: [
            'The window has no ORDER BY, so the accumulation order is undefined and the running total is meaningless',
            'SUM cannot be used as a window function',
            'The frame clause must come before the ORDER BY',
            'revenue_to_date is a reserved word'
          ],
          answer: 'The window has no ORDER BY, so the accumulation order is undefined and the running total is meaningless',
          explanation: 'A frame is only meaningful once the window defines a sequence with ORDER BY.'
        },
        {
          id: 'analytics-running-q6',
          prompt: 'You want to know how many days pass before a customer next order. Which function gives you that date on the current row?',
          options: ['LEAD(purchased_at)', 'LAG(purchased_at)', 'FIRST_VALUE(purchased_at)', 'ROW_NUMBER()'],
          answer: 'LEAD(purchased_at)',
          explanation: 'LEAD looks forward in the window, LAG looks backward.'
        }
      ]
    },
    {
      id: 'analytics-trends',
      title: 'Lesson 4 - Monthly trends and month-over-month growth',
      goal: 'Turn a raw order log into a monthly trend table with growth percentages an executive can read.',
      tables: ['orders', 'order_items', 'order_payments'],
      blocks: [
        {
          kind: 'text',
          text: 'A trend report is three decisions: what is the time bucket, what is the metric, and what is the comparison. In this dataset the bucket comes from strftime, the metric comes from an aggregate, and the comparison comes from LAG. Growth is then (this month minus last month) divided by last month.'
        },
        {
          kind: 'sql',
          title: 'The monthly metric table: orders, revenue and average order value',
          sql: "WITH monthly AS (\n  SELECT\n    strftime('%Y-%m', o.order_purchase_timestamp) AS month,\n    COUNT(DISTINCT o.order_id) AS orders,\n    SUM(CAST(oi.price AS REAL)) AS revenue\n  FROM orders AS o\n  JOIN order_items AS oi ON oi.order_id = o.order_id\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY month\n)\nSELECT\n  month,\n  orders,\n  ROUND(revenue, 2) AS revenue,\n  ROUND(revenue / orders, 2) AS avg_order_value\nFROM monthly\nORDER BY month;",
          explanation: 'Before you can measure growth you need a clean one-row-per-month table with the metrics defined once and only once.',
          breakdown: [
            { part: "strftime('%Y-%m', o.order_purchase_timestamp) AS month", meaning: 'Bucket every order into the calendar month in which it was placed.' },
            { part: 'COUNT(DISTINCT o.order_id) AS orders', meaning: 'The join to items multiplies rows, so orders must be counted distinctly.' },
            { part: 'SUM(CAST(oi.price AS REAL)) AS revenue', meaning: 'Item prices are TEXT, so cast before summing.' },
            { part: "WHERE o.order_status = 'delivered'", meaning: 'Define revenue as money on delivered orders, and state that definition in the query itself.' },
            { part: 'GROUP BY month', meaning: 'Collapse to one row per month.' },
            { part: 'ROUND(revenue / orders, 2) AS avg_order_value', meaning: 'Average order value is derived from the two aggregates, not averaged separately.' },
            { part: 'ORDER BY month', meaning: 'Year-month text sorts chronologically because the year comes first.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Month-over-month growth with LAG',
          sql: "WITH monthly AS (\n  SELECT\n    strftime('%Y-%m', o.order_purchase_timestamp) AS month,\n    SUM(CAST(oi.price AS REAL)) AS revenue\n  FROM orders AS o\n  JOIN order_items AS oi ON oi.order_id = o.order_id\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY month\n),\nwith_previous AS (\n  SELECT\n    month,\n    revenue,\n    LAG(revenue) OVER (ORDER BY month) AS previous_revenue\n  FROM monthly\n)\nSELECT\n  month,\n  ROUND(revenue, 2) AS revenue,\n  ROUND(previous_revenue, 2) AS previous_revenue,\n  CASE\n    WHEN previous_revenue IS NULL OR previous_revenue = 0 THEN NULL\n    ELSE ROUND(100.0 * (revenue - previous_revenue) / previous_revenue, 1)\n  END AS mom_growth_pct\nFROM with_previous\nORDER BY month;",
          explanation: 'LAG brings last month figure onto this month row, which turns a growth calculation into ordinary arithmetic.',
          breakdown: [
            { part: 'WITH monthly AS ( ... )', meaning: 'Step one is the clean monthly revenue series.' },
            { part: 'with_previous AS (', meaning: 'Step two widens each month row with the value of the month before it.' },
            { part: 'LAG(revenue) OVER (ORDER BY month)', meaning: 'No PARTITION BY because the whole series is one timeline; ORDER BY month defines what previous means.' },
            { part: 'CASE WHEN previous_revenue IS NULL OR previous_revenue = 0 THEN NULL', meaning: 'Guard the division: the first month has no predecessor and a zero base would divide by zero.' },
            { part: 'ELSE ROUND(100.0 * (revenue - previous_revenue) / previous_revenue, 1)', meaning: 'Percentage change; multiplying by 100.0 keeps the arithmetic in floating point.' },
            { part: 'END AS mom_growth_pct', meaning: 'Close the CASE and name the growth column.' },
            { part: 'ORDER BY month', meaning: 'Read the trend chronologically.' }
          ]
        },
        {
          kind: 'note',
          text: 'The Olist snapshot starts in late 2016 with only a handful of orders and stops mid 2018. The first and last months are partial, so a spectacular growth percentage there is an artefact of the data window, not a business result.'
        },
        {
          kind: 'sql',
          title: 'Share of the year and payment mix by month',
          sql: "WITH monthly_payments AS (\n  SELECT\n    strftime('%Y-%m', o.order_purchase_timestamp) AS month,\n    SUM(CASE WHEN p.payment_type = 'credit_card' THEN CAST(p.payment_value AS REAL) ELSE 0 END) AS card_value,\n    SUM(CAST(p.payment_value AS REAL)) AS total_value\n  FROM orders AS o\n  JOIN order_payments AS p ON p.order_id = o.order_id\n  WHERE NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY month\n)\nSELECT\n  month,\n  ROUND(total_value, 2) AS total_value,\n  ROUND(100.0 * card_value / total_value, 1) AS credit_card_share_pct,\n  ROUND(100.0 * total_value / SUM(total_value) OVER (), 2) AS share_of_all_months_pct\nFROM monthly_payments\nORDER BY month;",
          explanation: 'Conditional aggregation gives the payment mix inside each month, while an empty OVER () window gives every month its share of the whole period.',
          breakdown: [
            { part: "SUM(CASE WHEN p.payment_type = 'credit_card' THEN CAST(p.payment_value AS REAL) ELSE 0 END)", meaning: 'Conditional aggregation: add the value only when the payment was made by card.' },
            { part: 'SUM(CAST(p.payment_value AS REAL)) AS total_value', meaning: 'The denominator, all payment value in the month.' },
            { part: 'GROUP BY month', meaning: 'One row per month with both the numerator and the denominator side by side.' },
            { part: 'ROUND(100.0 * card_value / total_value, 1)', meaning: 'The card share of that month, expressed as a percentage.' },
            { part: 'SUM(total_value) OVER ()', meaning: 'An empty window covers every row of the result, so this is the grand total repeated on each row.' },
            { part: '100.0 * total_value / SUM(total_value) OVER ()', meaning: 'Each month share of the entire period, computed without a second query.' },
            { part: 'ORDER BY month', meaning: 'Chronological output.' }
          ]
        }
      ],
      practice: {
        task: 'Produce a monthly series of delivered orders together with the month-over-month change in order count as a percentage.',
        hint: 'Count orders per month in a CTE, add LAG(orders) OVER (ORDER BY month), then compute 100.0 * (orders - previous) / previous inside a CASE that guards against NULL.',
        solution: "WITH monthly AS (\n  SELECT\n    strftime('%Y-%m', order_purchase_timestamp) AS month,\n    COUNT(*) AS orders\n  FROM orders\n  WHERE order_status = 'delivered'\n    AND NULLIF(order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY month\n),\nwith_previous AS (\n  SELECT month, orders, LAG(orders) OVER (ORDER BY month) AS previous_orders\n  FROM monthly\n)\nSELECT\n  month,\n  orders,\n  previous_orders,\n  CASE\n    WHEN previous_orders IS NULL OR previous_orders = 0 THEN NULL\n    ELSE ROUND(100.0 * (orders - previous_orders) / previous_orders, 1)\n  END AS mom_growth_pct\nFROM with_previous\nORDER BY month;"
      },
      questions: [
        {
          id: 'analytics-trends-q1',
          prompt: "Which expression buckets an order into the month it was placed?",
          options: [
            "strftime('%Y-%m', order_purchase_timestamp)",
            "strftime('%m', order_purchase_timestamp)",
            "substr(order_purchase_timestamp, 6, 2)",
            "julianday(order_purchase_timestamp)"
          ],
          answer: "strftime('%Y-%m', order_purchase_timestamp)",
          explanation: 'Including the year keeps May 2017 and May 2018 in separate buckets.'
        },
        {
          id: 'analytics-trends-q2',
          prompt: 'Why is the month-over-month percentage wrapped in a CASE expression?',
          options: [
            'To avoid dividing by NULL for the first month and by zero for an empty month',
            'To convert the result to text',
            'Because ROUND cannot be used on a division',
            'Because LAG returns a string'
          ],
          answer: 'To avoid dividing by NULL for the first month and by zero for an empty month',
          explanation: 'The first row of the series has no previous value, so the guard returns NULL instead of an error or a misleading number.'
        },
        {
          id: 'analytics-trends-q3',
          prompt: 'What does SUM(total_value) OVER () return?',
          options: [
            'The grand total across all rows of the result, repeated on every row',
            'The running total up to the current row',
            'The total of the current group only',
            'An error, because OVER requires an ORDER BY'
          ],
          answer: 'The grand total across all rows of the result, repeated on every row',
          explanation: 'An empty OVER clause makes the whole result set one single window.'
        },
        {
          id: 'analytics-trends-q4',
          prompt: 'Which query answers the question: in which month did delivered revenue grow the most compared with the previous month?',
          options: [
            'Aggregate revenue by month, add LAG(revenue) OVER (ORDER BY month), compute the percentage change and sort by it',
            'Aggregate revenue by month and sort by revenue descending',
            'Rank orders by price with ROW_NUMBER and take the first row',
            'Sum revenue over the whole period and divide by the number of months'
          ],
          answer: 'Aggregate revenue by month, add LAG(revenue) OVER (ORDER BY month), compute the percentage change and sort by it',
          explanation: 'Growth is a comparison between neighbouring periods, which is what LAG provides.'
        },
        {
          id: 'analytics-trends-q5',
          prompt: 'Spot the mistake in this monthly revenue query.',
          code: "SELECT strftime('%Y-%m', o.order_purchase_timestamp) AS month,\n  COUNT(*) AS orders\nFROM orders AS o\nJOIN order_items AS oi ON oi.order_id = o.order_id\nGROUP BY month;",
          options: [
            'COUNT(*) counts item rows after the join, so it must be COUNT(DISTINCT o.order_id)',
            'GROUP BY cannot use a column alias',
            'strftime cannot be used in a SELECT list',
            'The join needs a WHERE clause to work'
          ],
          answer: 'COUNT(*) counts item rows after the join, so it must be COUNT(DISTINCT o.order_id)',
          explanation: 'Joining to order_items changes the grain from one row per order to one row per item.'
        },
        {
          id: 'analytics-trends-q6',
          prompt: 'A trend shows a 90 percent drop in the final month of the dataset. What should an analyst check first?',
          options: [
            'Whether the last month is only partially covered by the data snapshot',
            'Whether ROUND was applied to the wrong column',
            'Whether the ORDER BY should be descending',
            'Whether CAST was applied to payment_value'
          ],
          answer: 'Whether the last month is only partially covered by the data snapshot',
          explanation: 'Partial first and last periods are the most common cause of a fake collapse in a trend line.'
        }
      ]
    },
    {
      id: 'analytics-cohorts',
      title: 'Lesson 5 - Customer cohorts and repeat purchase rate',
      goal: 'Group people by the month of their first purchase and measure how many of them ever come back.',
      tables: ['orders', 'customers', 'order_items'],
      blocks: [
        {
          kind: 'text',
          text: 'A cohort is a group of customers who share a starting point, almost always the month of their first order. Cohort analysis answers whether the marketplace is getting better or worse at keeping people, because it compares like with like: customers acquired in March 2017 are only ever compared with other March 2017 customers.'
        },
        {
          kind: 'note',
          text: 'In this dataset customer_id is generated per order, so the same human being appears with a different customer_id for every purchase. Any cohort or retention query must join orders to customers and group by customer_unique_id, otherwise every customer looks brand new and the repeat rate collapses to zero.'
        },
        {
          kind: 'sql',
          title: 'How many people ever ordered twice?',
          sql: "WITH person_orders AS (\n  SELECT\n    c.customer_unique_id AS person,\n    COUNT(*) AS orders\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY c.customer_unique_id\n)\nSELECT\n  COUNT(*) AS people,\n  SUM(CASE WHEN orders > 1 THEN 1 ELSE 0 END) AS repeat_buyers,\n  ROUND(100.0 * SUM(CASE WHEN orders > 1 THEN 1 ELSE 0 END) / COUNT(*), 2) AS repeat_rate_pct\nFROM person_orders;",
          explanation: 'Counting orders per person first and then classifying those people is the general recipe for any customer level rate.',
          breakdown: [
            { part: 'JOIN customers AS c ON c.customer_id = o.customer_id', meaning: 'Translate the per-order customer key into the stable person identifier.' },
            { part: 'GROUP BY c.customer_unique_id', meaning: 'One row per real person, carrying their lifetime order count.' },
            { part: 'COUNT(*) AS people', meaning: 'In the outer query each row is now a person, so this counts distinct buyers.' },
            { part: 'SUM(CASE WHEN orders > 1 THEN 1 ELSE 0 END)', meaning: 'Conditional aggregation: add one for every person with more than one order.' },
            { part: '100.0 * ... / COUNT(*)', meaning: 'Turn the count into a percentage of the buyer base.' },
            { part: 'ROUND(..., 2) AS repeat_rate_pct', meaning: 'Two decimals, because in this marketplace the repeat rate is only a few percent.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Assign every person to an acquisition cohort',
          sql: "WITH person_orders AS (\n  SELECT\n    c.customer_unique_id AS person,\n    o.order_purchase_timestamp AS purchased_at\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n),\ncohorts AS (\n  SELECT\n    person,\n    strftime('%Y-%m', MIN(purchased_at)) AS cohort_month,\n    COUNT(*) AS lifetime_orders\n  FROM person_orders\n  GROUP BY person\n)\nSELECT\n  cohort_month,\n  COUNT(*) AS customers_acquired,\n  SUM(CASE WHEN lifetime_orders > 1 THEN 1 ELSE 0 END) AS returned_at_least_once,\n  ROUND(100.0 * SUM(CASE WHEN lifetime_orders > 1 THEN 1 ELSE 0 END) / COUNT(*), 2) AS repeat_rate_pct\nFROM cohorts\nGROUP BY cohort_month\nORDER BY cohort_month;",
          explanation: 'The cohort month is simply the month of a person earliest order, and the repeat rate is then computed inside each cohort.',
          breakdown: [
            { part: 'WITH person_orders AS ( ... )', meaning: 'Step one flattens orders to person and timestamp pairs.' },
            { part: 'cohorts AS (', meaning: 'Step two turns those pairs into one row per person.' },
            { part: "strftime('%Y-%m', MIN(purchased_at)) AS cohort_month", meaning: 'MIN finds the first purchase and strftime labels the cohort with its month.' },
            { part: 'COUNT(*) AS lifetime_orders', meaning: 'How many orders that person ever placed.' },
            { part: 'GROUP BY person', meaning: 'Collapse to the customer grain before any cohort maths.' },
            { part: 'GROUP BY cohort_month', meaning: 'In the final query each row becomes one acquisition month.' },
            { part: 'COUNT(*) AS customers_acquired', meaning: 'Cohort size: how many new people that month brought in.' },
            { part: 'SUM(CASE WHEN lifetime_orders > 1 THEN 1 ELSE 0 END)', meaning: 'How many of those people ever came back for a second order.' },
            { part: 'ORDER BY cohort_month', meaning: 'Read the cohorts in acquisition order to see whether retention improves over time.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Cohort value: what a cohort is worth per customer',
          sql: "WITH person_first AS (\n  SELECT\n    c.customer_unique_id AS person,\n    strftime('%Y-%m', MIN(o.order_purchase_timestamp)) AS cohort_month\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY c.customer_unique_id\n),\nperson_value AS (\n  SELECT\n    c.customer_unique_id AS person,\n    SUM(CAST(oi.price AS REAL)) AS lifetime_value\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  JOIN order_items AS oi ON oi.order_id = o.order_id\n  WHERE o.order_status = 'delivered'\n  GROUP BY c.customer_unique_id\n)\nSELECT\n  f.cohort_month,\n  COUNT(*) AS customers,\n  ROUND(SUM(v.lifetime_value), 2) AS cohort_revenue,\n  ROUND(AVG(v.lifetime_value), 2) AS revenue_per_customer\nFROM person_first AS f\nJOIN person_value AS v ON v.person = f.person\nGROUP BY f.cohort_month\nORDER BY f.cohort_month;",
          explanation: 'One CTE decides which cohort a person belongs to and a second measures what that person spent, so the join between them is at customer grain.',
          breakdown: [
            { part: 'person_first AS ( ... )', meaning: 'Map each person to the month they were acquired.' },
            { part: 'person_value AS ( ... )', meaning: 'Map each person to their total delivered spend.' },
            { part: 'JOIN order_items AS oi ON oi.order_id = o.order_id', meaning: 'Money lives in the item table, so the value CTE has to descend one level further.' },
            { part: "WHERE o.order_status = 'delivered'", meaning: 'Only delivered orders are counted as value.' },
            { part: 'JOIN person_value AS v ON v.person = f.person', meaning: 'Both CTEs are one row per person, so this join cannot multiply rows.' },
            { part: 'COUNT(*) AS customers', meaning: 'Cohort size after the join, in customers not orders.' },
            { part: 'AVG(v.lifetime_value) AS revenue_per_customer', meaning: 'The comparable metric across cohorts of different sizes.' },
            { part: 'GROUP BY f.cohort_month', meaning: 'Report one row per acquisition month.' }
          ]
        }
      ],
      practice: {
        task: 'Find the ten customers who placed the most orders, showing their customer_unique_id and order count.',
        hint: 'Join orders to customers, GROUP BY customer_unique_id, count the orders and sort descending.',
        solution: "SELECT\n  c.customer_unique_id AS person,\n  COUNT(*) AS orders\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nGROUP BY c.customer_unique_id\nORDER BY orders DESC\nLIMIT 10;"
      },
      questions: [
        {
          id: 'analytics-cohorts-q1',
          prompt: 'Which column identifies the same human being across several orders?',
          options: ['customer_unique_id', 'customer_id', 'order_id', 'customer_zip_code_prefix'],
          answer: 'customer_unique_id',
          explanation: 'customers.customer_id is generated per order; customer_unique_id is the stable person key.'
        },
        {
          id: 'analytics-cohorts-q2',
          prompt: 'What defines a customer cohort in this lesson?',
          options: [
            'The month of the customer first order',
            'The state the customer lives in',
            'The payment type of the last order',
            'The product category most often bought'
          ],
          answer: 'The month of the customer first order',
          explanation: 'Acquisition month is the standard cohort key because it fixes the starting point for every comparison.'
        },
        {
          id: 'analytics-cohorts-q3',
          prompt: 'Spot the mistake in this repeat rate query.',
          code: 'SELECT COUNT(*) AS people,\n  SUM(CASE WHEN orders > 1 THEN 1 ELSE 0 END) AS repeat_buyers\nFROM (SELECT customer_id, COUNT(*) AS orders FROM orders GROUP BY customer_id);',
          options: [
            'Grouping by customer_id counts order-level keys, so almost nobody appears twice and the repeat rate is near zero',
            'COUNT(*) cannot be used in a subquery',
            'The CASE expression needs an ELSE NULL',
            'The subquery must have an alias for the query to run'
          ],
          answer: 'Grouping by customer_id counts order-level keys, so almost nobody appears twice and the repeat rate is near zero',
          explanation: 'The query must join to customers and group by customer_unique_id.'
        },
        {
          id: 'analytics-cohorts-q4',
          prompt: 'Which expression finds the cohort month of a person?',
          options: [
            "strftime('%Y-%m', MIN(order_purchase_timestamp))",
            "strftime('%Y-%m', MAX(order_purchase_timestamp))",
            "MIN(strftime('%m', order_purchase_timestamp))",
            "COUNT(order_purchase_timestamp)"
          ],
          answer: "strftime('%Y-%m', MIN(order_purchase_timestamp))",
          explanation: 'The cohort is set by the earliest purchase, and the label needs both the year and the month.'
        },
        {
          id: 'analytics-cohorts-q5',
          prompt: 'Why is revenue per customer a better cross-cohort metric than total cohort revenue?',
          options: [
            'Because cohorts have different sizes, so totals mostly measure how many people were acquired',
            'Because AVG runs faster than SUM',
            'Because SUM cannot be rounded',
            'Because total revenue ignores freight'
          ],
          answer: 'Because cohorts have different sizes, so totals mostly measure how many people were acquired',
          explanation: 'Dividing by cohort size isolates customer quality from acquisition volume.'
        },
        {
          id: 'analytics-cohorts-q6',
          prompt: 'Both person_first and person_value are one row per person. What does that guarantee about the join between them?',
          options: [
            'It cannot multiply rows, so the cohort counts stay in customers',
            'It will always drop half of the rows',
            'It needs SELECT DISTINCT to be correct',
            'It turns the result into order grain'
          ],
          answer: 'It cannot multiply rows, so the cohort counts stay in customers',
          explanation: 'Joining two tables that are unique on the join key preserves the grain.'
        }
      ]
    },
    {
      id: 'analytics-rfm',
      title: 'Lesson 6 - RFM segmentation with NTILE',
      goal: 'Score customers on recency, frequency and monetary value with NTILE and turn the scores into named segments.',
      tables: ['orders', 'customers', 'order_items'],
      blocks: [
        {
          kind: 'text',
          text: 'RFM is the workhorse of customer segmentation. Recency is how long ago the person last bought, frequency is how many orders they placed, monetary is how much they spent. Each dimension is turned into a score from 1 to 5 by splitting the customer base into five equal buckets, which is exactly what NTILE(5) does.'
        },
        {
          kind: 'list',
          title: 'Reading NTILE',
          items: [
            'NTILE(5) OVER (ORDER BY x) splits the rows into five groups of near equal size and labels them 1 to 5.',
            'The label depends on rank position, not on the value itself, so an outlier cannot stretch the buckets.',
            'For recency you want small day counts to score high, so order the window so that the freshest customers land in bucket 5.',
            'NTILE is a relative measure: a score of 5 means top fifth of this population, not good in absolute terms.'
          ]
        },
        {
          kind: 'sql',
          title: 'Step one: the raw R, F and M facts per customer',
          sql: "WITH person_facts AS (\n  SELECT\n    c.customer_unique_id AS person,\n    MAX(o.order_purchase_timestamp) AS last_purchase,\n    COUNT(DISTINCT o.order_id) AS frequency,\n    SUM(CAST(oi.price AS REAL)) AS monetary\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  JOIN order_items AS oi ON oi.order_id = o.order_id\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY c.customer_unique_id\n)\nSELECT\n  person,\n  last_purchase,\n  frequency,\n  ROUND(monetary, 2) AS monetary\nFROM person_facts\nORDER BY monetary DESC\nLIMIT 20;",
          explanation: 'Every segmentation starts with a single tidy table at customer grain holding the three raw measures.',
          breakdown: [
            { part: 'JOIN customers AS c ON c.customer_id = o.customer_id', meaning: 'Reach the person key so several orders roll up to one human being.' },
            { part: 'JOIN order_items AS oi ON oi.order_id = o.order_id', meaning: 'Descend to the item level where the money is stored.' },
            { part: 'MAX(o.order_purchase_timestamp) AS last_purchase', meaning: 'Recency fact: the most recent purchase date of that person.' },
            { part: 'COUNT(DISTINCT o.order_id) AS frequency', meaning: 'Frequency fact, counted distinctly because the item join repeats orders.' },
            { part: 'SUM(CAST(oi.price AS REAL)) AS monetary', meaning: 'Monetary fact: total delivered spend, cast from TEXT.' },
            { part: 'GROUP BY c.customer_unique_id', meaning: 'One row per customer, which is the grain the scoring needs.' },
            { part: 'ORDER BY monetary DESC LIMIT 20', meaning: 'Preview the biggest spenders to sanity check the numbers before scoring.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Step two: score each dimension from 1 to 5 with NTILE',
          sql: "WITH person_facts AS (\n  SELECT\n    c.customer_unique_id AS person,\n    MAX(o.order_purchase_timestamp) AS last_purchase,\n    COUNT(DISTINCT o.order_id) AS frequency,\n    SUM(CAST(oi.price AS REAL)) AS monetary\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  JOIN order_items AS oi ON oi.order_id = o.order_id\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY c.customer_unique_id\n),\nwith_recency AS (\n  SELECT\n    person,\n    frequency,\n    monetary,\n    ROUND(\n      julianday((SELECT MAX(order_purchase_timestamp) FROM orders)) - julianday(last_purchase),\n      0\n    ) AS days_since_last_order\n  FROM person_facts\n)\nSELECT\n  person,\n  days_since_last_order,\n  frequency,\n  ROUND(monetary, 2) AS monetary,\n  NTILE(5) OVER (ORDER BY days_since_last_order DESC) AS r_score,\n  NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,\n  NTILE(5) OVER (ORDER BY monetary ASC) AS m_score\nFROM with_recency\nORDER BY monetary DESC\nLIMIT 30;",
          explanation: 'Each NTILE splits the customer base into five equally sized buckets on one dimension, so a score of 5 always means the best fifth.',
          breakdown: [
            { part: 'with_recency AS (', meaning: 'A second step that converts the last purchase date into an age in days.' },
            { part: '(SELECT MAX(order_purchase_timestamp) FROM orders)', meaning: 'The snapshot date: the latest purchase anywhere in the dataset, used instead of today because the data ends in 2018.' },
            { part: 'julianday(snapshot) - julianday(last_purchase)', meaning: 'Days between the snapshot and the customer last order.' },
            { part: 'NTILE(5) OVER (ORDER BY days_since_last_order DESC)', meaning: 'Descending order puts the largest day counts first, so recent buyers fall in the last bucket and score 5.' },
            { part: 'NTILE(5) OVER (ORDER BY frequency ASC)', meaning: 'Ascending order puts the busiest buyers last, so more orders means a higher score.' },
            { part: 'NTILE(5) OVER (ORDER BY monetary ASC)', meaning: 'Same direction for spend: the top fifth of spenders score 5.' },
            { part: 'ORDER BY monetary DESC LIMIT 30', meaning: 'Show the top spenders together with their three scores.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Step three: name the segments and count them',
          sql: "WITH person_facts AS (\n  SELECT\n    c.customer_unique_id AS person,\n    MAX(o.order_purchase_timestamp) AS last_purchase,\n    COUNT(DISTINCT o.order_id) AS frequency,\n    SUM(CAST(oi.price AS REAL)) AS monetary\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  JOIN order_items AS oi ON oi.order_id = o.order_id\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n  GROUP BY c.customer_unique_id\n),\nscored AS (\n  SELECT\n    person,\n    monetary,\n    NTILE(5) OVER (ORDER BY julianday(last_purchase) ASC) AS r_score,\n    NTILE(5) OVER (ORDER BY monetary ASC) AS m_score\n  FROM person_facts\n),\nsegmented AS (\n  SELECT\n    person,\n    monetary,\n    CASE\n      WHEN r_score >= 4 AND m_score >= 4 THEN 'champions'\n      WHEN r_score >= 4 THEN 'recent low spend'\n      WHEN m_score >= 4 THEN 'big spender at risk'\n      ELSE 'low value'\n    END AS segment\n  FROM scored\n)\nSELECT\n  segment,\n  COUNT(*) AS customers,\n  ROUND(SUM(monetary), 2) AS segment_revenue,\n  ROUND(AVG(monetary), 2) AS avg_customer_value\nFROM segmented\nGROUP BY segment\nORDER BY segment_revenue DESC;",
          explanation: 'Scores are only useful once they are translated into a handful of named segments a marketing team can act on.',
          breakdown: [
            { part: 'scored AS (', meaning: 'Attach the recency and monetary quintiles to every customer.' },
            { part: 'NTILE(5) OVER (ORDER BY julianday(last_purchase) ASC)', meaning: 'Ordering the last purchase date ascending puts the oldest first, so the freshest customers land in bucket 5.' },
            { part: 'segmented AS (', meaning: 'A step whose only job is to convert two numeric scores into one label.' },
            { part: "WHEN r_score >= 4 AND m_score >= 4 THEN 'champions'", meaning: 'Recent and high spending customers, the group worth protecting.' },
            { part: "WHEN m_score >= 4 THEN 'big spender at risk'", meaning: 'High value but not recent, the group a win-back campaign targets.' },
            { part: "ELSE 'low value'", meaning: 'Everything the earlier branches did not match falls into the catch-all label.' },
            { part: 'GROUP BY segment', meaning: 'Report one row per segment.' },
            { part: 'ORDER BY segment_revenue DESC', meaning: 'Put the segments carrying the most money at the top of the report.' }
          ]
        }
      ],
      practice: {
        task: 'Split customers into four spend quartiles and report how many customers and how much revenue each quartile holds.',
        hint: 'Build spend per customer_unique_id in a CTE, add NTILE(4) OVER (ORDER BY spend ASC) in a second CTE, then group by that quartile.',
        solution: "WITH person_value AS (\n  SELECT\n    c.customer_unique_id AS person,\n    SUM(CAST(oi.price AS REAL)) AS spend\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  JOIN order_items AS oi ON oi.order_id = o.order_id\n  WHERE o.order_status = 'delivered'\n  GROUP BY c.customer_unique_id\n),\nquartiles AS (\n  SELECT person, spend, NTILE(4) OVER (ORDER BY spend ASC) AS spend_quartile\n  FROM person_value\n)\nSELECT\n  spend_quartile,\n  COUNT(*) AS customers,\n  ROUND(SUM(spend), 2) AS revenue,\n  ROUND(AVG(spend), 2) AS avg_spend\nFROM quartiles\nGROUP BY spend_quartile\nORDER BY spend_quartile;"
      },
      questions: [
        {
          id: 'analytics-rfm-q1',
          prompt: 'What does NTILE(5) do?',
          options: [
            'Splits the ordered rows into five groups of near equal size and labels them 1 to 5',
            'Returns the top five rows of the window',
            'Divides every value by five',
            'Returns the fifth largest value in the partition'
          ],
          answer: 'Splits the ordered rows into five groups of near equal size and labels them 1 to 5',
          explanation: 'NTILE is bucketing by rank position, which is why it is immune to outliers.'
        },
        {
          id: 'analytics-rfm-q2',
          prompt: 'What do R, F and M stand for in RFM?',
          options: [
            'Recency, frequency and monetary value',
            'Rank, filter and merge',
            'Revenue, freight and margin',
            'Region, format and market'
          ],
          answer: 'Recency, frequency and monetary value',
          explanation: 'Those three behaviours summarise most of what a transaction history says about a customer.'
        },
        {
          id: 'analytics-rfm-q3',
          prompt: 'You compute days_since_last_order and want recent buyers to score 5. Which window is correct?',
          options: [
            'NTILE(5) OVER (ORDER BY days_since_last_order DESC)',
            'NTILE(5) OVER (ORDER BY days_since_last_order ASC)',
            'NTILE(5) OVER (PARTITION BY days_since_last_order)',
            'NTILE(5) OVER ()'
          ],
          answer: 'NTILE(5) OVER (ORDER BY days_since_last_order DESC)',
          explanation: 'Descending puts the stalest customers in bucket 1 and the freshest in bucket 5.'
        },
        {
          id: 'analytics-rfm-q4',
          prompt: 'Why does the recency calculation use the maximum purchase timestamp in the dataset instead of the current date?',
          options: [
            'Because the snapshot ends in 2018, so measuring against today would make every customer equally stale',
            'Because julianday cannot read the current date',
            'Because MAX is faster than a date function',
            'Because orders have no timestamps'
          ],
          answer: 'Because the snapshot ends in 2018, so measuring against today would make every customer equally stale',
          explanation: 'Anchoring recency to the end of the data keeps the quintiles meaningful.'
        },
        {
          id: 'analytics-rfm-q5',
          prompt: 'A customer has m_score 5. What does that actually mean?',
          options: [
            'They are in the top fifth of spenders in this population',
            'They spent more than a fixed currency threshold',
            'They placed at least five orders',
            'They bought within the last five days'
          ],
          answer: 'They are in the top fifth of spenders in this population',
          explanation: 'NTILE scores are relative to the customer base being scored, not absolute.'
        },
        {
          id: 'analytics-rfm-q6',
          prompt: 'Spot the mistake.',
          code: "SELECT c.customer_unique_id,\n  COUNT(*) AS frequency\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nJOIN order_items AS oi ON oi.order_id = o.order_id\nGROUP BY c.customer_unique_id;",
          options: [
            'COUNT(*) counts item rows after the item join, so frequency must use COUNT(DISTINCT o.order_id)',
            'customer_unique_id cannot be grouped',
            'The two joins must be swapped',
            'CAST is missing around COUNT'
          ],
          answer: 'COUNT(*) counts item rows after the item join, so frequency must use COUNT(DISTINCT o.order_id)',
          explanation: 'A three-item order would otherwise be counted as three purchases.'
        }
      ]
    },
    {
      id: 'analytics-quality',
      title: 'Lesson 7 - Delivery performance and data quality checks',
      goal: 'Measure delivery lateness, connect it to review scores, and audit the data before trusting any of it.',
      tables: ['orders', 'order_reviews', 'customers'],
      blocks: [
        {
          kind: 'text',
          text: 'The most valuable question in this dataset is whether late delivery damages satisfaction. Answering it needs two things: a careful definition of late, built from julianday differences, and an honest audit of how many rows can even be measured. An analyst who reports a number without checking coverage is guessing.'
        },
        {
          kind: 'list',
          title: 'Where this data is dirty',
          items: [
            'Every column is TEXT, so numbers need CAST and dates need julianday or strftime.',
            'Missing timestamps arrive as empty strings, not NULL, so IS NOT NULL alone does not filter them.',
            "NULLIF(col, '') turns an empty string into NULL, after which IS NOT NULL behaves as expected.",
            'Only delivered orders have a delivery date, so lateness is undefined for cancelled and shipped orders.',
            'An order can have more than one review row, so counting reviews and counting orders are different questions.'
          ]
        },
        {
          kind: 'sql',
          title: 'Audit first: how much of the delivery data is usable?',
          sql: "SELECT\n  COUNT(*) AS orders_total,\n  SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,\n  SUM(CASE WHEN NULLIF(order_delivered_customer_date, '') IS NULL THEN 1 ELSE 0 END) AS missing_delivery_date,\n  SUM(CASE WHEN NULLIF(order_estimated_delivery_date, '') IS NULL THEN 1 ELSE 0 END) AS missing_estimate,\n  SUM(CASE WHEN NULLIF(order_approved_at, '') IS NULL THEN 1 ELSE 0 END) AS missing_approval\nFROM orders;",
          explanation: 'One conditional aggregation per column gives a coverage report that tells you which analyses are even possible.',
          breakdown: [
            { part: 'COUNT(*) AS orders_total', meaning: 'The denominator every other number is judged against.' },
            { part: "SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END)", meaning: 'Count the orders that reached the customer, the only ones with a delivery date.' },
            { part: "NULLIF(order_delivered_customer_date, '')", meaning: 'Convert the empty string used by the importer into a real NULL.' },
            { part: 'CASE WHEN ... IS NULL THEN 1 ELSE 0 END', meaning: 'Flag each row as missing or not, so SUM turns the flags into a count.' },
            { part: 'FROM orders', meaning: 'The audit runs on the whole table with no filter, because filtering would hide the problem.' }
          ]
        },
        {
          kind: 'sql',
          title: 'How late are deliveries, by customer state?',
          sql: "WITH delivery AS (\n  SELECT\n    c.customer_state AS state,\n    julianday(o.order_delivered_customer_date) - julianday(o.order_estimated_delivery_date) AS days_late,\n    julianday(o.order_delivered_customer_date) - julianday(o.order_purchase_timestamp) AS days_to_deliver\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_delivered_customer_date, '') IS NOT NULL\n    AND NULLIF(o.order_estimated_delivery_date, '') IS NOT NULL\n)\nSELECT\n  state,\n  COUNT(*) AS delivered_orders,\n  ROUND(AVG(days_to_deliver), 1) AS avg_days_to_deliver,\n  SUM(CASE WHEN days_late > 0 THEN 1 ELSE 0 END) AS late_orders,\n  ROUND(100.0 * SUM(CASE WHEN days_late > 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS late_pct\nFROM delivery\nGROUP BY state\nHAVING COUNT(*) >= 100\nORDER BY late_pct DESC;",
          explanation: 'Subtracting the estimate from the actual delivery date gives a signed lateness in days, and anything above zero is a broken promise.',
          breakdown: [
            { part: 'julianday(order_delivered_customer_date) - julianday(order_estimated_delivery_date)', meaning: 'Positive means the parcel arrived after the promised date, negative means early.' },
            { part: 'julianday(order_delivered_customer_date) - julianday(order_purchase_timestamp)', meaning: 'The full customer wait, from checkout to doorstep.' },
            { part: "WHERE o.order_status = 'delivered'", meaning: 'Only delivered orders have both dates.' },
            { part: "AND NULLIF(o.order_delivered_customer_date, '') IS NOT NULL", meaning: 'Guard against empty strings that would make julianday return NULL.' },
            { part: 'AVG(days_to_deliver)', meaning: 'The typical wait in that state.' },
            { part: 'SUM(CASE WHEN days_late > 0 THEN 1 ELSE 0 END)', meaning: 'Count only the orders that missed the promise.' },
            { part: '100.0 * late / COUNT(*)', meaning: 'Express lateness as a rate so states of different sizes are comparable.' },
            { part: 'GROUP BY state', meaning: 'One row per Brazilian state.' },
            { part: 'HAVING COUNT(*) >= 100', meaning: 'Drop tiny states whose percentages would swing wildly on a handful of orders.' },
            { part: 'ORDER BY late_pct DESC', meaning: 'Worst performing states first, which is where operations should look.' }
          ]
        },
        {
          kind: 'note',
          text: 'HAVING filters groups after aggregation, which is why the minimum sample size test belongs there and not in WHERE. Filtering small states in WHERE is impossible because you do not know the group size until you have grouped.'
        },
        {
          kind: 'sql',
          title: 'The payoff: does lateness cost you review stars?',
          sql: "WITH order_delivery AS (\n  SELECT\n    o.order_id AS order_id,\n    julianday(o.order_delivered_customer_date) - julianday(o.order_estimated_delivery_date) AS days_late\n  FROM orders AS o\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_delivered_customer_date, '') IS NOT NULL\n    AND NULLIF(o.order_estimated_delivery_date, '') IS NOT NULL\n),\nrated AS (\n  SELECT\n    CASE\n      WHEN d.days_late <= 0 THEN 'on time or early'\n      WHEN d.days_late <= 3 THEN 'late 1 to 3 days'\n      WHEN d.days_late <= 10 THEN 'late 4 to 10 days'\n      ELSE 'late more than 10 days'\n    END AS bucket,\n    CAST(r.review_score AS REAL) AS score\n  FROM order_delivery AS d\n  JOIN order_reviews AS r ON r.order_id = d.order_id\n  WHERE NULLIF(r.review_score, '') IS NOT NULL\n)\nSELECT\n  bucket,\n  COUNT(*) AS reviews,\n  ROUND(AVG(score), 2) AS avg_review_score,\n  ROUND(100.0 * SUM(CASE WHEN score <= 2 THEN 1 ELSE 0 END) / COUNT(*), 1) AS bad_review_pct\nFROM rated\nGROUP BY bucket\nORDER BY avg_review_score DESC;",
          explanation: 'Bucketing lateness and averaging the review score inside each bucket shows the relationship without needing any statistics beyond an average.',
          breakdown: [
            { part: 'order_delivery AS (', meaning: 'Step one computes signed lateness per order and throws away unmeasurable rows.' },
            { part: 'rated AS (', meaning: 'Step two attaches the review score and labels each order with a lateness band.' },
            { part: "WHEN d.days_late <= 0 THEN 'on time or early'", meaning: 'Zero or negative lateness means the promise was kept.' },
            { part: "WHEN d.days_late <= 3 THEN 'late 1 to 3 days'", meaning: 'CASE branches are tested in order, so this only sees orders already known to be late.' },
            { part: 'CAST(r.review_score AS REAL) AS score', meaning: 'The score is stored as TEXT and must be numeric before it can be averaged.' },
            { part: 'JOIN order_reviews AS r ON r.order_id = d.order_id', meaning: 'An inner join keeps only orders that actually received a review.' },
            { part: 'AVG(score) AS avg_review_score', meaning: 'The headline metric per lateness band.' },
            { part: 'SUM(CASE WHEN score <= 2 THEN 1 ELSE 0 END) / COUNT(*)', meaning: 'The share of one and two star reviews, which moves more sharply than the average.' },
            { part: 'GROUP BY bucket', meaning: 'One row per lateness band.' },
            { part: 'ORDER BY avg_review_score DESC', meaning: 'Best satisfaction first, so the decline down the table is easy to read.' }
          ]
        }
      ],
      practice: {
        task: 'Report the average review score for orders delivered before the estimated date versus orders delivered after it, with the count of orders in each group.',
        hint: 'Compute days_late in a CTE, join order_reviews, then GROUP BY a CASE that returns two labels.',
        solution: "WITH order_delivery AS (\n  SELECT\n    order_id,\n    julianday(order_delivered_customer_date) - julianday(order_estimated_delivery_date) AS days_late\n  FROM orders\n  WHERE order_status = 'delivered'\n    AND NULLIF(order_delivered_customer_date, '') IS NOT NULL\n    AND NULLIF(order_estimated_delivery_date, '') IS NOT NULL\n)\nSELECT\n  CASE WHEN d.days_late > 0 THEN 'late' ELSE 'on time' END AS delivery_result,\n  COUNT(*) AS reviews,\n  ROUND(AVG(CAST(r.review_score AS REAL)), 2) AS avg_review_score\nFROM order_delivery AS d\nJOIN order_reviews AS r ON r.order_id = d.order_id\nWHERE NULLIF(r.review_score, '') IS NOT NULL\nGROUP BY delivery_result\nORDER BY avg_review_score DESC;"
      },
      questions: [
        {
          id: 'analytics-quality-q1',
          prompt: 'What does a positive value of julianday(order_delivered_customer_date) - julianday(order_estimated_delivery_date) mean?',
          options: [
            'The order arrived after the estimated delivery date',
            'The order arrived before the estimated delivery date',
            'The order was never delivered',
            'The estimate was missing'
          ],
          answer: 'The order arrived after the estimated delivery date',
          explanation: 'Actual minus promised is positive exactly when the parcel is late.'
        },
        {
          id: 'analytics-quality-q2',
          prompt: "Why is NULLIF(order_delivered_customer_date, '') IS NOT NULL used instead of a plain IS NOT NULL test?",
          options: [
            'Because missing values are stored as empty strings, which are not NULL',
            'Because IS NOT NULL does not work on TEXT columns',
            'Because NULLIF converts a date to a number',
            'Because the column is indexed'
          ],
          answer: 'Because missing values are stored as empty strings, which are not NULL',
          explanation: 'NULLIF turns the empty string into a real NULL so the usual test works.'
        },
        {
          id: 'analytics-quality-q3',
          prompt: 'Why is the minimum sample size test written as HAVING COUNT(*) >= 100 rather than in WHERE?',
          options: [
            'WHERE runs before grouping, so the group size is not known yet',
            'HAVING is faster than WHERE',
            'COUNT cannot appear in a SELECT list',
            'WHERE cannot compare integers'
          ],
          answer: 'WHERE runs before grouping, so the group size is not known yet',
          explanation: 'HAVING is the filter that applies to already aggregated groups.'
        },
        {
          id: 'analytics-quality-q4',
          prompt: 'Which query answers the question: do late deliveries get worse reviews?',
          options: [
            'Bucket orders by days late in a CTE, join order_reviews and compare AVG(review_score) per bucket',
            'Count how many orders are late per state',
            'Rank orders by price and take the top ten',
            'Sum review_score across all orders'
          ],
          answer: 'Bucket orders by days late in a CTE, join order_reviews and compare AVG(review_score) per bucket',
          explanation: 'Comparing an outcome metric across bands of the driver is the simplest honest way to show the relationship.'
        },
        {
          id: 'analytics-quality-q5',
          prompt: 'Spot the mistake.',
          code: "SELECT AVG(review_score) AS avg_score\nFROM order_reviews;",
          options: [
            'review_score is stored as TEXT, so it needs CAST(review_score AS REAL) before averaging',
            'AVG cannot be aliased',
            'order_reviews has no review_score column',
            'The query needs a GROUP BY'
          ],
          answer: 'review_score is stored as TEXT, so it needs CAST(review_score AS REAL) before averaging',
          explanation: 'Every column in this import is TEXT, so numeric aggregates need an explicit cast.'
        },
        {
          id: 'analytics-quality-q6',
          prompt: 'Why should a coverage audit run before the lateness analysis?',
          options: [
            'Because the share of orders with a usable delivery date decides how much of the business the result actually describes',
            'Because SQLite refuses to aggregate until the table is audited',
            'Because the audit rebuilds the indexes',
            'Because it converts empty strings into NULL permanently'
          ],
          answer: 'Because the share of orders with a usable delivery date decides how much of the business the result actually describes',
          explanation: 'A metric computed on a small measurable subset can be true and still be misleading.'
        }
      ]
    },
    {
      id: 'analytics-report',
      title: 'Lesson 8 - Putting it together: a marketplace KPI report',
      goal: 'Assemble CTEs, window functions and conditional aggregation into one report that a marketplace manager could read every Monday.',
      tables: ['orders', 'order_items', 'customers', 'order_reviews', 'products'],
      blocks: [
        {
          kind: 'text',
          text: 'A KPI report is not a clever query, it is a set of agreed definitions written down in SQL. Decide the reporting grain first, usually the month. Then build one CTE per metric family at that grain, join them together on the month, and let the final SELECT do nothing but arithmetic and formatting. When a number is later disputed, the definition is right there in a named block.'
        },
        {
          kind: 'list',
          title: 'The definitions this report uses',
          items: [
            'Month: the calendar month of order_purchase_timestamp.',
            'Revenue: the sum of item price on delivered orders only.',
            'Orders: distinct order_id, counted on delivered orders only.',
            'Average order value: revenue divided by orders, not the average of an average.',
            'Satisfaction: the average review score of orders placed in that month.',
            'Growth: revenue compared with the previous month using LAG.'
          ]
        },
        {
          kind: 'sql',
          title: 'Metric family one: monthly revenue and orders',
          sql: "WITH delivered AS (\n  SELECT\n    order_id,\n    strftime('%Y-%m', order_purchase_timestamp) AS month\n  FROM orders\n  WHERE order_status = 'delivered'\n    AND NULLIF(order_purchase_timestamp, '') IS NOT NULL\n)\nSELECT\n  d.month,\n  COUNT(DISTINCT d.order_id) AS orders,\n  ROUND(SUM(CAST(oi.price AS REAL)), 2) AS revenue,\n  ROUND(SUM(CAST(oi.freight_value AS REAL)), 2) AS freight,\n  ROUND(SUM(CAST(oi.price AS REAL)) / COUNT(DISTINCT d.order_id), 2) AS avg_order_value\nFROM delivered AS d\nJOIN order_items AS oi ON oi.order_id = d.order_id\nGROUP BY d.month\nORDER BY d.month;",
          explanation: 'Build and check each metric family on its own before wiring it into the report, because a mistake is far easier to see in five columns than in fifteen.',
          breakdown: [
            { part: 'WITH delivered AS (', meaning: 'A single place where the definition of a countable order lives.' },
            { part: "WHERE order_status = 'delivered'", meaning: 'The revenue definition, stated once so every metric inherits it.' },
            { part: "strftime('%Y-%m', order_purchase_timestamp) AS month", meaning: 'The reporting grain, taken from the purchase date rather than the delivery date.' },
            { part: 'JOIN order_items AS oi ON oi.order_id = d.order_id', meaning: 'Descend to item grain to reach price and freight.' },
            { part: 'COUNT(DISTINCT d.order_id) AS orders', meaning: 'Undo the row multiplication caused by that join.' },
            { part: 'SUM(CAST(oi.price AS REAL)) AS revenue', meaning: 'Product revenue, excluding shipping.' },
            { part: 'SUM(CAST(oi.freight_value AS REAL)) AS freight', meaning: 'Shipping charged, reported separately so it is never confused with revenue.' },
            { part: 'SUM(price) / COUNT(DISTINCT order_id)', meaning: 'Average order value derived from two totals, which is the only correct way to compute it.' },
            { part: 'GROUP BY d.month', meaning: 'One row per reporting period.' }
          ]
        },
        {
          kind: 'sql',
          title: 'Metric family two: monthly customers and satisfaction',
          sql: "WITH monthly_orders AS (\n  SELECT\n    o.order_id AS order_id,\n    strftime('%Y-%m', o.order_purchase_timestamp) AS month,\n    c.customer_unique_id AS person\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n)\nSELECT\n  m.month,\n  COUNT(DISTINCT m.person) AS active_customers,\n  COUNT(r.review_id) AS reviews,\n  ROUND(AVG(CAST(NULLIF(r.review_score, '') AS REAL)), 2) AS avg_review_score\nFROM monthly_orders AS m\nLEFT JOIN order_reviews AS r ON r.order_id = m.order_id\nGROUP BY m.month\nORDER BY m.month;",
          explanation: 'Customers are counted on the person key and reviews are attached with a LEFT JOIN so months keep their true order base even when reviews are missing.',
          breakdown: [
            { part: 'JOIN customers AS c ON c.customer_id = o.customer_id', meaning: 'Resolve the per-order key into the stable person identifier.' },
            { part: 'COUNT(DISTINCT m.person) AS active_customers', meaning: 'A person who ordered twice in a month is one active customer, not two.' },
            { part: 'LEFT JOIN order_reviews AS r ON r.order_id = m.order_id', meaning: 'Keep every order even if nobody reviewed it, so the customer count is not silently filtered.' },
            { part: 'COUNT(r.review_id) AS reviews', meaning: 'COUNT of a column ignores NULLs, so unreviewed orders contribute zero.' },
            { part: "CAST(NULLIF(r.review_score, '') AS REAL)", meaning: 'Blank scores become NULL and are then skipped by AVG instead of being read as zero.' },
            { part: 'AVG(...) AS avg_review_score', meaning: 'The satisfaction KPI for the month.' },
            { part: 'GROUP BY m.month', meaning: 'Same grain as the first family so the two can be joined later.' }
          ]
        },
        {
          kind: 'note',
          text: 'Both families are grouped to the same month key. That is what makes the final assembly a simple join instead of a rewrite.'
        },
        {
          kind: 'sql',
          title: 'The full report: every KPI on one row per month',
          sql: "WITH delivered AS (\n  SELECT\n    o.order_id AS order_id,\n    strftime('%Y-%m', o.order_purchase_timestamp) AS month,\n    c.customer_unique_id AS person\n  FROM orders AS o\n  JOIN customers AS c ON c.customer_id = o.customer_id\n  WHERE o.order_status = 'delivered'\n    AND NULLIF(o.order_purchase_timestamp, '') IS NOT NULL\n),\nsales AS (\n  SELECT\n    d.month AS month,\n    COUNT(DISTINCT d.order_id) AS orders,\n    COUNT(DISTINCT d.person) AS customers,\n    SUM(CAST(oi.price AS REAL)) AS revenue\n  FROM delivered AS d\n  JOIN order_items AS oi ON oi.order_id = d.order_id\n  GROUP BY d.month\n),\nsatisfaction AS (\n  SELECT\n    d.month AS month,\n    AVG(CAST(NULLIF(r.review_score, '') AS REAL)) AS avg_review_score\n  FROM delivered AS d\n  JOIN order_reviews AS r ON r.order_id = d.order_id\n  GROUP BY d.month\n),\nreport AS (\n  SELECT\n    s.month AS month,\n    s.orders AS orders,\n    s.customers AS customers,\n    s.revenue AS revenue,\n    s.revenue / s.orders AS avg_order_value,\n    t.avg_review_score AS avg_review_score,\n    LAG(s.revenue) OVER (ORDER BY s.month) AS previous_revenue,\n    SUM(s.revenue) OVER (ORDER BY s.month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS revenue_to_date\n  FROM sales AS s\n  LEFT JOIN satisfaction AS t ON t.month = s.month\n)\nSELECT\n  month,\n  orders,\n  customers,\n  ROUND(revenue, 2) AS revenue,\n  ROUND(avg_order_value, 2) AS avg_order_value,\n  ROUND(avg_review_score, 2) AS avg_review_score,\n  CASE\n    WHEN previous_revenue IS NULL OR previous_revenue = 0 THEN NULL\n    ELSE ROUND(100.0 * (revenue - previous_revenue) / previous_revenue, 1)\n  END AS mom_growth_pct,\n  ROUND(revenue_to_date, 2) AS revenue_to_date\nFROM report\nORDER BY month;",
          explanation: 'Four named steps produce one row per month carrying volume, value, satisfaction, growth and a cumulative total, which is a complete management report in a single statement.',
          breakdown: [
            { part: 'WITH delivered AS (', meaning: 'The shared foundation: every delivered order with its month and its buyer, defined exactly once.' },
            { part: 'sales AS (', meaning: 'Volume and money at month grain.' },
            { part: 'COUNT(DISTINCT d.order_id) AS orders', meaning: 'Distinct because the item join repeats each order.' },
            { part: 'COUNT(DISTINCT d.person) AS customers', meaning: 'Distinct people active in the month, counted on customer_unique_id.' },
            { part: 'satisfaction AS (', meaning: 'A separate step for reviews, kept apart so review rows cannot inflate the revenue sums.' },
            { part: "AVG(CAST(NULLIF(r.review_score, '') AS REAL))", meaning: 'Blank scores become NULL and AVG ignores them.' },
            { part: 'report AS (', meaning: 'The assembly step that joins the families and adds the time-series columns.' },
            { part: 'LEFT JOIN satisfaction AS t ON t.month = s.month', meaning: 'A month with sales but no reviews still appears, with a NULL score.' },
            { part: 's.revenue / s.orders AS avg_order_value', meaning: 'Derived metric computed from the two agreed totals.' },
            { part: 'LAG(s.revenue) OVER (ORDER BY s.month)', meaning: 'Last month revenue on this month row, ready for the growth calculation.' },
            { part: 'SUM(s.revenue) OVER (ORDER BY s.month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)', meaning: 'Cumulative revenue, using the running total frame.' },
            { part: 'CASE WHEN previous_revenue IS NULL OR previous_revenue = 0 THEN NULL', meaning: 'Protect the growth column against the first month and against a zero base.' },
            { part: 'ELSE ROUND(100.0 * (revenue - previous_revenue) / previous_revenue, 1)', meaning: 'Month-over-month growth as a percentage.' },
            { part: 'FROM report ORDER BY month', meaning: 'The final SELECT only formats and sorts; all the logic lives in the named steps above it.' }
          ]
        }
      ],
      practice: {
        task: 'Extend the report idea to product categories: for each category report delivered orders, revenue, average order value and the category rank by revenue.',
        hint: 'Build a delivered CTE, aggregate by product_category_name in a second CTE, then add RANK() OVER (ORDER BY revenue DESC) in the final SELECT.',
        solution: "WITH delivered AS (\n  SELECT order_id\n  FROM orders\n  WHERE order_status = 'delivered'\n),\ncategory_sales AS (\n  SELECT\n    p.product_category_name AS category,\n    COUNT(DISTINCT oi.order_id) AS orders,\n    SUM(CAST(oi.price AS REAL)) AS revenue\n  FROM delivered AS d\n  JOIN order_items AS oi ON oi.order_id = d.order_id\n  JOIN products AS p ON p.product_id = oi.product_id\n  WHERE NULLIF(p.product_category_name, '') IS NOT NULL\n  GROUP BY p.product_category_name\n)\nSELECT\n  RANK() OVER (ORDER BY revenue DESC) AS revenue_rank,\n  category,\n  orders,\n  ROUND(revenue, 2) AS revenue,\n  ROUND(revenue / orders, 2) AS avg_order_value\nFROM category_sales\nORDER BY revenue DESC\nLIMIT 20;"
      },
      questions: [
        {
          id: 'analytics-report-q1',
          prompt: 'Why does the report define a single delivered CTE and reuse it in every metric family?',
          options: [
            'So that every KPI shares one definition of a countable order',
            'Because SQLite only allows one join per query',
            'Because a CTE cannot be used more than once otherwise',
            'To make the query shorter than a subquery'
          ],
          answer: 'So that every KPI shares one definition of a countable order',
          explanation: 'Consistent definitions are what make a report defensible when a number is questioned.'
        },
        {
          id: 'analytics-report-q2',
          prompt: 'Why are sales and satisfaction built as two separate CTEs instead of one big join?',
          options: [
            'Because joining reviews and items at the same time would multiply rows and inflate the revenue sums',
            'Because a CTE can only contain one join',
            'Because AVG and SUM cannot appear in the same query',
            'Because reviews are stored in a different database'
          ],
          answer: 'Because joining reviews and items at the same time would multiply rows and inflate the revenue sums',
          explanation: 'Each fan-out join must be aggregated back to the reporting grain before the families are combined.'
        },
        {
          id: 'analytics-report-q3',
          prompt: 'Why is the join from sales to satisfaction a LEFT JOIN?',
          options: [
            'So a month with sales but no reviews still appears, with a NULL score',
            'Because LEFT JOIN is faster',
            'Because satisfaction has more rows than sales',
            'Because month is stored as TEXT'
          ],
          answer: 'So a month with sales but no reviews still appears, with a NULL score',
          explanation: 'An inner join would silently delete periods from the report.'
        },
        {
          id: 'analytics-report-q4',
          prompt: 'Which query answers the question: which month had the highest average order value?',
          options: [
            'Group delivered orders by month, compute SUM(price) / COUNT(DISTINCT order_id) and sort by it descending',
            'Compute AVG(price) over order_items grouped by month',
            'Rank individual orders by price and take the top row',
            'Divide total revenue by the number of months'
          ],
          answer: 'Group delivered orders by month, compute SUM(price) / COUNT(DISTINCT order_id) and sort by it descending',
          explanation: 'Average order value is a ratio of two totals at order grain, not the average of item prices.'
        },
        {
          id: 'analytics-report-q5',
          prompt: 'Spot the mistake.',
          code: 'SELECT month, revenue,\n  LAG(revenue) OVER (ORDER BY month) AS prev,\n  100.0 * (revenue - prev) / prev AS growth\nFROM sales;',
          options: [
            'The alias prev cannot be reused in the same SELECT list, so the growth column needs another level of CTE or a repeated LAG expression',
            'LAG cannot be used with ORDER BY',
            'growth must be cast to REAL',
            'sales must be a real table, not a CTE'
          ],
          answer: 'The alias prev cannot be reused in the same SELECT list, so the growth column needs another level of CTE or a repeated LAG expression',
          explanation: 'That is exactly why the report computes LAG in one step and the percentage in the next.'
        },
        {
          id: 'analytics-report-q6',
          prompt: 'What is the role of the final SELECT in a well built report query?',
          options: [
            'Formatting and sorting only, because all the logic lives in the named steps above it',
            'Recomputing every metric from the base tables',
            'Filtering out rows that should never have been aggregated',
            'Defining the reporting grain'
          ],
          answer: 'Formatting and sorting only, because all the logic lives in the named steps above it',
          explanation: 'Pushing logic into named CTEs keeps the report readable and easy to audit.'
        }
      ]
    }
  ]
}
