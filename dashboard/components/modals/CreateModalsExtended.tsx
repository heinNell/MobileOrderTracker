"use client";

import
  {
    Button,
    Chip,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Switch,
    Textarea
  } from '@nextui-org/react';
import { useState } from 'react';
import
  {
    EnhancedGeofence,
    OrderTemplate,
    useContacts,
    useEnhancedGeofences,
    useOrderTemplates,
    useTransporters
  } from '../../hooks/useEnhancedData';

// Create Geofence Modal
interface CreateGeofenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (geofence: EnhancedGeofence) => void;
  defaultType?: string;
}

export function CreateGeofenceModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'loading'
}: CreateGeofenceModalProps) {
  const { createGeofence } = useEnhancedGeofences();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    geofence_type: defaultType,
    center_latitude: '',
    center_longitude: '',
    radius_meters: '100',
    shape_type: 'circle',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    landmark: '',
    access_instructions: '',
    contact_person: '',
    contact_phone: '',
    facility_type: '',
    trigger_event: 'entry',
    notification_enabled: true,
    alert_enabled: false,
    categories: [] as string[],
    tags: [] as string[],
    business_unit: '',
    region: '',
    zone: '',
    is_active: true,
    is_template: false,
    priority_level: 5,
    notes: ''
  });

  const [categoryInput, setCategoryInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const geofenceData: Partial<EnhancedGeofence> = {
        name: formData.name,
        description: formData.description || undefined,
        geofence_type: formData.geofence_type,
        center_latitude: parseFloat(formData.center_latitude),
        center_longitude: parseFloat(formData.center_longitude),
        radius_meters: parseInt(formData.radius_meters),
        shape_type: formData.shape_type,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postal_code: formData.postal_code || undefined,
        country: formData.country || undefined,
        landmark: formData.landmark || undefined,
        access_instructions: formData.access_instructions || undefined,
        contact_person: formData.contact_person || undefined,
        contact_phone: formData.contact_phone || undefined,
        facility_type: formData.facility_type || undefined,
        trigger_event: formData.trigger_event,
        notification_enabled: formData.notification_enabled,
        alert_enabled: formData.alert_enabled,
        categories: formData.categories.length > 0 ? formData.categories : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        business_unit: formData.business_unit || undefined,
        region: formData.region || undefined,
        zone: formData.zone || undefined,
        is_active: formData.is_active,
        is_template: formData.is_template,
        priority_level: formData.priority_level,
        notes: formData.notes || undefined,
        usage_count: 0
      };

      const result = await createGeofence(geofenceData);
      
      if (result.success && result.data) {
        if (onSuccess) onSuccess(result.data);
        onClose();
      } else {
        alert(`Failed to create geofence: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    if (categoryInput.trim() && !formData.categories.includes(categoryInput.trim())) {
      setFormData({ ...formData, categories: [...formData.categories, categoryInput.trim()] });
      setCategoryInput('');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="3xl" 
      scrollBehavior="inside"
      placement="top-center"
      backdrop="blur"
      classNames={{
        wrapper: "overflow-y-auto p-4 md:p-8",
        base: "max-w-3xl max-h-[90vh] mt-8 mb-8",
        body: "py-6 px-6 overflow-y-auto",
        header: "border-b border-gray-200 flex-shrink-0 bg-white",
        footer: "border-t border-gray-200 flex-shrink-0 bg-white"
      }}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.2,
              ease: "easeOut"
            }
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.15,
              ease: "easeIn"
            }
          }
        }
      }}
    >
      <ModalContent className="bg-white">
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col gap-1 bg-white">
            <h2 className="text-2xl font-bold">Create New Geofence Location</h2>
            <p className="text-sm text-gray-600 font-normal">Define a geographic boundary for tracking</p>
          </ModalHeader>
          <ModalBody className="bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              </div>
              
              <Input
                label="Location Name"
                placeholder="Enter location name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                isRequired
              />
              
              <Select
                label="Geofence Type"
                selectedKeys={[formData.geofence_type]}
                onChange={(e) => setFormData({ ...formData, geofence_type: e.target.value })}
                isRequired
              >
                <SelectItem key="loading" value="loading">Loading Point</SelectItem>
                <SelectItem key="unloading" value="unloading">Unloading Point</SelectItem>
                <SelectItem key="warehouse" value="warehouse">Warehouse</SelectItem>
                <SelectItem key="distribution" value="distribution">Distribution Center</SelectItem>
                <SelectItem key="customer" value="customer">Customer Location</SelectItem>
                <SelectItem key="checkpoint" value="checkpoint">Checkpoint</SelectItem>
              </Select>
              
              <Input
                label="Facility Type"
                placeholder="e.g., Warehouse, Retail Store"
                value={formData.facility_type}
                onChange={(e) => setFormData({ ...formData, facility_type: e.target.value })}
              />
              
              <Select
                label="Shape Type"
                selectedKeys={[formData.shape_type]}
                onChange={(e) => setFormData({ ...formData, shape_type: e.target.value })}
              >
                <SelectItem key="circle" value="circle">Circle</SelectItem>
                <SelectItem key="polygon" value="polygon">Polygon</SelectItem>
              </Select>
              
              <Textarea
                label="Description"
                placeholder="Enter location description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="md:col-span-2"
                rows={2}
              />

              {/* Geographic Data */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Geographic Coordinates</h3>
              </div>
              
              <Input
                label="Latitude"
                placeholder="e.g., 40.7128"
                type="number"
                step="any"
                value={formData.center_latitude}
                onChange={(e) => setFormData({ ...formData, center_latitude: e.target.value })}
                isRequired
              />
              
              <Input
                label="Longitude"
                placeholder="e.g., -74.0060"
                type="number"
                step="any"
                value={formData.center_longitude}
                onChange={(e) => setFormData({ ...formData, center_longitude: e.target.value })}
                isRequired
              />
              
              <Input
                label="Radius (meters)"
                placeholder="100"
                type="number"
                value={formData.radius_meters}
                onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                isRequired
              />
              
              <Input
                label="Priority Level (1-10)"
                placeholder="5"
                type="number"
                min="1"
                max="10"
                value={formData.priority_level.toString()}
                onChange={(e) => setFormData({ ...formData, priority_level: parseInt(e.target.value) || 5 })}
              />

              {/* Address Information */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Address Details</h3>
              </div>
              
              <Input
                label="Street Address"
                placeholder="Enter street address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="md:col-span-2"
              />
              
              <Input
                label="City"
                placeholder="Enter city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              
              <Input
                label="State/Province"
                placeholder="Enter state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
              
              <Input
                label="Postal Code"
                placeholder="Enter postal code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
              
              <Input
                label="Country"
                placeholder="Enter country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
              
              <Input
                label="Landmark"
                placeholder="Nearby landmark"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              />
              
              <Textarea
                label="Access Instructions"
                placeholder="How to access this location..."
                value={formData.access_instructions}
                onChange={(e) => setFormData({ ...formData, access_instructions: e.target.value })}
                className="md:col-span-2"
                rows={2}
              />

              {/* Contact Information */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">On-Site Contact</h3>
              </div>
              
              <Input
                label="Contact Person"
                placeholder="Enter contact name"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
              
              <Input
                label="Contact Phone"
                placeholder="Enter phone number"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />

              {/* Business Organization */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Organization</h3>
              </div>
              
              <Input
                label="Business Unit"
                placeholder="e.g., Logistics, Retail"
                value={formData.business_unit}
                onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
              />
              
              <Input
                label="Region"
                placeholder="e.g., North, South, East, West"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
              
              <Input
                label="Zone"
                placeholder="e.g., Zone A, Zone B"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              />

              {/* Categories and Tags */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Categories & Tags</h3>
              </div>
              
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Categories</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add category (e.g., High Priority, 24/7 Access)"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  />
                  <Button color="primary" onPress={addCategory}>Add</Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {formData.categories.map((cat) => (
                    <Chip
                      key={cat}
                      onClose={() => setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat) })}
                      variant="flat"
                      color="secondary"
                    >
                      {cat}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button color="primary" onPress={addTag}>Add</Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      onClose={() => setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })}
                      variant="flat"
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Trigger Settings */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Trigger Settings</h3>
              </div>
              
              <Select
                label="Trigger Event"
                selectedKeys={[formData.trigger_event]}
                onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value })}
                className="md:col-span-2"
              >
                <SelectItem key="entry" value="entry">On Entry</SelectItem>
                <SelectItem key="exit" value="exit">On Exit</SelectItem>
                <SelectItem key="both" value="both">Both Entry & Exit</SelectItem>
                <SelectItem key="dwell" value="dwell">Dwell Time</SelectItem>
              </Select>
              
              <div className="flex flex-col gap-4 md:col-span-2">
                <Switch
                  isSelected={formData.notification_enabled}
                  onValueChange={(value) => setFormData({ ...formData, notification_enabled: value })}
                >
                  Enable Notifications
                </Switch>
                
                <Switch
                  isSelected={formData.alert_enabled}
                  onValueChange={(value) => setFormData({ ...formData, alert_enabled: value })}
                >
                  Enable Alerts
                </Switch>
                
                <Switch
                  isSelected={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                >
                  Active Status
                </Switch>
                
                <Switch
                  isSelected={formData.is_template}
                  onValueChange={(value) => setFormData({ ...formData, is_template: value })}
                >
                  Save as Template
                </Switch>
              </div>

              {/* Notes */}
              <div className="md:col-span-2 mt-4">
                <Textarea
                  label="Notes"
                  placeholder="Add any additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="bg-white">
            <Button variant="light" onPress={onClose} isDisabled={loading}>
              Cancel
            </Button>
            <Button color="primary" type="submit" isLoading={loading}>
              Create Geofence
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

// Create Template Modal
interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (template: OrderTemplate) => void;
}

export function CreateTemplateModal({
  isOpen,
  onClose,
  onSuccess
}: CreateTemplateModalProps) {
  const { createTemplate } = useOrderTemplates();
  const { transporters } = useTransporters();
  const { contacts } = useContacts();
  const { geofences } = useEnhancedGeofences();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    template_type: 'standard',
    default_transporter_id: '',
    default_customer_contact_id: '',
    default_loading_contact_id: '',
    default_unloading_contact_id: '',
    default_loading_geofence_id: '',
    default_unloading_geofence_id: '',
    default_service_type: '',
    default_vehicle_type: '',
    default_priority: 'normal',
    default_lead_time_hours: '24',
    default_loading_instructions: '',
    default_unloading_instructions: '',
    default_special_instructions: '',
    default_delivery_instructions: '',
    is_active: true,
    is_public: false,
    tags: [] as string[]
  });

  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const templateData: Partial<OrderTemplate> = {
        template_name: formData.template_name,
        description: formData.description || undefined,
        template_type: formData.template_type,
        default_transporter_id: formData.default_transporter_id || undefined,
        default_customer_contact_id: formData.default_customer_contact_id || undefined,
        default_loading_contact_id: formData.default_loading_contact_id || undefined,
        default_unloading_contact_id: formData.default_unloading_contact_id || undefined,
        default_loading_geofence_id: formData.default_loading_geofence_id || undefined,
        default_unloading_geofence_id: formData.default_unloading_geofence_id || undefined,
        default_service_type: formData.default_service_type || undefined,
        default_vehicle_type: formData.default_vehicle_type || undefined,
        default_priority: formData.default_priority || undefined,
        default_lead_time_hours: formData.default_lead_time_hours ? parseInt(formData.default_lead_time_hours) : undefined,
        default_loading_instructions: formData.default_loading_instructions || undefined,
        default_unloading_instructions: formData.default_unloading_instructions || undefined,
        default_special_instructions: formData.default_special_instructions || undefined,
        default_delivery_instructions: formData.default_delivery_instructions || undefined,
        is_active: formData.is_active,
        is_public: formData.is_public,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        usage_count: 0
      };

      const result = await createTemplate(templateData);
      
      if (result.success && result.data) {
        if (onSuccess) onSuccess(result.data);
        onClose();
      } else {
        alert(`Failed to create template: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="3xl" 
      scrollBehavior="inside"
      placement="top-center"
      backdrop="blur"
      classNames={{
        wrapper: "overflow-y-auto p-4 md:p-8",
        base: "max-w-3xl max-h-[90vh] mt-8 mb-8",
        body: "py-6 px-6 overflow-y-auto",
        header: "border-b border-gray-200 flex-shrink-0 bg-white",
        footer: "border-t border-gray-200 flex-shrink-0 bg-white"
      }}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.2,
              ease: "easeOut"
            }
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.15,
              ease: "easeIn"
            }
          }
        }
      }}
    >
      <ModalContent className="bg-white">
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col gap-1 bg-white">
            <h2 className="text-2xl font-bold">Create Order Template</h2>
            <p className="text-sm text-gray-600 font-normal">Configure default settings for quick order creation</p>
          </ModalHeader>
          <ModalBody className="bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Template Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b pb-2">Template Information</h3>
              </div>
              
              <Input
                label="Template Name"
                placeholder="e.g., Standard Delivery Route A"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                isRequired
              />
              
              <Select
                label="Template Type"
                selectedKeys={[formData.template_type]}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                isRequired
              >
                <SelectItem key="standard" value="standard">Standard Delivery</SelectItem>
                <SelectItem key="express" value="express">Express Delivery</SelectItem>
                <SelectItem key="freight" value="freight">Freight</SelectItem>
                <SelectItem key="recurring" value="recurring">Recurring Route</SelectItem>
                <SelectItem key="custom" value="custom">Custom</SelectItem>
              </Select>
              
              <Textarea
                label="Description"
                placeholder="Describe this template..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="md:col-span-2"
                rows={2}
              />

              {/* Pre-configured Entities */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b pb-2">Default Selections</h3>
              </div>
              
              <Select
                label="Default Transporter"
                placeholder="Select a transporter"
                selectedKeys={formData.default_transporter_id ? [formData.default_transporter_id] : []}
                onChange={(e) => setFormData({ ...formData, default_transporter_id: e.target.value })}
              >
                {transporters.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </Select>
              
              <Select
                label="Default Customer Contact"
                placeholder="Select a contact"
                selectedKeys={formData.default_customer_contact_id ? [formData.default_customer_contact_id] : []}
                onChange={(e) => setFormData({ ...formData, default_customer_contact_id: e.target.value })}
              >
                {contacts.filter(c => c.contact_type === 'customer').map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>
                ))}
              </Select>

              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b pb-2">Location Settings</h3>
              </div>
              
              <Select
                label="Default Loading Point"
                placeholder="Select loading location"
                selectedKeys={formData.default_loading_geofence_id ? [formData.default_loading_geofence_id] : []}
                onChange={(e) => setFormData({ ...formData, default_loading_geofence_id: e.target.value })}
              >
                {geofences.filter(g => g.geofence_type === 'loading' || g.geofence_type === 'warehouse').map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </Select>
              
              <Select
                label="Loading Contact"
                placeholder="Select loading contact"
                selectedKeys={formData.default_loading_contact_id ? [formData.default_loading_contact_id] : []}
                onChange={(e) => setFormData({ ...formData, default_loading_contact_id: e.target.value })}
              >
                {contacts.filter(c => c.contact_type === 'loading').map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>
                ))}
              </Select>
              
              <Select
                label="Default Unloading Point"
                placeholder="Select unloading location"
                selectedKeys={formData.default_unloading_geofence_id ? [formData.default_unloading_geofence_id] : []}
                onChange={(e) => setFormData({ ...formData, default_unloading_geofence_id: e.target.value })}
              >
                {geofences.filter(g => g.geofence_type === 'unloading' || g.geofence_type === 'customer').map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </Select>
              
              <Select
                label="Unloading Contact"
                placeholder="Select unloading contact"
                selectedKeys={formData.default_unloading_contact_id ? [formData.default_unloading_contact_id] : []}
                onChange={(e) => setFormData({ ...formData, default_unloading_contact_id: e.target.value })}
              >
                {contacts.filter(c => c.contact_type === 'unloading').map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>
                ))}
              </Select>

              {/* Service Configuration */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b pb-2">Service Configuration</h3>
              </div>
              
              <Input
                label="Default Service Type"
                placeholder="e.g., Express, Standard"
                value={formData.default_service_type}
                onChange={(e) => setFormData({ ...formData, default_service_type: e.target.value })}
              />
              
              <Input
                label="Default Vehicle Type"
                placeholder="e.g., Van, Truck"
                value={formData.default_vehicle_type}
                onChange={(e) => setFormData({ ...formData, default_vehicle_type: e.target.value })}
              />
              
              <Select
                label="Default Priority"
                selectedKeys={[formData.default_priority]}
                onChange={(e) => setFormData({ ...formData, default_priority: e.target.value })}
              >
                <SelectItem key="low" value="low">Low</SelectItem>
                <SelectItem key="normal" value="normal">Normal</SelectItem>
                <SelectItem key="high" value="high">High</SelectItem>
                <SelectItem key="urgent" value="urgent">Urgent</SelectItem>
              </Select>
              
              <Input
                label="Default Lead Time (hours)"
                placeholder="24"
                type="number"
                value={formData.default_lead_time_hours}
                onChange={(e) => setFormData({ ...formData, default_lead_time_hours: e.target.value })}
              />

              {/* Default Instructions */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b pb-2">Default Instructions</h3>
              </div>
              
              <Textarea
                label="Loading Instructions"
                placeholder="Instructions for loading..."
                value={formData.default_loading_instructions}
                onChange={(e) => setFormData({ ...formData, default_loading_instructions: e.target.value })}
                className="md:col-span-2"
                rows={2}
              />
              
              <Textarea
                label="Unloading Instructions"
                placeholder="Instructions for unloading..."
                value={formData.default_unloading_instructions}
                onChange={(e) => setFormData({ ...formData, default_unloading_instructions: e.target.value })}
                className="md:col-span-2"
                rows={2}
              />
              
              <Textarea
                label="Special Instructions"
                placeholder="Any special handling instructions..."
                value={formData.default_special_instructions}
                onChange={(e) => setFormData({ ...formData, default_special_instructions: e.target.value })}
                className="md:col-span-2"
                rows={2}
              />
              
              <Textarea
                label="Delivery Instructions"
                placeholder="Delivery-specific instructions..."
                value={formData.default_delivery_instructions}
                onChange={(e) => setFormData({ ...formData, default_delivery_instructions: e.target.value })}
                className="md:col-span-2"
                rows={2}
              />

              {/* Tags */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b pb-2">Tags</h3>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button color="primary" onPress={addTag}>Add</Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      onClose={() => setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })}
                      variant="flat"
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-blue-600 border-b pb-2">Settings</h3>
              </div>
              
              <div className="flex flex-col gap-4 md:col-span-2">
                <Switch
                  isSelected={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                >
                  <span className="text-sm">Active Template</span>
                </Switch>
                
                <Switch
                  isSelected={formData.is_public}
                  onValueChange={(value) => setFormData({ ...formData, is_public: value })}
                >
                  <span className="text-sm">Public Template - accessible to all users</span>
                </Switch>
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="bg-white">
            <Button variant="light" onPress={onClose} isDisabled={loading}>
              Cancel
            </Button>
            <Button color="primary" type="submit" isLoading={loading}>
              Create Template
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
