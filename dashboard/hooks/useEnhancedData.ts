"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Enhanced interfaces for the new system
export interface EnhancedTransporter {
  id: string;
  tenant_id: string;
  name: string;
  company_name?: string;
  registration_number?: string;
  tax_id?: string;
  
  // Contact Information
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  secondary_contact_name?: string;
  secondary_contact_phone?: string;
  secondary_contact_email?: string;
  
  // Address Information
  business_address?: string;
  business_city?: string;
  business_state?: string;
  business_postal_code?: string;
  business_country?: string;
  
  // Service Details
  service_types?: string[];
  coverage_areas?: string[];
  vehicle_types?: string[];
  max_capacity_kg?: number;
  max_volume_m3?: number;
  
  // Pricing Information
  base_rate_per_km?: number;
  base_rate_per_hour?: number;
  fuel_surcharge_rate?: number;
  minimum_charge?: number;
  currency?: string;
  
  // Operational Details
  operating_hours?: Record<string, { start: string; end: string }>;
  available_days?: number[];
  lead_time_hours?: number;
  
  // Quality & Compliance
  insurance_details?: Record<string, any>;
  certifications?: string[];
  compliance_documents?: Record<string, any>;
  performance_rating?: number;
  
  // Status and Preferences
  is_active: boolean;
  is_preferred: boolean;
  auto_assign_eligible: boolean;
  priority_level: number;
  
