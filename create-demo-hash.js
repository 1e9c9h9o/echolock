// Generate bcrypt hash for demo user password
import bcrypt from 'bcrypt';

const password = 'Demo123456!';
const saltRounds = 10;

const hash = await bcrypt.hash(password, saltRounds);
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nUse this hash in the seed-demo-user.sql file');
