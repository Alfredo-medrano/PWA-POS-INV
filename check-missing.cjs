require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query(`
      SELECT current_setting('random.missing.setting', true) IS NULL as is_null,
             current_setting('random.missing.setting', true) as val
    `);
    console.log("missing_ok = true:", res.rows[0]);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
