#!/usr/bin/env node

/**
 * Test script to verify location tracking fix
 * This script tests the LocationService functionality
 */

const { supabase } = require('./app/lib/supabase');

async function testLocationUpdates() {
  console.log('🧪 Testing Location Updates Fix...\n');

  try {
    // 1. Check if driver_locations table exists and has recent data
    console.log('1. Checking driver_locations table...');
    const { data: recentLocations, error: locError } = await supabase
      .from('driver_locations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (locError) {
      console.error('❌ Error querying driver_locations:', locError);
      return;
    }

    console.log(`✅ Found ${recentLocations.length} recent location updates`);
    
    if (recentLocations.length > 0) {
      const latest = recentLocations[0];
      console.log(`   Latest update: ${latest.created_at}`);
      console.log(`   Driver ID: ${latest.driver_id}`);
      console.log(`   Order ID: ${latest.order_id || 'NULL'}`);
      console.log(`   Location: ${latest.latitude}, ${latest.longitude}`);
      console.log(`   Is Manual: ${latest.is_manual_update || 'NULL'}\n`);
    }

    // 2. Check for updates with null order_id
    console.log('2. Checking for location updates without order_id...');
    const { data: nullOrderUpdates, error: nullError } = await supabase
      .from('driver_locations')
      .select('*')
      .is('order_id', null)
      .order('created_at', { ascending: false })
      .limit(3);

    if (nullError) {
      console.error('❌ Error querying null order updates:', nullError);
    } else {
      console.log(`⚠️  Found ${nullOrderUpdates.length} location updates with null order_id`);
      if (nullOrderUpdates.length > 0) {
        console.log('   This indicates drivers are sending location updates without active orders');
        console.log('   This is normal for manual location updates when no order is active\n');
      }
    }

    // 3. Check for recent updates with order_id
    console.log('3. Checking for location updates with order_id...');
    const { data: withOrderUpdates, error: withOrderError } = await supabase
      .from('driver_locations')
      .select(`
        *,
        orders:order_id (
          order_number,
          status
        )
      `)
      .not('order_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);

    if (withOrderError) {
      console.error('❌ Error querying order-linked updates:', withOrderError);
    } else {
      console.log(`✅ Found ${withOrderUpdates.length} location updates linked to orders`);
      withOrderUpdates.forEach((update, index) => {
        console.log(`   ${index + 1}. Order: ${update.orders?.order_number || 'Unknown'} (${update.orders?.status || 'Unknown status'})`);
        console.log(`      Location: ${update.latitude}, ${update.longitude}`);
        console.log(`      Timestamp: ${update.created_at}\n`);
      });
    }

    // 4. Summary
    console.log('📊 SUMMARY:');
    console.log(`   • Total recent location updates: ${recentLocations.length}`);
    console.log(`   • Updates without order_id: ${nullOrderUpdates.length}`);
    console.log(`   • Updates with order_id: ${withOrderUpdates.length}`);
    
    if (withOrderUpdates.length > 0) {
      console.log('\n🎉 SUCCESS: Location updates are being properly linked to orders!');
    } else if (recentLocations.length > 0) {
      console.log('\n⚠️  PARTIAL: Location updates are being sent, but none are linked to orders.');
      console.log('   This might be normal if no drivers are currently tracking orders.');
    } else {
      console.log('\n❌ ISSUE: No recent location updates found.');
      console.log('   Make sure drivers are using the mobile app and sending location updates.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLocationUpdates();