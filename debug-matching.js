// Debug matching
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

async function debugMatching() {
  // Get all templates
  const { data: templates } = await supabase
    .from('ride_templates')
    .select('id, host_id, from_location, to_location, days_available, status, vehicle_type, gender_preference');

  // Get all requests
  const { data: requests } = await supabase
    .from('ride_requests')
    .select('id, rider_id, pickup_location, destination_location, days_needed, status, vehicle_preference, gender_preference');

  console.log('=== RIDE TEMPLATES ===');
  templates?.forEach(t => {
    console.log(`  Template: ${t.id.substring(0,8)}...`);
    console.log(`    Host: ${t.host_id}, Status: ${t.status}`);
    console.log(`    Route: ${t.from_location} -> ${t.to_location}`);
    console.log(`    Days: ${JSON.stringify(t.days_available)}`);
    console.log(`    Vehicle: ${t.vehicle_type}, Gender: ${t.gender_preference}`);
  });

  console.log('\n=== RIDE REQUESTS ===');
  requests?.forEach(r => {
    console.log(`  Request: ${r.id.substring(0,8)}...`);
    console.log(`    Rider: ${r.rider_id}, Status: ${r.status}`);
    console.log(`    Route: ${r.pickup_location} -> ${r.destination_location}`);
    console.log(`    Days: ${JSON.stringify(r.days_needed)}`);
    console.log(`    Vehicle: ${r.vehicle_preference}, Gender: ${r.gender_preference}`);
  });

  // Test match calculation
  if (templates?.length > 0 && requests?.length > 0) {
    console.log('\n=== TESTING MATCH CALCULATION ===');
    const { data: result, error } = await supabase
      .rpc('calculate_route_match_score', {
        template_id: templates[0].id,
        request_id: requests[0].id
      });
    
    console.log('Match result:', result);
    if (error) console.error('RPC Error:', error);
  }

  // Try generating matches
  console.log('\n=== TRYING TO GENERATE MATCHES ===');
  const { data: genResult, error: genError } = await supabase
    .rpc('generate_all_matches');
  
  console.log('Generate result:', genResult);
  if (genError) console.error('Generate error:', genError);

  // Check match_suggestions again
  const { data: matches } = await supabase
    .from('match_suggestions')
    .select('*');
  
  console.log('\n=== MATCH SUGGESTIONS AFTER GENERATE ===');
  console.log(`Count: ${matches?.length || 0}`);
}

debugMatching();
