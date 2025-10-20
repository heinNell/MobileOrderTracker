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
        alert(`Failed to create contact: ${result.error}`);
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
            <h2 className="text-2xl font-bold">Create New Contact</h2>
            <p className="text-sm text-gray-600 font-normal">Add a customer or site contact</p>
          </ModalHeader>
          <ModalBody className="bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
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
                <SelectItem key="warehouse" value="warehouse">Warehouse Contact</SelectItem>
                <SelectItem key="emergency" value="emergency">Emergency Contact</SelectItem>
                <SelectItem key="other" value="other">Other</SelectItem>
              </Select>

              {/* Contact Methods */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Contact Methods</h3>
              </div>
              
              <Input
                label="Primary Phone"
                placeholder="Enter primary phone"
                type="tel"
                value={formData.primary_phone}
                onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
              />
              
              <Input
                label="Mobile Phone"
                placeholder="Enter mobile phone"
                type="tel"
                value={formData.mobile_phone}
                onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
              />
              
              <Input
                label="Secondary Phone"
                placeholder="Enter secondary phone"
                type="tel"
                value={formData.secondary_phone}
                onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
              />
              
              <Input
                label="Fax"
                placeholder="Enter fax number"
                type="tel"
                value={formData.fax}
                onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
              />
              
              <Input
                label="Primary Email"
                placeholder="Enter primary email"
                type="email"
                value={formData.primary_email}
                onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
              />
              
              <Input
                label="Secondary Email"
                placeholder="Enter secondary email"
                type="email"
                value={formData.secondary_email}
                onChange={(e) => setFormData({ ...formData, secondary_email: e.target.value })}
              />

              {/* Address */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Address</h3>
              </div>
              
              <Input
                label="Address Line 1"
                placeholder="Enter street address"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                className="md:col-span-2"
              />
              
              <Input
                label="Address Line 2"
                placeholder="Apt, suite, etc. (optional)"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
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

              {/* Contact Preferences */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Contact Preferences</h3>
              </div>
              
              <Select
                label="Preferred Contact Method"
                selectedKeys={[formData.preferred_contact_method]}
                onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
              >
                <SelectItem key="phone" value="phone">Phone</SelectItem>
                <SelectItem key="email" value="email">Email</SelectItem>
                <SelectItem key="sms" value="sms">SMS</SelectItem>
                <SelectItem key="mobile" value="mobile">Mobile App</SelectItem>
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
                <SelectItem key="zh" value="zh">Chinese</SelectItem>
              </Select>
              
              <Input
                label="Timezone"
                placeholder="e.g., America/New_York"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="md:col-span-2"
              />

              {/* Business Relationship */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Business Relationship</h3>
              </div>
              
              <Input
                label="Relationship Type"
                placeholder="e.g., Regular Customer, VIP, Partner"
                value={formData.relationship_type}
                onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
              />
              
              <Input
                label="Account Number"
                placeholder="Enter account number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
              
              <Input
                label="Customer ID"
                placeholder="Enter customer ID"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              />
              
              <Input
                label="Supplier ID"
                placeholder="Enter supplier ID"
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              />
              
              <Input
                label="Credit Limit"
                placeholder="e.g., 10000"
                type="number"
                step="0.01"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
              />
              
              <Input
                label="Payment Terms"
                placeholder="e.g., Net 30, Net 60"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              />

              {/* Categories */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Categories & Tags</h3>
              </div>
              
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Categories</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="e.g., VIP, Regular, Wholesale"
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

              {/* Status Settings */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4">Status</h3>
              </div>
              
              <div className="flex flex-col gap-4 md:col-span-2">
                <Switch
                  isSelected={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                >
                  Active Contact
                </Switch>
                
                <Switch
                  isSelected={formData.is_primary}
                  onValueChange={(value) => setFormData({ ...formData, is_primary: value })}
                >
                  Primary Contact for Company/Account
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