# 💬 Messages System Documentation

## Overview

The messaging system allows **communication between dashboard admins/dispatchers and drivers** about specific orders. It's currently implemented in the **dashboard only** - there is **NO mobile app implementation yet**.

---

## 🗄️ Database Structure

### Messages Table (`public.messages`)

```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    message_text TEXT NOT NULL,
    is_template BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_order ON messages(order_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view their messages
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can insert messages
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
```

### Real-time Subscription

```sql
-- Enable real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

---

## 📱 Current Implementation Status

### ✅ Dashboard (IMPLEMENTED)

**Location:** `/dashboard/app/messages/page.tsx`

**Features:**
- ✅ View all orders with assigned drivers
- ✅ Select order to view message history
- ✅ Send messages to specific drivers or all drivers
- ✅ Real-time message updates via Supabase subscriptions
- ✅ Message threading by order
- ✅ User-friendly chat interface
- ✅ Timestamp display
- ✅ Manual joins (no foreign key dependency)

**How it works:**
1. Admin selects an order from the left sidebar
2. Messages for that order appear in the main panel
3. Admin types message and optionally selects specific recipient driver
4. Message is sent to database with `order_id`, `sender_id`, `recipient_id`
5. Real-time subscription updates all connected clients

**Recent Fixes:**
- Removed dependency on foreign key relationships
- Implemented manual joins to fetch user details
- Fixed error: "PGRST200 - messages_recipient_id_fkey not found"

---

### ❌ Mobile App (NOT IMPLEMENTED)

**Status:** The mobile app (`/MyApp/`) does **NOT** have any messaging implementation currently.

**What's Missing:**
- No messaging UI/screen
- No message fetching logic
- No message sending functionality
- No real-time message notifications
- No message history display

**Why it doesn't exist:**
According to the documentation review, the mobile app focuses on:
- QR code scanning
- Location tracking
- Order status updates
- Driver dashboard

**Messaging was planned but never implemented in mobile app.**

---

## 🔧 How to Implement Mobile App Messaging

If you want to add messaging to the mobile app, here's what you need:

### 1. Create Messages Screen

**File:** `/MyApp/app/components/messaging/MessagesScreen.js`

```javascript
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button } from 'react-native';
import { supabase } from '../services/supabase';

export default function MessagesScreen({ order }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (order?.id) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [order]);

  const fetchMessages = async () => {
    try {
      // Fetch messages for this order
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user IDs
      const userIds = new Set();
      messagesData.forEach(msg => {
        if (msg.sender_id) userIds.add(msg.sender_id);
        if (msg.recipient_id) userIds.add(msg.recipient_id);
      });

      // Fetch user details
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, role')
        .in('id', Array.from(userIds));

      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

      // Enrich messages
      const enriched = messagesData.map(msg => ({
        ...msg,
        sender: usersMap.get(msg.sender_id),
        recipient: usersMap.get(msg.recipient_id)
      }));

      setMessages(enriched);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMsg = payload.new;
          if (newMsg.order_id === order.id) {
            // Fetch sender details
            const { data: userData } = await supabase
              .from('users')
              .select('id, full_name, role')
              .eq('id', newMsg.sender_id)
              .single();

            setMessages(prev => [...prev, {
              ...newMsg,
              sender: userData
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          order_id: order.id,
          sender_id: user.id,
          message_text: newMessage
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{
            padding: 10,
            marginVertical: 5,
            backgroundColor: item.sender_id === user?.id ? '#e3f2fd' : '#f5f5f5',
            borderRadius: 8
          }}>
            <Text style={{ fontWeight: 'bold' }}>
              {item.sender?.full_name || 'Unknown'}
            </Text>
            <Text>{item.message_text}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        )}
      />
      
      <View style={{ flexDirection: 'row', padding: 10 }}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          style={{ flex: 1, borderWidth: 1, borderRadius: 5, padding: 10 }}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
}
```

### 2. Add to Driver Dashboard

**File:** `/MyApp/app/(tabs)/DriverDashboard.js`

Add a "Messages" tab or button to access messaging for each order.

### 3. Add Push Notifications

When a new message arrives, send a push notification to the driver's device.

---

## 🔄 Data Flow

### Sending a Message (Dashboard)

```
Admin Dashboard
    ↓
  Select Order
    ↓
  Type Message
    ↓
  Optional: Select Recipient Driver
    ↓
  Click "Send"
    ↓
Supabase Insert
  messages table
    ↓
Real-time Broadcast
    ↓
All Subscribed Clients Update
```

### Receiving Messages (Dashboard)

```
Supabase Real-time Subscription
    ↓
New Message Event
    ↓
Fetch Sender/Recipient User Details
    ↓
Enrich Message Object
    ↓
Update Messages State
    ↓
UI Updates Automatically
```

---

## 📊 Message Types

### 1. **Broadcast Messages**
- `recipient_id` = NULL
- Visible to all users associated with the order
- Example: "Order delayed due to traffic"

### 2. **Direct Messages**
- `recipient_id` = specific driver ID
- Only visible to sender and recipient
- Example: "Please call customer at pickup"

### 3. **Template Messages** (Future)
- `is_template` = true
- Pre-defined messages for common scenarios
- Example: "Arrived at loading point"

---

## 🐛 Common Issues & Fixes

### Issue 1: Foreign Key Error (PGRST200)

**Error:** `foreign key relationship could not be established between 'messages' and 'users' tables`

**Solution:** Use manual joins instead of foreign key relationships in query
```javascript
// ❌ Don't do this
.select(`
  *,
  sender:users!messages_sender_id_fkey(full_name)
`)

// ✅ Do this instead
const { data: messagesData } = await supabase
  .from('messages')
  .select('*');

const { data: usersData } = await supabase
  .from('users')
  .select('id, full_name')
  .in('id', userIds);

// Enrich manually
```

### Issue 2: Messages Not Updating in Real-time

**Cause:** Not subscribed to changes or channel not set up

**Solution:** 
1. Ensure table is in `supabase_realtime` publication
2. Subscribe to correct channel
3. Handle new messages in subscription callback

### Issue 3: RLS Blocking Messages

**Cause:** User not authorized by RLS policies

**Solution:** Check RLS policies allow user to:
- SELECT their own messages (sender or recipient)
- INSERT with their own user_id as sender

---

## 🚀 Future Enhancements

### Planned Features:
- [ ] **Mobile app messaging screen**
- [ ] **Push notifications for new messages**
- [ ] **Message attachments (photos, documents)**
- [ ] **Read receipts**
- [ ] **Typing indicators**
- [ ] **Message search**
- [ ] **Message templates**
- [ ] **Group messaging**
- [ ] **Message deletion**
- [ ] **Message editing**

### Technical Improvements:
- [ ] **Pagination for message history**
- [ ] **Message caching**
- [ ] **Offline message queue**
- [ ] **Message encryption**
- [ ] **Rate limiting**
- [ ] **Spam prevention**

---

## 📝 Summary

**Current State:**
- ✅ Database schema complete with RLS
- ✅ Dashboard messaging fully functional
- ✅ Real-time updates working
- ❌ Mobile app has NO messaging implementation

**To Add Mobile Messaging:**
1. Create MessagesScreen component
2. Add to order detail view
3. Implement send/receive logic
4. Add push notifications
5. Test real-time updates

**Estimated Effort:** 4-6 hours for basic mobile messaging implementation

---

**Last Updated:** October 29, 2025
**Status:** Dashboard Complete | Mobile App Pending
