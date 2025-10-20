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
    EnhancedContact,
    EnhancedTransporter,
    useContacts,
    useTransporters
  } from '../../hooks/useEnhancedData';

// Create Transporter Modal
interface CreateTransporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (transporter: EnhancedTransporter) => void;
}

export function CreateTransporterModal({
  isOpen,
  onClose,
  onSuccess
}: CreateTransporterModalProps) {
  const { createTransporter } = useTransporters();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    registration_number: '',
    tax_id: '',
    primary_contact_name: '',
    primary_contact_phone: '',
    primary_contact_email: '',
    business_address: '',
    business_city: '',
    business_state: '',
    business_postal_code: '',
    business_country: '',
    service_types: [] as string[],
    coverage_areas: [] as string[],
    vehicle_types: [] as string[],
    base_rate_per_km: '',
    minimum_charge: '',
    currency: 'USD',
    is_active: true,
    is_preferred: false,
    auto_assign_eligible: false,
    priority_level: 5,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const transporterData: Partial<EnhancedTransporter> = {
        name: formData.name,
        company_name: formData.company_name || undefined,
        registration_number: formData.registration_number || undefined,
        tax_id: formData.tax_id || undefined,
        primary_contact_name: formData.primary_contact_name || undefined,
        primary_contact_phone: formData.primary_contact_phone || undefined,
        primary_contact_email: formData.primary_contact_email || undefined,
        business_address: formData.business_address || undefined,
        business_city: formData.business_city || undefined,
        business_state: formData.business_state || undefined,
        business_postal_code: formData.business_postal_code || undefined,
        business_country: formData.business_country || undefined,
        service_types: formData.service_types.length > 0 ? formData.service_types : undefined,
        coverage_areas: formData.coverage_areas.length > 0 ? formData.coverage_areas : undefined,
        vehicle_types: formData.vehicle_types.length > 0 ? formData.vehicle_types : undefined,
        base_rate_per_km: formData.base_rate_per_km ? parseFloat(formData.base_rate_per_km) : undefined,
        minimum_charge: formData.minimum_charge ? parseFloat(formData.minimum_charge) : undefined,
        currency: formData.currency,
        is_active: formData.is_active,
        is_preferred: formData.is_preferred,
        auto_assign_eligible: formData.auto_assign_eligible,
        priority_level: formData.priority_level,
        notes: formData.notes || undefined
      };

      const result = await createTransporter(transporterData);
      
      if (result.success && result.data) {
        if (onSuccess) onSuccess(result.data);
        onClose();
        // Reset form
        setFormData({
          name: '',
          company_name: '',
          registration_number: '',
          tax_id: '',
          primary_contact_name: '',
          primary_contact_phone: '',
          primary_contact_email: '',
          business_address: '',
          business_city: '',
          business_state: '',
          business_postal_code: '',
          business_country: '',
          service_types: [],
          coverage_areas: [],
          vehicle_types: [],
          base_rate_per_km: '',
          minimum_charge: '',
          currency: 'USD',
          is_active: true,
          is_preferred: false,
          auto_assign_eligible: false,
          priority_level: 5,
          notes: ''
        });
      } else {
        alert(`Failed to create transporter: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [serviceTypeInput, setServiceTypeInput] = useState('');
  const [coverageAreaInput, setCoverageAreaInput] = useState('');
  const [vehicleTypeInput, setVehicleTypeInput] = useState('');

  const addServiceType = () => {
    if (serviceTypeInput.trim() && !formData.service_types.includes(serviceTypeInput.trim())) {
      setFormData({ ...formData, service_types: [...formData.service_types, serviceTypeInput.trim()] });
      setServiceTypeInput('');
    }
  };

  const addCoverageArea = () => {
    if (coverageAreaInput.trim() && !formData.coverage_areas.includes(coverageAreaInput.trim())) {
      setFormData({ ...formData, coverage_areas: [...formData.coverage_areas, coverageAreaInput.trim()] });
      setCoverageAreaInput('');
    }
  };

  const addVehicleType = () => {
    if (vehicleTypeInput.trim() && !formData.vehicle_types.includes(vehicleTypeInput.trim())) {
      setFormData({ ...formData, vehicle_types: [...formData.vehicle_types, vehicleTypeInput.trim()] });
      setVehicleTypeInput('');
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
            <h2 className="text-2xl font-bold">Create New Transporter</h2>
            <p className="text-sm text-gray-600 font-normal">Add a carrier or logistics provider</p>
          </ModalHeader>
          <ModalBody className="bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              </div>
              
              <Input
                label="Transporter Name"
                placeholder="Enter transporter name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                isRequired
              />
              
              <Input
                label="Company Name"
                placeholder="Enter company name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
              
              <Input
                label="Registration Number"
                placeholder="Enter registration number"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
              
              <Input
                label="Tax ID"
                placeholder="Enter tax ID"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              />

              {/* Contact Information */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              </div>
              
              <Input
                label="Primary Contact Name"
                placeholder="Enter contact name"
                value={formData.primary_contact_name}
                onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
              />
              
              <Input
                label="Primary Contact Phone"
                placeholder="Enter phone number"
                type="tel"
                value={formData.primary_contact_phone}
                onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
              />
              
              <Input
                label="Primary Contact Email"
                placeholder="Enter email address"
                type="email"
                value={formData.primary_contact_email}
                onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                className="md:col-span-2"
              />

              {/* Address Information */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Business Address</h3>
              </div>
              
              <Input
                label="Street Address"
                placeholder="Enter street address"
                value={formData.business_address}
                onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                className="md:col-span-2"
              />
              
              <Input
                label="City"
                placeholder="Enter city"
                value={formData.business_city}
                onChange={(e) => setFormData({ ...formData, business_city: e.target.value })}
              />
              
              <Input
                label="State/Province"
                placeholder="Enter state"
                value={formData.business_state}
                onChange={(e) => setFormData({ ...formData, business_state: e.target.value })}
              />
              
              <Input
                label="Postal Code"
                placeholder="Enter postal code"
                value={formData.business_postal_code}
                onChange={(e) => setFormData({ ...formData, business_postal_code: e.target.value })}
              />
              
              <Input
                label="Country"
                placeholder="Enter country"
                value={formData.business_country}
                onChange={(e) => setFormData({ ...formData, business_country: e.target.value })}
              />

              {/* Service Types */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Services & Capabilities</h3>
              </div>
              
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Service Types</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add service type (e.g., Express, Freight)"
                    value={serviceTypeInput}
                    onChange={(e) => setServiceTypeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceType())}
                  />
                  <Button color="primary" onPress={addServiceType}>Add</Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {formData.service_types.map((type) => (
                    <Chip
                      key={type}
                      onClose={() => setFormData({ ...formData, service_types: formData.service_types.filter(t => t !== type) })}
                      variant="flat"
                    >
                      {type}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Coverage Areas</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add coverage area (e.g., North America, Europe)"
                    value={coverageAreaInput}
                    onChange={(e) => setCoverageAreaInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCoverageArea())}
                  />
                  <Button color="primary" onPress={addCoverageArea}>Add</Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {formData.coverage_areas.map((area) => (
                    <Chip
                      key={area}
                      onClose={() => setFormData({ ...formData, coverage_areas: formData.coverage_areas.filter(a => a !== area) })}
                      variant="flat"
                    >
                      {area}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Vehicle Types</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add vehicle type (e.g., Van, Truck, Trailer)"
                    value={vehicleTypeInput}
                    onChange={(e) => setVehicleTypeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVehicleType())}
                  />
                  <Button color="primary" onPress={addVehicleType}>Add</Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {formData.vehicle_types.map((type) => (
                    <Chip
                      key={type}
                      onClose={() => setFormData({ ...formData, vehicle_types: formData.vehicle_types.filter(t => t !== type) })}
                      variant="flat"
                    >
                      {type}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Pricing Information</h3>
              </div>
              
              <Select
                label="Currency"
                selectedKeys={[formData.currency]}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <SelectItem key="USD" value="USD">USD ($)</SelectItem>
                <SelectItem key="EUR" value="EUR">EUR (€)</SelectItem>
                <SelectItem key="GBP" value="GBP">GBP (£)</SelectItem>
                <SelectItem key="CAD" value="CAD">CAD ($)</SelectItem>
              </Select>
              
              <Input
                label="Base Rate per KM"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formData.base_rate_per_km}
                onChange={(e) => setFormData({ ...formData, base_rate_per_km: e.target.value })}
                startContent={<span className="text-gray-500">{formData.currency}</span>}
              />
              
              <Input
                label="Minimum Charge"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={formData.minimum_charge}
                onChange={(e) => setFormData({ ...formData, minimum_charge: e.target.value })}
                startContent={<span className="text-gray-500">{formData.currency}</span>}
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

              {/* Settings */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Settings</h3>
              </div>
              
              <div className="flex flex-col gap-4 md:col-span-2">
                <Switch
                  isSelected={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                >
                  Active Status
                </Switch>
                
                <Switch
                  isSelected={formData.is_preferred}
                  onValueChange={(value) => setFormData({ ...formData, is_preferred: value })}
                >
                  Preferred Transporter
                </Switch>
                
                <Switch
                  isSelected={formData.auto_assign_eligible}
                  onValueChange={(value) => setFormData({ ...formData, auto_assign_eligible: value })}
                >
                  Auto-Assignment Eligible
                </Switch>
              </div>

              {/* Notes */}
              <div className="md:col-span-2 mt-4">
                <Textarea
                  label="Notes"
                  placeholder="Add any additional notes or special instructions..."
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
              Create Transporter
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

// Create Contact Modal
interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (contact: EnhancedContact) => void;
  defaultContactType?: string;
}

export function CreateContactModal({
  isOpen,
  onClose,
  onSuccess,
  defaultContactType = 'customer'
}: CreateContactModalProps) {
  const { createContact } = useContacts();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    job_title: '',
    department: '',
    primary_phone: '',
    mobile_phone: '',
    primary_email: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    contact_type: defaultContactType,
    preferred_contact_method: 'phone',
    language_preference: 'en',
    is_active: true,
    is_primary: false,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const contactData: Partial<EnhancedContact> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        company_name: formData.company_name || undefined,
        job_title: formData.job_title || undefined,
        department: formData.department || undefined,
        primary_phone: formData.primary_phone || undefined,
        mobile_phone: formData.mobile_phone || undefined,
        primary_email: formData.primary_email || undefined,
        address_line1: formData.address_line1 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postal_code: formData.postal_code || undefined,
        country: formData.country || undefined,
        contact_type: formData.contact_type,
        preferred_contact_method: formData.preferred_contact_method,
        language_preference: formData.language_preference,
        is_active: formData.is_active,
        is_primary: formData.is_primary,
        notes: formData.notes || undefined
      };

      const result = await createContact(contactData);
      
      if (result.success && result.data) {
        if (onSuccess) onSuccess(result.data);
        onClose();
      } else {
        alert(`Failed to create contact: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
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
            <h2 className="text-2xl font-bold">Create New Contact</h2>
            <p className="text-sm text-gray-600 font-normal">Add a customer or site contact</p>
          </ModalHeader>
          <ModalBody className="bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              </div>
              
              <Input
                label="First Name"
                placeholder="Enter first name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                isRequired
              />
              
              <Input
                label="Last Name"
                placeholder="Enter last name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                isRequired
              />
              
              <Input
                label="Company Name"
                placeholder="Enter company name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
              
              <Input
                label="Job Title"
                placeholder="Enter job title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              />
              
              <Input
                label="Department"
                placeholder="Enter department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
              
              <Select
                label="Contact Type"
                selectedKeys={[formData.contact_type]}
                onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })}
                isRequired
              >
                <SelectItem key="customer" value="customer">Customer</SelectItem>
                <SelectItem key="supplier" value="supplier">Supplier</SelectItem>
                <SelectItem key="driver" value="driver">Driver</SelectItem>
                <SelectItem key="warehouse" value="warehouse">Warehouse</SelectItem>
                <SelectItem key="other" value="other">Other</SelectItem>
              </Select>

              {/* Contact Information */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Contact Details</h3>
              </div>
              
              <Input
                label="Primary Phone"
                placeholder="Enter phone number"
                type="tel"
                value={formData.primary_phone}
                onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
              />
              
              <Input
                label="Mobile Phone"
                placeholder="Enter mobile number"
                type="tel"
                value={formData.mobile_phone}
                onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
              />
              
              <Input
                label="Email Address"
                placeholder="Enter email"
                type="email"
                value={formData.primary_email}
                onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
                className="md:col-span-2"
              />
              
              <Select
                label="Preferred Contact Method"
                selectedKeys={[formData.preferred_contact_method]}
                onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
              >
                <SelectItem key="phone" value="phone">Phone</SelectItem>
                <SelectItem key="email" value="email">Email</SelectItem>
                <SelectItem key="sms" value="sms">SMS</SelectItem>
                <SelectItem key="whatsapp" value="whatsapp">WhatsApp</SelectItem>
              </Select>
              
              <Select
                label="Language Preference"
                selectedKeys={[formData.language_preference]}
                onChange={(e) => setFormData({ ...formData, language_preference: e.target.value })}
              >
                <SelectItem key="en" value="en">English</SelectItem>
                <SelectItem key="es" value="es">Spanish</SelectItem>
                <SelectItem key="fr" value="fr">French</SelectItem>
                <SelectItem key="de" value="de">German</SelectItem>
              </Select>

              {/* Address */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Address</h3>
              </div>
              
              <Input
                label="Street Address"
                placeholder="Enter street address"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
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

              {/* Settings */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Settings</h3>
              </div>
              
              <div className="flex flex-col gap-4 md:col-span-2">
                <Switch
                  isSelected={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                >
                  Active Status
                </Switch>
                
                <Switch
                  isSelected={formData.is_primary}
                  onValueChange={(value) => setFormData({ ...formData, is_primary: value })}
                >
                  Primary Contact
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
              Create Contact
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

// Export note: CreateGeofenceModal and CreateTemplateModal will be added in the next file
// to keep file size manageable
