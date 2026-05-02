import { NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    await initSchema();
    const today = new Date().toISOString().split('T')[0];

    const result = await db.execute({
      sql: `SELECT
              m.id, m.bike_id, m.customer_id, m.maintenance_type,
              m.date as last_date, m.next_due_date, m.next_due_mileage,
              c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
              b.vehicle_type, b.maker, b.product_name, b.registration_no, b.color,
              JULIANDAY(?) - JULIANDAY(m.next_due_date) as days_overdue
            FROM maintenance_records m
            JOIN customers c ON c.id = m.customer_id
            JOIN bikes b ON b.id = m.bike_id
            WHERE m.next_due_date IS NOT NULL
              AND m.id = (
                SELECT id FROM maintenance_records m2
                WHERE m2.bike_id = m.bike_id AND m2.maintenance_type = m.maintenance_type
                ORDER BY m2.date DESC LIMIT 1
              )
            ORDER BY days_overdue DESC, m.maintenance_type`,
      args: [today],
    });

    const alerts = result.rows as unknown as Array<{ days_overdue: number; [key: string]: unknown }>;
    const overdue = alerts.filter(a => Number(a.days_overdue) > 0);
    const upcoming = alerts.filter(a => Number(a.days_overdue) <= 0 && Number(a.days_overdue) > -30);
    const future = alerts.filter(a => Number(a.days_overdue) <= -30);

    return NextResponse.json({ overdue, upcoming, future, total: alerts.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}
