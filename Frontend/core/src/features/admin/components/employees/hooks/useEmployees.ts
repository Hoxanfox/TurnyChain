import { useState, useCallback } from 'react';
import { employeesAPI, type Employee } from '../api/employeesAPI';
import toast from 'react-hot-toast';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await employeesAPI.getEmployees();
      setEmployees(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar empleados');
      toast.error('Error al cargar empleados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEmployee = async (name: string, role: string) => {
    try {
      const newEmployee = await employeesAPI.createEmployee({ name, role });
      setEmployees((prev) => [...prev, newEmployee]);
      toast.success('Empleado creado exitosamente');
      return true;
    } catch (err) {
      toast.error('Error al crear empleado');
      return false;
    }
  };

  const updateEmployee = async (id: string, name: string, role: string, isActive: boolean) => {
    try {
      const updated = await employeesAPI.updateEmployee(id, { name, role, is_active: isActive });
      setEmployees((prev) => prev.map((emp) => (emp.id === id ? updated : emp)));
      toast.success('Empleado actualizado');
      return true;
    } catch (err) {
      toast.error('Error al actualizar empleado');
      return false;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await employeesAPI.deleteEmployee(id);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      toast.success('Empleado eliminado');
      return true;
    } catch (err) {
      toast.error('Error al eliminar empleado');
      return false;
    }
  };

  return {
    employees,
    isLoading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
};
