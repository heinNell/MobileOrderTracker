// src/screens/Messages.tsx
import { supabase } from '@/lib/supabase';
import type { RootStackParamList } from '@/types/navigation';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import
  {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
  } from 'react-native';
import type { Message } from '../../../shared/types';

// Define navigation and route props
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Messages'>;
type RoutePropType = RouteProp<RootStackParamList, 'Messages'>;

const MessagesScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { orderId } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data as Message[]);
      } catch (e) {
        console.error('Fetch messages error:', e);
        Alert.alert('Error', 'Failed to load messages.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages:order=${orderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to send messages.');
        navigation.navigate('Login');
        return;
      }

      const { error } = await supabase.from('messages').insert({
        order_id: orderId,
        sender_id: user.id,
        message_text: newMessage.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setNewMessage('');
    } catch (e: any) {
      console.error('Send message error:', e);
      Alert.alert('Error', e?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }, [newMessage, orderId, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item: Message) => item.id}
        renderItem={({ item }: { item: Message }) => (
          <View style={styles.message}>
            <Text style={styles.sender}>{item.sender?.full_name || 'Unknown'}</Text>
            <Text style={styles.text}>{item.message_text}</Text>
            <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleTimeString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>}
      />
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  message: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sender: { fontWeight: '600', color: '#111827' },
  text: { color: '#374151', marginTop: 4 },
  timestamp: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'right' },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 20 },
  inputWrap: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  input: { flex: 1, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: '600' },
});

export default MessagesScreen;
