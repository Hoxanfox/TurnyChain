import React, { useRef, useState, useEffect } from 'react';
import { MdMap, MdList } from 'react-icons/md';
import { useTableLayout } from '../../layoutEditor/useTableLayout';
import type { LayoutNode } from '../../../../../types/layout';

interface TableMapOverviewCardProps {
  tableNumbers: number[];
  porCobrarTables: number[];
  pagadasTables: number[];
  porVerificarTables: number[];
  onSelectTable: (tableNum: number) => void;
  onOpenPagination: () => void;
  onOpenSearchId?: () => void;
  onOpenSearchWaiter?: () => void;
}

export const TableMapOverviewCard: React.FC<TableMapOverviewCardProps> = ({
  tableNumbers,
  porCobrarTables,
  pagadasTables,
  porVerificarTables,
  onSelectTable,
  onOpenPagination,
  onOpenSearchId,
  onOpenSearchWaiter,
}) => {
  const { layout, isLoading } = useTableLayout();

  const getTableStyle = (tableNum: number) => {
    let bgColor = 'bg-slate-200 text-slate-800 border-slate-900 border-2';
    let hoverColor = 'hover:bg-slate-300';
    let shadow = 'shadow-sm';
    
    if (porVerificarTables.includes(tableNum)) {
      bgColor = 'bg-orange-500 text-white border-slate-900 border-2';
      hoverColor = 'hover:bg-orange-600';
      shadow = 'shadow-orange-500/30 shadow-md';
    } else if (porCobrarTables.includes(tableNum)) {
      bgColor = 'bg-blue-500 text-white border-slate-900 border-2';
      hoverColor = 'hover:bg-blue-600';
      shadow = 'shadow-blue-500/30 shadow-md';
    } else if (pagadasTables.includes(tableNum)) {
      bgColor = 'bg-emerald-500 text-white border-slate-900 border-2';
      hoverColor = 'hover:bg-emerald-600';
      shadow = 'shadow-emerald-500/30 shadow-md';
    }

    return `${bgColor} ${hoverColor} ${shadow}`;
  };

  const mappedTableIds = layout.nodes.filter((n: LayoutNode) => n.type === 'table').map((n: LayoutNode) => parseInt(n.id.replace('table-', '')));
  const unmappedTables = tableNumbers.filter(t => !mappedTableIds.includes(t));

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setContainerSize({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Cálculos síncronos en el render para evitar FOUC
  let scale = 1;
  let offset = { x: 0, y: 0 };
  
  if (layout.nodes && layout.nodes.length > 0 && containerSize.width > 0) {
    const minX = Math.min(...layout.nodes.map((n: LayoutNode) => n.x));
    const maxX = Math.max(...layout.nodes.map((n: LayoutNode) => n.x + (n.width || 60)));
    const minY = Math.min(...layout.nodes.map((n: LayoutNode) => n.y));
    const maxY = Math.max(...layout.nodes.map((n: LayoutNode) => n.y + (n.height || 60)));

    const contentWidth = maxX - minX + 60; // margen
    const contentHeight = maxY - minY + 60;

    const scaleX = containerSize.width / contentWidth;
    const scaleY = containerSize.height / contentHeight;
    scale = Math.min(scaleX, scaleY, 1.2); 

    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;
    offset.x = (containerSize.width - scaledWidth) / 2 - minX * scale + 30 * scale;
    offset.y = (containerSize.height - scaledHeight) / 2 - minY * scale + 30 * scale;
  }

  const isReady = containerSize.width > 0 && !isLoading && layout.nodes.length > 0;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <MdMap size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">Mapa de Mesas</h2>
            <p className="text-xs text-slate-500 font-medium">{tableNumbers.length} mesas activas</p>
          </div>
        </div>
        <button 
          onClick={onOpenPagination}
          className="flex items-center gap-1.5 text-indigo-600 text-sm font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
        >
          <MdList size={18} />
          Ver lista
        </button>
      </div>

      <div 
           ref={containerRef}
           className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 relative min-h-[40vh] group"
           style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`,
            opacity: (!isLoading && layout.nodes.length === 0) ? 1 : (isReady ? 1 : 0),
            transition: 'opacity 0.3s ease'
           }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <span className="text-sm font-bold text-slate-500">Cargando plano...</span>
          </div>
        )}

        {/* Nodos mapeados con escalado automático */}
        <div 
          className="absolute inset-0"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
        >
        {layout.nodes.map((node: LayoutNode) => {
          if (node.type === 'wall') {
            return (
              <div
                key={node.id}
                className="absolute bg-slate-800 border-slate-900 rounded-md shadow-sm opacity-50"
                style={{
                  left: node.x, top: node.y, width: node.width, height: node.height,
                  transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined
                }}
              />
            );
          }
          if (node.type === 'zone') {
            return (
              <div
                key={node.id}
                className="absolute bg-emerald-50 text-emerald-700 border-2 border-dashed border-emerald-300 rounded-2xl flex items-start justify-start p-2 opacity-60 pointer-events-none"
                style={{
                  left: node.x, top: node.y, width: node.width, height: node.height,
                  transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined
                }}
              >
                <span className="font-bold">{node.label || 'Zona'}</span>
              </div>
            );
          }

          if (node.type === 'tool_search') {
            return (
              <button
                key={node.id}
                onClick={onOpenSearchId}
                className="absolute w-14 h-14 bg-blue-100 border-blue-600 border-2 text-blue-700 rounded-full flex items-center justify-center shadow-md hover:bg-blue-200 active:scale-95 transition-all text-2xl"
                style={{
                  left: node.x, top: node.y,
                  transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined
                }}
                title="Buscar orden por ID"
              >
                🔍
              </button>
            );
          }
          if (node.type === 'tool_waiter') {
            return (
              <button
                key={node.id}
                onClick={onOpenSearchWaiter}
                className="absolute w-14 h-14 bg-green-100 border-green-600 border-2 text-green-700 rounded-full flex items-center justify-center shadow-md hover:bg-green-200 active:scale-95 transition-all text-2xl"
                style={{
                  left: node.x, top: node.y,
                  transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined
                }}
                title="Buscar por mesero"
              >
                👨‍🍳
              </button>
            );
          }

          // Es una mesa
          const tableNum = parseInt(node.id.replace('table-', ''));
          // Solo mostrar si está activa (si el backend reportó órdenes o está en tableNumbers)
          // Pero para plano físico siempre la mostramos, así que la mostramos y si no tiene orden le ponemos color gris claro
          
          const isActive = tableNumbers.includes(tableNum);
          const styleClasses = isActive 
            ? getTableStyle(tableNum)
            : 'bg-white text-slate-400 border-slate-900 border-2 opacity-80 hover:bg-slate-50'; // Mesa vacía

          return (
            <button
              key={node.id}
              onClick={() => onSelectTable(tableNum)}
              className={`absolute flex items-center justify-center font-black text-2xl rounded-xl shadow-sm transition-all active:scale-95 ${styleClasses}`}
              style={{
                left: node.x,
                top: node.y,
                width: 60,
                height: 60,
                transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined
              }}
            >
              {node.label || tableNum}
            </button>
          );
        })}
        </div>

        {/* Mensaje si no hay layout configurado */}
        {!isLoading && layout.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <MdMap className="text-slate-300 text-6xl mb-4" />
            <p className="text-slate-500 font-medium">El plano del restaurante no ha sido configurado.</p>
            <p className="text-sm text-slate-400 mt-1">Usa la herramienta "Editar Plano de Mesas" en el menú para diseñar la distribución.</p>
          </div>
        )}
      </div>

      {/* Mesas Activas NO Mapeadas (Aparecen fuera de la cuadrícula si el cajero olvidó ponerlas en el mapa pero existen en la BD) */}
      {unmappedTables.length > 0 && (
        <div className="mt-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mesas Activas (Sin posición en mapa)</h3>
          <div className="flex flex-wrap gap-2">
            {unmappedTables.map((tableNum) => (
              <button 
                key={`unmapped-${tableNum}`}
                onClick={() => onSelectTable(tableNum)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black transition-all active:scale-90 ${getTableStyle(tableNum)}`}
              >
                {tableNum}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
