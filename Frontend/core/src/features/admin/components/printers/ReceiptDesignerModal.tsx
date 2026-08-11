import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical, FaTimes, FaSave, FaCog, FaEye, FaEyeSlash } from 'react-icons/fa';
import type { Printer, PrintBlock } from '../../../../types/printers';
import { printersAPI } from './api/printersAPI';

interface ReceiptDesignerModalProps {
  printer: Printer;
  onClose: () => void;
  onSaved: () => void;
}

const BLOCK_LABELS: Record<string, string> = {
  header: '🏢 Cabecera (Estación)',
  order_info: '📋 Info Orden (Nº, Fecha)',
  items: '🍔 Productos (Items)',
  totals: '💰 Totales (Caja)',
  notes: '📝 Notas Especiales',
  footer: '👨‍🍳 Pie de Página (Mesero)',
  item_name: 'Nombre Producto',
  item_price: 'Precio',
  item_modifiers: 'Modificadores',
  item_notes: 'Notas del Producto',
};

const DEFAULT_LAYOUT: PrintBlock[] = [
  { id: 'header', visible: true, align: 'center', font_size: 'double', font_weight: 'bold' },
  { id: 'order_info', visible: true, align: 'center', font_size: 'normal', font_weight: 'bold' },
  {
    id: 'items', visible: true, align: 'left', font_size: 'normal', font_weight: 'normal',
    sub_blocks: [
      { id: 'item_name', visible: true, align: 'left', font_size: 'normal', font_weight: 'bold' },
      { id: 'item_price', visible: true, align: 'left', font_size: 'normal', font_weight: 'normal' },
      { id: 'item_modifiers', visible: true, align: 'left', font_size: 'normal', font_weight: 'normal' },
      { id: 'item_notes', visible: true, align: 'left', font_size: 'normal', font_weight: 'normal' },
    ],
  },
  { id: 'totals', visible: true, align: 'right', font_size: 'double', font_weight: 'bold' },
  { id: 'notes', visible: true, align: 'left', font_size: 'normal', font_weight: 'normal' },
  { id: 'footer', visible: true, align: 'left', font_size: 'normal', font_weight: 'normal' },
];

