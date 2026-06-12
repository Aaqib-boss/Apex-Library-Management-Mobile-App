import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, User, Notification, SystemSettings } from '../utils/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  notifications: Notification[];
  unreadCount: number;
  settings: SystemSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings | null>>;
  login: (email: string, password: string, expectedRole?: 'admin' | 'librarian' | 'member') => Promise<{ success: boolean; message?: string; user?: User; require2FA?: boolean; tempToken?: string; code?: string; userId?: string }>;
  verify2FA: (otpCode: string, tempToken: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  fetchSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Synchronize notifications if logged in
  useEffect(() => {
    if (token && user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [token, user]);

  // Synchronize settings if logged in
  useEffect(() => {
    if (token) {
      fetchSettings();
    } else {
      setSettings(null);
    }
  }, [token]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Refresh profile in background to verify token validity
        try {
          const profileData = await api.getProfile();
          if (profileData.success && profileData.user) {
            setUser(profileData.user);
            await AsyncStorage.setItem('user', JSON.stringify(profileData.user));
          }
        } catch (err) {
          // Token expired or server unreachable, clear session
          console.warn('Profile refresh failed during startup, logging out:', err);
          await logout();
        }
      }
    } catch (e) {
      console.error('Failed to load local auth credentials:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, expectedRole?: 'admin' | 'librarian' | 'member') => {
    try {
      let role: 'admin' | 'librarian' | 'member' = 'member';
      if (expectedRole) {
        role = expectedRole;
      } else if (email.includes('admin')) {
        role = 'admin';
      } else if (email.includes('librarian') || email.includes('lib')) {
        role = 'librarian';
      }

      const data = await api.login(email, password, role);
      if (data && data.require2FA) {
        return { success: true, require2FA: true, tempToken: data.tempToken, code: data.code, userId: data.userId };
      }
      if (data && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const verify2FA = async (otpCode: string, tempToken: string) => {
    try {
      const data = await api.verify2FA(otpCode, tempToken);
      if (data && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (error: any) {
      return { success: false, message: error.message || 'OTP verification failed' };
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (e) {
      console.error('Failed to clear credentials from storage:', e);
    }
  };

  const refreshUser = async () => {
    try {
      const profileData = await api.getProfile();
      if (profileData.success && profileData.user) {
        setUser(profileData.user);
        await AsyncStorage.setItem('user', JSON.stringify(profileData.user));
      }
    } catch (err) {
      console.error('Failed to refresh user profile data:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.getNotifications();
      if (data.success) {
        setNotifications(data.notifications);
        const unread = data.notifications.filter((n: any) => !n.readStatus).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications in AuthContext:', err);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const data = await api.markNotificationRead(id);
      if (data.success) {
        setNotifications(prev =>
          prev.map(n => (n._id === id ? { ...n, readStatus: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const data = await api.markAllNotificationsRead();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, readStatus: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await api.getSystemSettings();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error fetching settings in AuthContext:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        notifications,
        unreadCount,
        settings,
        setSettings,
        login,
        verify2FA,
        logout,
        refreshUser,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        fetchSettings
      }}
    >
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
