import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:data/materials.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
})

async function init() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      contact TEXT,
      memo TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      memo TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      purchase_date TEXT NOT NULL,
      receipt_no TEXT,
      memo TEXT,
      file_name TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
      item_name_raw TEXT NOT NULL,
      spec TEXT,
      unit TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL DEFAULT 0,
      amount INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pi_material ON purchase_items(material_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pi_purchase ON purchase_items(purchase_id)`,
    `CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date)`,
    `CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id)`,
  ]

  for (const sql of statements) {
    await client.execute(sql)
  }

  console.log('✅ DB 초기화 완료: data/materials.db')
  process.exit(0)
}

init().catch(e => { console.error(e); process.exit(1) })
