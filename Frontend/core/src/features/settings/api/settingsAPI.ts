import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export const settingsAPI = {
  getSettings: async () => {
    const response = await axios.get(`${API_URL}/settings`);
    return response.data as Setting[];
  },

  getSetting: async (key: string) => {
    try {
      const response = await axios.get(`${API_URL}/settings/${key}`);
      return response.data as Setting;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  uploadImage: async (key: string, file: File, token: string) => {
    const formData = new FormData();
    formData.append('key', key);
    formData.append('image', file);

    const response = await axios.post(`${API_URL}/settings/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
    });
    return response.data;
  },

  verifyPassword: async (password: string, token: string) => {
    const response = await axios.post(`${API_URL}/auth/verify-password`, { password }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  updateSetting: async (key: string, value: string, token: string) => {
    const response = await axios.post(`${API_URL}/settings`, { key, value }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }
};
