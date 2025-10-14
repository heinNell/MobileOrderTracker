const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Auth users data from the provided list
const authUsers = [
  {
    id: "b4c0f491-b3f2-4b48-8447-cab1610999e8",
    email: "heinrich@matanuska.com",
    full_name: "Heinrich Nel",
    role: "driver",
    created_at: "2025-10-09 14:24:41.598917+00"
  },
  {
    id: "a46e2a06-a773-45db-b060-d51bf151c587", 
    email: "www.hjnel@gmail.com",
    full_name: "Admin User",
    role: "admin",
    created_at: "2025-09-27 12:59:17.890902+00"
  },
  {
    id: "7d3cdfb1-b7e9-4dec-8671-3bf7e223dc0c",
    email: "heinrich@matanuska.co.zw", 
    full_name: "Heinrich Nel",
    role: "driver",
    created_at: "2025-10-09 08:23:01.778004+00"
  },
  {
    id: "c64ff1f7-d317-4f6b-9bb3-8dd93728984b",
    email: "nikkiekriel@gmail.com",
    full_name: "Nikkie", 
    role: "driver",
    created_at: "2025-10-10 05:27:56.014534+00"
  },
  {
    id: "1810fcd6-d65c-48ed-a680-db647117e984",
    email: "heinnell64@gmail.com",
    full_name: "Heinrich Nel",
    role: "driver", 
    created_at: "2025-10-09 14:11:28.447711+00"
  },
  {
    id: "720ea10c-5328-4821-a8f3-f710a0d176f8",
    email: "nikkie@gmail.com",
    full_name: "Nikkie",
    role: "driver",
    created_at: "2025-10-13 15:46:12.900953+00"
  },
  {
    id: "5d48cad9-b561-402f-ac10-fda2761076ee",
    email: "heinrich@matanuska.co.zc", 
    full_name: "heinrich",
    role: "driver",
    created_at: "2025-10-14 12:36:20.25065+00"
  },
  {
    id: "6f64a796-e52f-4ca0-a8cd-40a9c854057b",
    email: "heinnell64@gmail.co",
    full_name: "heinnell", 
    role: "driver",
    created_at: "2025-10-14 12:01:45.051262+00"
  },
  {
    id: "5e5ebf46-d35f-4dc4-9025-28fdf81059fd", // ⭐ THE KEY ONE!
    email: "john@gmail.com",
    full_name: "John Nolen",
    role: "driver",
    created_at: "2025-10-14 13:05:39.667588+00"
  }
];

async function syncAuthUsersToPublic() {
  console.log('🔄 Syncing auth.users to public.users...\n');
  
  const tenant_id = '17ed751d-9c45-4cbb-9ccc-50607c151d43'; // From admin user
  
  for (const user of authUsers) {
    console.log(`📝 Creating user: ${user.full_name} (${user.email}) - ${user.role}`);
    
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        tenant_id: tenant_id,
        is_active: true,
        created_at: user.created_at,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
      
    if (error) {
      console.error(`❌ Error creating ${user.full_name}:`, error);
    } else {
      console.log(`✅ Successfully synced ${user.full_name}`);
      
      // Highlight the key user
      if (user.id === '5e5ebf46-d35f-4dc4-9025-28fdf81059fd') {
        console.log('   ⭐ THIS IS JOHN NOLEN - THE ASSIGNED DRIVER!');
      }
    }
  }
  
  console.log('\n🔍 Verifying sync - checking public.users...');
  
  const { data: publicUsers, error: checkError } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .order('full_name');
    
  if (publicUsers && publicUsers.length > 0) {
    console.log(`✅ Found ${publicUsers.length} users in public.users:`);
    publicUsers.forEach((user, i) => {
      const highlight = user.id === '5e5ebf46-d35f-4dc4-9025-28fdf81059fd' ? ' ⭐' : '';
      console.log(`  ${i+1}. ${user.full_name} (${user.email}) - ${user.role}${highlight}`);
    });
  } else {
    console.log('❌ Still no users in public.users');
    if (checkError) console.log('Error:', checkError);
  }
  
  console.log('\n🎯 Now checking the order assignment...');
  
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      order_number,
      assigned_driver_id,
      status,
      assigned_driver:users!orders_assigned_driver_id_fkey(
        id,
        full_name,
        email,
        role
      )
    `)
    .eq('order_number', 'ORD-1760104586344')
    .single();
    
  if (order) {
    console.log('📦 Order Details:');
    console.log('- Order Number:', order.order_number);
    console.log('- Assigned Driver ID:', order.assigned_driver_id);
    console.log('- Status:', order.status);
    
    if (order.assigned_driver) {
      console.log('✅ Driver Assignment FIXED:');
      console.log('- Driver Name:', order.assigned_driver.full_name);
      console.log('- Driver Email:', order.assigned_driver.email);
      console.log('- Driver Role:', order.assigned_driver.role);
    } else {
      console.log('❌ Driver assignment still not working');
    }
  } else {
    console.log('❌ Order not found or error:', orderError);
  }
}

syncAuthUsersToPublic().catch(console.error);