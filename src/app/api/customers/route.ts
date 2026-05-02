import { NextRequest, NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    await initSchema();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    let result;
    if (search) {
      const like = `%${search}%`;
      result = await db.execute({
        sql: `SELECT c.*, COUNT(b.id) as bike_count
              FROM customers c
              LEFT JOIN bikes b ON b.customer_id = c.id
              WHERE c.name LIKE ? OR c.name_kana LIKE ? OR c.phone LIKE ?
              GROUP BY c.id ORDER BY c.name_kana, c.name`,
        args: [like, like, like],
      });
    } else {
      result = await db.execute({
        sql: `SELECT c.*, COUNT(b.id) as bike_count
              FROM customers c
              LEFT JOIN bikes b ON b.customer_id = c.id
              GROUP BY c.id ORDER BY c.name_kana, c.name`,
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
    await initSchema();
    const body = await req.json();
    const { name, name_kana, phone, birthday, email, notes } = body;

    if (!name) return NextResponse.json({ error: 'お客様名は必須です' }, { status: 400 });

    const result = await db.execute({
      sql: `INSERT INTO customers (name, name_kana, phone, birthday, email, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [name, name_kana || null, phone || null, birthday || null, email || null, notes || null],
    });

    const row = await db.execute({ sql: 'SELECT * FROM customers WHERE id = ?', args: [Number(result.lastInsertRowid)] });
    return NextResponse.json(row.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
  }
}
