require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testInsert() {
  const client = await pool.connect();
  try {
    await client.query("SELECT set_config('app.current_tenant_id', 'single', false)");
    console.log("Config set to 'single'");
    
    // Try to insert a dummy product
    const id = require('crypto').randomUUID();
    await client.query(`
      INSERT INTO productos (id, name, sku, category, stock, min_stock, cost, price)
      VALUES ($1, $2, $3, $4, 0, 0, 0, 0)
    `, [id, 'Test Product', 'TEST-SKU-999', 'Test Category']);
    
    console.log("Insert successful!");
    
    // Clean up
    await client.query("DELETE FROM productos WHERE id = $1", [id]);
  } catch(e) {
    console.error("Insert failed:", e.message);
  } finally {
    client.release();
    pool.end();
  }
}

testInsert();
