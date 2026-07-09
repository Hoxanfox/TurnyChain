import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MdClose, MdSave, MdAdd, MdDelete, MdRotateRight } from 'react-icons/md';
import { useTableLayout } from './useTableLayout';
import { DraggableTableNode } from './DraggableTableNode';
import { fetchTables } from '../../../admin/components/tables/api/tablesSlice';
import type { LayoutNode } from '../../../../types/layout';
import type { RootState, AppDispatch } from '../../../../app/store';


interface LayoutEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LayoutEditorModal: React.FC<LayoutEditorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { layout, saveLayout, isSaving } = useTableLayout();
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const dispatch = useDispatch<AppDispatch>();
  const backendTables = useSelector((state: RootState) => state.tables.tables);

  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchTables());
    }
  }, [isOpen, dispatch]);
  const [newTableNum, setNewTableNum] = useState<string>('');
  
  // Dragging state for nodes
  const draggingNodeId = useRef<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const nodeStartPos = useRef({ x: 0, y: 0 });
  
  // Dragging state for canvas pan
  const isPanning = useRef(false);
  const panStartPos = useRef({ x: 0, y: 0 });
  const initialPan = useRef({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (layout && layout.nodes) {
      setNodes(layout.nodes);
    }
  }, [layout]);

  if (!isOpen) return null;

  // Encontrar qué mesas del backend NO están aún en el plano
  const assignedTableIds = nodes.filter(n => n.type === 'table').map(n => parseInt(n.id.replace('table-', '')));
  const unassignedBackendTables = backendTables
    .filter(t => t.is_active && !assignedTableIds.includes(t.table_number))
    .map(t => t.table_number)
    .sort((a, b) => a - b);

  // Siguiente número de mesa automático si no hay mesas del backend
  const nextTableNumber = nodes
    .filter(n => n.type === 'table')
    .map(n => parseInt(n.id.replace('table-', '')))
    .reduce((max, num) => (num > max ? num : max), 0) + 1;

  const handlePointerDown = (e: React.PointerEvent, node: LayoutNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    draggingNodeId.current = node.id;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    nodeStartPos.current = { x: node.x, y: node.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).id === 'canvas-inner') {
      setSelectedNodeId(null);
      isPanning.current = true;
      panStartPos.current = { x: e.clientX, y: e.clientY };
      initialPan.current = { x: pan.x, y: pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - panStartPos.current.x;
      const dy = e.clientY - panStartPos.current.y;
      setPan({ x: initialPan.current.x + dx, y: initialPan.current.y + dy });
      return;
    }

    if (!draggingNodeId.current) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    // Snap a grid de 10px
    const newX = Math.round((nodeStartPos.current.x + dx) / 10) * 10;
    const newY = Math.round((nodeStartPos.current.y + dy) / 10) * 10;

    setNodes(prev => prev.map(n => 
      n.id === draggingNodeId.current 
        ? { ...n, x: newX, y: newY }
        : n
    ));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingNodeId.current) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      draggingNodeId.current = null;
    }
    if (isPanning.current) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      isPanning.current = false;
    }
  };

  const addTableToCanvas = (tableNum: number) => {
    const newNode: LayoutNode = {
      id: `table-${tableNum}`,
      type: 'table',
      x: 100 - pan.x,
      y: 100 - pan.y,
      label: tableNum.toString()
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const addWall = () => {
    setNodes(prev => [...prev, {
      id: `wall-${Date.now()}`,
      type: 'wall',
      x: 100 - pan.x,
      y: 100 - pan.y,
      width: 200,
      height: 20
    }]);
  };

  const addToolSearch = () => {
    setNodes(prev => [...prev, {
      id: `tool_search-${Date.now()}`,
      type: 'tool_search',
      x: 100 - pan.x,
      y: 100 - pan.y
    }]);
  };

  const addToolWaiter = () => {
    setNodes(prev => [...prev, {
      id: `tool_waiter-${Date.now()}`,
      type: 'tool_waiter',
      x: 100 - pan.x,
      y: 100 - pan.y
    }]);
  };

  const deleteSelected = () => {
    if (selectedNodeId) {
      setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
      setSelectedNodeId(null);
    }
  };

  const rotateSelected = () => {
    if (selectedNodeId) {
      setNodes(prev => prev.map(n => 
        n.id === selectedNodeId 
          ? { ...n, rotation: ((n.rotation || 0) + 45) % 360 }
          : n
      ));
    }
  };

  const handleResizeNode = (prop: 'width' | 'height', value: number) => {
    if (selectedNodeId) {
      setNodes(prev => prev.map(n => 
        n.id === selectedNodeId 
          ? { ...n, [prop]: value }
          : n
      ));
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const handleSave = async () => {
    await saveLayout({ nodes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <MdClose size={24} />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-tight">Editor de Plano</h2>
            <p className="text-xs text-slate-500 font-medium">Mantén presionado y arrastra</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 text-sm shadow-md shadow-indigo-200"
        >
          <MdSave size={18} />
          <span className="hidden sm:inline">{isSaving ? 'Guardando...' : 'Guardar'}</span>
        </button>
      </div>

      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden touch-none"
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      >
        <div 
          id="canvas-inner"
          className="absolute inset-0" 
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          {nodes.map(node => (
            <DraggableTableNode
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              onPointerDown={handlePointerDown}
            />
          ))}
        </div>
      </div>

      {/* Bottom Floating Tools */}
      <div className="bg-white border-t border-slate-200 p-4 pb-safe z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        
        {/* Herramientas de Elemento Seleccionado */}
        {selectedNodeId ? (
          <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-200">
            {selectedNode?.type === 'wall' && (
              <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600 w-16">Largo:</span>
                  <input type="range" min="20" max="600" step="10" value={selectedNode.width || 200} onChange={e => handleResizeNode('width', parseInt(e.target.value))} className="flex-1 accent-slate-800" />
                  <span className="text-xs font-bold text-slate-400 w-8">{selectedNode.width || 200}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600 w-16">Grosor:</span>
                  <input type="range" min="10" max="100" step="10" value={selectedNode.height || 20} onChange={e => handleResizeNode('height', parseInt(e.target.value))} className="flex-1 accent-slate-800" />
                  <span className="text-xs font-bold text-slate-400 w-8">{selectedNode.height || 20}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={rotateSelected} className="flex-1 flex items-center justify-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-700 font-bold active:scale-95 transition-all">
                <MdRotateRight size={22} /> 
                <span>Rotar</span>
              </button>
              <button onClick={deleteSelected} className="flex-1 flex items-center justify-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-red-600 font-bold active:scale-95 transition-all">
                <MdDelete size={22} /> 
                <span>Quitar</span>
              </button>
              <button onClick={() => setSelectedNodeId(null)} className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-600 font-bold active:scale-95 transition-all">
                <MdClose size={22} />
              </button>
            </div>
          </div>
        ) : (
          /* Herramientas de Creación */
          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row gap-3">
              {unassignedBackendTables.length > 0 && (
                <select 
                  value=""
                  onChange={(e) => addTableToCanvas(parseInt(e.target.value))}
                  className="flex-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm cursor-pointer"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%234338ca\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                >
                  <option value="" disabled>+ Añadir Mesa Registrada</option>
                  {unassignedBackendTables.map(tNum => (
                    <option key={tNum} value={tNum}>Mesa {tNum}</option>
                  ))}
                </select>
              )}

              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder={`No. ${nextTableNumber}`}
                  value={newTableNum}
                  onChange={e => setNewTableNum(e.target.value)}
                  className="w-24 bg-slate-50 border border-slate-200 text-slate-800 font-bold px-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  title="Número de mesa manual"
                />
                <button 
                  onClick={() => {
                    addTableToCanvas(newTableNum ? parseInt(newTableNum) : nextTableNumber);
                    setNewTableNum('');
                  }}
                  className="flex items-center justify-center p-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl active:scale-95 transition-all shadow-sm"
                  title="Añadir mesa manual"
                >
                  <MdAdd size={24} />
                </button>
              </div>

              <button 
                onClick={addWall}
                className="flex items-center justify-center gap-2 bg-slate-800 text-white font-bold py-3 px-6 rounded-xl active:scale-95 transition-all shadow-sm"
              >
                <div className="w-4 h-4 bg-slate-600 rounded-sm border border-slate-500"></div>
                Pared
              </button>

              <button 
                onClick={addToolSearch}
                className="flex items-center justify-center gap-2 bg-blue-100 text-blue-700 border-2 border-blue-600 font-bold py-3 px-6 rounded-xl active:scale-95 transition-all shadow-sm"
              >
                🔍 Lupa ID
              </button>

              <button 
                onClick={addToolWaiter}
                className="flex items-center justify-center gap-2 bg-green-100 text-green-700 border-2 border-green-600 font-bold py-3 px-6 rounded-xl active:scale-95 transition-all shadow-sm"
              >
                👨‍🍳 Mesero
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
