import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    client = createClient({ url, authToken });
  }
  return client;
}

export async function initSchema() {
  const db = getDb();

  await db.execute(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_kana TEXT,
    phone TEXT,
    birthday TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS bikes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    vehicle_type TEXT,
    maker TEXT,
    product_name TEXT,
    bike_type TEXT,
    color TEXT,
    registration_no TEXT,
    frame_no TEXT,
    displacement INTEGER,
    year INTEGER,
    purchase_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bike_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    maintenance_type TEXT NOT NULL,
    date TEXT NOT NULL,
    mileage INTEGER,
    next_due_date TEXT,
    next_due_mileage INTEGER,
    cost REAL DEFAULT 0,
    description TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (bike_id) REFERENCES bikes(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    bike_id INTEGER,
    invoice_no TEXT UNIQUE NOT NULL,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    subtotal REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0.10,
    tax_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT '未払い',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  )`);
}
