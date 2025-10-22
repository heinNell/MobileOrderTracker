// Excel export utilities for orders
import * as XLSX from 'xlsx';
import type { Order } from '../shared/types';

/**
 * Export orders to Excel format
 */
export function exportOrdersToExcel(orders: Order[], filename?: string) {
  try {
    // Prepare data for Excel
    const excelData = orders.map(order => ({
      'Order Number': order.order_number,
      'SKU': order.sku || 'N/A',
      'Status': order.status.toUpperCase(),
      'Driver': order.assigned_driver?.full_name || 'Unassigned',
      'Customer Contact': order.contact_name || 'N/A',
      'Customer Phone': order.contact_phone || 'N/A',
      'Expected Loading Date': order.expected_loading_date 
        ? new Date(order.expected_loading_date).toLocaleDateString() 
        : 'Not Set',
      'Expected Unloading Date': order.expected_unloading_date 
        ? new Date(order.expected_unloading_date).toLocaleDateString() 
        : 'Not Set',
      'Loading Point': order.loading_point_name,
      'Loading Address': order.loading_point_address,
      'Unloading Point': order.unloading_point_name,
      'Unloading Address': order.unloading_point_address,
      'Distance (km)': order.estimated_distance_km || 'N/A',
      'Duration (min)': order.estimated_duration_minutes || 'N/A',
      'Transporter': order.transporter_supplier?.name || 'N/A',
      'Transporter Phone': order.transporter_supplier?.contact_phone || 'N/A',
      'Transporter Cost': order.transporter_supplier?.cost_amount 
        ? `${order.transporter_supplier.cost_currency || 'USD'} ${order.transporter_supplier.cost_amount.toFixed(2)}`
        : 'N/A',
      'Delivery Instructions': order.delivery_instructions || 'None',
      'Special Instructions': order.special_handling_instructions || 'None',
      'Load Activated At': order.load_activated_at 
        ? new Date(order.load_activated_at).toLocaleString() 
        : 'Not Activated',
      'Started At': order.actual_start_time 
        ? new Date(order.actual_start_time).toLocaleString() 
        : 'Not Started',
      'Completed At': order.actual_end_time 
        ? new Date(order.actual_end_time).toLocaleString() 
        : 'Not Completed',
      'Created At': new Date(order.created_at).toLocaleString(),
      'Updated At': new Date(order.updated_at).toLocaleString(),
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 15 }, // Order Number
      { wch: 12 }, // SKU
      { wch: 12 }, // Status
      { wch: 20 }, // Driver
      { wch: 20 }, // Customer Contact
      { wch: 15 }, // Customer Phone
      { wch: 18 }, // Expected Loading Date
      { wch: 20 }, // Expected Unloading Date
      { wch: 25 }, // Loading Point
      { wch: 40 }, // Loading Address
      { wch: 25 }, // Unloading Point
      { wch: 40 }, // Unloading Address
      { wch: 12 }, // Distance
      { wch: 12 }, // Duration
      { wch: 25 }, // Transporter
      { wch: 15 }, // Transporter Phone
      { wch: 15 }, // Transporter Cost
      { wch: 30 }, // Delivery Instructions
      { wch: 30 }, // Special Instructions
      { wch: 20 }, // Load Activated At
      { wch: 20 }, // Started At
      { wch: 20 }, // Completed At
      { wch: 20 }, // Created At
      { wch: 20 }, // Updated At
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // Generate filename
    const exportFilename = filename || `Orders_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, exportFilename);

    return {
      success: true,
      filename: exportFilename,
      recordCount: orders.length,
    };
  } catch (error: any) {
    console.error('Excel export error:', error);
    throw new Error(`Failed to export to Excel: ${error.message}`);
  }
}

/**
 * Export a single order to Excel format with detailed information
 */
export function exportOrderDetailToExcel(order: Order, filename?: string) {
  try {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Order Summary
    const summaryData = [
      ['Order Number', order.order_number],
      ['SKU', order.sku || 'N/A'],
      ['Status', order.status.toUpperCase()],
      ['Driver', order.assigned_driver?.full_name || 'Unassigned'],
      ['Driver Email', order.assigned_driver?.email || 'N/A'],
      ['Customer Contact', order.contact_name || 'N/A'],
      ['Customer Phone', order.contact_phone || 'N/A'],
      [''],
      ['DATES'],
      ['Expected Loading Date', order.expected_loading_date || 'Not Set'],
      ['Expected Unloading Date', order.expected_unloading_date || 'Not Set'],
      ['Load Activated At', order.load_activated_at ? new Date(order.load_activated_at).toLocaleString() : 'Not Activated'],
      ['Started At', order.actual_start_time ? new Date(order.actual_start_time).toLocaleString() : 'Not Started'],
      ['Completed At', order.actual_end_time ? new Date(order.actual_end_time).toLocaleString() : 'Not Completed'],
      ['Created At', new Date(order.created_at).toLocaleString()],
      ['Updated At', new Date(order.updated_at).toLocaleString()],
      [''],
      ['LOADING POINT'],
      ['Name', order.loading_point_name],
      ['Address', order.loading_point_address],
      [''],
      ['UNLOADING POINT'],
      ['Name', order.unloading_point_name],
      ['Address', order.unloading_point_address],
      [''],
      ['ROUTE INFORMATION'],
      ['Estimated Distance (km)', order.estimated_distance_km || 'N/A'],
      ['Estimated Duration (min)', order.estimated_duration_minutes || 'N/A'],
      [''],
      ['TRANSPORTER'],
      ['Name', order.transporter_supplier?.name || 'N/A'],
      ['Phone', order.transporter_supplier?.contact_phone || 'N/A'],
      ['Email', order.transporter_supplier?.contact_email || 'N/A'],
      ['Cost Amount', order.transporter_supplier?.cost_amount || 'N/A'],
      ['Currency', order.transporter_supplier?.cost_currency || 'N/A'],
      ['Notes', order.transporter_supplier?.notes || 'N/A'],
      [''],
      ['INSTRUCTIONS'],
      ['Delivery Instructions', order.delivery_instructions || 'None'],
      ['Special Handling', order.special_handling_instructions || 'None'],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Order Details');

    // Generate filename
    const exportFilename = filename || `Order_${order.order_number}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, exportFilename);

    return {
      success: true,
      filename: exportFilename,
    };
  } catch (error: any) {
    console.error('Excel export error:', error);
    throw new Error(`Failed to export order to Excel: ${error.message}`);
  }
}
