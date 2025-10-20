"use client";

import
  {
    BuildingOfficeIcon,
    Cog6ToothIcon,
    DocumentTextIcon,
    EnvelopeIcon,
    MapPinIcon,
    PhoneIcon,
    UserIcon
  } from '@heroicons/react/24/outline';
import
  {
    Button,
    Card,
    CardBody,
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
import toast from 'react-hot-toast';
import { EnhancedContact, useContacts } from '../../hooks/useEnhancedData';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (contact: EnhancedContact) => void;
  defaultType?: string;
}

export function CreateContactModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'customer'
}: CreateContactModalProps) {
  const { createContact } = useContacts();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    job_title: '',
    department: '',
    
    // Contact Methods
    primary_phone: '',
    secondary_phone: '',
    mobile_phone: '',
    primary_email: '',
    secondary_email: '',
    fax: '',
    
    // Address
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    
    // Preferences
    preferred_contact_method: 'phone',
    language_preference: 'en',
    timezone: '',
    
    // Contact Type
    contact_type: defaultType,
    categories: [] as string[],
    relationship_type: '',
    
    // Customer/Supplier Specific
    customer_id: '',
    supplier_id: '',
    account_number: '',
    credit_limit: '',
    payment_terms: '',
    
    // Status
    is_active: true,
    is_primary: false,
    tags: [] as string[],
    notes: ''
  });

  const [categoryInput, setCategoryInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const full_name = `${formData.first_name} ${formData.last_name}`.trim();
      
      const contactData: Partial<EnhancedContact> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name,
        company_name: formData.company_name || undefined,
        job_title: formData.job_title || undefined,
        department: formData.department || undefined,
        
        primary_phone: formData.primary_phone || undefined,
        secondary_phone: formData.secondary_phone || undefined,
        mobile_phone: formData.mobile_phone || undefined,
        primary_email: formData.primary_email || undefined,
        secondary_email: formData.secondary_email || undefined,
        fax: formData.fax || undefined,
        
        address_line1: formData.address_line1 || undefined,
        address_line2: formData.address_line2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postal_code: formData.postal_code || undefined,
        country: formData.country || undefined,
        
        preferred_contact_method: formData.preferred_contact_method,
        language_preference: formData.language_preference,
        timezone: formData.timezone || undefined,
        
        contact_type: formData.contact_type,
        categories: formData.categories.length > 0 ? formData.categories : undefined,
        relationship_type: formData.relationship_type || undefined,
        
        customer_id: formData.customer_id || undefined,
        supplier_id: formData.supplier_id || undefined,
        account_number: formData.account_number || undefined,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : undefined,
        payment_terms: formData.payment_terms || undefined,
        
        is_active: formData.is_active,
        is_primary: formData.is_primary,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        notes: formData.notes || undefined
      };

      const result = await createContact(contactData);
      
      if (result.success && result.data) {
        toast.success('Contact created successfully!');
        if (onSuccess) onSuccess(result.data);
        onClose();
        // Reset form
        setFormData({
          first_name: '', last_name: '', company_name: '', job_title: '', department: '',
          primary_phone: '', secondary_phone: '', mobile_phone: '', primary_email: '', secondary_email: '', fax: '',
          address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: '',
          preferred_contact_method: 'phone', language_preference: 'en', timezone: '',
          contact_type: defaultType, categories: [], relationship_type: '',
          customer_id: '', supplier_id: '', account_number: '', credit_limit: '', payment_terms: '',
          is_active: true, is_primary: false, tags: [], notes: ''
        });
      } else {
        toast.error(`Failed to create contact: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
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
        body: "py-6 px-6 overflow-y-auto bg-gray-50", // Light background for body
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
            <h2 className="text-2xl font-bold text-gray-800">Create New Contact</h2>
            <p className="text-sm text-gray-600 font-normal">Add a customer or site contact</p>
          </ModalHeader>
          <ModalBody className="bg-gray-50">
            <div className="space-y-6">
              {/* Basic Information Section */}
              <Card className="shadow-sm border border-gray-200">
                <CardBody className="gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Basic Information</h3>
                      <p className="text-xs text-gray-600">Contact's personal details</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      labelPlacement="outside"
                      placeholder="e.g., John"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      isRequired
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Contact's given name"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Last Name"
                      labelPlacement="outside"
                      placeholder="e.g., Doe"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      isRequired
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Contact's family name"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Company Name"
                      labelPlacement="outside"
                      placeholder="e.g., ABC Corp"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Optional: Company they represent"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Job Title"
                      labelPlacement="outside"
                      placeholder="e.g., Operations Manager"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Optional: Their position"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Department"
                      labelPlacement="outside"
                      placeholder="e.g., Logistics"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Optional: Their department"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Select
                      label="Contact Type"
                      labelPlacement="outside"
                      selectedKeys={[formData.contact_type]}
                      onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })}
                      isRequired
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="What type of contact is this?"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        trigger: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    >
                      <SelectItem key="customer" value="customer">Customer</SelectItem>
                      <SelectItem key="supplier" value="supplier">Supplier</SelectItem>
                      <SelectItem key="driver" value="driver">Driver</SelectItem>
                      <SelectItem key="warehouse" value="warehouse">Warehouse Contact</SelectItem>
                      <SelectItem key="emergency" value="emergency">Emergency Contact</SelectItem>
                      <SelectItem key="other" value="other">Other</SelectItem>
                    </Select>
                  </div>
                </CardBody>
              </Card>

              {/* Contact Methods Section */}
              <Card className="shadow-sm border border-gray-200">
                <CardBody className="gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <PhoneIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Contact Methods</h3>
                      <p className="text-xs text-gray-600">Phone numbers and email addresses</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Primary Phone"
                      labelPlacement="outside"
                      placeholder="+1 (555) 123-4567"
                      type="tel"
                      value={formData.primary_phone}
                      onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Main contact number"
                      startContent={<PhoneIcon className="w-4 h-4 text-gray-400" />}
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Mobile Phone"
                      labelPlacement="outside"
                      placeholder="+1 (555) 987-6543"
                      type="tel"
                      value={formData.mobile_phone}
                      onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Mobile/cell number"
                      startContent={<PhoneIcon className="w-4 h-4 text-gray-400" />}
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Secondary Phone (Optional)"
                      labelPlacement="outside"
                      placeholder="+1 (555) 111-2222"
                      type="tel"
                      value={formData.secondary_phone}
                      onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Alternative phone number"
                      startContent={<PhoneIcon className="w-4 h-4 text-gray-400" />}
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Fax (Optional)"
                      labelPlacement="outside"
                      placeholder="+1 (555) 333-4444"
                      type="tel"
                      value={formData.fax}
                      onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Fax number if applicable"
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Primary Email"
                      labelPlacement="outside"
                      placeholder="john.doe@company.com"
                      type="email"
                      value={formData.primary_email}
                      onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Main email address"
                      startContent={<EnvelopeIcon className="w-4 h-4 text-gray-400" />}
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Secondary Email (Optional)"
                      labelPlacement="outside"
                      placeholder="john@example.com"
                      type="email"
                      value={formData.secondary_email}
                      onChange={(e) => setFormData({ ...formData, secondary_email: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Alternative email"
                      startContent={<EnvelopeIcon className="w-4 h-4 text-gray-400" />}
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Address Section */}
              <Card className="shadow-sm border border-gray-200">
                <CardBody className="gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MapPinIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Physical Address</h3>
                      <p className="text-xs text-gray-600">Where is this contact located?</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Address Line 1"
                      labelPlacement="outside"
                      placeholder="123 Main Street"
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Street address"
                      className="md:col-span-2"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Address Line 2 (Optional)"
                      labelPlacement="outside"
                      placeholder="Apt, suite, unit, building, floor"
                      value={formData.address_line2}
                      onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Additional address information"
                      className="md:col-span-2"
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="City"
                      labelPlacement="outside"
                      placeholder="e.g., New York"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="City or town"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="State/Province"
                      labelPlacement="outside"
                      placeholder="e.g., NY"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="State or province"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Postal Code"
                      labelPlacement="outside"
                      placeholder="e.g., 10001"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="ZIP or postal code"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Country"
                      labelPlacement="outside"
                      placeholder="e.g., United States"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Country name"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Contact Preferences Section */}
              <Card className="shadow-sm border border-gray-200">
                <CardBody className="gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Cog6ToothIcon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Contact Preferences</h3>
                      <p className="text-xs text-gray-600">How they prefer to be contacted</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Preferred Contact Method"
                      labelPlacement="outside"
                      selectedKeys={[formData.preferred_contact_method]}
                      onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="How to reach them best"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        trigger: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    >
                      <SelectItem key="phone" value="phone">Phone Call</SelectItem>
                      <SelectItem key="email" value="email">Email</SelectItem>
                      <SelectItem key="sms" value="sms">SMS/Text</SelectItem>
                      <SelectItem key="mobile" value="mobile">Mobile App</SelectItem>
                    </Select>
                    
                    <Select
                      label="Language Preference"
                      labelPlacement="outside"
                      selectedKeys={[formData.language_preference]}
                      onChange={(e) => setFormData({ ...formData, language_preference: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Preferred language"
                      classNames={{
                        label: "text-sm font-semibold text-gray-700 mb-1",
                        trigger: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    >
                      <SelectItem key="en" value="en">English</SelectItem>
                      <SelectItem key="es" value="es">Spanish</SelectItem>
                      <SelectItem key="fr" value="fr">French</SelectItem>
                      <SelectItem key="de" value="de">German</SelectItem>
                      <SelectItem key="zh" value="zh">Chinese</SelectItem>
                    </Select>
                    
                    <Input
                      label="Timezone (Optional)"
                      labelPlacement="outside"
                      placeholder="e.g., America/New_York"
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="IANA timezone identifier"
                      className="md:col-span-2"
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Business Relationship Section */}
              <Card className="shadow-sm border border-gray-200">
                <CardBody className="gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Business Relationship</h3>
                      <p className="text-xs text-gray-600">Account and payment information</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Relationship Type (Optional)"
                      labelPlacement="outside"
                      placeholder="e.g., Regular Customer, VIP, Partner"
                      value={formData.relationship_type}
                      onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Type of business relationship"
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Account Number (Optional)"
                      labelPlacement="outside"
                      placeholder="e.g., ACC-12345"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Internal account number"
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Customer ID (Optional)"
                      labelPlacement="outside"
                      placeholder="External customer ID"
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="External CRM/system ID"
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Supplier ID (Optional)"
                      labelPlacement="outside"
                      placeholder="External supplier ID"
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="For supplier contacts"
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Credit Limit (Optional)"
                      labelPlacement="outside"
                      placeholder="10000.00"
                      type="number"
                      step="0.01"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Maximum credit amount"
                      startContent={<span className="text-gray-500">$</span>}
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                    
                    <Input
                      label="Payment Terms (Optional)"
                      labelPlacement="outside"
                      placeholder="e.g., Net 30, Net 60, COD"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      size="lg"
                      variant="bordered"
                      radius="md"
                      description="Payment terms agreed"
                      classNames={{
                        label: "text-sm font-medium text-gray-600 mb-1",
                        input: "text-base",
                        description: "text-xs text-gray-500 mt-1"
                      }}
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Categories & Tags Section */}
              <Card className="shadow-sm border border-gray-200">
                <CardBody className="gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <DocumentTextIcon className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Categories & Tags</h3>
                      <p className="text-xs text-gray-600">Organize and label this contact</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Categories</label>
                      <p className="text-xs text-gray-500 mb-3">Add categories like VIP, Regular, Wholesale</p>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Type category name and press Enter or click Add"
                          value={categoryInput}
                          onChange={(e) => setCategoryInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                          size="lg"
                          variant="bordered"
                          classNames={{
                            input: "text-base"
                          }}
                        />
                        <Button 
                          color="primary" 
                          onPress={addCategory}
                          size="lg"
                          className="px-6"
                        >
                          Add
                        </Button>
                      </div>
                      {formData.categories.length > 0 && (
                        <div className="flex gap-2 flex-wrap p-3 bg-gray-50 rounded-lg border border-gray-200">
                          {formData.categories.map((cat) => (
                            <Chip
                              key={cat}
                              onClose={() => setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat) })}
                              variant="flat"
                              color="secondary"
                              size="lg"
                            >
                              {cat}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Tags</label>
                      <p className="text-xs text-gray-500 mb-3">Add custom tags for easy searching</p>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Type tag name and press Enter or click Add"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          size="lg"
                          variant="bordered"
                          classNames={{
                            input: "text-base"
                          }}
                        />
                        <Button 
                          color="primary" 
                          onPress={addTag}
                          size="lg"
                          className="px-6"
                        >
                          Add
                        </Button>
                      </div>
                      {formData.tags.length > 0 && (
                        <div className="flex gap-2 flex-wrap p-3 bg-gray-50 rounded-lg border border-gray-200">
                          {formData.tags.map((tag) => (
                            <Chip
                              key={tag}
                              onClose={() => setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })}
                              variant="flat"
                              size="lg"
                            >
                              {tag}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Status Settings Section */}
              <Card className="shadow-sm border border-gray-200">
                <CardBody className="gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Status Settings</h3>
                      <p className="text-xs text-gray-600">Configure contact status</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Switch
                        isSelected={formData.is_active}
                        onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                        size="lg"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Active Contact</p>
                        <p className="text-xs text-gray-600">Enable if this contact should be available for selection</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Switch
                        isSelected={formData.is_primary}
                        onValueChange={(value) => setFormData({ ...formData, is_primary: value })}
                        size="lg"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Primary Contact</p>
                        <p className="text-xs text-gray-600">Mark as the main contact for this company/account</p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Notes Section */}
              <Card className="shadow-sm border border-gray-200">
                <CardBody className="gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <DocumentTextIcon className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Additional Notes</h3>
                      <p className="text-xs text-gray-600">Any other important information</p>
                    </div>
                  </div>
                  
                  <Textarea
                    label="Notes"
                    labelPlacement="outside"
                    placeholder="Add any additional notes, special instructions, or important information about this contact..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    minRows={4}
                    maxRows={8}
                    size="lg"
                    variant="bordered"
                    radius="md"
                    description="Optional: Any relevant details"
                    classNames={{
                      label: "text-sm font-semibold text-gray-700 mb-1",
                      input: "text-base",
                      description: "text-xs text-gray-500 mt-1"
                    }}
                  />
                </CardBody>
              </Card>
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
