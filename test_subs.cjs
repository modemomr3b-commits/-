require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('settings').select('*').match({ id: 'push_subs' }).single();
  console.log("Subscriptions data:", data ? data.data.length : 'none');
}
run();
