import client from './client'
import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse
} from '@/types'

export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const response = await client.post('/auth/login', credentials)
  return response.data
}

export async function register(
  credentials: RegisterCredentials
): Promise<AuthResponse> {
  const response = await client.post('/auth/register', credentials)
  return response.data
}