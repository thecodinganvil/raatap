// test-env.js - Test if .env.local is readable
const fs = require('fs');

console.log('Reading .env.local...\n');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', env.NEXT_PUBLIC_SUPABASE_URL);
console.log('✅ SUPABASE_SERVICE_ROLE_KEY exists:', !!env.SUPABASE_SERVICE_ROLE_KEY);
console.log('\n✅ Environment variables loaded successfully!');
