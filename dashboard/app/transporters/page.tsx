'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '@nextui-org/react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Transporter {
  id: string;
  name: string;
  company_name?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  service_types?: string[];
  currency?: string;
  base_rate_per_km?: number;
  is_active: boolean;
  is_preferred: boolean;
  performance_rating?: number;
  created_at: string;
}

export default function TransportersPage() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState<Transporter | null>(null);

  useEffect(() => {
    fetchTransporters();
  }, []);

  async function fetchTransporters() {
    try {
      const { data, error } = await supabase
        .from('transporters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransporters(data || []);
    } catch (error) {
      console.error('Error fetching transporters:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTransporter(id: string) {
    if (!confirm('Are you sure you want to delete this transporter?')) return;

    try {
      const { error } = await supabase
        .from('transporters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTransporters();
    } catch (error) {
      console.error('Error deleting transporter:', error);
      alert('Failed to delete transporter');
    }
  }

  function openModal(transporter?: Transporter) {
    setEditingTransporter(transporter || null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTransporter(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading transporters...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transporter Management</h1>
        <Button
          color="primary"
          startContent={<PlusIcon className="h-5 w-5" />}
          onPress={() => openModal()}
        >
          Add Transporter
        </Button>
      </div>

      {transporters.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No transporters found</p>
          <Button color="primary" onPress={() => openModal()}>
            Create Your First Transporter
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {transporters.map((transporter) => (
            <div
              key={transporter.id}
              className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{transporter.name}</h3>
                    {transporter.is_preferred && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Preferred
                      </span>
                    )}
                    {transporter.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  {transporter.company_name && (
                    <p className="text-gray-600 mb-1">
                      Company: {transporter.company_name}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm text-gray-600">
                    {transporter.primary_contact_name && (
                      <p>Contact: {transporter.primary_contact_name}</p>
                    )}
                    {transporter.primary_contact_phone && (
                      <p>Phone: {transporter.primary_contact_phone}</p>
                    )}
                    {transporter.primary_contact_email && (
                      <p>Email: {transporter.primary_contact_email}</p>
                    )}
                    {transporter.base_rate_per_km && (
                      <p>Rate: {transporter.currency || 'USD'} {transporter.base_rate_per_km.toFixed(2)}/km</p>
                    )}
                  </div>

                  {transporter.service_types && transporter.service_types.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {transporter.service_types.map((service, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  )}

                  {transporter.performance_rating && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-600">Rating:</span>
                      <span className="text-yellow-500">
                        {'★'.repeat(Math.round(transporter.performance_rating))}
                        {'☆'.repeat(5 - Math.round(transporter.performance_rating))}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({transporter.performance_rating.toFixed(1)})
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => openModal(transporter)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => deleteTransporter(transporter.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <TransporterModal
          transporter={editingTransporter}
          onClose={closeModal}
          onSave={() => {
            closeModal();
            fetchTransporters();
          }}
        />
      )}
    </div>
  );
}

function TransporterModal({
  transporter,
  onClose,
  onSave,
}: {
  transporter: Transporter | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: transporter?.name || '',
    company_name: transporter?.company_name || '',
    primary_contact_name: transporter?.primary_contact_name || '',
    primary_contact_phone: transporter?.primary_contact_phone || '',
    primary_contact_email: transporter?.primary_contact_email || '',
    base_rate_per_km: transporter?.base_rate_per_km || 0,
    currency: transporter?.currency || 'USD',
    service_types: transporter?.service_types?.join(', ') || '',
    is_active: transporter?.is_active ?? true,
    is_preferred: transporter?.is_preferred ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        name: formData.name,
        company_name: formData.company_name || null,
        primary_contact_name: formData.primary_contact_name || null,
        primary_contact_phone: formData.primary_contact_phone || null,
        primary_contact_email: formData.primary_contact_email || null,
        base_rate_per_km: formData.base_rate_per_km || null,
        currency: formData.currency,
        service_types: formData.service_types
          ? formData.service_types.split(',').map((s) => s.trim())
          : [],
        is_active: formData.is_active,
        is_preferred: formData.is_preferred,
      };

      if (transporter) {
        const { error } = await supabase
          .from('transporters')
          .update(data)
          .eq('id', transporter.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transporters').insert(data);
        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving transporter:', error);
      alert('Failed to save transporter');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {transporter ? 'Edit Transporter' : 'Add Transporter'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Company Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.primary_contact_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primary_contact_name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.primary_contact_phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primary_contact_phone: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Contact Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.primary_contact_email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    primary_contact_email: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Base Rate per KM
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.base_rate_per_km}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      base_rate_per_km: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Currency
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="ZAR">ZAR</option>
                  <option value="NGN">NGN</option>
                  <option value="KES">KES</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Service Types (comma-separated)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Local Delivery, Long Haul, Express"
                value={formData.service_types}
                onChange={(e) =>
                  setFormData({ ...formData, service_types: e.target.value })
                }
              />
            </div>

            <div className="flex gap-4">
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

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_preferred}
                  onChange={(e) =>
                    setFormData({ ...formData, is_preferred: e.target.checked })
                  }
                />
                <span className="text-sm">Preferred</span>
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" type="submit" isLoading={saving}>
                {transporter ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