// --- Block Editor Component (Inline) ---
const BlockEditor: React.FC<{ block: PrintBlock; onChange: (updated: PrintBlock) => void }> = ({ block, onChange }) => {
  return (
    <div className="bg-gray-50 border-t border-gray-200 p-3 flex flex-wrap gap-4 text-sm mt-2 rounded-b-md">
      <div className="flex items-center gap-2">
        <label className="text-gray-600 font-medium text-xs uppercase">Alineación</label>
        <select
          value={block.align}
          onChange={(e) => onChange({ ...block, align: e.target.value as any })}
          className="border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="right">Derecha</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-gray-600 font-medium text-xs uppercase">Tamaño</label>
        <select
          value={block.font_size}
          onChange={(e) => onChange({ ...block, font_size: e.target.value as any })}
          className="border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="normal">Normal</option>
          <option value="double">Doble (Grande)</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-gray-600 font-medium text-xs uppercase">Grosor</label>
        <select
          value={block.font_weight}
          onChange={(e) => onChange({ ...block, font_weight: e.target.value as any })}
          className="border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="normal">Normal</option>
          <option value="bold">Negrita</option>
        </select>
      </div>
      
      {/* Sub-blocks si existen */}
      {block.sub_blocks && block.sub_blocks.length > 0 && (
        <div className="w-full mt-2 pt-2 border-t border-gray-300">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Configuración de Elementos (Productos)</p>
          <div className="flex flex-col gap-2">
            {block.sub_blocks.map((sb, idx) => (
              <div key={sb.id} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                <button
                  onClick={() => {
                    const newSub = [...block.sub_blocks!];
                    newSub[idx] = { ...sb, visible: !sb.visible };
                    onChange({ ...block, sub_blocks: newSub });
                  }}
                  className={`p-1.5 rounded-md text-white transition-colors ${sb.visible ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-400 hover:bg-gray-500'}`}
                >
                  {sb.visible ? <FaEye size={12} /> : <FaEyeSlash size={12} />}
                </button>
                <span className="font-semibold text-gray-700 w-32">{BLOCK_LABELS[sb.id]}</span>
                
                <select
                  disabled={!sb.visible}
                  value={sb.align}
                  onChange={(e) => {
                    const newSub = [...block.sub_blocks!];
                    newSub[idx] = { ...sb, align: e.target.value as any };
                    onChange({ ...block, sub_blocks: newSub });
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none disabled:opacity-50"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>

                <select
                  disabled={!sb.visible}
                  value={sb.font_size}
                  onChange={(e) => {
                    const newSub = [...block.sub_blocks!];
                    newSub[idx] = { ...sb, font_size: e.target.value as any };
                    onChange({ ...block, sub_blocks: newSub });
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none disabled:opacity-50"
                >
                  <option value="normal">Normal</option>
                  <option value="double">Doble</option>
                </select>

                <select
                  disabled={!sb.visible}
                  value={sb.font_weight}
                  onChange={(e) => {
                    const newSub = [...block.sub_blocks!];
                    newSub[idx] = { ...sb, font_weight: e.target.value as any };
                    onChange({ ...block, sub_blocks: newSub });
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none disabled:opacity-50"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Negrita</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sortable Item Component ---
interface SortableItemProps {
  block: PrintBlock;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updated: PrintBlock) => void;
}

function SortableItem({ block, isSelected, onSelect, onChange }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className={`flex items-center gap-3 bg-white border-2 p-3 rounded-lg shadow-sm transition-colors ${isSelected ? 'border-indigo-500' : 'border-gray-200'}`}>
        <div {...attributes} {...listeners} className="cursor-grab hover:text-indigo-600 text-gray-400 p-1">
          <FaGripVertical />
        </div>
        
        <div className="font-semibold text-gray-700 flex-1 flex items-center gap-2">
          {BLOCK_LABELS[block.id] || block.id}
          {!block.visible && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Oculto</span>}
        </div>
        
        <button
          onClick={(e) => { e.stopPropagation(); onChange({ ...block, visible: !block.visible }); }}
          className={`p-2 rounded-md transition-colors ${block.visible ? 'text-indigo-600 hover:bg-indigo-50' : 'text-gray-400 hover:bg-gray-100'}`}
          title={block.visible ? 'Ocultar bloque' : 'Mostrar bloque'}
        >
          {block.visible ? <FaEye /> : <FaEyeSlash />}
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`p-2 rounded-md transition-colors ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          <FaCog />
        </button>
      </div>
      
      {isSelected && (
        <BlockEditor block={block} onChange={onChange} />
      )}
    </div>
  );
}

// --- Ticket Preview Component ---
const TicketPreview: React.FC<{ layout: PrintBlock[] }> = ({ layout }) => {
  const applyStyles = (block: PrintBlock) => {
    let classes = "";
    if (block.align === 'center') classes += " text-center";
    if (block.align === 'right') classes += " text-right";
    if (block.align === 'left') classes += " text-left";
    
    if (block.font_size === 'double') classes += " text-lg";
    else classes += " text-sm";
    
    if (block.font_weight === 'bold') classes += " font-bold";
    else classes += " font-normal";
    
    return classes;
  };

  const getBlockPreview = (block: PrintBlock) => {
    if (!block.visible) return null;

    switch (block.id) {
      case 'header':
        return (
          <div key={block.id} className={`${applyStyles(block)} border-b border-dashed border-gray-400 pb-2 mb-2`}>
            COCINA CALIENTE
          </div>
        );
      case 'order_info':
        return (
          <div key={block.id} className={`${applyStyles(block)} border-b border-dashed border-gray-400 pb-2 mb-2`}>
            <div>ORDEN: ORD-001</div>
            <div>MESA</div>
            <div>Fecha: 10/08/2026 14:30:00</div>
          </div>
        );
      case 'items':
        const nBlock = block.sub_blocks?.find(s => s.id === 'item_name');
        const pBlock = block.sub_blocks?.find(s => s.id === 'item_price');
        const mBlock = block.sub_blocks?.find(s => s.id === 'item_modifiers');
        const ntBlock = block.sub_blocks?.find(s => s.id === 'item_notes');

        return (
          <div key={block.id} className={`text-sm border-b border-dashed border-gray-400 pb-2 mb-2 ${applyStyles(block)}`}>
            <div className="mb-1 font-bold">ITEMS:</div>
            
            {/* Item 1 */}
            <div className="mb-2">
              {nBlock?.visible !== false && (
                <div className={applyStyles(nBlock || { align: 'left', font_size: 'double', font_weight: 'bold', visible: true, id: '' })}>
                  2x Hamburguesa Clásica
                </div>
              )}
              {pBlock?.visible !== false && (
                <div className={`pl-2 ${applyStyles(pBlock || { align: 'left', font_size: 'normal', font_weight: 'normal', visible: true, id: '' })}`}>
                  $15.000 c/u -{">"} $30.000
                </div>
              )}
              {mBlock?.visible !== false && (
                <div className={`pl-2 mt-1 ${applyStyles(mBlock || { align: 'left', font_size: 'normal', font_weight: 'normal', visible: true, id: '' })}`}>
                  <div className="bg-black text-white px-1 w-max font-bold text-[10px] uppercase">
                    {">>>"} MODIFICADO {"<<<"}
                  </div>
                  <div>SIN: Cebolla</div>
                </div>
              )}
            </div>

            {/* Item 2 */}
            <div className="mb-2">
              {nBlock?.visible !== false && (
                <div className={applyStyles(nBlock || { align: 'left', font_size: 'double', font_weight: 'bold', visible: true, id: '' })}>
                  1x Papas Fritas
                </div>
              )}
              {pBlock?.visible !== false && (
                <div className={`pl-2 ${applyStyles(pBlock || { align: 'left', font_size: 'normal', font_weight: 'normal', visible: true, id: '' })}`}>
                  $5.000 c/u -{">"} $5.000
                </div>
              )}
              {ntBlock?.visible !== false && (
                <div className={`pl-2 ${applyStyles(ntBlock || { align: 'left', font_size: 'normal', font_weight: 'normal', visible: true, id: '' })}`}>
                  <span className="underline">NOTA: Muy crujientes</span>
                </div>
              )}
            </div>
          </div>
        );
      case 'totals':
        return (
          <div key={block.id} className={`${applyStyles(block)} border-b border-dashed border-gray-400 pb-2 mb-2`}>
            <div>TOTAL ORDEN: $35.000</div>
          </div>
        );
      case 'notes':
        return (
          <div key={block.id} className={`${applyStyles(block)} border-b border-dashed border-gray-400 pb-2 mb-2`}>
            <div>NOTA ESPECIAL:</div>
            <div>Mesa de cumpleaños, apurar.</div>
          </div>
        );
      case 'footer':
        return (
          <div key={block.id} className={`${applyStyles(block)}`}>
            <div>Mesero: Juan Pérez</div>
            <div>Mesa: 5</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#fdfcf0] text-black p-4 mx-auto shadow-md border-x border-gray-200 w-full max-w-[320px]" style={{ fontFamily: '"Courier New", Courier, monospace', minHeight: '350px' }}>
      {layout.map(getBlockPreview)}
    </div>
  );
};

// --- Main Modal Component ---
const ReceiptDesignerModal: React.FC<ReceiptDesignerModalProps> = ({
  printer,
  onClose,
  onSaved,
}) => {
  const [layout, setLayout] = useState<PrintBlock[]>(() => {
    if (printer.print_layout && Array.isArray(printer.print_layout) && printer.print_layout.length > 0) {
      if (typeof printer.print_layout[0] === 'object') {
        return printer.print_layout as any;
      }
    }
    return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLayout((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const updateBlock = (updatedBlock: PrintBlock) => {
    setLayout(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await printersAPI.update(printer.id, { print_layout: layout as any });
      onSaved();
    } catch (error) {
      console.error('Error guardando layout:', error);
      alert('Error al guardar el diseño de la comanda');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-50 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              🎨 Diseñador Avanzado de Comandas
            </h2>
            <p className="text-indigo-100 text-sm">{printer.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6">
          
          {/* Bloques DND */}
          <div className="flex-1 min-w-[350px]">
            <p className="text-sm text-gray-600 mb-4 font-semibold bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              1. Ordena los bloques arrastrando (⋮⋮). <br/>
              2. Usa (👁) para ocultar/mostrar un bloque entero.<br/>
              3. Toca la tuerca (⚙️) para personalizar su alineación y fuente.
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={layout.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {layout.map((block) => (
                  <SortableItem 
                    key={block.id} 
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
                    onChange={updateBlock}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Vista Previa */}
          <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center border-2 border-dashed border-gray-300 w-full lg:w-auto">
            <p className="text-sm text-gray-600 mb-4 font-semibold text-center w-full">
              Vista Previa (En Vivo)
            </p>
            <TicketPreview layout={layout} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <div className="animate-spin text-xl">⏳</div>
            ) : (
              <FaSave />
            )}
            Guardar Diseño
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDesignerModal;
