import jsPDF from "jspdf";
import QRCode from "qrcode";
import { parsePostGISPoint } from "../shared/locationUtils";
import type { Order } from "../shared/types";

export interface PDFExportOptions {
  includeQR?: boolean;
  includeTransporter?: boolean;
  includeMap?: boolean;
  companyLogo?: string;
  companyName?: string;
  companyAddress?: string;
}

export class OrderPDFExporter {
  private pdf: jsPDF;
  private pageHeight: number = 297; // A4 height in mm
  private pageWidth: number = 210; // A4 width in mm
  private margin: number = 20;
  private currentY: number = 20;
  private lineHeight: number = 7;

  constructor() {
    this.pdf = new jsPDF("p", "mm", "a4");
  }

  async exportOrderToPDF(
    order: Order,
    options: PDFExportOptions = {}
  ): Promise<Blob> {
    this.currentY = this.margin;

    // Add header
    await this.addHeader(options);

    // Add order information
    this.addOrderDetails(order);

    // Add transporter information if available
    if (options.includeTransporter && order.transporter_supplier) {
      this.addTransporterDetails(order.transporter_supplier);
    }

    // Add location details
    this.addLocationDetails(order);

    // Add QR code if requested
    if (options.includeQR) {
      await this.addQRCode(order);
    }

    // Add footer
    this.addFooter();

    return this.pdf.output("blob");
  }

  private async addHeader(options: PDFExportOptions): Promise<void> {
    // Company logo space (if provided)
    if (options.companyLogo) {
      // Add logo implementation here if needed
      this.currentY += 20;
    }

    // Company name and details
    this.pdf.setFontSize(20);
    this.pdf.setFont("helvetica", "bold");
    const companyName = options.companyName || "Matanuska Load Confirmation";
    this.pdf.text(companyName, this.margin, this.currentY);
    this.currentY += 10;

    if (options.companyAddress) {
      this.pdf.setFontSize(10);
      this.pdf.setFont("helvetica", "normal");
      this.pdf.text(options.companyAddress, this.margin, this.currentY);
      this.currentY += 8;
    }

    // Title
    this.pdf.setFontSize(16);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("ORDER DETAILS", this.margin, this.currentY);
    this.currentY += 15;

    // Separator line
    this.pdf.setLineWidth(0.5);
    this.pdf.line(
      this.margin,
      this.currentY,
      this.pageWidth - this.margin,
      this.currentY
    );
    this.currentY += 10;
  }

  private addOrderDetails(order: Order): void {
    this.pdf.setFontSize(12);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Order Information", this.margin, this.currentY);
    this.currentY += 8;

    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(10);

    const orderDetails = [
      ["Order Number:", order.order_number],
      ["SKU:", order.sku || "N/A"],
      ["Status:", order.status.toUpperCase()],
      ["Created Date:", new Date(order.created_at).toLocaleDateString()],
      [
        "Estimated Distance:",
        order.estimated_distance_km
          ? `${order.estimated_distance_km} km`
          : "N/A",
      ],
      [
        "Estimated Duration:",
        order.estimated_duration_minutes
          ? `${order.estimated_duration_minutes} minutes`
          : "N/A",
      ],
      [
        "Rate:",
        order.rate && order.rate_currency
          ? `${order.rate_currency} ${order.rate.toFixed(2)}`
          : "N/A",
      ],
    ];

    if (order.assigned_driver?.full_name) {
      orderDetails.push(["Assigned Driver:", order.assigned_driver.full_name]);
    }

    if (order.contact_name || order.contact_phone) {
      orderDetails.push([
        "Contact:",
        `${order.contact_name || ""} ${order.contact_phone || ""}`.trim(),
      ]);
    }

    orderDetails.forEach(([label, value]) => {
      this.pdf.setFont("helvetica", "bold");
      this.pdf.text(String(label), this.margin, this.currentY);
      this.pdf.setFont("helvetica", "normal");
      this.pdf.text(String(value), this.margin + 40, this.currentY);
      this.currentY += this.lineHeight;
    });

    this.currentY += 5;

    // Instructions if available
    if (order.delivery_instructions || order.special_handling_instructions) {
      this.pdf.setFont("helvetica", "bold");
      this.pdf.text("Instructions:", this.margin, this.currentY);
      this.currentY += this.lineHeight;

      this.pdf.setFont("helvetica", "normal");
      if (order.delivery_instructions) {
        const lines = this.pdf.splitTextToSize(
          `Delivery: ${order.delivery_instructions}`,
          this.pageWidth - 2 * this.margin
        );
        this.pdf.text(lines, this.margin, this.currentY);
        this.currentY += lines.length * this.lineHeight;
      }

      if (order.special_handling_instructions) {
        const lines = this.pdf.splitTextToSize(
          `Special Handling: ${order.special_handling_instructions}`,
          this.pageWidth - 2 * this.margin
        );
        this.pdf.text(lines, this.margin, this.currentY);
        this.currentY += lines.length * this.lineHeight;
      }
    }

    this.currentY += 10;
  }

