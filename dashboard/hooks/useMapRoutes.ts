"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Enhanced interfaces for map routes
export interface MapRoute {
  id: string;
  user_id: string;
  tenant_id?: string;
  order_id?: string;
  route_name?: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  waypoints?: any; // JSONB array of coordinates
  distance_meters?: number;
  duration_seconds?: number;
  route_polyline?: string;
  route_type: 'planned' | 'actual' | 'optimized';
  usage_count: number;
  last_used_at?: string;
  average_speed_kmh?: number;
  route_efficiency_score?: number;
  weather_conditions?: any;
  traffic_conditions?: any;
  driver_notes?: string;
  is_template: boolean;
  template_category?: string;
  created_at: string;
  updated_at: string;
}

export interface RouteSuggestion {
  suggestion_type: 'historical' | 'template';
  route_id: string;
  route_name: string;
  estimated_distance_meters: number;
  estimated_duration_seconds: number;
  confidence_score: number;
  usage_statistics: {
    usage_count?: number;
    last_used?: string;
    efficiency_score?: number;
    template_category?: string;
    created_at?: string;
  };
}

export interface SimilarRoute {
  route_id: string;
  route_name: string;
  distance_meters: number;
  average_duration_seconds: number;
  usage_count: number;
  efficiency_score: number;
  last_used_at: string;
}

