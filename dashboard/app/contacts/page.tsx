"use client";

import
  {
    EnvelopeIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
    PencilIcon,
    PhoneIcon,
    PlusIcon,
    TrashIcon,
    TruckIcon,
    UserGroupIcon,
  } from "@heroicons/react/24/outline";
import
  {
    Button,
    Card,
    CardBody,
    CardHeader,
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
    Tooltip,
    useDisclosure
  } from "@nextui-org/react";
import { debounce } from "lodash";
import { useCallback, useMemo, useState } from "react";
import { CreateContactModal } from "../../components/modals/CreateContactModal";
import { EnhancedContact, useContacts } from "../../hooks/useEnhancedData";

export default function ContactsPage() {
  const { contacts, loading, updateContact, refetch } = useContacts();

  const deleteContact = async (id: string) => {
    console.warn("Delete contact not yet implemented in hook");
    return { success: false, error: "Not implemented" };
  };

  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterContactType, setFilterContactType] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("full_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedContact, setSelectedContact] = useState<EnhancedContact | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const deleteModal = useDisclosure();

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
      setPage(1);
    }, 300),
    []
  );

  const filteredContacts = useMemo(() => {
    let result = contacts.filter((contact) => {
      const matchesSearch =
        !searchTerm ||
        contact.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.primary_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.primary_phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = !filterContactType || contact.contact_type === filterContactType;

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && contact.is_active) ||
        (filterStatus === "inactive" && !contact.is_active) ||
        (filterStatus === "primary" && contact.is_primary);

      return matchesSearch && matchesType && matchesStatus;
    });

    // Sort contacts
    result.sort((a, b) => {
      const aValue = a[sortBy as keyof EnhancedContact];
      const bValue = b[sortBy as keyof EnhancedContact];
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

    return result;
  }, [contacts, searchTerm, filterContactType, filterStatus, sortBy, sortOrder]);

  // Pagination
  const paginatedContacts = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredContacts.slice(start, start + rowsPerPage);
  }, [filteredContacts, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredContacts.length / rowsPerPage);

  const handleEdit = (contact: EnhancedContact) => {
    setSelectedContact(contact);
    editModal.onOpen();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
    deleteModal.onOpen();
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      setActionLoading(deleteConfirmId);
      try {
        const result = await deleteContact(deleteConfirmId);
        if (result.success) {
          toast.success("Contact deleted successfully");
          refetch();
        } else {
          toast.error(`Failed to delete: ${result.error}`);
        }
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      } finally {
        setActionLoading(null);
        deleteModal.onClose();
        setDeleteConfirmId(null);
      }
    }
  };

  const handleTogglePrimary = async (contact: EnhancedContact) => {
    setActionLoading(contact.id);
    try {
      await updateContact(contact.id, { is_primary: !contact.is_primary });
      toast.success(`Contact ${contact.is_primary ? 'removed from' : 'set as'} primary`);
      refetch();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (contact: EnhancedContact) => {
    setActionLoading(contact.id);
    try {
      await updateContact(contact.id, { is_active: !contact.is_active });
      toast.success(`Contact ${contact.is_active ? 'deactivated' : 'activated'}`);
      refetch();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const contactTypes = useMemo(() => {
    const types = new Set<string>();
    contacts.forEach((c) => types.add(c.contact_type));
    return Array.from(types);
  }, [contacts]);

  const getContactTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      customer: "from-purple-500 to-purple-600",
      supplier: "from-orange-500 to-orange-600",
      driver: "from-blue-500 to-blue-600",
      warehouse: "from-green-500 to-green-600",
      other: "from-gray-500 to-gray-600"
    };
    return colors[type] || "from-gray-500 to-gray-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Contacts
                  </h1>
                  <p className="text-gray-500 mt-1">Manage customer, supplier, and operational contacts</p>
                </div>
              </div>
            </div>
            <Button
              size="lg"
              startContent={<PlusIcon className="w-5 h-5" />}
              onPress={createModal.onOpen}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
            >
              Add Contact
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 hover:shadow-xl transition-all">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Contacts</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    {contacts.length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <UserGroupIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50/50 hover:shadow-xl transition-all">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent">
                    {contacts.filter((c) => c.is_active).length}
                  </p>
                </div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <div className="w-4 h-4 rounded-full bg-white"></div>
                  </div>
                  <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 hover:shadow-xl transition-all">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Customers</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-purple-600 to-purple-700 bg-clip-text text-transparent">
                    {contacts.filter((c) => c.contact_type === "customer").length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <UserGroupIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/50 hover:shadow-xl transition-all">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Suppliers</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-orange-600 to-orange-700 bg-clip-text text-transparent">
                    {contacts.filter((c) => c.contact_type === "supplier").length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <TruckIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Search by name, company, email, or phone..."
                value={searchTerm}
                onChange={(e) => debouncedSearch(e.target.value)}
                startContent={<MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />}
                className="md:w-96"
                isClearable
                onClear={() => setSearchTerm("")}
                classNames={{
                  input: "text-sm",
                  inputWrapper: "border-1 border-gray-200 hover:border-purple-400 focus-within:!border-purple-500 shadow-sm"
                }}
              />
              <Select
                placeholder="Filter by Contact Type"
                selectedKeys={filterContactType ? [filterContactType] : []}
                onChange={(e) => {
                  setFilterContactType(e.target.value);
                  setPage(1);
                }}
                className="md:w-64"
                startContent={<FunnelIcon className="w-4 h-4 text-gray-400" />}
                items={[{ key: "", label: "All Types" }, ...contactTypes.map(type => ({ key: type, label: type.charAt(0).toUpperCase() + type.slice(1) }))]}
                classNames={{
                  trigger: "border-1 border-gray-200 hover:border-purple-400 shadow-sm"
                }}
              >
                {(item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                )}
              </Select>
              <Select
                placeholder="Filter by Status"
                selectedKeys={[filterStatus]}
                onChange={(e) => {
                  setFilterStatus(e.target.value || "all");
                  setPage(1);
                }}
                className="md:w-48"
                classNames={{
                  trigger: "border-1 border-gray-200 hover:border-purple-400 shadow-sm"
                }}
              >
                <SelectItem key="all" value="all">All Status</SelectItem>
                <SelectItem key="active" value="active">Active Only</SelectItem>
                <SelectItem key="inactive" value="inactive">Inactive Only</SelectItem>
                <SelectItem key="primary" value="primary">Primary Only</SelectItem>
              </Select>
              <Select
                placeholder="Sort By"
                selectedKeys={[sortBy]}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="md:w-48"
              >
                <SelectItem key="full_name" value="full_name">Name</SelectItem>
                <SelectItem key="company_name" value="company_name">Company</SelectItem>
                <SelectItem key="contact_type" value="contact_type">Type</SelectItem>
              </Select>
              <Button
                variant="light"
                onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                aria-label={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
              >
                {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Contacts List */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 p-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
                <Chip 
                  size="lg" 
                  variant="flat"
                  classNames={{
                    base: "bg-gradient-to-r from-purple-50 to-pink-50 border-1 border-purple-200"
                  }}
                >
                  <span className="font-semibold text-gray-700">{filteredContacts.length}</span>
                </Chip>
              </div>
              {totalPages > 1 && (
                <Pagination
                  total={totalPages}
                  page={page}
                  onChange={setPage}
                  size="sm"
                  showControls
                  aria-label="Contact Pagination"
                />
              )}
            </div>
          </CardHeader>
          <CardBody className="p-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="text-center">
                  <Spinner size="lg" className="mb-4" color="secondary" />
                  <p className="text-gray-500">Loading contacts...</p>
                </div>
              </div>
            ) : paginatedContacts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
                  <UserGroupIcon className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-900 text-xl font-semibold mb-2">No contacts found</p>
                <p className="text-gray-500 mb-6">
                  {searchTerm || filterContactType || filterStatus !== "all"
                    ? "Try adjusting your filters to see more results"
                    : "Get started by adding your first contact to the system"}
                </p>
                {!searchTerm && !filterContactType && filterStatus === "all" && (
                  <Button
                    size="lg"
                    startContent={<PlusIcon className="w-5 h-5" />}
                    onPress={createModal.onOpen}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/30"
                  >
                    Add Your First Contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedContacts.map((contact) => (
                  <Card 
                    key={contact.id} 
                    className="border-1 border-gray-200 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all duration-200 bg-white"
                  >
                    <CardBody className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getContactTypeColor(contact.contact_type)} flex items-center justify-center shadow-md shrink-0`}>
                              <UserGroupIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-gray-900 truncate">
                                  {contact.full_name}
                                </h3>
                                {contact.company_name && (
                                  <span className="text-gray-500 text-sm truncate">
                                    ({contact.company_name})
                                  </span>
                                )}
                              </div>
                              {contact.job_title && (
                                <p className="text-sm text-gray-600 mb-2">{contact.job_title}</p>
                              )}
                              <div className="flex gap-2 flex-wrap">
                                <Chip 
                                  size="sm"
                                  classNames={{
                                    base: "bg-gray-100 border-1 border-gray-300"
                                  }}
                                >
                                  <span className="text-gray-700 font-medium">
                                    {contact.contact_type.charAt(0).toUpperCase() + contact.contact_type.slice(1)}
                                  </span>
                                </Chip>
                                {contact.is_primary && (
                                  <Chip 
                                    size="sm"
                                    classNames={{
                                      base: "bg-gradient-to-r from-blue-100 to-blue-200 border-1 border-blue-300"
                                    }}
                                  >
                                    <span className="text-blue-800 font-medium">Primary</span>
                                  </Chip>
                                )}
                                {contact.is_active ? (
                                  <Chip 
                                    size="sm"
                                    classNames={{
                                      base: "bg-gradient-to-r from-green-100 to-green-200 border-1 border-green-300"
                                    }}
                                  >
                                    <span className="text-green-800 font-medium">Active</span>
                                  </Chip>
                                ) : (
                                  <Chip 
                                    size="sm"
                                    classNames={{
                                      base: "bg-gray-100 border-1 border-gray-300"
                                    }}
                                  >
                                    <span className="text-gray-600 font-medium">Inactive</span>
                                  </Chip>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Contact Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {contact.primary_phone && (
                              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-1 border-gray-200">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                  <PhoneIcon className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-500 font-medium">Phone</p>
                                  <p className="text-sm font-semibold text-blue-600 truncate">
                                    {contact.primary_phone}
                                  </p>
                                  {contact.mobile_phone && contact.mobile_phone !== contact.primary_phone && (
                                    <p className="text-xs text-gray-500 truncate">
                                      Mobile: {contact.mobile_phone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {contact.primary_email && (
                              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-1 border-gray-200">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                                  <EnvelopeIcon className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-500 font-medium">Email</p>
                                  <p className="text-sm font-semibold text-blue-600 truncate">
                                    {contact.primary_email}
                                  </p>
                                </div>
                              </div>
                            )}

                            {contact.city && (
                              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-1 border-gray-200">
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                  <MapPinIcon className="w-4 h-4 text-green-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-500 font-medium">Location</p>
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {[contact.city, contact.state, contact.country].filter(Boolean).join(", ")}
                                  </p>
                                </div>
                              </div>
                            )}

                            {contact.preferred_contact_method && (
                              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-1 border-gray-200">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                  <span className="text-amber-600 font-bold text-sm">★</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-500 font-medium">Prefers</p>
                                  <p className="text-sm font-semibold text-gray-900 capitalize">
                                    {contact.preferred_contact_method}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Categories */}
                          {contact.categories && contact.categories.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-2">Categories</p>
                              <div className="flex gap-2 flex-wrap">
                                {contact.categories.map((category) => (
                                  <Chip 
                                    key={category} 
                                    size="sm" 
                                    variant="flat"
                                    classNames={{
                                      base: "bg-purple-50 border-1 border-purple-200"
                                    }}
                                  >
                                    <span className="text-purple-700 font-medium">{category}</span>
                                  </Chip>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 ml-6">
                          <Tooltip content="Edit contact">
                            <Button
                              isIconOnly
                              size="md"
                              variant="flat"
                              onPress={() => handleEdit(contact)}
                              className="bg-purple-100 hover:bg-purple-200 border-1 border-purple-300"
                            >
                              <PencilIcon className="w-5 h-5 text-purple-600" />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Delete contact">
                            <Button
                              isIconOnly
                              size="md"
                              variant="flat"
                              onPress={() => handleDeleteClick(contact.id)}
                              className="bg-red-100 hover:bg-red-200 border-1 border-red-300"
                            >
                              <TrashIcon className="w-5 h-5 text-red-600" />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Create Modal */}
        <CreateContactModal
          isOpen={createModal.isOpen}
          onClose={createModal.onClose}
          onSuccess={() => {
            refetch();
            createModal.onClose();
          }}
        />

        {/* Delete Confirmation Modal */}
        <Modal 
          isOpen={deleteModal.isOpen} 
          onClose={deleteModal.onClose}
          classNames={{
            backdrop: "bg-black/60 backdrop-blur-sm",
            base: "bg-white shadow-2xl"
          }}
        >
          <ModalContent>
            <ModalHeader className="border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                  <p className="text-sm text-gray-500 font-normal">This action cannot be undone</p>
                </div>
              </div>
            </ModalHeader>
            <ModalBody className="py-6">
              <p className="text-gray-700">
                Are you sure you want to delete this contact? All associated data will be permanently removed from the system.
              </p>
            </ModalBody>
            <ModalFooter className="border-t border-gray-200 gap-3">
              <Button 
                variant="flat" 
                onPress={deleteModal.onClose}
                className="border-1 border-gray-300 font-medium"
              >
                Cancel
              </Button>
              <Button 
                onPress={handleDeleteConfirm}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow-lg shadow-red-500/30"
              >
                Delete Contact
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}