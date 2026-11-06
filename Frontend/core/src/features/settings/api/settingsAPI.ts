import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export const settingsAPI = {
  getSettings: async (): Promise<Setting[]> => {
    const response = await axios.get(`${API_URL}/settings`);
    return response.data as Setting[];
  },

  getSetting: async (key: string): Promise<Setting | null> => {
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
    const response = await axios.post(`${API_URL}/settings/upload-image`, formData, auth(token));
    return response.data as { url: string };
  },

  verifyPassword: async (password: string, token: string) => {
    const response = await axios.post(`${API_URL}/auth/verify-password`, { password }, auth(token));
    return response.data;
  },

  updateSetting: async (key: string, value: string, token: string) => {
    const response = await axios.post(`${API_URL}/settings`, { key, value }, auth(token));
    return response.data;
  },
};
