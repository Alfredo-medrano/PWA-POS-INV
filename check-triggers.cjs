require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query(`
      SELECT tgname, tgisinternal 
      FROM pg_trigger 
      WHERE tgrelid = 'productos'::regclass
    `);
    console.log("Triggers on productos:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
