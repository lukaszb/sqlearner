import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { course } from '@/shared/course'
import { splitSqlStatements } from '@/shared/sql-statements'

const schema = [
  'CREATE TABLE customers (customer_id TEXT, customer_unique_id TEXT, customer_zip_code_prefix TEXT, customer_city TEXT, customer_state TEXT)',
  'CREATE TABLE geolocation (geolocation_zip_code_prefix TEXT, geolocation_lat TEXT, geolocation_lng TEXT, geolocation_city TEXT, geolocation_state TEXT)',
  'CREATE TABLE order_items (order_id TEXT, order_item_id TEXT, product_id TEXT, seller_id TEXT, shipping_limit_date TEXT, price TEXT, freight_value TEXT)',
  'CREATE TABLE order_payments (order_id TEXT, payment_sequential TEXT, payment_type TEXT, payment_installments TEXT, payment_value TEXT)',
  'CREATE TABLE order_reviews (review_id TEXT, order_id TEXT, review_score TEXT, review_comment_title TEXT, review_comment_message TEXT, review_creation_date TEXT, review_answer_timestamp TEXT)',
  'CREATE TABLE orders (order_id TEXT, customer_id TEXT, order_status TEXT, order_purchase_timestamp TEXT, order_approved_at TEXT, order_delivered_carrier_date TEXT, order_delivered_customer_date TEXT, order_estimated_delivery_date TEXT)',
  'CREATE TABLE products (product_id TEXT, product_category_name TEXT, product_name_lenght TEXT, product_description_lenght TEXT, product_photos_qty TEXT, product_weight_g TEXT, product_length_cm TEXT, product_height_cm TEXT, product_width_cm TEXT)',
  'CREATE TABLE sellers (seller_id TEXT, seller_zip_code_prefix TEXT, seller_city TEXT, seller_state TEXT)',
  'CREATE TABLE product_category_name_translation (product_category_name TEXT, product_category_name_english TEXT)'
]

function createDatabase(): Database.Database {
  const db = new Database(':memory:')
  for (const statement of schema) db.exec(statement)
  return db
}

function execute(db: Database.Database, sql: string): void {
  for (const single of splitSqlStatements(sql)) {
    const statement = db.prepare(single)
    if (statement.reader) statement.all()
    else statement.run()
  }
}

describe.each(course.map((module) => [module.id, module] as const))(
  '%s lessons run against the Olist schema',
  (_id, module) => {
    const db = createDatabase()

    for (const lesson of module.lessons) {
      const statements = [
        ...lesson.blocks
          .filter((block) => block.kind === 'sql')
          .map((block, index) => [`block ${index}`, block.sql] as const),
        ['practice solution', lesson.practice.solution] as const
      ]

      it.each(statements.map(([label, sql]) => [`${lesson.id} ${label}`, sql] as const))('%s', (_label, sql) => {
        expect(() => execute(db, sql)).not.toThrow()
      })
    }
  }
)
