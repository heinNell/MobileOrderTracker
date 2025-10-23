"use client";

import
  {
    CheckCircleIcon,
    EnvelopeIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
    PencilIcon,
    PhoneIcon,
    PlusIcon,
    TrashIcon,
    TruckIcon
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
    Pagination,
    Select,
    SelectItem,
    Spinner,
    Tooltip,
    useDisclosure,
  } from "@nextui-org/react";
import { debounce } from "lodash";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CreateTransporterModal } from "../../components/modals/CreateTransporterModal";
import { EnhancedTransporter, useTransporters } from "../../hooks/useEnhancedData";

export default function TransportersPage() {
  const { transporters, loading, updateTransporter, refetch } = useTransporters();

  const deleteTransporter = async (id: string) => {
    console.warn("Delete transporter not yet implemented in hook");
    return { success: false, error: "Not implemented" };
  };

  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterServiceType, setFilterServiceType] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedTransporter, setSelectedTransporter] = useState<EnhancedTransporter | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const deleteModal = useDisclosure();

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchTerm(value);
        setPage(1);
      }, 300),
    [setSearchTerm, setPage]
  );

  const filteredTransporters = useMemo(() => {
    let result = transporters.filter((transporter) => {
      const matchesSearch =
        !searchTerm ||
        transporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transporter.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transporter.primary_contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transporter.primary_contact_phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesServiceType = 
        !filterServiceType || 
        transporter.service_types?.includes(filterServiceType);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && transporter.is_active) ||
        (filterStatus === "inactive" && !transporter.is_active) ||
        (filterStatus === "preferred" && transporter.is_preferred);

      return matchesSearch && matchesServiceType && matchesStatus;
    });

    // Sort transporters
    result.sort((a, b) => {
      const aValue = a[sortBy as keyof EnhancedTransporter];
      const bValue = b[sortBy as keyof EnhancedTransporter];
      
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
  }, [transporters, searchTerm, filterServiceType, filterStatus, sortBy, sortOrder]);

  // Pagination
  const paginatedTransporters = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredTransporters.slice(start, start + rowsPerPage);
  }, [filteredTransporters, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredTransporters.length / rowsPerPage);

  const handleEdit = (transporter: EnhancedTransporter) => {
    setSelectedTransporter(transporter);
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
        const result = await deleteTransporter(deleteConfirmId);
        if (result.success) {
          toast.success("Transporter deleted successfully");
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

  const handleTogglePreferred = async (transporter: EnhancedTransporter) => {
    setActionLoading(transporter.id);
    try {
      await updateTransporter(transporter.id, { is_preferred: !transporter.is_preferred });
      toast.success(`Transporter ${transporter.is_preferred ? 'removed from' : 'added to'} preferred list`);
      refetch();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (transporter: EnhancedTransporter) => {
    setActionLoading(transporter.id);
    try {
      await updateTransporter(transporter.id, { is_active: !transporter.is_active });
      toast.success(`Transporter ${transporter.is_active ? 'deactivated' : 'activated'}`);
      refetch();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const serviceTypes = useMemo(() => {
    const types = new Set<string>();
    transporters.forEach((t) => t.service_types?.forEach(st => types.add(st)));
    return Array.from(types);
  }, [transporters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <TruckIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Transporters
                  </h1>
                  <p className="text-gray-500 mt-1">Manage carriers and logistics providers</p>
                </div>
              </div>
            </div>
            <Button
              size="lg"
              startContent={<PlusIcon className="w-5 h-5" />}
              onPress={createModal.onOpen}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all"
            >
              Add Transporter
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 hover:shadow-xl transition-all">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Transporters</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    {transporters.length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <TruckIcon className="w-7 h-7 text-white" />
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
                    {transporters.filter((t) => t.is_active).length}
                  </p>
                </div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <CheckCircleIcon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50/50 hover:shadow-xl transition-all">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Preferred</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-yellow-600 to-yellow-700 bg-clip-text text-transparent">
                    {transporters.filter((t) => t.is_preferred).length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <TruckIcon className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/50 hover:shadow-xl transition-all">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Auto-Assign Eligible</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-orange-600 to-orange-700 bg-clip-text text-transparent">
                    {transporters.filter((t) => t.auto_assign_eligible).length}
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
                placeholder="Filter by Service Type"
                selectedKeys={filterServiceType ? [filterServiceType] : []}
                onChange={(e) => {
                  setFilterServiceType(e.target.value);
                  setPage(1);
                }}
                className="md:w-64"
                startContent={<FunnelIcon className="w-4 h-4 text-gray-400" />}
                items={[
                  { key: "", label: "All Types" },
                  { key: "ltl", label: "LTL Freight" },
                  { key: "ftl", label: "FTL Freight" },
                  { key: "air", label: "Air Freight" },
                  { key: "ocean", label: "Ocean Freight" },
                  { key: "rail", label: "Rail Freight" },
                  { key: "courier", label: "Courier/Express" },
                  { key: "intermodal", label: "Intermodal" }
                ]}
                classNames={{
                  trigger: "border-1 border-gray-200 hover:border-blue-400 shadow-sm"
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
                <SelectItem key="preferred" value="preferred">Preferred Only</SelectItem>
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
                <SelectItem key="name" value="name">Name</SelectItem>
                <SelectItem key="company_name" value="company_name">Company</SelectItem>
                <SelectItem key="performance_rating" value="performance_rating">Rating</SelectItem>
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

        {/* Transporters List */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100 p-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-900">Transporters</h2>
                <Chip 
                  size="lg" 
                  variant="flat"
                  classNames={{
                    base: "bg-gradient-to-r from-blue-50 to-cyan-50 border-1 border-blue-200"
                  }}
                >
                  <span className="font-semibold text-gray-700">{filteredTransporters.length}</span>
                </Chip>
              </div>
              {totalPages > 1 && (
                <Pagination
                  total={totalPages}
                  page={page}
                  onChange={setPage}
                  size="sm"
                  showControls
                  aria-label="Transporter Pagination"
                />
              )}
            </div>
          </CardHeader>
          <CardBody className="p-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="text-center">
                  <Spinner size="lg" className="mb-4" color="secondary" />
                  <p className="text-gray-500">Loading transporters...</p>
                </div>
              </div>
            ) : paginatedTransporters.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
                  <TruckIcon className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-900 text-xl font-semibold mb-2">No transporters found</p>
                <p className="text-gray-500 mb-6">
                  {searchTerm || filterServiceType || filterStatus !== "all"
                    ? "Try adjusting your filters to see more results"
                    : "Get started by adding your first transporter to the system"}
                </p>
                {!searchTerm && !filterServiceType && filterStatus === "all" && (
                  <Button
                    size="lg"
                    startContent={<PlusIcon className="w-5 h-5" />}
                    onPress={createModal.onOpen}
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/30"
                  >
                    Add Your First Transporter
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedTransporters.map((transporter) => (
                  <Card 
                    key={transporter.id} 
                    className="border-1 border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 bg-white"
                  >
                    <CardBody className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md shrink-0">
                              <TruckIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-gray-900 truncate">
                                  {transporter.company_name}
                                </h3>
                              </div>
                              {transporter.registration_number && (
                                <p className="text-sm text-gray-600 mb-2">Reg: {transporter.registration_number}</p>
                              )}
                              <div className="flex gap-2 flex-wrap">
                                {transporter.service_types && transporter.service_types.slice(0, 3).map((serviceType) => (
                                  <Chip 
                                    key={serviceType}
                                    size="sm"
                                    classNames={{
                                      base: "bg-blue-100 border-1 border-blue-300"
                                    }}
                                  >
                                    <span className="text-blue-700 font-medium uppercase">
                                      {serviceType}
                                    </span>
                                  </Chip>
                                ))}
                                {transporter.service_types && transporter.service_types.length > 3 && (
                                  <Chip 
                                    size="sm"
                                    classNames={{
                                      base: "bg-gray-100 border-1 border-gray-300"
                                    }}
                                  >
                                    <span className="text-gray-700 font-medium">
                                      +{transporter.service_types.length - 3} more
                                    </span>
                                  </Chip>
                                )}
                                {transporter.is_preferred && (
                                  <Chip 
                                    size="sm"
                                    classNames={{
                                      base: "bg-gradient-to-r from-amber-100 to-amber-200 border-1 border-amber-300"
                                    }}
                                  >
                                    <span className="text-amber-800 font-medium">Preferred</span>
                                  </Chip>
                                )}
                                {transporter.is_active ? (
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

                          {/* Primary Contact Section */}
                          {(transporter.primary_contact_name || transporter.primary_contact_phone || transporter.primary_contact_email) && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Primary Contact</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {transporter.primary_contact_name && (
                                  <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border-1 border-blue-200">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                                      <span className="text-white text-sm font-bold">
                                        {transporter.primary_contact_name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-gray-600 font-medium">Contact Person</p>
                                      <p className="text-sm font-semibold text-gray-900 truncate">
                                        {transporter.primary_contact_name}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {transporter.primary_contact_phone && (
                                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-1 border-gray-200">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                      <PhoneIcon className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-gray-500 font-medium">Phone</p>
                                      <a 
                                        href={`tel:${transporter.primary_contact_phone}`}
                                        className="text-sm font-semibold text-blue-600 truncate hover:underline"
                                      >
                                        {transporter.primary_contact_phone}
                                      </a>
                                    </div>
                                  </div>
                                )}

                                {transporter.primary_contact_email && (
                                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-1 border-gray-200">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                                      <EnvelopeIcon className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-gray-500 font-medium">Email</p>
                                      <a 
                                        href={`mailto:${transporter.primary_contact_email}`}
                                        className="text-sm font-semibold text-blue-600 truncate hover:underline"
                                      >
                                        {transporter.primary_contact_email}
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Additional Transporter Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                            {transporter.coverage_areas && transporter.coverage_areas.length > 0 && (
                              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-1 border-gray-200">
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                  <MapPinIcon className="w-4 h-4 text-green-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-500 font-medium">Coverage</p>
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {transporter.coverage_areas.slice(0, 2).join(", ")}
                                    {transporter.coverage_areas.length > 2 && ` +${transporter.coverage_areas.length - 2}`}
                                  </p>
                                </div>
                              </div>
                            )}

                            {transporter.performance_rating !== null && transporter.performance_rating !== undefined && (
                              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-1 border-gray-200">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                  <span className="text-emerald-600 font-bold text-sm">★</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-500 font-medium">Rating</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {transporter.performance_rating.toFixed(1)}/5.0
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Secondary Contact Section */}
                          {(transporter.secondary_contact_name || transporter.secondary_contact_phone || transporter.secondary_contact_email) && (
                            <div className="mb-4 pb-4 border-b border-gray-200">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Secondary Contact</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {transporter.secondary_contact_name && (
                                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border-1 border-gray-200">
                                    <div className="w-7 h-7 rounded-lg bg-gray-300 flex items-center justify-center shrink-0">
                                      <span className="text-white text-xs font-bold">
                                        {transporter.secondary_contact_name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-gray-900 font-medium truncate">
                                        {transporter.secondary_contact_name}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {transporter.secondary_contact_phone && (
                                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border-1 border-gray-200">
                                    <PhoneIcon className="w-4 h-4 text-gray-600 shrink-0" />
                                    <a 
                                      href={`tel:${transporter.secondary_contact_phone}`}
                                      className="text-xs font-medium text-blue-600 truncate hover:underline"
                                    >
                                      {transporter.secondary_contact_phone}
                                    </a>
                                  </div>
                                )}

                                {transporter.secondary_contact_email && (
                                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border-1 border-gray-200">
                                    <EnvelopeIcon className="w-4 h-4 text-gray-600 shrink-0" />
                                    <a 
                                      href={`mailto:${transporter.secondary_contact_email}`}
                                      className="text-xs font-medium text-blue-600 truncate hover:underline"
                                    >
                                      {transporter.secondary_contact_email}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Vehicle Types */}
                          {transporter.vehicle_types && transporter.vehicle_types.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-2">Vehicle Types</p>
                              <div className="flex gap-2 flex-wrap">
                                {transporter.vehicle_types.map((vehicleType) => (
                                  <Chip 
                                    key={vehicleType} 
                                    size="sm" 
                                    variant="flat"
                                    classNames={{
                                      base: "bg-cyan-50 border-1 border-cyan-200"
                                    }}
                                  >
                                    <span className="text-cyan-700 font-medium capitalize">{vehicleType.replace(/_/g, ' ')}</span>
                                  </Chip>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 ml-6">
                          <Tooltip content="Edit transporter">
                            <Button
                              isIconOnly
                              size="md"
                              variant="flat"
                              onPress={() => handleEdit(transporter)}
                              className="bg-blue-100 hover:bg-blue-200 border-1 border-blue-300"
                            >
                              <PencilIcon className="w-5 h-5 text-blue-600" />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Delete transporter">
                            <Button
                              isIconOnly
                              size="md"
                              variant="flat"
                              onPress={() => handleDeleteClick(transporter.id)}
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
        <CreateTransporterModal
          isOpen={createModal.isOpen}
          onClose={createModal.onClose}
          onSuccess={() => {
            refetch();
            createModal.onClose();
          }}
        />

        {/* Edit Modal - Using Create Modal with initial data */}
        {selectedTransporter && (
          <CreateTransporterModal
            isOpen={editModal.isOpen}
            onClose={() => {
              editModal.onClose();
              setSelectedTransporter(null);
            }}
            onSuccess={() => {
              refetch();
              editModal.onClose();
              setSelectedTransporter(null);
            }}
            initialData={selectedTransporter}
            isEditing={true}
          />
        )}

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
                Are you sure you want to delete this transporter? All associated data will be permanently removed from the system.
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
                Delete Transporter
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}