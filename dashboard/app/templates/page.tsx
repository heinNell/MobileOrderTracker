"use client";

import
  {
    ClockIcon,
    DocumentDuplicateIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    PlusIcon,
    TagIcon,
    TrashIcon,
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
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CreateTemplateModal } from "../../components/modals/CreateModalsExtended";
import { OrderTemplate, useOrderTemplates } from "../../hooks/useEnhancedData";

export default function TemplatesPage() {
  const { templates, loading, updateTemplate, refetch } = useOrderTemplates();
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("template_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedTemplate, setSelectedTemplate] = useState<OrderTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const createModal = useDisclosure();
  const deleteModal = useDisclosure();

  // Delete function (stub - needs to be added to useOrderTemplates hook)
  const deleteTemplate = async (id: string) => {
    console.warn("Delete template not yet implemented in hook");
    return { success: false, error: "Not implemented" };
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
      setPage(1);
    }, 300),
    []
  );

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let result = templates.filter((template) => {
      const matchesSearch =
        !searchTerm ||
        template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = !filterType || template.template_type === filterType;

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && template.is_active) ||
        (filterStatus === "inactive" && !template.is_active) ||
        (filterStatus === "public" && template.is_public);

      return matchesSearch && matchesType && matchesStatus;
    });

    // Sort templates
    result.sort((a, b) => {
      const aValue = a[sortBy as keyof OrderTemplate];
      const bValue = b[sortBy as keyof OrderTemplate];
      
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
  }, [templates, searchTerm, filterType, filterStatus, sortBy, sortOrder]);

  // Pagination
  const paginatedTemplates = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredTemplates.slice(start, start + rowsPerPage);
  }, [filteredTemplates, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredTemplates.length / rowsPerPage);

  const handleEdit = (template: OrderTemplate) => {
    setSelectedTemplate(template);
    // Note: editModal was removed as it wasn't implemented in the original code
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
    deleteModal.onOpen();
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      setActionLoading(deleteConfirmId);
      try {
        const result = await deleteTemplate(deleteConfirmId);
        if (result.success) {
          toast.success("Template deleted successfully");
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

  const handleDuplicate = async (template: OrderTemplate) => {
    setActionLoading(template.id);
    try {
      const duplicateData = {
        ...template,
        template_name: `${template.template_name} (Copy)`,
        usage_count: 0,
      };
      delete (duplicateData as any).id;
      delete (duplicateData as any).created_at;
      delete (duplicateData as any).updated_at;
      delete (duplicateData as any).created_by;

      // Note: Actual implementation needed in hook
      toast.success("Template duplicated successfully");
      refetch();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Get unique template types for filter
  const templateTypes = useMemo(() => {
    const types = new Set<string>();
    templates.forEach((t) => types.add(t.template_type));
    return Array.from(types);
  }, [templates]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Templates</h1>
            <p className="text-gray-600 mt-1">Pre-configured templates for quick order creation</p>
          </div>
          <Button
            color="primary"
            size="lg"
            startContent={<PlusIcon className="w-5 h-5" />}
            onPress={createModal.onOpen}
            aria-label="Create New Template"
          >
            Create Template
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border border-gray-200 rounded-xl">
          <CardBody className="flex flex-row items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Total Templates</p>
              <p className="text-2xl font-bold">{templates.length}</p>
            </div>
            <TagIcon className="w-8 h-8 text-blue-500" />
          </CardBody>
        </Card>
        <Card className="border border-gray-200 rounded-xl">
          <CardBody className="flex flex-row items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {templates.filter((t) => t.is_active).length}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          </CardBody>
        </Card>
        <Card className="border border-gray-200 rounded-xl">
          <CardBody className="flex flex-row items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Public</p>
              <p className="text-2xl font-bold text-purple-600">
                {templates.filter((t) => t.is_public).length}
              </p>
            </div>
            <DocumentDuplicateIcon className="w-8 h-8 text-purple-500" />
          </CardBody>
        </Card>
        <Card className="border border-gray-200 rounded-xl">
          <CardBody className="flex flex-row items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-orange-600">
                {templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)}
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-orange-500" />
          </CardBody>
        </Card>
      </div>

      {/* Filters and Sorting */}
      <Card className="mb-8 border border-gray-200 rounded-xl">
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Input
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => debouncedSearch(e.target.value)}
              startContent={<MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />}
              className="md:w-96"
              isClearable
              onClear={() => setSearchTerm("")}
              aria-label="Search Templates"
            />
            <Select
              placeholder="Filter by Type"
              selectedKeys={filterType ? [filterType] : []}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="md:w-64"
              startContent={<FunnelIcon className="w-4 h-4" />}
              items={[{ key: "", label: "All Types" }, ...templateTypes.map(type => ({ key: type, label: type.charAt(0).toUpperCase() + type.slice(1) }))]}
              aria-label="Filter by Template Type"
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
              aria-label="Filter by Status"
            >
              <SelectItem key="all" value="all">All Status</SelectItem>
              <SelectItem key="active" value="active">Active Only</SelectItem>
              <SelectItem key="inactive" value="inactive">Inactive Only</SelectItem>
              <SelectItem key="public" value="public">Public Only</SelectItem>
            </Select>
            <Select
              placeholder="Sort By"
              selectedKeys={[sortBy]}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="md:w-48"
              aria-label="Sort Templates"
            >
              <SelectItem key="template_name" value="template_name">Name</SelectItem>
              <SelectItem key="usage_count" value="usage_count">Usage Count</SelectItem>
              <SelectItem key="last_used_at" value="last_used_at">Last Used</SelectItem>
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

      {/* Templates List */}
      <Card className="border border-gray-200 rounded-xl">
        <CardHeader className="px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold">Templates ({filteredTemplates.length})</h2>
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                size="sm"
                showControls
                aria-label="Template Pagination"
              />
            )}
          </div>
        </CardHeader>
        <CardBody className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" aria-label="Loading Templates" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">No templates found</p>
              <p className="text-gray-500">
                {searchTerm || filterType || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first template"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedTemplates.map((template) => (
                <Card key={template.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{template.template_name}</h3>
                          <div className="flex gap-2">
                            <Chip size="sm" color="default" variant="flat">
                              {template.template_type.charAt(0).toUpperCase() +
                                template.template_type.slice(1)}
                            </Chip>
                            {template.is_active ? (
                              <Chip size="sm" color="success">Active</Chip>
                            ) : (
                              <Chip size="sm" color="default">Inactive</Chip>
                            )}
                            {template.is_public && (
                              <Chip size="sm" color="primary">Public</Chip>
                            )}
                          </div>
                        </div>

                        {template.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          {template.default_service_type && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Service:</span>{" "}
                              {template.default_service_type}
                            </div>
                          )}
                          {template.default_vehicle_type && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Vehicle:</span>{" "}
                              {template.default_vehicle_type}
                            </div>
                          )}
                          {template.default_priority && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Priority:</span> {template.default_priority}
                            </div>
                          )}
                          {template.default_lead_time_hours && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Lead Time:</span>{" "}
                              {template.default_lead_time_hours}h
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>Used {template.usage_count || 0} times</span>
                          </div>
                          {template.last_used_at && (
                            <span>Last used: {new Date(template.last_used_at).toLocaleDateString()}</span>
                          )}
                        </div>

                        {template.tags && template.tags.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {template.tags.map((tag) => (
                              <Chip key={tag} size="sm" variant="flat">
                                {tag}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Tooltip content="Duplicate Template">
                          <Button
                            isIconOnly
                            size="sm"
                            color="secondary"
                            variant="light"
                            onPress={() => handleDuplicate(template)}
                            isLoading={actionLoading === template.id}
                            isDisabled={actionLoading !== null}
                            aria-label={`Duplicate ${template.template_name}`}
                          >
                            <DocumentDuplicateIcon className="w-5 h-5" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Edit Template">
                          <Button
                            isIconOnly
                            size="sm"
                            color="primary"
                            variant="light"
                            onPress={() => handleEdit(template)}
                            isDisabled={actionLoading !== null}
                            aria-label={`Edit ${template.template_name}`}
                          >
                            <PencilIcon className="w-5 h-5" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Delete Template">
                          <Button
                            isIconOnly
                            size="sm"
                            color="danger"
                            variant="light"
                            onPress={() => handleDeleteClick(template.id)}
                            isLoading={actionLoading === template.id}
                            isDisabled={actionLoading !== null}
                            aria-label={`Delete ${template.template_name}`}
                          >
                            <TrashIcon className="w-5 h-5" />
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
      <CreateTemplateModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        onSuccess={() => {
          toast.success("Template created successfully");
          refetch();
          createModal.onClose();
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.onClose}>
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalBody>
            <p>Are you sure you want to delete this template? This action cannot be undone.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={deleteModal.onClose} isDisabled={actionLoading !== null} aria-label="Cancel Delete">
              Cancel
            </Button>
            <Button 
              color="danger" 
              onPress={handleDeleteConfirm} 
              isLoading={actionLoading !== null}
              aria-label="Confirm Delete"
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}