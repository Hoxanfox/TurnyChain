// Tipos para el sistema de estaciones de preparación

export interface Station {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateStationRequest {
  name: string;
  description?: string;
}

export interface UpdateStationRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

