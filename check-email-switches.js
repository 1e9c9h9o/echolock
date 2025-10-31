import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkEmailSwitches() {
  const client = await pool.connect();
  try {
    // Check total email switches
    console.log('=== EMAIL SWITCH ANALYSIS ===\n');

    const totalResult = await client.query(`
      SELECT COUNT(*) as count
      FROM switches
      WHERE type = 'email'
    `);
    console.log('Total email switches:', totalResult.rows[0].count);

    // Check email switches by user
    const userResult = await client.query(`
      SELECT u.email, u.id as user_id, COUNT(s.id) as switch_count
      FROM users u
      LEFT JOIN switches s ON u.id = s.user_id AND s.type = 'email'
      GROUP BY u.email, u.id
      ORDER BY switch_count DESC
    `);
    console.log('\nEmail switches by user:');
    userResult.rows.forEach(row => {
      console.log(`  ${row.email}: ${row.switch_count} switches`);
    });

    // Check recent email switches
    const recentResult = await client.query(`
      SELECT
        s.id,
        s.user_id,
        u.email,
        s.title,
        s.created_at,
        s.released_at,
        s.status
      FROM switches s
      JOIN users u ON u.id = s.user_id
      WHERE s.type = 'email'
      ORDER BY s.created_at DESC
      LIMIT 10
    `);
    console.log('\nRecent email switches:');
    if (recentResult.rows.length === 0) {
      console.log('  No email switches found!');
    } else {
      recentResult.rows.forEach(row => {
        console.log(`  [${row.email}] ${row.title} - Status: ${row.status}, Created: ${row.created_at}`);
      });
    }

    // Check if there's a scheduled distribution or initialization
    const initResult = await client.query(`
      SELECT * FROM release_log
      ORDER BY timestamp DESC
      LIMIT 5
    `);
    console.log('\nRecent release log entries:');
    if (initResult.rows.length === 0) {
      console.log('  No release log entries found!');
    } else {
      initResult.rows.forEach(row => {
        console.log(`  ${row.timestamp}: ${row.event_type} - Count: ${row.count || 0}`);
      });
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkEmailSwitches().catch(console.error);
