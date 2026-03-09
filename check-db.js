// Check Supabase tables
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read env file manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('=== PROFILES ===');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, full_name, prefer_hosting, prefer_taking_ride, email_verified, vehicle_type');
  if (pError) console.error('Error:', pError);
  else {
    console.log(`Count: ${profiles?.length || 0}`);
    profiles?.forEach(p => console.log(`  - ${p.full_name} | Host: ${p.prefer_hosting} | Rider: ${p.prefer_taking_ride} | Verified: ${p.email_verified}`));
  }

  console.log('\n=== RIDE TEMPLATES ===');
  const { data: templates, error: tError } = await supabase
    .from('ride_templates')
    .select('id, host_id, from_location, to_location, status');
  if (tError) console.error('Error:', tError);
  else console.log(`Count: ${templates?.length || 0}`);

  console.log('\n=== RIDE REQUESTS ===');
  const { data: requests, error: rError } = await supabase
    .from('ride_requests')
    .select('id, rider_id, pickup_location, destination_location, status');
  if (rError) console.error('Error:', rError);
  else console.log(`Count: ${requests?.length || 0}`);

  console.log('\n=== MATCH SUGGESTIONS ===');
  const { data: matches, error: mError } = await supabase
    .from('match_suggestions')
    .select('id, ride_template_id, ride_request_id, overall_score, status');
  if (mError) console.error('Error:', mError);
  else console.log(`Count: ${matches?.length || 0}`);
}

checkTables();
