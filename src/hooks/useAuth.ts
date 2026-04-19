'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient, AuthResponse, UserResponse } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const currentUser = await apiClient.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch (err) {
          // Token might be expired, clear it
          await apiClient.logout();
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const register = useCallback(
    async (telegramId: string, username: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const newUser = await apiClient.register(telegramId, username);
        setUser(newUser);
        // After registration, login to get tokens
        const auth = await apiClient.login(telegramId);
        setIsAuthenticated(true);
        router.push('/dashboard');
        return auth;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const login = useCallback(
    async (telegramId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const auth = await apiClient.login(telegramId);
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        router.push('/dashboard');
        return auth;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    await apiClient.logout();
    setUser(null);
    setIsAuthenticated(false);
    router.push('/auth/login');
  }, [router]);

  return {
    isAuthenticated,
    user,
    isLoading,
    error,
    register,
    login,
    logout,
  };
}
