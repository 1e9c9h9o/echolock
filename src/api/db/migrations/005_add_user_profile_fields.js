/**
 * Migration: Add user profile fields
 *
 * Adds display_name, bio, and avatar_url columns to the users table
 * for enhanced profile customization.
 */

export async function up(client) {
  // Add profile fields to users table
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
  `);

  console.log('Added profile fields to users table');
}

export async function down(client) {
  await client.query(`
    ALTER TABLE users DROP COLUMN IF EXISTS display_name;
    ALTER TABLE users DROP COLUMN IF EXISTS bio;
    ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
  `);
}
