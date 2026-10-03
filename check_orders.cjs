
const { createClient } = require('@supabase/supabase-js');

// These should be set in the environment, if not, use placeholder
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://eycaxecdnzaj6jtnorvk2a.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '...';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
  console.log("Checking orders...");
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, orderNumber, status, createdAt')
      .order('createdAt', { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      console.log("Last 5 orders:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Caught error:", err);
  }
}

checkOrders();
