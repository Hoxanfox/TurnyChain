import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_URL = '/api/backup';
const API_URL_FALLBACK = '/api/backups';

const withBaseURL = (path: string) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);

export interface CatalogRestoreResult {
  tables_imported: number;
  stations_imported: number;
  printers_imported: number;
  categories_imported: number;
  ingredients_imported: number;
  accompaniments_imported: number;
  menu_items_imported: number;
  menu_ingredient_links_imported: number;
  menu_accompaniment_links_imported: number;
  users_skipped: number;
  warning?: string;
}

export interface ImportCatalogResponse {
  message: string;
  result: CatalogRestoreResult;
}

const getAuthConfig = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const exportCatalogBackup = async (token: string) => {
  const config = {
    ...getAuthConfig(token),
    responseType: 'blob' as const,
  };

  try {
    return await axios.get(withBaseURL(`${API_URL}/catalog`), config);
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 404) {
      return axios.get(withBaseURL(`${API_URL_FALLBACK}/catalog`), config);
    }
    throw error;
  }
};

export const importCatalogBackup = async (token: string, file: File): Promise<ImportCatalogResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  };

  let response;
  try {
    response = await axios.post(withBaseURL(`${API_URL}/catalog/import`), formData, config);
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 404) {
      response = await axios.post(withBaseURL(`${API_URL_FALLBACK}/catalog/import`), formData, config);
    } else {
      throw error;
    }
  }

  return response.data as ImportCatalogResponse;
};
