// src/shared/utils.ts
import type { OrderStatus } from '../../../shared/types';

export const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending: '#6B7280',
    assigned: '#3B82F6',
    in_transit: '#8B5CF6',
    arrived: '#10B981',
    loading: '#F59E0B',
    loaded: '#10B981',
    unloading: '#F59E0B',
    completed: '#059669',
    cancelled: '#EF4444',
  };
  return colors[status] ?? '#6B7280';
};