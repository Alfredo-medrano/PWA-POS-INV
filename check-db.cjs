require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query(`
      SELECT polname, polcmd, polroles, polqual, polwithcheck 
      FROM pg_policy 
      WHERE polrelid = 'productos'::regclass
    `);
    console.log("Policies on productos:", res.rows);
    
    const res2 = await pool.query(`
      SELECT column_name, column_default, data_type 
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
