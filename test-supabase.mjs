import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0 && !key.startsWith('#')) {
    acc[key.trim()] = value.join('=').trim();
  }
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log(`Connecting to Supabase at ${supabaseUrl}`);
  
  // Try querying a public table or auth
  const { data, error } = await supabase.from('products').select('*').limit(1);
  
  if (error) {
    console.error("Supabase Query Error:", error);
  } else {
    console.log("Supabase Connection Successful! Data:", data);
  }
}

main();
