import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { id } = await params;
    const customerRes = await db.execute({ sql: 'SELECT * FROM customers WHERE id = ?', args: [id] });
    if (customerRes.rows.length === 0) return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 });
    const bikesRes = await db.execute({ sql: 'SELECT * FROM bikes WHERE customer_id = ? ORDER BY created_at DESC', args: [id] });
    return NextResponse.json({ ...customerRes.rows[0], bikes: bikesRes.rows });
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
    const { name, name_kana, phone, birthday, email, notes } = body;
    if (!name) return NextResponse.json({ error: 'お客様名は必須です' }, { status: 400 });

    await db.execute({
      sql: `UPDATE customers SET name=?, name_kana=?, phone=?, birthday=?, email=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?`,
      args: [name, name_kana || null, phone || null, birthday || null, email || null, notes || null, id],
    });

    const row = await db.execute({ sql: 'SELECT * FROM customers WHERE id = ?', args: [id] });
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
    await db.execute({ sql: 'DELETE FROM customers WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
