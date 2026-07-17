import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export interface Employee {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
}

export const employeesAPI = {
  getEmployees: async (): Promise<Employee[]> => {
    const response = await axios.get(`${API_URL}/employees`, getAuthHeaders());
    return response.data;
  },

  createEmployee: async (data: { name: string; role: string }): Promise<Employee> => {
    const response = await axios.post(`${API_URL}/employees`, data, getAuthHeaders());
    return response.data;
  },

  updateEmployee: async (id: string, data: { name: string; role: string; is_active: boolean }): Promise<Employee> => {
    const response = await axios.put(`${API_URL}/employees/${id}`, data, getAuthHeaders());
    return response.data;
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/employees/${id}`, getAuthHeaders());
  },
};
