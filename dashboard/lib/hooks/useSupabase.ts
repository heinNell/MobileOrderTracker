import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { formatErrorMessage } from '../utils/api-helpers';

interface UseSupabaseState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for Supabase operations with loading and error states
 */
export function useSupabase<T = any>() {
  const [state, setState] = useState<UseSupabaseState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async <R = T>(
    operation: () => Promise<R>
  ): Promise<R | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await operation();
      setState(prev => ({ ...prev, data: result as unknown as T, loading: false }));
      return result;
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, []);

  const resetState = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    resetState,
    supabase,
  };
}
