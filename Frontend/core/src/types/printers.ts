// =================================================================
// ARCHIVO: /src/types/printers.ts
// Tipos para el sistema de impresoras
// =================================================================

export type PrinterType = 'escpos' | 'pdf' | 'raw';

export interface PrintBlock {
  id: string;
  visible: boolean;
  align: 'left' | 'center' | 'right';
  font_size: 'normal' | 'double';
  font_weight: 'normal' | 'bold';
  sub_blocks?: PrintBlock[];
}

export interface Printer {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  printer_type: PrinterType;
  station_id: string;
  station_name?: string;
  print_layout?: PrintBlock[];
  is_active: boolean;
  created_at: string;
}

export interface CreatePrinterRequest {
  name: string;
  ip_address: string;
  port: number;
  printer_type: PrinterType;
  station_id: string;
  print_layout?: PrintBlock[];
}

export interface UpdatePrinterRequest {
  name?: string;
  ip_address?: string;
  port?: number;
  printer_type?: PrinterType;
  station_id?: string;
  print_layout?: PrintBlock[];
  is_active?: boolean;
}