  private addTransporterDetails(
    transporter: NonNullable<Order["transporter_supplier"]>
  ): void {
    this.checkPageBreak(40);

    this.pdf.setFontSize(12);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text(
      "Transporter Supplier Information",
      this.margin,
      this.currentY
    );
    this.currentY += 8;

    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(10);

    const transporterDetails = [
      ["Company Name:", transporter.name],
      ["Phone:", transporter.contact_phone || "N/A"],
      ["Email:", transporter.contact_email || "N/A"],
    ];

    if (transporter.cost_amount && transporter.cost_currency) {
      transporterDetails.push([
        "Cost:",
        `${transporter.cost_currency} ${transporter.cost_amount.toFixed(2)}`,
      ]);
    }

    transporterDetails.forEach(([label, value]) => {
      this.pdf.setFont("helvetica", "bold");
      this.pdf.text(String(label), this.margin, this.currentY);
      this.pdf.setFont("helvetica", "normal");
      this.pdf.text(String(value), this.margin + 40, this.currentY);
      this.currentY += this.lineHeight;
    });

    if (transporter.notes) {
      this.currentY += 3;
      this.pdf.setFont("helvetica", "bold");
      this.pdf.text("Notes:", this.margin, this.currentY);
      this.currentY += this.lineHeight;

      this.pdf.setFont("helvetica", "normal");
      const lines = this.pdf.splitTextToSize(
        transporter.notes,
        this.pageWidth - 2 * this.margin
      );
      this.pdf.text(lines, this.margin, this.currentY);
      this.currentY += lines.length * this.lineHeight;
    }

    this.currentY += 10;
  }

