import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { id } = await params;
    const invRes = await db.execute({
      sql: `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   b.vehicle_type, b.maker, b.product_name, b.registration_no, b.color
            FROM invoices i
            JOIN customers c ON c.id = i.customer_id
            LEFT JOIN bikes b ON b.id = i.bike_id WHERE i.id = ?`,
      args: [id],
    });
    if (invRes.rows.length === 0) return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 });
    const itemsRes = await db.execute({ sql: 'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id', args: [id] });
    return NextResponse.json({ ...invRes.rows[0], items: itemsRes.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { id } = await params;
    const { status } = await req.json();
    await db.execute({ sql: `UPDATE invoices SET status=?, updated_at=datetime('now','localtime') WHERE id=?`, args: [status, id] });
    const row = await db.execute({ sql: 'SELECT * FROM invoices WHERE id = ?', args: [id] });
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
    await db.execute({ sql: 'DELETE FROM invoices WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
