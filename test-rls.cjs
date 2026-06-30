require('dotenv').config({ path: '.env' });
const { AsyncLocalStorage } = require('async_hooks');
const { Pool } = require('pg');

const als = new AsyncLocalStorage();
const rawPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const pool = new Proxy(rawPool, {
  get(target, prop, receiver) {
    if (prop === 'query') {
      return async function(text, params) {
        console.log('Query trap triggered');
        const client = await receiver.connect();
        try {
          return await client.query(text, params);
        } finally {
          client.release();
        }
      };
    }
    if (prop === 'connect') {
      console.log('Connect trap accessed');
      return async function() {
        console.log('Connect function executed');
        const client = await target.connect();
        const tenantId = als.getStore();
        if (tenantId) {
          await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
        } else {
          await client.query(`SELECT set_config('app.current_tenant_id', '', false)`);
        }
        return client;
      }
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
});

async function test() {
  await als.run('test-tenant', async () => {
    try {
      const res = await pool.query("SELECT current_setting('app.current_tenant_id', true) as t");
      console.log('Inside pool.query, tenant is:', res.rows[0].t);
    } catch(e) {
      console.error(e);
    }
  });
  rawPool.end();
}

test();
