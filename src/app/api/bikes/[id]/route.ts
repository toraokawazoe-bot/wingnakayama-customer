import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { id } = await params;
    const bikeRes = await db.execute({
      sql: `SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
            FROM bikes b JOIN customers c ON c.id = b.customer_id WHERE b.id = ?`,
      args: [id],
    });
    if (bikeRes.rows.length === 0) return NextResponse.json({ error: '車両が見つかりません' }, { status: 404 });
    const maintRes = await db.execute({ sql: 'SELECT * FROM maintenance_records WHERE bike_id = ? ORDER BY date DESC', args: [id] });
    return NextResponse.json({ ...bikeRes.rows[0], maintenance: maintRes.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { id } = await params;
    const body = await req.json();
    const { vehicle_type, maker, product_name, bike_type, color, registration_no, frame_no, displacement, year, purchase_date, notes } = body;

    await db.execute({
      sql: `UPDATE bikes SET vehicle_type=?, maker=?, product_name=?, bike_type=?, color=?, registration_no=?, frame_no=?, displacement=?, year=?, purchase_date=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?`,
      args: [vehicle_type || null, maker || null, product_name || null, bike_type || null, color || null, registration_no || null, frame_no || null, displacement || null, year || null, purchase_date || null, notes || null, id],
    });

    const row = await db.execute({ sql: 'SELECT * FROM bikes WHERE id = ?', args: [id] });
    return NextResponse.json(row.rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { id } = await params;
    await db.execute({ sql: 'DELETE FROM bikes WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
