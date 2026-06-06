import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // Test the actual query from getMaintenanceRecordsByVehicleId
  try {
    const result = await client.execute(`
      SELECT 
        mr.id, mr.vehicle_id, mr.work_item_id, mr.work_name, mr.price, 
        mr.mileage, mr.performed_at, mr.memo, mr.created_at,
        u.display_name as staff_name,
        wi.category
      FROM maintenance_records mr
      LEFT JOIN users u ON mr.staff_id = u.id
      LEFT JOIN work_items wi ON mr.work_item_id = wi.id
      WHERE mr.vehicle_id = 1
      ORDER BY mr.performed_at DESC
    `);
    console.log("Query OK, rows:", result.rows.length);
    result.rows.forEach(r => console.log("  record:", JSON.stringify(r)));
  } catch (e: any) {
    console.error("Query FAILED:", e.message);
  }
  
  // Also test getActiveWorkItems
  try {
    const result = await client.execute(`
      SELECT id, name, category, default_price, display_order, is_active
      FROM work_items
      WHERE is_active = 1
      ORDER BY display_order
    `);
    console.log("\nWork items OK, count:", result.rows.length);
    result.rows.forEach(r => console.log(`  ${r.id}: ${r.name} (${r.category})`));
  } catch (e: any) {
    console.error("Work items query FAILED:", e.message);
  }

  client.close();
}
main().catch(console.error);
