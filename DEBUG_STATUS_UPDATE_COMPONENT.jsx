// DEBUG COMPONENT - Add this temporarily to DriverDashboard.js to test status updates
// Place this right before the closing </View> of the activeOrder card

{/* 🧪 DEBUG: Status Update Test Component */}
{__DEV__ && (
  <View style={{
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F59E0B'
  }}>
    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#92400E', marginBottom: 12 }}>
      🧪 DEBUG: Status Update Test
    </Text>
    
    <Pressable
      style={{
        backgroundColor: '#3B82F6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8
      }}
      onPress={async () => {
        console.log('🧪 TEST: Starting status update test...');
        
        try {
          // Test 1: Check user
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          console.log('✅ User:', user?.id);
          if (userError) throw userError;
          
          // Test 2: Check order
          const { data: orderCheck, error: orderError } = await supabase
            .from('orders')
            .select('id, status, assigned_driver_id')
            .eq('id', activeOrder.id)
            .single();
          console.log('✅ Order:', orderCheck);
          console.log('✅ Assigned match?', orderCheck.assigned_driver_id === user.id);
          if (orderError) throw orderError;
          
          // Test 3: Check transitions
          const transitions = StatusUpdateService.getAvailableTransitions(orderCheck.status);
          console.log('✅ Available transitions:', transitions);
          
          // Test 4: Try update
          if (transitions.length > 0) {
            const nextStatus = transitions[0];
            console.log('🔄 Testing transition to:', nextStatus);
            
            const { data: updated, error: updateError } = await supabase
              .from('orders')
              .update({ 
                status: nextStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', activeOrder.id)
              .select()
              .single();
            
            if (updateError) {
              console.error('❌ Update failed:', updateError);
              Alert.alert('Update Failed', updateError.message);
            } else {
              console.log('✅ Order updated!', updated);
              
              // Test 5: Try status_updates insert
              const { error: insertError } = await supabase
                .from('status_updates')
                .insert({
                  order_id: activeOrder.id,
                  driver_id: user.id,
                  user_id: user.id,
                  status: nextStatus,
                  notes: 'Test from debug component'
                });
              
              if (insertError) {
                console.error('❌ Status update insert failed:', insertError);
              } else {
                console.log('✅ Status update record created!');
              }
              
              Alert.alert('Success!', `Updated to ${nextStatus}`);
              loadDriverData(); // Reload data
            }
          } else {
            Alert.alert('No Transitions', 'No valid status transitions available');
          }
          
        } catch (error) {
          console.error('❌ Test failed:', error);
          Alert.alert('Test Failed', error.message);
        }
      }}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
        🧪 Test Direct Status Update
      </Text>
    </Pressable>
    
    <Pressable
      style={{
        backgroundColor: '#6B7280',
        padding: 12,
        borderRadius: 8
      }}
      onPress={async () => {
        console.log('📊 Current State:');
        console.log('- Order ID:', activeOrder?.id);
        console.log('- Status:', activeOrder?.status);
        console.log('- Service initialized:', !!statusUpdateServiceInstance.currentUser);
        
        const { data: { user } } = await supabase.auth.getUser();
        console.log('- User ID:', user?.id);
        
        const transitions = StatusUpdateService.getAvailableTransitions(activeOrder?.status);
        console.log('- Transitions:', transitions);
        
        Alert.alert(
          'Current State',
          `Order: ${activeOrder?.id}\nStatus: ${activeOrder?.status}\nTransitions: ${transitions.join(', ')}`
        );
      }}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
        📊 Show Current State
      </Text>
    </Pressable>
  </View>
)}

/* 
USAGE INSTRUCTIONS:
1. Add this code block right before the closing </View> of the activeOrder card in DriverDashboard.js
2. Make sure to import StatusUpdateService at the top:
   import { StatusUpdateService } from '../services/StatusUpdateService';
3. The debug panel will only show in development mode (__DEV__)
4. Click "Test Direct Status Update" to try updating the order
5. Check console logs for detailed output
6. Remove this debug component once testing is complete
*/
