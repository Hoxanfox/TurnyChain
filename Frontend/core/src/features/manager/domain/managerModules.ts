export type ManagerModule = 'overview' | 'inventory' | 'attendance' | 'reports' | 'employees';

export interface ManagerModuleDefinition {
  id: ManagerModule;
  label: string;
  description: string;
  icon: string;
}

export const managerModules: ManagerModuleDefinition[] = [
  { id: 'overview', label: 'Resumen', description: 'Estado general de la operación', icon: '◈' },
  { id: 'inventory', label: 'Inventario', description: 'Recepciones y existencias', icon: '▣' },
  { id: 'attendance', label: 'Asistencias', description: 'Asistencia y liquidaciones', icon: '◷' },
  { id: 'reports', label: 'Reportes', description: 'Métricas para decidir', icon: '▥' },
  { id: 'employees', label: 'Empleados', description: 'Datos y estado del equipo', icon: '◎' },
];
