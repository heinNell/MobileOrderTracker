'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '@nextui-org/react';
import { PlusIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

interface OrderTemplate {
  id: string;
  template_name: string;
  description?: string;
  template_type: string;
  default_service_type?: string;
  default_vehicle_type?: string;
  default_priority: string;
  default_loading_instructions?: string;
  default_unloading_instructions?: string;
  usage_count: number;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OrderTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const { data, error } = await supabase
        .from('order_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('order_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  }

  async function duplicateTemplate(template: OrderTemplate) {
    try {
      const { id, created_at, usage_count, ...templateData } = template;
      const newTemplate = {
        ...templateData,
        template_name: `${template.template_name} (Copy)`,
        usage_count: 0,
      };

      const { error } = await supabase
        .from('order_templates')
        .insert(newTemplate);

      if (error) throw error;
      await fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      alert('Failed to duplicate template');
    }
  }

  function openModal(template?: OrderTemplate) {
    setEditingTemplate(template || null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTemplate(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Order Template Management</h1>
        <Button
          color="primary"
          startContent={<PlusIcon className="h-5 w-5" />}
          onPress={() => openModal()}
        >
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No templates found</p>
          <Button color="primary" onPress={() => openModal()}>
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">
                    {template.template_name}
                  </h3>
                  <div className="flex gap-2 flex-wrap mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                      {template.template_type}
                    </span>
                    {template.is_public && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                        Public
                      </span>
                    )}
                    {template.is_active ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="space-y-1 text-sm text-gray-600 mb-3">
                {template.default_service_type && (
                  <p>Service: {template.default_service_type}</p>
                )}
                {template.default_vehicle_type && (
                  <p>Vehicle: {template.default_vehicle_type}</p>
                )}
                <p>Priority: {template.default_priority}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-xs text-gray-500">
                  Used {template.usage_count} times
                </span>
                <div className="flex gap-1">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => duplicateTemplate(template)}
                    title="Duplicate"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => openModal(template)}
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => deleteTemplate(template.id)}
                    title="Delete"
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
        <TemplateModal
          template={editingTemplate}
          onClose={closeModal}
          onSave={() => {
            closeModal();
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}

function TemplateModal({
  template,
  onClose,
  onSave,
}: {
  template: OrderTemplate | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    description: template?.description || '',
    template_type: template?.template_type || 'standard',
    default_service_type: template?.default_service_type || '',
    default_vehicle_type: template?.default_vehicle_type || '',
    default_priority: template?.default_priority || 'standard',
    default_loading_instructions: template?.default_loading_instructions || '',
    default_unloading_instructions: template?.default_unloading_instructions || '',
    is_active: template?.is_active ?? true,
    is_public: template?.is_public ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        template_name: formData.template_name,
        description: formData.description || null,
        template_type: formData.template_type,
        default_service_type: formData.default_service_type || null,
        default_vehicle_type: formData.default_vehicle_type || null,
        default_priority: formData.default_priority,
        default_loading_instructions: formData.default_loading_instructions || null,
        default_unloading_instructions: formData.default_unloading_instructions || null,
        is_active: formData.is_active,
        is_public: formData.is_public,
      };

      if (template) {
        const { error } = await supabase
          .from('order_templates')
          .update(data)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('order_templates')
          .insert(data);
        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {template ? 'Edit Template' : 'Add Template'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md"
                value={formData.template_name}
                onChange={(e) =>
                  setFormData({ ...formData, template_name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Template Type
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.template_type}
                  onChange={(e) =>
                    setFormData({ ...formData, template_type: e.target.value })
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="bulk">Bulk</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Priority
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.default_priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_priority: e.target.value,
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Service Type
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Local Delivery"
                  value={formData.default_service_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_service_type: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Vehicle Type
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Van, Truck"
                  value={formData.default_vehicle_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_vehicle_type: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Default Loading Instructions
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Instructions for loading..."
                value={formData.default_loading_instructions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_loading_instructions: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Default Unloading Instructions
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
                placeholder="Instructions for unloading..."
                value={formData.default_unloading_instructions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_unloading_instructions: e.target.value,
                  })
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
                  checked={formData.is_public}
                  onChange={(e) =>
                    setFormData({ ...formData, is_public: e.target.checked })
                  }
                />
                <span className="text-sm">Public (available to all users)</span>
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" type="submit" isLoading={saving}>
                {template ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