// Hook for managing map routes
export function useMapRoutes() {
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async (routeType?: string, isTemplate?: boolean) => {
    try {
      setLoading(true);
      let query = supabase
        .from('map_routes')
        .select('*');

      if (routeType) {
        query = query.eq('route_type', routeType);
      }

      if (isTemplate !== undefined) {
        query = query.eq('is_template', isTemplate);
      }

      const { data, error } = await query
        .order('usage_count', { ascending: false })
        .order('last_used_at', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRoute = useCallback(async (routeData: Partial<MapRoute>) => {
    try {
      const { data, error } = await supabase
        .from('map_routes')
        .insert([routeData])
        .select()
        .single();

      if (error) throw error;
      
      setRoutes(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateRoute = useCallback(async (id: string, updates: Partial<MapRoute>) => {
    try {
      const { data, error } = await supabase
        .from('map_routes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setRoutes(prev => prev.map(r => r.id === id ? data : r));
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const deleteRoute = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('map_routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setRoutes(prev => prev.filter(r => r.id !== id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const saveCompletedRoute = useCallback(async (
    orderId: string,
    routeName?: string,
    actualRoute?: any,
    totalDistanceMeters?: number,
    totalDurationSeconds?: number,
    averageSpeedKmh?: number,
    driverNotes?: string
  ) => {
    try {
      const { data, error } = await supabase
        .rpc('save_completed_route', {
          p_order_id: orderId,
          p_route_name: routeName,
          p_actual_route: actualRoute,
          p_total_distance_meters: totalDistanceMeters,
          p_total_duration_seconds: totalDurationSeconds,
          p_average_speed_kmh: averageSpeedKmh,
          p_driver_notes: driverNotes
        });

      if (error) throw error;
      
      // Refresh routes after saving
      await fetchRoutes();
      
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchRoutes]);

  const createRouteTemplate = useCallback(async (
    baseRouteId: string,
    templateName: string,
    templateCategory: string = 'general'
  ) => {
    try {
      const { data, error } = await supabase
        .rpc('create_route_template', {
          p_base_route_id: baseRouteId,
          p_template_name: templateName,
          p_template_category: templateCategory
        });

      if (error) throw error;
      
      await fetchRoutes();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchRoutes]);

  const findSimilarRoutes = useCallback(async (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    radiusMeters: number = 1000,
    limit: number = 5
  ) => {
    try {
      const { data, error } = await supabase
        .rpc('find_similar_routes', {
          p_origin_lat: originLat,
          p_origin_lng: originLng,
          p_dest_lat: destLat,
          p_dest_lng: destLng,
          p_radius_meters: radiusMeters,
          p_limit: limit
        });

      if (error) throw error;
      return { success: true, data: data as SimilarRoute[] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return {
    routes,
    loading,
    error,
    refetch: fetchRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
    saveCompletedRoute,
    createRouteTemplate,
    findSimilarRoutes
  };
}

// Hook for route suggestions during order creation
export function useRouteSuggestions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRouteSuggestions = useCallback(async (
    loadingLat: number,
    loadingLng: number,
    unloadingLat: number,
    unloadingLng: number
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .rpc('get_route_suggestions_for_order', {
          p_loading_lat: loadingLat,
          p_loading_lng: loadingLng,
          p_unloading_lat: unloadingLat,
          p_unloading_lng: unloadingLng
        });

      if (error) throw error;
      
      return { success: true, data: data as RouteSuggestion[] };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getRouteSuggestions,
    loading,
    error
  };
}

// Hook for route templates management
export function useRouteTemplates() {
  const [templates, setTemplates] = useState<MapRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (category?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('map_routes')
        .select('*')
        .eq('is_template', true);

      if (category) {
        query = query.eq('template_category', category);
      }

      const { data, error } = await query
        .order('usage_count', { ascending: false })
        .order('route_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (templateData: Partial<MapRoute>) => {
    try {
      const { data, error } = await supabase
        .from('map_routes')
        .insert([{ ...templateData, is_template: true }])
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: Partial<MapRoute>) => {
    try {
      const { data, error } = await supabase
        .from('map_routes')
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

  const incrementTemplateUsage = useCallback(async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('map_routes')
        .update({ 
          usage_count: supabase.rpc('increment', { step: 1 }),
          last_used_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (error) throw error;
      
      // Refresh templates to get updated usage count
      await fetchTemplates();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchTemplates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    incrementTemplateUsage
  };
}

// Hook for route analytics and statistics
export function useRouteAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRouteAnalytics = useCallback(async (timeRange: 'week' | 'month' | 'year' = 'month') => {
    try {
      setLoading(true);
      setError(null);

      let dateFilter = 'NOW() - INTERVAL \'1 month\'';
      if (timeRange === 'week') dateFilter = 'NOW() - INTERVAL \'1 week\'';
      if (timeRange === 'year') dateFilter = 'NOW() - INTERVAL \'1 year\'';

      const { data, error } = await supabase
        .from('map_routes')
        .select(`
          route_type,
          distance_meters,
          duration_seconds,
          average_speed_kmh,
          route_efficiency_score,
          template_category,
          created_at
        `)
        .gte('created_at', dateFilter);

      if (error) throw error;

      // Process analytics data
      const processedAnalytics = {
        totalRoutes: data.length,
        routeTypes: data.reduce((acc: any, route: any) => {
          acc[route.route_type] = (acc[route.route_type] || 0) + 1;
          return acc;
        }, {}),
        averageDistance: data.reduce((sum: number, route: any) => sum + (route.distance_meters || 0), 0) / data.length,
        averageDuration: data.reduce((sum: number, route: any) => sum + (route.duration_seconds || 0), 0) / data.length,
        averageSpeed: data.reduce((sum: number, route: any) => sum + (route.average_speed_kmh || 0), 0) / data.length,
        templateCategories: data.reduce((acc: any, route: any) => {
          if (route.template_category) {
            acc[route.template_category] = (acc[route.template_category] || 0) + 1;
          }
          return acc;
        }, {}),
        efficiencyDistribution: data.map((route: any) => route.route_efficiency_score).filter(Boolean),
        timeRange
      };

      setAnalytics(processedAnalytics);
      return { success: true, data: processedAnalytics };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getMostUsedRoutes = useCallback(async (limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('map_routes')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const getRouteEfficiencyStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('map_routes')
        .select('route_efficiency_score, average_speed_kmh, duration_seconds, distance_meters')
        .not('route_efficiency_score', 'is', null);

      if (error) throw error;

      const stats = {
        averageEfficiency: data.reduce((sum, route) => sum + route.route_efficiency_score, 0) / data.length,
        topEfficiencyRoutes: data.sort((a, b) => b.route_efficiency_score - a.route_efficiency_score).slice(0, 5),
        efficiencyTrends: data.map(route => ({
          efficiency: route.route_efficiency_score,
          speed: route.average_speed_kmh,
          timePerKm: route.duration_seconds / (route.distance_meters / 1000)
        }))
      };

      return { success: true, data: stats };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  return {
    analytics,
    loading,
    error,
    getRouteAnalytics,
    getMostUsedRoutes,
    getRouteEfficiencyStats
  };
}