// =================================================================
// ARCHIVO: /src/features/admin/components/printers/PrinterManagement.tsx
// Gestión de impresoras
// =================================================================

import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaCheck, FaTimes, FaPrint } from 'react-icons/fa';
import { printersAPI } from './api/printersAPI';
import { stationsAPI } from '../stations/api/stationsAPI';
import ReceiptDesignerModal from './ReceiptDesignerModal';
import { requestUsbPrinter, testUsbPrinter } from '../../../../utils/usbPrinterUtils';
import type { Printer, CreatePrinterRequest, PrinterType } from '../../../../types/printers';
import type { Station } from '../../../../types/stations';

const PrinterManagement: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [designerPrinter, setDesignerPrinter] = useState<Printer | null>(null);
  const [filterStation, setFilterStation] = useState<string>('all');
  const [connectionType, setConnectionType] = useState<'network' | 'usb'>('network');
  const [formData, setFormData] = useState<CreatePrinterRequest>({
    name: '',
    ip_address: '',
    port: 9100,
    printer_type: 'escpos',
    station_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [printersData, stationsData] = await Promise.all([
        printersAPI.getAll(),
        stationsAPI.getActive(),
      ]);
      setPrinters(printersData);
      setStations(stationsData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.ip_address.trim() || !formData.station_id) {
      alert('Todos los campos obligatorios deben ser completados');
      return;
    }

    try {
      await printersAPI.create(formData);
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error al crear impresora:', error);
      alert('Error al crear impresora');
    }
  };

  const handleUpdate = async () => {
    if (!editingPrinter || !formData.name.trim()) return;

    try {
      await printersAPI.update(editingPrinter.id, formData);
      setEditingPrinter(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error al actualizar impresora:', error);
      alert('Error al actualizar impresora');
    }
  };

  const handleToggleActive = async (printer: Printer) => {
    try {
      await printersAPI.update(printer.id, {
        is_active: !printer.is_active,
      });
      loadData();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar estado');
    }
  };

  // NOTA: Función handleDelete comentada por no estar en uso actualmente.
  // Descomentar si se necesita funcionalidad de eliminación permanente.
  /*
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar esta impresora?')) return;

    try {
      await printersAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Error al eliminar impresora:', error);
      alert('Error al eliminar impresora');
    }
  };
  */

  const openEditModal = (printer: Printer) => {
    setEditingPrinter(printer);
    setConnectionType(printer.ip_address.startsWith('USB:') ? 'usb' : 'network');
    setFormData({
      name: printer.name,
      ip_address: printer.ip_address,
      port: printer.port,
      printer_type: printer.printer_type,
      station_id: printer.station_id,
    });
  };

  const resetForm = () => {
    setConnectionType('network');
    setFormData({
      name: '',
      ip_address: '',
      port: 9100,
      printer_type: 'escpos',
      station_id: '',
    });
  };

  const handleTestPrint = async (printer: Printer) => {
    try {
      if (printer.ip_address.startsWith('USB:')) {
        const parts = printer.ip_address.split(':');
        if (parts.length === 3) {
          const vendorId = parseInt(parts[1], 10);
          const productId = parseInt(parts[2], 10);
          await testUsbPrinter(vendorId, productId);
          alert('Prueba enviada a impresora USB exitosamente');
        } else {
          throw new Error('Configuración de USB inválida en la dirección IP');
        }
      } else {
        await printersAPI.test(printer.id);
        alert('Prueba enviada a impresora de red exitosamente');
      }
    } catch (error: any) {
      console.error('Error al probar impresora:', error);
      alert('Error al probar impresora: ' + (error.response?.data?.message || error.message || ''));
    }
  };

  const filteredPrinters =
    filterStation === 'all'
      ? printers
      : printers.filter((p) => p.station_id === filterStation);

  const getPrinterTypeLabel = (type: PrinterType) => {
    const labels = {
      escpos: '🖨️ ESC/POS (Térmica)',
      pdf: '📄 PDF',
      raw: '⚙️ Raw',
    };
    return labels[type];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaPrint className="text-indigo-600" />
            Gestión de Impresoras
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Configura las impresoras para cada estación
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <FaPlus />
          Nueva Impresora
        </button>
      </div>

      {/* Filtro por Estación */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Filtrar por Estación
        </label>
        <select
          value={filterStation}
          onChange={(e) => setFilterStation(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">🌐 Todas las estaciones</option>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              🍳 {station.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Impresoras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPrinters.map((printer) => (
          <div
            key={printer.id}
            className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 border-2 ${
              printer.is_active ? 'border-green-200' : 'border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FaPrint className="text-indigo-600" />
                  {printer.name}
                </h3>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="text-gray-600">
                    <span className="font-semibold">Estación:</span>{' '}
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {printer.station_name}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-semibold">Conexión:</span>{' '}
                    {printer.ip_address.startsWith('USB:') ? (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">USB Local</span>
                    ) : (
                      <>
                        <code className="bg-gray-100 px-2 py-1 rounded">{printer.ip_address}</code>:
                        <code className="bg-gray-100 px-2 py-1 rounded ml-1">{printer.port}</code>
                      </>
                    )}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-semibold">Tipo:</span>{' '}
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                      {getPrinterTypeLabel(printer.printer_type)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    printer.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {printer.is_active ? '✅ Activa' : '❌ Inactiva'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => openEditModal(printer)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <FaEdit /> Editar
              </button>
              <button
                onClick={() => handleTestPrint(printer)}
                className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                🖨️ Probar
              </button>
              <button
                onClick={() => setDesignerPrinter(printer)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                🎨 Diseño
              </button>
              <button
                onClick={() => handleToggleActive(printer)}
                className={`px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  printer.is_active
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {printer.is_active ? <FaTimes /> : <FaCheck />}
                {printer.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}

        {filteredPrinters.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">🖨️</div>
            <p className="text-gray-500 text-lg">No hay impresoras configuradas</p>
            <p className="text-gray-400 text-sm mt-2">Crea tu primera impresora para comenzar</p>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {(showCreateModal || editingPrinter) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-xl">
              <h3 className="text-xl font-bold">
                {editingPrinter ? '✏️ Editar Impresora' : '➕ Nueva Impresora'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Ej: Impresora Cocina 1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estación *
                </label>
                <select
                  value={formData.station_id}
                  onChange={(e) => setFormData({ ...formData, station_id: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Seleccionar estación...</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Conexión *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="connectionType"
                      value="network"
                      checked={connectionType === 'network'}
                      onChange={() => setConnectionType('network')}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span>Red (IP)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="connectionType"
                      value="usb"
                      checked={connectionType === 'usb'}
                      onChange={() => setConnectionType('usb')}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span>Local (USB)</span>
                  </label>
                </div>
              </div>

              {connectionType === 'network' ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dirección IP *
                    </label>
                    <input
                      type="text"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      placeholder="192.168.1.101"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Puerto *</label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      placeholder="9100"
                    />
                  </div>
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    Conecta la impresora térmica por USB a este equipo para enlazarla.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const usbDevice = await requestUsbPrinter();
                        setFormData({
                          ...formData,
                          ip_address: `USB:${usbDevice.vendorId}:${usbDevice.productId}`,
                          port: 0,
                          printer_type: 'escpos'
                        });
                        alert(`Impresora seleccionada: ${usbDevice.productName}`);
                      } catch (error: any) {
                        alert(error.message);
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    🔌 Buscar Impresora USB
                  </button>
                  {formData.ip_address.startsWith('USB:') && (
                    <p className="text-xs text-green-700 font-bold mt-2 text-center">
                      ✓ Dispositivo USB Enlazado
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Impresora *
                </label>
                <select
                  value={formData.printer_type}
                  onChange={(e) =>
                    setFormData({ ...formData, printer_type: e.target.value as PrinterType })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="escpos">🖨️ ESC/POS (Impresora Térmica)</option>
                  <option value="pdf">📄 PDF (Para pruebas)</option>
                  <option value="raw">⚙️ Raw (Comandos directos)</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-b-xl flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPrinter(null);
                  resetForm();
                }}
                className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={editingPrinter ? handleUpdate : handleCreate}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all"
              >
                {editingPrinter ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Diseño de Comanda */}
      {designerPrinter && (
        <ReceiptDesignerModal
          printer={designerPrinter}
          onClose={() => setDesignerPrinter(null)}
          onSaved={() => {
            setDesignerPrinter(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default PrinterManagement;

