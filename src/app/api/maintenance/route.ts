import { NextRequest, NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    await initSchema();
    const { searchParams } = new URL(req.url);
    const bikeId = searchParams.get('bike_id');
    const customerId = searchParams.get('customer_id');
    const type = searchParams.get('type');

    let sql = `SELECT m.*, c.name as customer_name, b.vehicle_type, b.maker, b.product_name, b.registration_no
               FROM maintenance_records m
               JOIN customers c ON c.id = m.customer_id
               JOIN bikes b ON b.id = m.bike_id WHERE 1=1`;
    const args: (string | number | null)[] = [];

    if (bikeId) { sql += ' AND m.bike_id = ?'; args.push(bikeId); }
    if (customerId) { sql += ' AND m.customer_id = ?'; args.push(customerId); }
    if (type) { sql += ' AND m.maintenance_type = ?'; args.push(type); }
    sql += ' ORDER BY m.date DESC';

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
    const { bike_id, customer_id, maintenance_type, date, mileage, next_due_date, next_due_mileage, cost, description, notes } = body;

    if (!bike_id || !customer_id || !maintenance_type || !date) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const result = await db.execute({
      sql: `INSERT INTO maintenance_records (bike_id, customer_id, maintenance_type, date, mileage, next_due_date, next_due_mileage, cost, description, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [bike_id, customer_id, maintenance_type, date, mileage || null, next_due_date || null, next_due_mileage || null, cost || 0, description || null, notes || null],
    });

    const row = await db.execute({ sql: 'SELECT * FROM maintenance_records WHERE id = ?', args: [Number(result.lastInsertRowid)] });
    return NextResponse.json(row.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
  }
}
