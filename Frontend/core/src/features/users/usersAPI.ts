// =================================================================
// ARCHIVO 2: /src/features/users/usersAPI.ts (ACTUALIZADO)
// Propósito: Añadir funciones para actualizar y eliminar usuarios.
// =================================================================
import axios from 'axios';
import type { User, NewUser, UpdateUser } from '../../types/users';

const API_URL = 'http://localhost:8080/api/users';

// Función para obtener la lista de usuarios.
export const getUsers = async (token: string): Promise<User[]> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.get(API_URL, config);
  return response.data;
};

// Función para crear un nuevo usuario.
export const createUser = async (userData: NewUser, token: string): Promise<User> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.post(API_URL, userData, config);
  return response.data;
};

// Función para actualizar un usuario.
export const updateUser = async (userData: UpdateUser, token: string): Promise<User> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { id, ...updateData } = userData;
  const response = await axios.put(`${API_URL}/${id}`, updateData, config);
  return response.data;
};

// Función para eliminar un usuario.
export const deleteUser = async (userId: string, token: string): Promise<{ id: string }> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  await axios.delete(`${API_URL}/${userId}`, config);
  return { id: userId }; // Devolvemos el ID para saber cuál eliminar del estado
};