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

export interface EmployeeAttendance extends Employee {
  current_state: string;
  arrival_time?: string | null;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  action: string;
  timestamp: string;
}

export interface DailyAttendance {
  date: string;
  arrival_time?: string | null;
  departure_time?: string | null;
}

export interface AttendanceReport {
  employee_id: string;
  name: string;
  role: string;
  days_worked: number;
  records: DailyAttendance[];
}

export const attendanceApi = {
  getEmployees: async (): Promise<Employee[]> => {
    const response = await axios.get(`${API_URL}/employees`, getAuthHeaders());
    return response.data;
  },

  getTodayStatus: async (): Promise<EmployeeAttendance[]> => {
    const response = await axios.get(`${API_URL}/attendance/today`, getAuthHeaders());
    return response.data;
  },

  registerAttendance: async (employeeId: string, action: string, timestamp?: string): Promise<AttendanceRecord> => {
    const response = await axios.post(`${API_URL}/attendance`, {
      employee_id: employeeId,
      action: action,
      timestamp: timestamp,
    }, getAuthHeaders());
    return response.data;
  },

  updateTodayArrival: async (employeeId: string, timestamp: string): Promise<void> => {
    await axios.put(`${API_URL}/attendance/today`, {
      employee_id: employeeId,
      timestamp: timestamp,
    }, getAuthHeaders());
  },

  getAttendanceReport: async (startDate: string, endDate: string): Promise<AttendanceReport[]> => {
    const response = await axios.get(`${API_URL}/attendance/report?start_date=${startDate}&end_date=${endDate}`, getAuthHeaders());
    return response.data;
  },
};
