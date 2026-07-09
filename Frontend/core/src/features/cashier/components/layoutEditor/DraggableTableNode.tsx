import React from 'react';
import type { LayoutNode } from '../../../../types/layout';
import { MdTableRestaurant } from 'react-icons/md';

interface DraggableTableNodeProps {
  node: LayoutNode;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent, node: LayoutNode) => void;
}

export const DraggableTableNode: React.FC<DraggableTableNodeProps> = ({ 
  node, 
  isSelected,
  onPointerDown 
}) => {
  const isWall = node.type === 'wall';
  const isZone = node.type === 'zone';
  const isToolSearch = node.type === 'tool_search';
  const isToolWaiter = node.type === 'tool_waiter';

  let bgColor = 'bg-indigo-50 border-slate-900 border-2 text-indigo-900';
  let sizeClasses = 'w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl shadow-sm';
  let content = node.label || node.id.replace('table-', '');

  if (isWall) {
    bgColor = 'bg-slate-800 border-slate-900';
    sizeClasses = 'rounded-md opacity-90 shadow-sm';
    content = ''; // Las paredes no tienen texto por defecto
  } else if (isZone) {
    bgColor = 'bg-slate-100/50 border-slate-300 border-dashed border-2 text-slate-400';
    sizeClasses = 'rounded-2xl shadow-none flex items-center justify-center font-bold text-xl opacity-70';
    content = node.label || 'Zona';
  } else if (isToolSearch) {
    bgColor = 'bg-blue-100 border-blue-600 border-2 text-blue-700';
    sizeClasses = 'w-14 h-14 rounded-full flex items-center justify-center shadow-md';
    content = '🔍';
  } else if (isToolWaiter) {
    bgColor = 'bg-green-100 border-green-600 border-2 text-green-700';
    sizeClasses = 'w-14 h-14 rounded-full flex items-center justify-center shadow-md';
    content = '👨‍🍳';
  }

  const widthStyle = node.width ? `${node.width}px` : undefined;
  const heightStyle = node.height ? `${node.height}px` : undefined;

  return (
    <div
      onPointerDown={(e) => onPointerDown(e, node)}
      className={`absolute cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-400 border select-none transition-shadow ${bgColor} ${sizeClasses} ${isSelected ? 'ring-4 ring-indigo-500 z-50' : 'z-10'}`}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: widthStyle,
        height: heightStyle,
        transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
        touchAction: 'none' // Prevent scrolling while dragging on touch devices
      }}
    >
      {!isWall && !isZone && <MdTableRestaurant className="absolute opacity-10 w-full h-full p-2" />}
      <span className="relative z-10">{content}</span>
    </div>
  );
};
