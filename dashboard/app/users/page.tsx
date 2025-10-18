'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '@nextui-org/react';
import { 
  PlusIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
  raw_user_meta_data?: {
    full_name?: string;
    role?: string;
  };
}

interface PublicUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [publicUsers, setPublicUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAuthUser, setSelectedAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);

      // Fetch auth users - Note: admin.listUsers requires service role
      // For now, we'll just fetch from public.users and show a note
      // In production, this should be done via a server-side API endpoint
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (!authError && authData) {
          setAuthUsers(authData.users as any || []);
        }
      } catch (adminError) {
        console.log('Admin API not available, using public users only');
        // If admin API is not available, we can only show synced users
      }

      // Fetch public users
      const { data: publicData, error: publicError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (publicError) throw publicError;
      setPublicUsers(publicData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  function isUserSynced(authUserId: string): boolean {
    return publicUsers.some(u => u.id === authUserId);
  }

  async function syncAllUsers() {
    if (!confirm('Sync all auth users to public.users table?')) return;

    setSyncing(true);
    try {
      const unsyncedUsers = authUsers.filter(au => !isUserSynced(au.id));
      
      for (const authUser of unsyncedUsers) {
        await syncUser(authUser);
      }

      await fetchUsers();
      alert(`Successfully synced ${unsyncedUsers.length} users!`);
    } catch (error) {
      console.error('Error syncing users:', error);
      alert('Failed to sync all users');
    } finally {
      setSyncing(false);
    }
  }

  async function syncUser(authUser: AuthUser) {
    try {
      const userData = {
        id: authUser.id,
        email: authUser.email || 'no-email@example.com',
        full_name: authUser.raw_user_meta_data?.full_name || authUser.email || 'Unknown',
        role: authUser.raw_user_meta_data?.role || 'driver',
        is_active: true,
      };

      const { error } = await supabase
        .from('users')
        .insert(userData);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error syncing user:', error);
      throw error;
    }
  }

  function openManualAddModal(authUser: AuthUser) {
    setSelectedAuthUser(authUser);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedAuthUser(null);
  }

  const syncedCount = authUsers.filter(au => isUserSynced(au.id)).length;
  const unsyncedCount = authUsers.length - syncedCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Sync Management</h1>
          <p className="text-gray-600 mt-1">
            Sync users from auth.users to public.users (Option 3)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            color="default"
            startContent={<ArrowPathIcon className="h-5 w-5" />}
            onPress={fetchUsers}
          >
            Refresh
          </Button>
          <Button
            color="primary"
            startContent={<ArrowPathIcon className="h-5 w-5" />}
            onPress={syncAllUsers}
            isLoading={syncing}
            isDisabled={unsyncedCount === 0}
          >
            Sync All Unsynced ({unsyncedCount})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Auth Users</p>
              <p className="text-2xl font-bold">{authUsers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Synced Users</p>
              <p className="text-2xl font-bold">{syncedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationCircleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Unsynced Users</p>
              <p className="text-2xl font-bold">{unsyncedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Auth Users Status</h2>
        </div>
        
        <div className="divide-y">
          {authUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No auth users found
            </div>
          ) : (
            authUsers.map((authUser) => {
              const isSynced = isUserSynced(authUser.id);
              const publicUser = publicUsers.find(u => u.id === authUser.id);

              return (
                <div key={authUser.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isSynced ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {isSynced ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <ExclamationCircleIcon className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{authUser.email || 'No email'}</p>
                            {isSynced && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                Synced
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 mt-1">
                            <span>ID: {authUser.id}</span>
                            {authUser.raw_user_meta_data?.full_name && (
                              <span className="ml-3">
                                Name: {authUser.raw_user_meta_data.full_name}
                              </span>
                            )}
                            {authUser.raw_user_meta_data?.role && (
                              <span className="ml-3">
                                Role: {authUser.raw_user_meta_data.role}
                              </span>
                            )}
                          </div>

                          {publicUser && (
                            <div className="text-sm text-gray-500 mt-1">
                              Public User: {publicUser.full_name || publicUser.email} 
                              ({publicUser.role})
                              {publicUser.is_active && (
                                <span className="ml-2 text-green-600">● Active</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isSynced && (
                      <Button
                        size="sm"
                        color="primary"
                        startContent={<PlusIcon className="h-4 w-4" />}
                        onPress={() => openManualAddModal(authUser)}
                      >
                        Manual Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isModalOpen && selectedAuthUser && (
        <ManualAddUserModal
          authUser={selectedAuthUser}
          onClose={closeModal}
          onSave={async () => {
            closeModal();
            await fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function ManualAddUserModal({
  authUser,
  onClose,
  onSave,
}: {
  authUser: AuthUser;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    id: authUser.id,
    email: authUser.email || '',
    full_name: authUser.raw_user_meta_data?.full_name || authUser.email || '',
    role: authUser.raw_user_meta_data?.role || 'driver',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .insert({
          id: formData.id,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
        });

      if (error) throw error;
      alert('User synced successfully!');
      onSave();
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user to public.users');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            Manual User Sync (Option 3)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Add this auth user to the public.users table
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                User ID (read-only)
              </label>
              <input
                type="text"
                disabled
                className="w-full px-3 py-2 border rounded-md bg-gray-100"
                value={formData.id}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border rounded-md"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="driver">Driver</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
                <span className="text-sm">Active</span>
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" type="submit" isLoading={saving}>
                Add to Public Users
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
