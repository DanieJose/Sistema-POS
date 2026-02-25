const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

console.log('process.cwd():', process.cwd());
console.log('__dirname:', __dirname);
console.log('Candidate .env paths:');

for (const candidate of candidates) {
  console.log(`- ${candidate} => ${fs.existsSync(candidate) ? 'FOUND' : 'missing'}`);
}

const envPath = candidates.find((candidate) => fs.existsSync(candidate));

if (!envPath) {
  console.error('NO .env found');
  process.exit(1);
}

dotenv.config({ path: envPath });

console.log('Using .env:', envPath);
console.log('Loaded env (safe):', {
  DB_HOST: process.env.DB_HOST || '',
  DB_PORT: process.env.DB_PORT || '',
  DB_USER: process.env.DB_USER || '',
  DB_NAME: process.env.DB_NAME || '',
});
