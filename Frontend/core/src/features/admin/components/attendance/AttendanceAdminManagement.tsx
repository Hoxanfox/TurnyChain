import React, { useState, useEffect } from 'react';
import { attendanceApi, type EmployeeAttendance } from '../../../cashier/api/attendanceApi';
import { FaCalendarAlt, FaCheck, FaTimes, FaUndo, FaClock, FaEdit, FaSave } from 'react-icons/fa';

const AttendanceAdminManagement: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [employees, setEmployees] = useState<EmployeeAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time editing state
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState<string>('');

  const loadAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await attendanceApi.getTodayStatus(selectedDate);
      setEmployees(data || []);
    } catch (err) {
      console.error('Error loading attendance', err);
      setError('No se pudo cargar la información de asistencia.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedDate]);

  const handleAction = async (employeeId: string, action: string) => {
    try {
      // Create a timestamp using the current time but applied to the selected date.
      // This ensures that sequential clicks generate sequential timestamps,
      // and actions made today get the actual current time.
      const now = new Date();
      const [year, month, day] = selectedDate.split('-');
      now.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      const timestamp = now.toISOString();

      await attendanceApi.registerAttendance(employeeId, action, timestamp);
      await loadAttendance(); // Re-sync with backend
    } catch (err) {
      console.error('Error registering attendance', err);
      setError('Error al registrar la asistencia.');
    }
  };

  const startEditingTime = (emp: EmployeeAttendance) => {
    setEditingTimeId(emp.id);
    if (emp.arrival_time) {
      const d = new Date(emp.arrival_time);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      setTempTime(`${hours}:${minutes}`);
    } else {
      setTempTime('');
    }
  };

  const saveEditedTime = async (empId: string) => {
    if (!tempTime) {
      setEditingTimeId(null);
      return;
    }
    
    // Create new Date object from selectedDate and tempTime
    const [hours, minutes] = tempTime.split(':');
    const customTime = new Date(`${selectedDate}T00:00:00`);
    customTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    const isoTime = customTime.toISOString();
    
    try {
      // NOTE: In the backend UpdateTodayArrival currently modifies the first record 
      // of the CURRENT DAY if it doesn't take the date into account. 
      // If we want it to work for past dates perfectly, we might need a specific endpoint. 
      // For now, we will use the generic attendance register to override or update.
      await attendanceApi.updateTodayArrival(empId, isoTime);
      await loadAttendance();
    } catch (err) {
      console.error("Error updating arrival time", err);
      setError('Error al actualizar la hora de llegada.');
    } finally {
      setEditingTimeId(null);
    }
  };

  const formatTimeStr = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Asistencias</h2>
          <p className="text-gray-500 text-sm mt-1">
            Administra las asistencias diarias estilo hoja de cálculo.
          </p>
        </div>
        
        <div className="flex items-center bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
          <FaCalendarAlt className="text-gray-400 mr-2" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="outline-none text-gray-700 bg-transparent font-medium"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-sm font-medium hover:underline">
            Cerrar
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No se encontraron empleados para gestionar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Empleado</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4">Hora Llegada</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                          emp.current_state === 'ENTRADA' ? 'bg-emerald-500' : 
                          emp.current_state === 'FALTA' ? 'bg-red-500' : 'bg-gray-400'
                        }`}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-800">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">{emp.role}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {emp.current_state === 'ENTRADA' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          <FaCheck size={10} /> Asistió
                        </span>
                      )}
                      {emp.current_state === 'FALTA' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                          <FaTimes size={10} /> Falta
                        </span>
                      )}
                      {emp.current_state !== 'ENTRADA' && emp.current_state !== 'FALTA' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                          Sin Marcar
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {emp.current_state === 'ENTRADA' ? (
                        editingTimeId === emp.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={tempTime}
                              onChange={(e) => setTempTime(e.target.value)}
                              className="px-2 py-1 border border-emerald-300 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                              autoFocus
                            />
                            <button onClick={() => saveEditedTime(emp.id)} className="text-emerald-600 hover:text-emerald-800" title="Guardar">
                              <FaSave size={16} />
                            </button>
                            <button onClick={() => setEditingTimeId(null)} className="text-gray-400 hover:text-gray-600" title="Cancelar">
                              <FaTimes size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg w-fit border border-emerald-100">
                            <FaClock className="text-emerald-500" />
                            {formatTimeStr(emp.arrival_time)}
                            <button 
                              onClick={() => startEditingTime(emp)}
                              className="ml-2 text-emerald-500 hover:text-emerald-700 transition-colors"
                              title="Editar Hora"
                            >
                              <FaEdit size={14} />
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {emp.current_state === 'FALTA' || emp.current_state === 'ENTRADA' ? (
                          <button
                            onClick={() => handleAction(emp.id, 'RESET')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-bold transition-colors"
                          >
                            <FaUndo size={12} /> Deshacer
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAction(emp.id, 'ENTRADA')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold transition-colors border border-emerald-200"
                            >
                              <FaCheck size={12} /> Llegó
                            </button>
                            <button
                              onClick={() => handleAction(emp.id, 'FALTA')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-xs font-bold transition-colors border border-red-200"
                            >
                              <FaTimes size={12} /> Faltó
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceAdminManagement;
