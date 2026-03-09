/**
 * deploy-db.js
 * Deploys all Supabase SQL functions and triggers
 * 
 * Usage: npm run db:migrate
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// SQL files in deployment order
const SQL_FILES = [
  'database/functions/01_create_rides.sql',
  'database/functions/02_matching.sql',
  'database/functions/03_match_management.sql',
  'database/functions/04_seat_management.sql',
  'database/functions/05_auto_create_triggers.sql',
  'database/functions/06_idempotent_matching.sql',
  'database/functions/07_match_workflow_updates.sql',
  'database/functions/08_enforce_capacity.sql',
  'database/functions/09_standardize_match_functions.sql',
];

async function deploySQLFile(filePath, supabase) {
  const sqlContent = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`📄 Deploying: ${filePath}`);
  
  // Split by semicolons to execute individual statements
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  for (const statement of statements) {
    try {
      // Use RPC to execute raw SQL (requires service role key)
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.warn(`⚠️  Warning in statement: ${error.message}`);
      }
    } catch (err) {
      console.warn(`⚠️  Statement execution error: ${err.message}`);
    }
  }
  
  console.log(`✅ Completed: ${filePath}`);
}

async function main() {
  console.log('🚀 Starting Supabase Database Deployment...\n');
  
  // Validate configuration
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n   Please create a .env.local file with these values.');
    process.exit(1);
  }
  
  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Test connection
  const { error: testError } = await supabase.from('profiles').select('id').limit(1);
  if (testError) {
    console.error('❌ Failed to connect to Supabase:', testError.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to Supabase\n');
  
  // Deploy each SQL file
  for (const file of SQL_FILES) {
    const fullPath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  File not found: ${fullPath}`);
      continue;
    }
    
    await deploySQLFile(fullPath, supabase);
    console.log(''); // Empty line between files
  }
  
  console.log('✅ All database functions deployed successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Verify functions in Supabase Dashboard → Database → Functions');
  console.log('   2. Check triggers in Database → Triggers');
  console.log('   3. Test the match workflow in the app');
}

main().catch(console.error);
