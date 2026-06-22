import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  department?: string;
  semester?: number;
  phone?: string;
  avatar: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  studentIdImage?: string;
  wishlist?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerUser: (formData: any) => Promise<void>;
  googleLoginSuccess: (credential: string) => Promise<void>;
  logout: () => void;
  uploadIdCard: (file: File) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure global Axios headers
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  const refreshProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      if (response.data.success) {
        setUser({
          id: response.data.user._id,
          ...response.data.user
        });
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      logout();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          await refreshProfile();
        } catch (error) {
          console.error('Init Auth error:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (response.data.success) {
        const { token: userToken, user: userData } = response.data;
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(userData);
      }
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const registerUser = async (formData: any) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, formData);
      if (response.data.success) {
        const { token: userToken, user: userData } = response.data;
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(userData);
      }
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const googleLoginSuccess = async (credential: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/google`, { credential });
      if (response.data.success) {
        const { token: userToken, user: userData } = response.data;
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(userData);
      }
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.message || 'Google authentication failed');
    }
  };

  const uploadIdCard = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('studentIdImage', file);

      const response = await axios.put(`${API_URL}/auth/verify`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        await refreshProfile();
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'ID Upload failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      registerUser,
      googleLoginSuccess,
      logout,
      uploadIdCard,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
