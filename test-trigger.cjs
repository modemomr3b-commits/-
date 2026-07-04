
const { supabase } = require('./src/supabase');
async function run() {
  const { data, error } = await supabase.rpc('get_triggers');
  console.log('Triggers:', data, error);
}
run();

