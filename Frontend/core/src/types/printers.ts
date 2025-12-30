// =================================================================
// ARCHIVO: /src/types/printers.ts
// Tipos para el sistema de impresoras
// =================================================================

export type PrinterType = 'escpos' | 'pdf' | 'raw';

export interface Printer {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  printer_type: PrinterType;
  station_id: string;
  station_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreatePrinterRequest {
  name: string;
  ip_address: string;
  port: number;
  printer_type: PrinterType;
  station_id: string;
}

export interface UpdatePrinterRequest {
  name?: string;
  ip_address?: string;
  port?: number;
  printer_type?: PrinterType;
  station_id?: string;
  is_active?: boolean;
}

