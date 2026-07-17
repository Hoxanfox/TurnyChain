import React, { useState, useEffect } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useEmployees } from './hooks/useEmployees';
import { EmployeeList } from './EmployeeList';
import { EmployeeFormModal } from './EmployeeFormModal';
import type { Employee } from './api/employeesAPI';

const EmployeeManagement: React.FC = () => {
  const {
    employees,
    isLoading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  } = useEmployees();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleSubmit = async (name: string, role: string) => {
    if (editingEmployee) {
      return await updateEmployee(editingEmployee.id, name, role, editingEmployee.is_active);
    } else {
      return await createEmployee(name, role);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Empleados</h2>
          <p className="text-gray-500 text-sm mt-1">
            Administra el personal del restaurante y sus roles.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-medium shadow-md shadow-cyan-500/20 transition-all active:scale-95"
        >
          <FiPlus size={20} />
          Nuevo Empleado
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchEmployees} className="text-sm font-medium hover:underline">
            Reintentar
          </button>
        </div>
      )}

      <EmployeeList
        employees={employees}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDelete={deleteEmployee}
      />

      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingEmployee}
      />
    </div>
  );
};

export default EmployeeManagement;
