import { NextRequest, NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    await initSchema();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customer_id');

    let result;
    if (customerId) {
      result = await db.execute({
        sql: `SELECT b.*, c.name as customer_name, c.phone as customer_phone
              FROM bikes b JOIN customers c ON c.id = b.customer_id
              WHERE b.customer_id = ? ORDER BY b.created_at DESC`,
        args: [customerId],
      });
    } else {
      result = await db.execute({
        sql: `SELECT b.*, c.name as customer_name, c.phone as customer_phone
              FROM bikes b JOIN customers c ON c.id = b.customer_id
              ORDER BY b.created_at DESC`,
        args: [],
      });
    }

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
    const { customer_id, vehicle_type, maker, product_name, bike_type, color, registration_no, frame_no, displacement, year, purchase_date, notes } = body;

    if (!customer_id) return NextResponse.json({ error: 'お客様IDは必須です' }, { status: 400 });

    const result = await db.execute({
      sql: `INSERT INTO bikes (customer_id, vehicle_type, maker, product_name, bike_type, color, registration_no, frame_no, displacement, year, purchase_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [customer_id, vehicle_type || null, maker || null, product_name || null, bike_type || null, color || null, registration_no || null, frame_no || null, displacement || null, year || null, purchase_date || null, notes || null],
    });

    const row = await db.execute({ sql: 'SELECT * FROM bikes WHERE id = ?', args: [Number(result.lastInsertRowid)] });
    return NextResponse.json(row.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
  }
}
