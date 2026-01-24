const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.development.local' });

async function initDb() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing in .env.development.local');
        process.exit(1);
    }

    const sql = neon(process.env.DATABASE_URL);

    try {
        console.log('Initializing database table...');
        await sql`
      CREATE TABLE IF NOT EXISTS user_verifications (
        whop_user_id TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        is_verified BOOLEAN DEFAULT TRUE,
        verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
        console.log('Success: user_verifications table is ready.');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initDb();
