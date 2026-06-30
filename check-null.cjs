require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res2 = await pool.query(`
      SELECT column_name, is_nullable, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'productos' AND column_name = 'tenant_id'
    `);
    console.log("tenant_id column:", res2.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