  // Metadata
  tags?: string[];
  notes?: string;
  metadata?: Record<string, any>;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EnhancedContact {
  id: string;
  tenant_id: string;
  
  // Basic Information
  first_name: string;
  last_name: string;
  full_name: string;
  company_name?: string;
  job_title?: string;
  department?: string;
  
  // Contact Methods
  primary_phone?: string;
  secondary_phone?: string;
  mobile_phone?: string;
  primary_email?: string;
  secondary_email?: string;
  fax?: string;
  
  // Address Information
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  
  // Contact Preferences
  preferred_contact_method: string;
  best_contact_times?: Record<string, any>;
  language_preference: string;
  timezone?: string;
  
  // Contact Type and Categories
  contact_type: string;
  categories?: string[];
  relationship_type?: string;
  
  // Customer/Supplier Specific
  customer_id?: string;
  supplier_id?: string;
  account_number?: string;
  credit_limit?: number;
  payment_terms?: string;
  
  // Status and Metadata
  is_active: boolean;
  is_primary: boolean;
  tags?: string[];
  notes?: string;
  metadata?: Record<string, any>;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EnhancedGeofence {
  id: string;
  tenant_id: string;
  
  // Basic Information
  name: string;
  description?: string;
  geofence_type: string;
  
  // Geographic Data
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  shape_type: string;
  polygon_coordinates?: Record<string, any>;
  
  // Location Details
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  landmark?: string;
  access_instructions?: string;
  
  // Operational Information
  operating_hours?: Record<string, any>;
  access_restrictions?: string;
  contact_person?: string;
  contact_phone?: string;
  facility_type?: string;
  
  // Business Rules
  auto_trigger_status?: string;
  trigger_event: string;
  notification_enabled: boolean;
  alert_enabled: boolean;
  
  // Categorization and Search
  categories?: string[];
  tags?: string[];
  business_unit?: string;
  region?: string;
  zone?: string;
  
  // Usage Statistics
  usage_count: number;
  last_used_at?: string;
  
  // Status and Metadata
  is_active: boolean;
  is_template: boolean;
  priority_level: number;
  notes?: string;
  metadata?: Record<string, any>;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderTemplate {
  id: string;
  tenant_id: string;
  
  // Template Information
  template_name: string;
  description?: string;
  template_type: string;
  
  // Pre-configured Order Data
  default_transporter_id?: string;
  default_customer_contact_id?: string;
  default_loading_contact_id?: string;
  default_unloading_contact_id?: string;
  
  // Default Locations
  default_loading_geofence_id?: string;
  default_unloading_geofence_id?: string;
  
  // Service Configuration
  default_service_type?: string;
  default_vehicle_type?: string;
  default_priority?: string;
  
  // Default Time Windows
  default_loading_time_window?: Record<string, any>;
  default_unloading_time_window?: Record<string, any>;
  default_lead_time_hours?: number;
  
  // Instructions and Notes
  default_loading_instructions?: string;
  default_unloading_instructions?: string;
  default_special_instructions?: string;
  default_delivery_instructions?: string;
  
  // Pre-filled Fields Configuration
  auto_populate_fields?: Record<string, any>;
  field_mapping?: Record<string, any>;
  
  // Usage and Management
  usage_count: number;
  last_used_at?: string;
  is_active: boolean;
  is_public: boolean;
  
  // Metadata
  tags?: string[];
  metadata?: Record<string, any>;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderCreationSuggestions {
  transporters: Array<{
    id: string;
    name: string;
    score: number;
    reason: string;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    company?: string;
    contact_type: string;
    phone?: string;
    email?: string;
  }>;
  geofences: Array<{
    id: string;
    name: string;
    type: string;
    address?: string;
    usage_count: number;
    latitude: number;
    longitude: number;
    radius: number;
  }>;
  templates: Array<{
    id: string;
    name: string;
    description?: string;
    type: string;
    usage_count: number;
  }>;
  generated_at: string;
}

// Hook for managing transporters
export function useTransporters() {
  const [transporters, setTransporters] = useState<EnhancedTransporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransporters = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transporters')
        .select('*')
        .eq('is_active', true)
        .order('priority_level', { ascending: false });

      if (error) throw error;
      setTransporters(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTransporter = useCallback(async (transporterData: Partial<EnhancedTransporter>) => {
    try {
      // Get authenticated user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found or unauthorized');
      }

      // Add tenant_id to the transporter data
      const dataWithTenant = {
        ...transporterData,
        tenant_id: userData.tenant_id
      };

      const { data, error } = await supabase
        .from('transporters')
        .insert([dataWithTenant])
        .select()
        .single();

      if (error) throw error;
      
      setTransporters(prev => [...prev, data]);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateTransporter = useCallback(async (id: string, updates: Partial<EnhancedTransporter>) => {
    try {
      const { data, error } = await supabase
        .from('transporters')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setTransporters(prev => prev.map(t => t.id === id ? data : t));
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const deleteTransporter = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('transporters')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      setTransporters(prev => prev.filter(t => t.id !== id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const getSuggestedTransporters = useCallback(async (
    serviceType?: string,
    coverageArea?: string,
    vehicleType?: string
  ) => {
    try {
      const { data, error } = await supabase
        .rpc('suggest_best_transporter', {
          p_tenant_id: null, // Will be handled by RLS
          p_service_type: serviceType,
          p_coverage_area: coverageArea,
          p_vehicle_type: vehicleType
        });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    fetchTransporters();
  }, [fetchTransporters]);

  return {
    transporters,
    loading,
    error,
    refetch: fetchTransporters,
    createTransporter,
    updateTransporter,
    deleteTransporter,
    getSuggestedTransporters
  };
}

// Hook for managing contacts
export function useContacts() {
  const [contacts, setContacts] = useState<EnhancedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async (contactType?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('contacts')
        .select('*')
        .eq('is_active', true);

      if (contactType) {
        query = query.eq('contact_type', contactType);
      }

      const { data, error } = await query.order('full_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createContact = useCallback(async (contactData: Partial<EnhancedContact>) => {
    try {
      // Get authenticated user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found or unauthorized');
      }

      // Add tenant_id to the contact data
      const dataWithTenant = {
        ...contactData,
        tenant_id: userData.tenant_id
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert([dataWithTenant])
        .select()
        .single();

      if (error) throw error;
      
      setContacts(prev => [...prev, data]);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateContact = useCallback(async (id: string, updates: Partial<EnhancedContact>) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setContacts(prev => prev.map(c => c.id === id ? data : c));
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const searchContacts = useCallback(async (searchTerm: string, contactType?: string) => {
    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .eq('is_active', true);

      if (contactType) {
        query = query.eq('contact_type', contactType);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,primary_email.ilike.%${searchTerm}%,primary_phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query
        .order('is_primary', { ascending: false })
        .order('full_name')
        .limit(50);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    refetch: fetchContacts,
    createContact,
    updateContact,
    searchContacts
  };
}

// Hook for managing enhanced geofences
export function useEnhancedGeofences() {
  const [geofences, setGeofences] = useState<EnhancedGeofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGeofences = useCallback(async (geofenceType?: string) => {
    try {
      setLoading(true);
      
      // Try enhanced_geofences first
      let query = supabase
        .from('enhanced_geofences')
        .select('*')
        .eq('is_active', true);

      if (geofenceType) {
        query = query.eq('geofence_type', geofenceType);
      }

      const { data: enhancedData, error: enhancedError } = await query
        .order('usage_count', { ascending: false })
        .order('name');

      // If enhanced_geofences has data, use it
      if (!enhancedError && enhancedData && enhancedData.length > 0) {
        setGeofences(enhancedData);
      } else {
        // Fallback to regular geofences table
        console.log('No enhanced_geofences found, using regular geofences table');
        const { data: regularData, error: regularError } = await supabase
          .from('geofences')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (regularError) throw regularError;
        
        // Map regular geofences to enhanced format
        const mappedGeofences = (regularData || []).map((g: any) => {
          // Parse PostGIS POINT if needed
          let latitude = g.latitude || 0;
          let longitude = g.longitude || 0;
          
          if (g.location && typeof g.location === 'string') {
            const match = g.location.match(/POINT\(([^)]+)\)/);
            if (match) {
              [longitude, latitude] = match[1].split(" ").map(Number);
            }
          }
          
          return {
            id: g.id,
            tenant_id: g.tenant_id,
            name: g.name,
            description: g.description,
            geofence_type: g.geofence_type || 'custom',
            center_latitude: latitude,
            center_longitude: longitude,
            radius_meters: g.radius_meters || 100,
            shape_type: 'circle',
            is_active: g.is_active,
            usage_count: 0,
            created_at: g.created_at,
            updated_at: g.updated_at,
            is_template: false,
            priority_level: 1,
            trigger_event: 'entry',
            notification_enabled: false,
            alert_enabled: false
          } as EnhancedGeofence;
        });
        
        setGeofences(mappedGeofences);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createGeofence = useCallback(async (geofenceData: Partial<EnhancedGeofence>) => {
    try {
      // Get authenticated user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found or unauthorized');
      }

      // Try to insert into enhanced_geofences first
      const enhancedData = {
        ...geofenceData,
        tenant_id: userData.tenant_id
      };

      const { data: enhancedResult, error: enhancedError } = await supabase
        .from('enhanced_geofences')
        .insert([enhancedData])
        .select()
        .single();

      if (!enhancedError && enhancedResult) {
        setGeofences(prev => [...prev, enhancedResult]);
        return { success: true, data: enhancedResult };
      }

      // Fallback to regular geofences table
      console.log('Enhanced geofences insert failed, using regular geofences table:', enhancedError);
      
      const regularData = {
        tenant_id: userData.tenant_id,
        name: geofenceData.name,
        description: geofenceData.description,
        latitude: geofenceData.center_latitude,
        longitude: geofenceData.center_longitude,
        radius_meters: geofenceData.radius_meters || 100,
        is_active: geofenceData.is_active !== false,
        geofence_type: geofenceData.geofence_type
      };

      const { data, error } = await supabase
        .from('geofences')
        .insert([regularData])
        .select()
        .single();

      if (error) throw error;
      
      // Map back to enhanced format
      const mappedData: EnhancedGeofence = {
        id: data.id,
        tenant_id: data.tenant_id,
        name: data.name,
        description: data.description,
        geofence_type: data.geofence_type || 'custom',
        center_latitude: data.latitude || 0,
        center_longitude: data.longitude || 0,
        radius_meters: data.radius_meters || 100,
        shape_type: 'circle',
        is_active: data.is_active,
        usage_count: 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_template: false,
        priority_level: 1,
        trigger_event: 'entry',
        notification_enabled: false,
        alert_enabled: false
      };
      
      setGeofences(prev => [...prev, mappedData]);
      return { success: true, data: mappedData };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateGeofence = useCallback(async (id: string, updates: Partial<EnhancedGeofence>) => {
    try {
      // Try enhanced_geofences first
      const { data: enhancedData, error: enhancedError } = await supabase
        .from('enhanced_geofences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (!enhancedError && enhancedData) {
        setGeofences(prev => prev.map(g => g.id === id ? enhancedData : g));
        return { success: true, data: enhancedData };
      }

      // Fallback to regular geofences table
      const regularUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.name) regularUpdates.name = updates.name;
      if (updates.description) regularUpdates.description = updates.description;
      if (updates.center_latitude) regularUpdates.latitude = updates.center_latitude;
      if (updates.center_longitude) regularUpdates.longitude = updates.center_longitude;
      if (updates.radius_meters) regularUpdates.radius_meters = updates.radius_meters;
      if (updates.is_active !== undefined) regularUpdates.is_active = updates.is_active;
      if (updates.geofence_type) regularUpdates.geofence_type = updates.geofence_type;

      const { data, error } = await supabase
        .from('geofences')
        .update(regularUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Map back to enhanced format
      const mappedData: EnhancedGeofence = {
        id: data.id,
        tenant_id: data.tenant_id,
        name: data.name,
        description: data.description,
        geofence_type: data.geofence_type || 'custom',
        center_latitude: data.latitude || 0,
        center_longitude: data.longitude || 0,
        radius_meters: data.radius_meters || 100,
        shape_type: 'circle',
        is_active: data.is_active,
        usage_count: 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_template: false,
        priority_level: 1,
        trigger_event: 'entry',
        notification_enabled: false,
        alert_enabled: false
      };
      
      setGeofences(prev => prev.map(g => g.id === id ? mappedData : g));
      return { success: true, data: mappedData };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const searchGeofences = useCallback(async (searchTerm: string, filters?: {
    type?: string;
    category?: string;
    region?: string;
  }) => {
    try {
      // Try enhanced_geofences first
      let query = supabase
        .from('enhanced_geofences')
        .select('*')
        .eq('is_active', true);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
      }

      if (filters?.type) {
        query = query.eq('geofence_type', filters.type);
      }

      if (filters?.category) {
        query = query.contains('categories', [filters.category]);
      }

      if (filters?.region) {
        query = query.eq('region', filters.region);
      }

      const { data: enhancedData, error: enhancedError } = await query
        .order('usage_count', { ascending: false })
        .order('name')
        .limit(100);

      if (!enhancedError && enhancedData && enhancedData.length > 0) {
        return { success: true, data: enhancedData };
      }

      // Fallback to regular geofences table
      let regularQuery = supabase
        .from('geofences')
        .select('*')
        .eq('is_active', true);

      if (searchTerm) {
        regularQuery = regularQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (filters?.type) {
        regularQuery = regularQuery.eq('geofence_type', filters.type);
      }

      const { data: regularData, error: regularError } = await regularQuery
        .order('name')
        .limit(100);

      if (regularError) throw regularError;

      // Map regular geofences to enhanced format
      const mappedGeofences = (regularData || []).map((g: any) => {
        let latitude = g.latitude || 0;
        let longitude = g.longitude || 0;
        
        if (g.location && typeof g.location === 'string') {
          const match = g.location.match(/POINT\(([^)]+)\)/);
          if (match) {
            [longitude, latitude] = match[1].split(" ").map(Number);
          }
        }
        
        return {
          id: g.id,
          tenant_id: g.tenant_id,
          name: g.name,
          description: g.description,
          geofence_type: g.geofence_type || 'custom',
          center_latitude: latitude,
          center_longitude: longitude,
          radius_meters: g.radius_meters || 100,
          shape_type: 'circle',
          is_active: g.is_active,
          usage_count: 0,
          created_at: g.created_at,
          updated_at: g.updated_at,
          is_template: false,
          priority_level: 1,
          trigger_event: 'entry',
          notification_enabled: false,
          alert_enabled: false
        } as EnhancedGeofence;
      });

      return { success: true, data: mappedGeofences };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  return {
    geofences,
    loading,
    error,
    refetch: fetchGeofences,
    createGeofence,
    updateGeofence,
    searchGeofences
  };
}

// Hook for managing order templates
export function useOrderTemplates() {
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_templates')
        .select(`
          *,
          default_transporter:transporters(name),
          default_customer_contact:contacts(full_name, company_name),
          default_loading_geofence:enhanced_geofences(name, address),
          default_unloading_geofence:enhanced_geofences(name, address)
        `)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (templateData: Partial<OrderTemplate>) => {
    try {
      // Get authenticated user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found or unauthorized');
      }

      // Add tenant_id to the template data
      const dataWithTenant = {
        ...templateData,
        tenant_id: userData.tenant_id
      };

      const { data, error } = await supabase
        .from('order_templates')
        .insert([dataWithTenant])
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => [...prev, data]);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: Partial<OrderTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('order_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => prev.map(t => t.id === id ? data : t));
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate
  };
}

// Hook for getting comprehensive order creation suggestions
export function useOrderCreationSuggestions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = useCallback(async (params?: {
    customerName?: string;
    loadingLocation?: string;
    unloadingLocation?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .rpc('get_order_creation_suggestions', {
          p_tenant_id: null, // Will be handled by RLS
          p_customer_name: params?.customerName,
          p_loading_location: params?.loadingLocation,
          p_unloading_location: params?.unloadingLocation
        });

      if (error) throw error;
      
      return { success: true, data: data as OrderCreationSuggestions };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getSuggestions,
    loading,
    error
  };
}