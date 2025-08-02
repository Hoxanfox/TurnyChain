// =================================================================
// ARCHIVO 3: /src/features/users/usersAPI.ts (CORREGIDO)
// =================================================================
import axios from 'axios';
import type { User, NewUser, UpdateUser } from '../../types/users';

// CORRECCIÓN: Usamos una ruta relativa.
const API_URL = '/api/users';

export const getUsers = async (token: string): Promise<User[]> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.get(API_URL, config);
  return response.data;
};

export const createUser = async (userData: NewUser, token: string): Promise<User> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.post(API_URL, userData, config);
  return response.data;
};

export const updateUser = async (userData: UpdateUser, token: string): Promise<User> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { id, ...updateData } = userData;
  const response = await axios.put(`${API_URL}/${id}`, updateData, config);
  return response.data;
};

export const deleteUser = async (userId: string, token: string): Promise<{ id: string }> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  await axios.delete(`${API_URL}/${userId}`, config);
  return { id: userId };
};