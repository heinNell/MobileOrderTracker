// Messages Page - Communication Hub
// Fixed: Removed foreign key relationship dependency (messages_recipient_id_fkey)
// Now using manual joins to fetch user details for sender/recipient
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Message, Order, User } from "../../shared/types";

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      fetchMessagesForOrder(selectedOrder.id);
    }
  }, [selectedOrder]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUser(session.user);
    fetchOrders();
    fetchDrivers();
    subscribeToMessages();
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
      
      // Select the first order by default if none selected
      if (data && data.length > 0 && !selectedOrder) {
        setSelectedOrder(data[0]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "driver")
        .order("full_name", { ascending: true });

      if (error) throw error;

      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const fetchMessagesForOrder = async (orderId: string) => {
    try {
      // Fetch messages without using foreign key relationships
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Get unique user IDs from messages
      const userIds = new Set<string>();
      messagesData.forEach(msg => {
        if (msg.sender_id) userIds.add(msg.sender_id);
        if (msg.recipient_id) userIds.add(msg.recipient_id);
      });

      // Fetch user details for all involved users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .in("id", Array.from(userIds));

      if (usersError) {
        console.warn("Error fetching user details:", usersError);
      }

      // Create a map of user ID to user details
      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

      // Enrich messages with user details
      const enrichedMessages = messagesData.map(msg => ({
        ...msg,
        sender: msg.sender_id ? usersMap.get(msg.sender_id) : null,
        recipient: msg.recipient_id ? usersMap.get(msg.recipient_id) : null
      }));

      setMessages(enrichedMessages as any);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      // Show user-friendly error message
      alert(`An error occurred while retrieving messages: ${error.message || 'Unknown error'}`);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any; // Use any since DB returns raw data
          // Only add message if it's for the currently selected order
          if (selectedOrder && newMessage.order_id === selectedOrder.id) {
            // Fetch user details for the new message
            const userIds = [];
            if (newMessage.sender_id) userIds.push(newMessage.sender_id);
            // Note: Check if your messages table actually has recipient_id column
            // If not, you may need to determine recipient differently

            let enrichedMessage = newMessage;
            
            if (userIds.length > 0) {
              const { data: usersData } = await supabase
                .from("users")
                .select("id, full_name, email, role")
                .in("id", userIds);

              const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
              enrichedMessage = {
                ...newMessage,
                sender: newMessage.sender_id ? usersMap.get(newMessage.sender_id) : null,
                // Only set recipient if recipient_id exists in the message
                ...(newMessage.recipient_id && {
                  recipient: usersMap.get(newMessage.recipient_id)
                })
              };
            }

            setMessages((prev) => [...prev, enrichedMessage as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedOrder) return;

    try {
      const messageData: any = {
        order_id: selectedOrder.id,
        sender_id: user.id,
        message_text: newMessage,
      };

      // Add recipient if selected
      if (selectedDriver) {
        messageData.recipient_id = selectedDriver;
      }

      const { error } = await supabase
        .from("messages")
        .insert(messageData);

      if (error) throw error;

      setNewMessage("");
      setSelectedDriver("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="md:hidden bg-white shadow">
        <div className="px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Communication Hub</h1>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 hidden md:block"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Communicate with drivers about orders
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-1 bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Orders</h2>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
              {orders.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No orders available
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedOrder?.id === order.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.order_number}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {order.assigned_driver?.full_name || "Unassigned"}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {order.status}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 truncate">
                          {order.loading_point_name} → {order.unloading_point_name}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-3 flex flex-col">
            {selectedOrder ? (
              <div className="bg-white shadow rounded-lg flex flex-col h-full">
                {/* Order Header */}
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        Order {selectedOrder.order_number}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedOrder.loading_point_name} → {selectedOrder.unloading_point_name}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-0">
                      <p className="text-sm text-gray-500">
                        Driver: {selectedOrder.assigned_driver?.full_name || "Unassigned"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 350px)" }}>
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No messages yet. Start a conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-3/4 ${
                            message.sender_id === user.id ? "ml-auto" : "mr-auto"
                          }`}
                        >
                          <div
                            className={`rounded-lg p-4 ${
                              message.sender_id === user.id
                                ? "bg-blue-100 rounded-br-none"
                                : "bg-gray-100 rounded-bl-none"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-medium text-gray-900">
                                {message.sender?.full_name || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <p className="mt-1 text-gray-700">{message.message_text}</p>
                            {message.recipient && (
                              <p className="mt-2 text-xs text-gray-500">
                                To: {message.recipient.full_name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <textarea
                        rows={2}
                        className="shadow-sm block w-full focus:ring-blue-500 focus:border-blue-500 sm:text-sm border border-gray-300 rounded-md"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <label htmlFor="driver" className="block text-sm font-medium text-gray-700 mr-2">
                        To:
                      </label>
                      <select
                        id="driver"
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                      >
                        <option value="">All drivers for this order</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No order selected</h3>
                  <p className="mt-1 text-gray-500">
                    Select an order from the list to start messaging.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}