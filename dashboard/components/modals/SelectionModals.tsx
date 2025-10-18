"use client";

import {
    ClockIcon,
    CurrencyDollarIcon,
    EnvelopeIcon,
    GlobeAltIcon,
    MapPinIcon,
    PhoneIcon,
    MagnifyingGlassIcon,
    StarIcon,
    TagIcon,
    TruckIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import {
    Avatar,
    Badge,
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
    Spinner,
    Tab,
    Tabs
} from '@nextui-org/react';
import { useEffect, useMemo, useState } from 'react';
import {
    EnhancedContact,
    EnhancedGeofence,
    EnhancedTransporter,
    OrderTemplate,
    useContacts,
    useEnhancedGeofences,
    useOrderTemplates,
    useTransporters
} from '../../hooks/useEnhancedData';

// Transporter Selection Modal
interface TransporterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (transporter: EnhancedTransporter) => void;
  preSelectedId?: string;
  filterCriteria?: {
    serviceType?: string;
    coverageArea?: string;
    vehicleType?: string;
  };
}

export function TransporterSelectionModal({
  isOpen,
  onClose,
  onSelect,
  preSelectedId,
  filterCriteria
}: TransporterSelectionModalProps) {
  const { transporters, loading, getSuggestedTransporters } = useTransporters();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState<EnhancedTransporter | null>(null);
  const [filterServiceType, setFilterServiceType] = useState(filterCriteria?.serviceType || '');
  const [filterVehicleType, setFilterVehicleType] = useState(filterCriteria?.vehicleType || '');
  const [suggestedTransporters, setSuggestedTransporters] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Filter and search transporters
  const filteredTransporters = useMemo(() => {
    return transporters.filter((transporter: EnhancedTransporter) => {
      const matchesSearch = !searchTerm || 
        transporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transporter.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transporter.primary_contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesServiceType = !filterServiceType || 
        transporter.service_types?.includes(filterServiceType);
      
      const matchesVehicleType = !filterVehicleType || 
        transporter.vehicle_types?.includes(filterVehicleType);
      
      return matchesSearch && matchesServiceType && matchesVehicleType;
    });
  }, [transporters, searchTerm, filterServiceType, filterVehicleType]);

  // Get suggestions when filters change
  useEffect(() => {
    if (filterCriteria?.serviceType || filterCriteria?.coverageArea || filterCriteria?.vehicleType) {
      setLoadingSuggestions(true);
      getSuggestedTransporters(
        filterCriteria.serviceType,
        filterCriteria.coverageArea,
        filterCriteria.vehicleType
      ).then((result: any) => {
        if (result.success) {
          setSuggestedTransporters(result.data || []);
        }
        setLoadingSuggestions(false);
      });
    }
  }, [filterCriteria, getSuggestedTransporters]);

  // Pre-select transporter if provided
  useEffect(() => {
    if (preSelectedId && transporters.length > 0) {
      const preSelected = transporters.find((t: EnhancedTransporter) => t.id === preSelectedId);
      if (preSelected) {
        setSelectedTransporter(preSelected);
      }
    }
  }, [preSelectedId, transporters]);

  const handleSelect = () => {
    if (selectedTransporter) {
      onSelect(selectedTransporter);
      onClose();
    }
  };

  const TransporterCard = ({ transporter, isSuggested = false }: { 
    transporter: EnhancedTransporter; 
    isSuggested?: boolean;
  }) => (
    <Card 
      isPressable 
      isHoverable
      className={`mb-3 ${selectedTransporter?.id === transporter.id ? 'ring-2 ring-primary' : ''}`}
      onPress={() => setSelectedTransporter(transporter)}
    >
      <CardBody className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <Avatar
              name={transporter.name.charAt(0)}
              className="bg-primary text-white"
              size="md"
            />
            <div>
              <h4 className="font-semibold text-lg">{transporter.name}</h4>
              {transporter.company_name && (
                <p className="text-sm text-gray-600">{transporter.company_name}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {transporter.is_preferred && (
              <Chip color="warning" size="sm" startContent={<StarIcon className="w-3 h-3" />}>
                Preferred
              </Chip>
            )}
            {isSuggested && (
              <Chip color="success" size="sm">
                Suggested
              </Chip>
            )}
            <Badge content={transporter.performance_rating || 0} color="primary">
              <StarIcon className="w-4 h-4" />
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          {transporter.primary_contact_name && (
            <div className="flex items-center gap-2 text-sm">
              <UserGroupIcon className="w-4 h-4 text-gray-500" />
              <span>{transporter.primary_contact_name}</span>
              {transporter.primary_contact_phone && (
                <>
                  <PhoneIcon className="w-4 h-4 text-gray-500 ml-2" />
                  <span>{transporter.primary_contact_phone}</span>
                </>
              )}
            </div>
          )}

          {transporter.service_types && transporter.service_types.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <TruckIcon className="w-4 h-4 text-gray-500" />
              <div className="flex gap-1 flex-wrap">
                {transporter.service_types.slice(0, 3).map((service: string) => (
                  <Chip key={service} size="sm" variant="flat">{service}</Chip>
                ))}
              </div>
            </div>
          )}

          {transporter.coverage_areas && transporter.coverage_areas.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <GlobeAltIcon className="w-4 h-4 text-gray-500" />
              <span>{transporter.coverage_areas.slice(0, 2).join(', ')}</span>
              {transporter.coverage_areas.length > 2 && (
                <span className="text-gray-500">+{transporter.coverage_areas.length - 2} more</span>
              )}
            </div>
          )}

          {transporter.base_rate_per_km && (
            <div className="flex items-center gap-2 text-sm">
              <CurrencyDollarIcon className="w-4 h-4 text-gray-500" />
              <span>{transporter.currency || '$'}{transporter.base_rate_per_km}/km</span>
              {transporter.minimum_charge && (
                <span className="text-gray-500">
                  (Min: {transporter.currency || '$'}{transporter.minimum_charge})
                </span>
              )}
            </div>
          )}
        </div>

        {transporter.tags && transporter.tags.length > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {transporter.tags.slice(0, 4).map((tag: string) => (
              <Chip key={tag} size="sm" variant="flat" color="default">
                {tag}
              </Chip>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="4xl" 
      scrollBehavior="inside"
      classNames={{
        body: "py-6",
        base: "max-h-[90vh]"
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">Select Transporter</h2>
            <p className="text-sm text-gray-600">Choose from available transporters or view suggestions</p>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-3">
              <Input
                placeholder="Search transporters..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
                className="flex-1"
              />
              <Select
                placeholder="Service Type"
                value={filterServiceType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterServiceType(e.target.value)}
                className="w-48"
              >
                <SelectItem key="express" value="express">Express Delivery</SelectItem>
                <SelectItem key="standard" value="standard">Standard Delivery</SelectItem>
                <SelectItem key="freight" value="freight">Freight</SelectItem>
                <SelectItem key="specialized" value="specialized">Specialized</SelectItem>
              </Select>
              <Select
                placeholder="Vehicle Type"
                value={filterVehicleType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterVehicleType(e.target.value)}
                className="w-48"
              >
                <SelectItem key="van" value="van">Van</SelectItem>
                <SelectItem key="truck" value="truck">Truck</SelectItem>
                <SelectItem key="trailer" value="trailer">Trailer</SelectItem>
                <SelectItem key="motorcycle" value="motorcycle">Motorcycle</SelectItem>
              </Select>
            </div>

            <Tabs aria-label="Transporter options">
              <Tab key="all" title={`All Transporters (${filteredTransporters.length})`}>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : filteredTransporters.length === 0 ? (
                    <div className="text-center py-8">
                      <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No transporters found matching your criteria</p>
                    </div>
                  ) : (
                    filteredTransporters.map((transporter: EnhancedTransporter) => (
                      <TransporterCard key={transporter.id} transporter={transporter} />
                    ))
                  )}
                </div>
              </Tab>

              <Tab key="suggested" title={`Suggested (${suggestedTransporters.length})`}>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loadingSuggestions ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : suggestedTransporters.length === 0 ? (
                    <div className="text-center py-8">
                      <StarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No suggestions available for current criteria</p>
                    </div>
                  ) : (
                    suggestedTransporters.map(suggestion => {
                      const transporter = transporters.find((t: EnhancedTransporter) => t.id === suggestion.id);
                      return transporter ? (
                        <div key={transporter.id}>
                          <div className="mb-2 text-sm text-gray-600">
                            Score: {suggestion.score}% - {suggestion.reason}
                          </div>
                          <TransporterCard transporter={transporter} isSuggested />
                        </div>
                      ) : null;
                    })
                  )}
                </div>
              </Tab>
            </Tabs>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button 
            color="primary" 
            onPress={handleSelect}
            isDisabled={!selectedTransporter}
          >
            Select Transporter
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Contact Selection Modal
interface ContactSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contact: EnhancedContact) => void;
  contactType?: string;
  preSelectedId?: string;
}

export function ContactSelectionModal({
  isOpen,
  onClose,
  onSelect,
  contactType,
  preSelectedId
}: ContactSelectionModalProps) {
  const { contacts, loading, searchContacts } = useContacts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<EnhancedContact | null>(null);
  const [searchResults, setSearchResults] = useState<EnhancedContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter contacts based on type and search
  const filteredContacts = useMemo(() => {
    const baseContacts = searchResults.length > 0 ? searchResults : contacts;
    return baseContacts.filter((contact: EnhancedContact) => {
      const matchesType = !contactType || contact.contact_type === contactType;
      return matchesType;
    });
  }, [contacts, searchResults, contactType]);

  // Handle search
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length > 2) {
      setIsSearching(true);
      const result = await searchContacts(term, contactType);
      if (result.success) {
        setSearchResults(result.data || []);
      }
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  // Pre-select contact if provided
  useEffect(() => {
    if (preSelectedId && contacts.length > 0) {
      const preSelected = contacts.find((c: EnhancedContact) => c.id === preSelectedId);
      if (preSelected) {
        setSelectedContact(preSelected);
      }
    }
  }, [preSelectedId, contacts]);

  const handleSelect = () => {
    if (selectedContact) {
      onSelect(selectedContact);
      onClose();
    }
  };

  const ContactCard = ({ contact }: { contact: EnhancedContact }) => (
    <Card 
      isPressable 
      isHoverable
      className={`mb-3 ${selectedContact?.id === contact.id ? 'ring-2 ring-primary' : ''}`}
      onPress={() => setSelectedContact(contact)}
    >
      <CardBody className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <Avatar
              name={contact.full_name.split(' ').map((n: string) => n[0]).join('')}
              className="bg-secondary text-white"
              size="md"
            />
            <div>
              <h4 className="font-semibold text-lg">{contact.full_name}</h4>
              {contact.company_name && (
                <p className="text-sm text-gray-600">{contact.company_name}</p>
              )}
              {contact.job_title && (
                <p className="text-xs text-gray-500">{contact.job_title}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {contact.is_primary && (
              <Chip color="primary" size="sm">Primary</Chip>
            )}
            <Chip color="default" size="sm" variant="flat">
              {contact.contact_type}
            </Chip>
          </div>
        </div>

        <div className="space-y-2">
          {contact.primary_phone && (
            <div className="flex items-center gap-2 text-sm">
              <PhoneIcon className="w-4 h-4 text-gray-500" />
              <span>{contact.primary_phone}</span>
              {contact.mobile_phone && contact.mobile_phone !== contact.primary_phone && (
                <span className="text-gray-500">/ {contact.mobile_phone}</span>
              )}
            </div>
          )}

          {contact.primary_email && (
            <div className="flex items-center gap-2 text-sm">
              <EnvelopeIcon className="w-4 h-4 text-gray-500" />
              <span>{contact.primary_email}</span>
            </div>
          )}

          {(contact.city || contact.state || contact.country) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPinIcon className="w-4 h-4 text-gray-500" />
              <span>
                {[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {contact.preferred_contact_method && (
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="w-4 h-4 text-gray-500" />
              <span>Prefers: {contact.preferred_contact_method}</span>
            </div>
          )}
        </div>

        {contact.tags && contact.tags.length > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {contact.tags.slice(0, 3).map((tag: string) => (
              <Chip key={tag} size="sm" variant="flat" color="default">
                {tag}
              </Chip>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="3xl" 
      scrollBehavior="inside"
      classNames={{
        body: "py-6",
        base: "max-h-[90vh]"
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">
              Select {contactType ? contactType.charAt(0).toUpperCase() + contactType.slice(1) : 'Contact'}
            </h2>
            <p className="text-sm text-gray-600">Choose from existing contacts</p>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Search */}
            <Input
              placeholder="Search contacts by name, company, email, or phone..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
              startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
              endContent={isSearching && <Spinner size="sm" />}
            />

            {/* Results */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm ? 'No contacts found matching your search' : 'No contacts available'}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact: EnhancedContact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button 
            color="primary" 
            onPress={handleSelect}
            isDisabled={!selectedContact}
          >
            Select Contact
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Enhanced Geofence Selection Modal
interface GeofenceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (geofence: EnhancedGeofence) => void;
  geofenceType?: string;
  preSelectedId?: string;
}

export function GeofenceSelectionModal({
  isOpen,
  onClose,
  onSelect,
  geofenceType,
  preSelectedId
}: GeofenceSelectionModalProps) {
  const { geofences, loading, searchGeofences } = useEnhancedGeofences();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGeofence, setSelectedGeofence] = useState<EnhancedGeofence | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [searchResults, setSearchResults] = useState<EnhancedGeofence[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle search with filters
  const handleSearch = async (term?: string, category?: string, region?: string) => {
    const searchTermToUse = term !== undefined ? term : searchTerm;
    const categoryToUse = category !== undefined ? category : filterCategory;
    const regionToUse = region !== undefined ? region : filterRegion;

    if (searchTermToUse.length > 2 || categoryToUse || regionToUse) {
      setIsSearching(true);
      const result = await searchGeofences(searchTermToUse, {
        type: geofenceType,
        category: categoryToUse,
        region: regionToUse
      });
      if (result.success) {
        setSearchResults(result.data || []);
      }
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  // Filter geofences
  const filteredGeofences = useMemo(() => {
    const baseGeofences = searchResults.length > 0 ? searchResults : geofences;
    return baseGeofences.filter((geofence: EnhancedGeofence) => {
      const matchesType = !geofenceType || geofence.geofence_type === geofenceType;
      return matchesType;
    });
  }, [geofences, searchResults, geofenceType]);

  // Pre-select geofence if provided
  useEffect(() => {
    if (preSelectedId && geofences.length > 0) {
      const preSelected = geofences.find((g: EnhancedGeofence) => g.id === preSelectedId);
      if (preSelected) {
        setSelectedGeofence(preSelected);
      }
    }
  }, [preSelectedId, geofences]);

  const handleSelect = () => {
    if (selectedGeofence) {
      onSelect(selectedGeofence);
      onClose();
    }
  };

  const GeofenceCard = ({ geofence }: { geofence: EnhancedGeofence }) => (
    <Card 
      isPressable 
      isHoverable
      className={`mb-3 ${selectedGeofence?.id === geofence.id ? 'ring-2 ring-primary' : ''}`}
      onPress={() => setSelectedGeofence(geofence)}
    >
      <CardBody className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <MapPinIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-lg">{geofence.name}</h4>
              {geofence.facility_type && (
                <p className="text-sm text-gray-600">{geofence.facility_type}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Chip color="default" size="sm" variant="flat">
              {geofence.geofence_type}
            </Chip>
            <Badge content={geofence.usage_count} color="primary">
              <ClockIcon className="w-4 h-4" />
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          {geofence.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPinIcon className="w-4 h-4 text-gray-500 mt-0.5" />
              <span>{geofence.address}</span>
            </div>
          )}

          {(geofence.city || geofence.state || geofence.country) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <GlobeAltIcon className="w-4 h-4 text-gray-500" />
              <span>
                {[geofence.city, geofence.state, geofence.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {geofence.contact_person && (
            <div className="flex items-center gap-2 text-sm">
              <UserGroupIcon className="w-4 h-4 text-gray-500" />
              <span>{geofence.contact_person}</span>
              {geofence.contact_phone && (
                <>
                  <PhoneIcon className="w-4 h-4 text-gray-500 ml-2" />
                  <span>{geofence.contact_phone}</span>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Radius: {geofence.radius_meters}m</span>
            {geofence.region && <span>Region: {geofence.region}</span>}
          </div>
        </div>

        {geofence.categories && geofence.categories.length > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {geofence.categories.slice(0, 4).map((category: string) => (
              <Chip key={category} size="sm" variant="flat" color="secondary">
                {category}
              </Chip>
            ))}
          </div>
        )}

        {geofence.tags && geofence.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {geofence.tags.slice(0, 3).map((tag: string) => (
              <Chip key={tag} size="sm" variant="flat" color="default">
                {tag}
              </Chip>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="4xl" 
      scrollBehavior="inside"
      classNames={{
        body: "py-6",
        base: "max-h-[90vh]"
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">
              Select {geofenceType ? geofenceType.charAt(0).toUpperCase() + geofenceType.slice(1) : 'Location'}
            </h2>
            <p className="text-sm text-gray-600">Choose from existing locations or search by criteria</p>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-3">
              <Input
                placeholder="Search locations by name, address, or landmark..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchTerm(e.target.value);
                  handleSearch(e.target.value);
                }}
                startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
                endContent={isSearching && <Spinner size="sm" />}
                className="flex-1"
              />
              <Select
                placeholder="Category"
                value={filterCategory}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setFilterCategory(e.target.value);
                  handleSearch(undefined, e.target.value);
                }}
                className="w-48"
              >
                <SelectItem key="warehouse" value="warehouse">Warehouse</SelectItem>
                <SelectItem key="distribution" value="distribution">Distribution Center</SelectItem>
                <SelectItem key="retail" value="retail">Retail Location</SelectItem>
                <SelectItem key="office" value="office">Office</SelectItem>
                <SelectItem key="customer" value="customer">Customer Site</SelectItem>
              </Select>
              <Select
                placeholder="Region"
                value={filterRegion}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setFilterRegion(e.target.value);
                  handleSearch(undefined, undefined, e.target.value);
                }}
                className="w-48"
              >
                <SelectItem key="north" value="north">North Region</SelectItem>
                <SelectItem key="south" value="south">South Region</SelectItem>
                <SelectItem key="east" value="east">East Region</SelectItem>
                <SelectItem key="west" value="west">West Region</SelectItem>
                <SelectItem key="central" value="central">Central Region</SelectItem>
              </Select>
            </div>

            {/* Results */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : filteredGeofences.length === 0 ? (
                <div className="text-center py-8">
                  <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm || filterCategory || filterRegion ? 
                      'No locations found matching your criteria' : 
                      'No locations available'
                    }
                  </p>
                </div>
              ) : (
                filteredGeofences.map((geofence: EnhancedGeofence) => (
                  <GeofenceCard key={geofence.id} geofence={geofence} />
                ))
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button 
            color="primary" 
            onPress={handleSelect}
            isDisabled={!selectedGeofence}
          >
            Select Location
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Order Template Selection Modal
interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: OrderTemplate) => void;
}

export function TemplateSelectionModal({
  isOpen,
  onClose,
  onSelect
}: TemplateSelectionModalProps) {
  const { templates, loading } = useOrderTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<OrderTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = useMemo(() => {
    return templates.filter((template: OrderTemplate) => 
      !searchTerm || 
      template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.template_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      onClose();
    }
  };

  const TemplateCard = ({ template }: { template: OrderTemplate }) => (
    <Card 
      isPressable 
      isHoverable
      className={`mb-3 ${selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''}`}
      onPress={() => setSelectedTemplate(template)}
    >
      <CardBody className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold text-lg">{template.template_name}</h4>
            <p className="text-sm text-gray-600">{template.template_type}</p>
            {template.description && (
              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge content={template.usage_count} color="primary">
              <ClockIcon className="w-4 h-4" />
            </Badge>
            {template.is_public && (
              <Chip color="success" size="sm">Public</Chip>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {(template as any).default_transporter?.name && (
            <div className="flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-gray-500" />
              <span>Transporter: {(template as any).default_transporter.name}</span>
            </div>
          )}

          {(template as any).default_customer_contact?.full_name && (
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-gray-500" />
              <span>
                Customer: {(template as any).default_customer_contact.full_name}
                {(template as any).default_customer_contact.company_name && 
                  ` (${(template as any).default_customer_contact.company_name})`
                }
              </span>
            </div>
          )}

          {(template as any).default_loading_geofence?.name && (
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-gray-500" />
              <span>
                From: {(template as any).default_loading_geofence.name}
                {(template as any).default_loading_geofence.address && 
                  ` - ${(template as any).default_loading_geofence.address}`
                }
              </span>
            </div>
          )}

          {(template as any).default_unloading_geofence?.name && (
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-gray-500" />
              <span>
                To: {(template as any).default_unloading_geofence.name}
                {(template as any).default_unloading_geofence.address && 
                  ` - ${(template as any).default_unloading_geofence.address}`
                }
              </span>
            </div>
          )}

          {template.default_service_type && (
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="flat">{template.default_service_type}</Chip>
              {template.default_vehicle_type && (
                <Chip size="sm" variant="flat">{template.default_vehicle_type}</Chip>
              )}
            </div>
          )}
        </div>

        {template.tags && template.tags.length > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {template.tags.map((tag: string) => (
              <Chip key={tag} size="sm" variant="flat" color="default">
                {tag}
              </Chip>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="3xl" 
      scrollBehavior="inside"
      classNames={{
        body: "py-6",
        base: "max-h-[90vh]"
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">Select Order Template</h2>
            <p className="text-sm text-gray-600">Choose a pre-configured template to auto-populate order details</p>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Search */}
            <Input
              placeholder="Search templates by name, type, or description..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
            />

            {/* Results */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm ? 'No templates found matching your search' : 'No templates available'}
                  </p>
                </div>
              ) : (
                filteredTemplates.map((template: OrderTemplate) => (
                  <TemplateCard key={template.id} template={template} />
                ))
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button 
            color="primary" 
            onPress={handleSelect}
            isDisabled={!selectedTemplate}
          >
            Use Template
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}