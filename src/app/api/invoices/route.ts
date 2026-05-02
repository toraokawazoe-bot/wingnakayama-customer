import { NextRequest, NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';

async function generateInvoiceNo(db: ReturnType<typeof getDb>): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;
  const result = await db.execute({
    sql: `SELECT invoice_no FROM invoices WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1`,
    args: [`${prefix}%`],
  });
  let seq = 1;
  if (result.rows.length > 0) {
    const last = result.rows[0].invoice_no as string;
    seq = parseInt(last.split('-').pop() || '0') + 1;
  }
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    await initSchema();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customer_id');

    let sql = `SELECT i.*, c.name as customer_name, b.vehicle_type, b.registration_no
               FROM invoices i
               JOIN customers c ON c.id = i.customer_id
               LEFT JOIN bikes b ON b.id = i.bike_id WHERE 1=1`;
    const args: (string | number)[] = [];
    if (customerId) { sql += ' AND i.customer_id = ?'; args.push(customerId); }
    sql += ' ORDER BY i.created_at DESC';

    const result = await db.execute({ sql, args });
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { customer_id, bike_id, issue_date, due_date, items, tax_rate = 0.10, notes } = body;

    if (!customer_id || !issue_date || !items || items.length === 0) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const invoice_no = await generateInvoiceNo(db);
    const subtotal = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
    const tax_amount = Math.floor(subtotal * tax_rate);
    const total_amount = subtotal + tax_amount;

    const invResult = await db.execute({
      sql: `INSERT INTO invoices (customer_id, bike_id, invoice_no, issue_date, due_date, subtotal, tax_rate, tax_amount, total_amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [customer_id, bike_id || null, invoice_no, issue_date, due_date || null, subtotal, tax_rate, tax_amount, total_amount, notes || null],
    });

    const invoiceId = Number(invResult.lastInsertRowid);
    for (const item of items) {
      await db.execute({
        sql: `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)`,
        args: [invoiceId, item.description, item.quantity, item.unit_price, item.amount],
      });
    }

    const row = await db.execute({ sql: 'SELECT * FROM invoices WHERE id = ?', args: [invoiceId] });
    return NextResponse.json(row.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
  }
}
