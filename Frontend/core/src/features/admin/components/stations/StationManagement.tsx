// =================================================================
// ARCHIVO: /src/features/admin/components/stations/StationManagement.tsx
// Gestión de estaciones de preparación
// =================================================================

import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaCheck, FaTimes, FaUtensils } from 'react-icons/fa';
import { stationsAPI } from './api/stationsAPI';
import type { Station, CreateStationRequest } from '../../../../types/stations';

const StationManagement: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [formData, setFormData] = useState<CreateStationRequest>({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await stationsAPI.getAll();
      setStations(data);
    } catch (error) {
      console.error('Error al cargar estaciones:', error);
      alert('Error al cargar estaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    try {
      await stationsAPI.create(formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      loadStations();
    } catch (error) {
      console.error('Error al crear estación:', error);
      alert('Error al crear estación');
    }
  };

  const handleUpdate = async () => {
    if (!editingStation || !formData.name.trim()) return;

    try {
      await stationsAPI.update(editingStation.id, {
        name: formData.name,
        description: formData.description,
      });
      setEditingStation(null);
      setFormData({ name: '', description: '' });
      loadStations();
    } catch (error) {
      console.error('Error al actualizar estación:', error);
      alert('Error al actualizar estación');
    }
  };

  const handleToggleActive = async (station: Station) => {
    try {
      await stationsAPI.update(station.id, {
        is_active: !station.is_active,
      });
      loadStations();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar estado');
    }
  };

  // NOTA: Función handleDelete comentada por no estar en uso actualmente.
  // Descomentar si se necesita funcionalidad de eliminación permanente.
  /*
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar esta estación?')) return;

    try {
      await stationsAPI.delete(id);
      loadStations();
    } catch (error) {
      console.error('Error al eliminar estación:', error);
      alert('Error al eliminar estación');
    }
  };
  */

  const openEditModal = (station: Station) => {
    setEditingStation(station);
    setFormData({
      name: station.name,
      description: station.description || '',
    });
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaUtensils className="text-purple-600" />
            Estaciones de Preparación
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Gestiona las estaciones de cocina, bar, parrilla, etc.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <FaPlus />
          Nueva Estación
        </button>
      </div>

      {/* Lista de Estaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stations.map((station) => (
          <div
            key={station.id}
            className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 border-2 ${
              station.is_active ? 'border-green-200' : 'border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">🍳</span>
                  {station.name}
                </h3>
                {station.description && (
                  <p className="text-sm text-gray-600 mt-1">{station.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    station.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {station.is_active ? '✅ Activa' : '❌ Inactiva'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => openEditModal(station)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <FaEdit />
                Editar
              </button>
              <button
                onClick={() => handleToggleActive(station)}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  station.is_active
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {station.is_active ? <FaTimes /> : <FaCheck />}
                {station.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}

        {stations.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-gray-500 text-lg">No hay estaciones configuradas</p>
            <p className="text-gray-400 text-sm mt-2">Crea tu primera estación para comenzar</p>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {(showCreateModal || editingStation) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
              <h3 className="text-xl font-bold">
                {editingStation ? '✏️ Editar Estación' : '➕ Nueva Estación'}
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
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="Ej: Cocina Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  rows={3}
                  placeholder="Ej: Preparación de platos principales y entradas"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-b-xl flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingStation(null);
                  setFormData({ name: '', description: '' });
                }}
                className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={editingStation ? handleUpdate : handleCreate}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all"
              >
                {editingStation ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationManagement;