  private addLocationDetails(order: Order): void {
    this.checkPageBreak(60);

    // Loading Point
    this.pdf.setFontSize(12);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Loading Point", this.margin, this.currentY);
    this.currentY += 8;

    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(10);

    const loadingDetails = [
      ["Name:", order.loading_point_name],
      ["Address:", order.loading_point_address],
    ];

    // Parse coordinates if available
    try {
      if (typeof order.loading_point_location === "string") {
        const coords = parsePostGISPoint(order.loading_point_location);
        loadingDetails.push([
          "Coordinates:",
          `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
        ]);
      }
    } catch (error) {
      // Ignore coordinate parsing errors
    }

    if (order.expected_loading_date) {
      loadingDetails.push([
        "Expected Loading Date:",
        new Date(order.expected_loading_date).toLocaleString(),
      ]);
    }

    if (order.loading_time_window_start && order.loading_time_window_end) {
      loadingDetails.push([
        "Time Window:",
        `${order.loading_time_window_start} - ${order.loading_time_window_end}`,
      ]);
    }

    loadingDetails.forEach(([label, value]) => {
      this.pdf.setFont("helvetica", "bold");
      this.pdf.text(String(label), this.margin, this.currentY);
      this.pdf.setFont("helvetica", "normal");
      const lines = this.pdf.splitTextToSize(
        String(value),
        this.pageWidth - this.margin - 40
      );
      this.pdf.text(lines, this.margin + 40, this.currentY);
      this.currentY += Math.max(1, lines.length) * this.lineHeight;
    });

    this.currentY += 8;

    // Unloading Point
    this.checkPageBreak(40);

    this.pdf.setFontSize(12);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text("Unloading Point (Destination)", this.margin, this.currentY);
    this.currentY += 8;

    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(10);

    const unloadingDetails = [
      ["Name:", order.unloading_point_name],
      ["Address:", order.unloading_point_address],
    ];

    // Parse coordinates if available
    try {
      if (typeof order.unloading_point_location === "string") {
        const coords = parsePostGISPoint(order.unloading_point_location);
        unloadingDetails.push([
          "Coordinates:",
          `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
        ]);
      }
    } catch (error) {
      // Ignore coordinate parsing errors
    }

    if (order.expected_unloading_date) {
      unloadingDetails.push([
        "Expected Unloading Date:",
        new Date(order.expected_unloading_date).toLocaleString(),
      ]);
    }

    if (order.unloading_time_window_start && order.unloading_time_window_end) {
      unloadingDetails.push([
        "Time Window:",
        `${order.unloading_time_window_start} - ${order.unloading_time_window_end}`,
      ]);
    }

    unloadingDetails.forEach(([label, value]) => {
      this.pdf.setFont("helvetica", "bold");
      this.pdf.text(String(label), this.margin, this.currentY);
      this.pdf.setFont("helvetica", "normal");
      const lines = this.pdf.splitTextToSize(
        String(value),
        this.pageWidth - this.margin - 40
      );
      this.pdf.text(lines, this.margin + 40, this.currentY);
      this.currentY += Math.max(1, lines.length) * this.lineHeight;
    });

    this.currentY += 10;
  }

  private async addQRCode(order: Order): Promise<void> {
    this.checkPageBreak(60);

    try {
      // Generate QR code for the order
      const qrData = JSON.stringify({
        orderId: order.id,
        orderNumber: order.order_number,
        timestamp: new Date().toISOString(),
      });

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      this.pdf.setFontSize(12);
      this.pdf.setFont("helvetica", "bold");
      this.pdf.text("QR Code for Order Access", this.margin, this.currentY);
      this.currentY += 10;

      // Add QR code image
      const qrSize = 40; // mm
      const xPos = this.margin;
      this.pdf.addImage(
        qrCodeDataURL,
        "PNG",
        xPos,
        this.currentY,
        qrSize,
        qrSize
      );

      // Add explanation text next to QR code
      this.pdf.setFontSize(10);
      this.pdf.setFont("helvetica", "normal");
      const explanationText = [
        "Scan this QR code with your mobile device",
        "to access real-time order tracking and",
        "update delivery status information.",
      ];

      explanationText.forEach((text, index) => {
        this.pdf.text(
          text,
          xPos + qrSize + 10,
          this.currentY + 10 + index * this.lineHeight
        );
      });

      this.currentY += qrSize + 10;
    } catch (error) {
      console.error("Failed to generate QR code for PDF:", error);
      // Continue without QR code
      this.pdf.setFontSize(10);
      this.pdf.setFont("helvetica", "italic");
      this.pdf.text("QR code generation failed", this.margin, this.currentY);
      this.currentY += this.lineHeight;
    }
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 15;

    this.pdf.setFontSize(8);
    this.pdf.setFont("helvetica", "normal");
    this.pdf.text(
      "Generated on: " + new Date().toLocaleString(),
      this.margin,
      footerY
    );

    // Page number
    const pageCount = this.pdf.getNumberOfPages();
    this.pdf.text(
      `Page 1 of ${pageCount}`,
      this.pageWidth - this.margin - 20,
      footerY
    );
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 30) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
  }
}

// Utility function to export order to PDF
export async function exportOrderToPDF(
  order: Order,
  options: PDFExportOptions = {}
): Promise<void> {
  const exporter = new OrderPDFExporter();
  const pdfBlob = await exporter.exportOrderToPDF(order, {
    includeQR: true,
    includeTransporter: true,
    companyName: "Matanuska Load Confirmation",
    ...options,
  });

  // Download the PDF
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `order-${order.order_number}-${
    new Date().toISOString().split("T")[0]
  }.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
