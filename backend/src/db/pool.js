import pg from 'pg';

const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://suresh_kumar:12345@127.0.0.1:5432/AstroAuth' });

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});
