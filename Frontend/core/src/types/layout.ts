export interface LayoutNode {
  id: string; // "table-1", "wall-1", "zone-1"
  type: 'table' | 'wall' | 'zone' | 'tool_search' | 'tool_waiter';
  x: number;
  y: number;
  width?: number; // for walls/zones
  height?: number; // for walls/zones
  rotation?: number;
  label?: string; // e.g. Table number, or Zone name
}

export interface RestaurantLayout {
  nodes: LayoutNode[];
}
