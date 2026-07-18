import React, { useState, useEffect } from 'react';
import {
  FiX as X,
  FiLock as Lock,
  FiUnlock as Unlock,
  FiCheckCircle as CheckCircle2,
  FiClock as Clock,
  FiUserCheck as UserCheck,
  FiEdit2 as Edit2,
  FiCheck as Check,
  FiBarChart2 as BarChart,
  FiCalendar as Calendar,
  FiChevronDown as ChevronDown,
  FiChevronUp as ChevronUp
} from 'react-icons/fi';
import { attendanceApi, type EmployeeAttendance, type AttendanceReport } from '../../api/attendanceApi';

interface AttendanceNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttendanceNotebookModal: React.FC<AttendanceNotebookModalProps> = ({ isOpen, onClose }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const [employees, setEmployees] = useState<EmployeeAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estado para la edición de la hora
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState<string>('');

  // Estado para Reportes/Historial
  const [showHistory, setShowHistory] = useState(false);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (isOpen && isUnlocked) {
      if (showHistory) {
        loadHistory();
      } else {
        loadEmployees();
      }
    }
    // Reset state on close
    if (!isOpen) {
      setIsUnlocked(false);
      setPin('');
      setError('');
      setEditingTimeId(null);
      setShowHistory(false);
    }
  }, [isOpen, isUnlocked, showHistory]);

  useEffect(() => {
    const handleWsUpdate = () => {
      if (isOpen && isUnlocked) {
        if (showHistory) {
          loadHistory();
        } else {
          loadEmployees();
        }
      }
    };

    window.addEventListener('attendance_updated', handleWsUpdate);
    return () => window.removeEventListener('attendance_updated', handleWsUpdate);
  }, [isOpen, isUnlocked, showHistory]);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await attendanceApi.getTodayStatus();
      setEmployees(data || []);
    } catch (err) {
      console.error('Error loading attendance', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await attendanceApi.getAttendanceReport(startDate, endDate);
      setReports(data || []);
    } catch (err) {
      console.error('Error loading history', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234' || pin === '0000') {
      setIsUnlocked(true);
      setError('');
    } else {
      setError('PIN incorrecto');
      setPin('');
    }
  };

  const handleAction = async (employeeId: string, action: string) => {
    try {
      await attendanceApi.registerAttendance(employeeId, action);
      // Siempre recargamos los datos para mantener el estado 100% sincronizado con el backend,
      // evitando inconsistencias al cambiar rápidamente de FALTA a RESET y a ENTRADA.
      await loadEmployees();
    } catch (err) {
      console.error('Error registering attendance', err);
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
      setTempTime("");
    }
  };

  const saveEditedTime = async (empId: string) => {
    if (!tempTime) {
      setEditingTimeId(null);
      return;
    }
    const today = new Date();
    const [hours, minutes] = tempTime.split(':');
    today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    const isoTime = today.toISOString();
    
    try {
      await attendanceApi.updateTodayArrival(empId, isoTime);
      setEmployees(prev =>
        prev.map(emp => (emp.id === empId ? { ...emp, arrival_time: isoTime } : emp))
      );
    } catch (error) {
      console.error("Error updating arrival time", error);
    } finally {
      setEditingTimeId(null);
    }
  };

  const formatTimeStr = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateStr = (dateString: string) => {
    const d = new Date(dateString + 'T00:00:00'); // Prevent timezone shift
    return d.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col h-[90vh] md:h-[80vh] overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Cuaderno de Asistencias</h2>
          </div>
          <div className="flex items-center gap-2">
            {isUnlocked && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-white/20"
              >
                {showHistory ? <UserCheck className="w-4 h-4" /> : <BarChart className="w-4 h-4" />}
                <span className="hidden sm:inline">{showHistory ? 'Registrar Hoy' : 'Ver Historial'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 relative">
          {!isUnlocked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center border border-gray-100">
                <div className="mx-auto bg-indigo-100 w-16 h-16 flex items-center justify-center rounded-full mb-6">
                  <Lock className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Bloqueado</h3>
                <p className="text-gray-500 mb-6 text-sm">
                  Ingresa tu PIN de administrador para abrir el cuaderno.
                </p>
                <form onSubmit={handleUnlock} className="flex flex-col gap-4">
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="****"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full text-center text-3xl tracking-widest p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-mono"
                    autoFocus
                    maxLength={4}
                  />
                  {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <Unlock className="w-5 h-5" />
                    Desbloquear
                  </button>
                </form>
              </div>
            </div>
          ) : showHistory ? (
            /* HISTORY VIEW */
            <div className="p-4 md:p-6 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-end gap-4 mb-2">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Desde</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Hasta</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button 
                  onClick={loadHistory}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Filtrar
                </button>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <BarChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No hay registros en este rango de fechas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(report => (
                    <div key={report.employee_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div 
                        onClick={() => setExpandedReportId(expandedReportId === report.employee_id ? null : report.employee_id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {report.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">{report.name}</h4>
                            <p className="text-sm text-gray-500">{report.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="block text-xl font-black text-indigo-600">{report.days_worked}</span>
                            <span className="text-xs text-gray-500 font-semibold uppercase">Días</span>
                          </div>
                          {expandedReportId === report.employee_id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </div>
                      </div>
                      
                      {expandedReportId === report.employee_id && (
                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                          {report.records.length > 0 ? (
                            <table className="w-full text-sm text-left">
                              <thead>
                                <tr className="text-gray-500 border-b border-gray-200">
                                  <th className="py-2 font-semibold">Fecha</th>
                                  <th className="py-2 font-semibold text-emerald-600">Entrada</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {report.records.map((rec, idx) => (
                                  <tr key={idx}>
                                    <td className="py-2 font-medium text-gray-700 capitalize">{formatDateStr(rec.date)}</td>
                                    <td className="py-2 text-emerald-700 font-medium">{formatTimeStr(rec.arrival_time)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-2">Sin asistencia registrada.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TODAY VIEW */
            <div className="p-4 md:p-6 flex flex-col gap-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-20">
                  <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No hay empleados registrados.</p>
                </div>
              ) : (
                employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 ${
                        emp.current_state === 'ENTRADA' ? 'bg-emerald-500' : emp.current_state === 'FALTA' ? 'bg-red-500' : 'bg-gray-400'
                      }`}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">{emp.name}</h4>
                        <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500 mt-1">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                            {emp.role}
                          </span>
                          <span>•</span>
                          <span className={`font-semibold ${
                            emp.current_state === 'ENTRADA' ? 'text-emerald-600' : emp.current_state === 'FALTA' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {emp.current_state === 'ENTRADA' ? 'Asistió' : emp.current_state === 'FALTA' ? 'Falta (No Llegó)' : 'Sin marcar'}
                          </span>
                          
                          {/* Hora de llegada y Edición */}
                          {emp.current_state === 'ENTRADA' && (
                            <>
                              <span className="text-gray-300 hidden sm:inline">|</span>
                              {editingTimeId === emp.id ? (
                                <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded">
                                  <input 
                                    type="time" 
                                    value={tempTime}
                                    onChange={(e) => setTempTime(e.target.value)}
                                    className="border border-emerald-300 rounded px-1 py-0.5 text-xs text-emerald-800 outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                                  />
                                  <button 
                                    onClick={() => saveEditedTime(emp.id)}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => setEditingTimeId(null)}
                                    className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Llegó a las {formatTimeStr(emp.arrival_time)}</span>
                                  <button 
                                    onClick={() => startEditingTime(emp)}
                                    className="ml-1 p-1 hover:bg-emerald-200 rounded-full transition-colors text-emerald-600"
                                    title="Editar hora de llegada"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0 mt-3 sm:mt-0">
                      {emp.current_state === 'FALTA' ? (
                        <button
                          onClick={() => handleAction(emp.id, 'RESET')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
                        >
                          <X className="w-4 h-4" />
                          <span>Deshacer Falta</span>
                        </button>
                      ) : emp.current_state === 'ENTRADA' ? (
                        <button
                          onClick={() => handleAction(emp.id, 'RESET')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
                        >
                          <X className="w-4 h-4" />
                          <span>Deshacer Asistencia</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAction(emp.id, 'FALTA')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm"
                          >
                            <X className="w-4 h-4" />
                            <span>No Llegó</span>
                          </button>

                          <button
                            onClick={() => handleAction(emp.id, 'ENTRADA')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Entrada</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
