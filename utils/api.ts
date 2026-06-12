import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://mern-web-based-library-management-system.onrender.com/api';

export interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'librarian' | 'member';
  status: 'active' | 'blocked';
  phone?: string;
  address?: string;
  joinDate?: string;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  rackNumber: string;
  availableCopies: number;
  totalCopies: number;
  coverImage?: string;
  coverUrl?: string;
  description?: string;
}

export interface Loan {
  _id: string;
  bookId: Book | null;
  userId: User | null;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'active' | 'returned' | 'overdue';
  fineAmount: number;
  fineStatus: 'none' | 'unpaid' | 'paid';
}

export interface Reservation {
  _id: string;
  bookId: Book | null;
  userId: User | null;
  reservationDate: string;
  status: 'pending' | 'active' | 'cancelled' | 'completed';
}

export interface DashboardMetrics {
  borrowedBooks: number;
  activeHolds: number;
  pendingFines: number;
}

export interface Notification {
  _id: string;
  userId: string | User | null;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
  readStatus: boolean;
}

export interface SystemSettings {
  libraryName: string;
  address: string;
  phone: string;
  email: string;
  fineRatePerDay: number;
  maxActiveLoans: number;
  loanDurationDays: number;
  is2FAEnforcedForStaff: boolean;
  isSelfRegistrationEnabled: boolean;
  isBruteForceLimiterEnabled: boolean;
  isLoanLimitEnforced: boolean;
  description?: string;
  whatsappUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  branches?: string;
  workingHours?: string;
  mapEmbedUrl?: string;
  customSocialLinks?: Array<{ platform: string; url: string }>;
  features: Array<{ id: string; key: string; name: string; description: string; enabled: boolean; isSystem: boolean }>;
}

export interface AuditLog {
  _id: string;
  userId: User | null;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

// Helper to retrieve auth headers with JWT token
const getAuthHeaders = async (): Promise<HeadersInit> => {
  try {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  } catch (error) {
    console.error('Error fetching token from storage:', error);
    return { 'Content-Type': 'application/json' };
  }
};

export const api = {
  // Authentication
  login: async (email: string, password: string, expectedRole: 'admin' | 'librarian' | 'member') => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, expectedRole })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },

  verify2FA: async (otpCode: string, tempToken: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otpCode, tempToken })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid OTP');
    return data;
  },

  // Get current user profile info
  getProfile: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/members/profile`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch profile');
    return data;
  },

  // Get dashboard metrics
  getDashboardMetrics: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/dashboard`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch dashboard metrics');
    return data;
  },

  // Books Catalog Search
  getCatalog: async (search = '', category = 'All'): Promise<Book[]> => {
    const headers = await getAuthHeaders();
    const queryParams = new URLSearchParams({
      search,
      category: category === 'All' ? '' : category,
      limit: '100'
    }).toString();
    const res = await fetch(`${API_BASE_URL}/books?${queryParams}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to search catalog');
    return data.books || [];
  },

  // Loan Transactions List
  getLoans: async (): Promise<Loan[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/loans`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch transactions');
    return data.loans || [];
  },

  // Reservations List
  getReservations: async (): Promise<Reservation[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/reservations`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch reservations');
    return data.reservations || [];
  },

  // Place Hold Reservation
  placeHold: async (bookId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/reservations/reserve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bookId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to place hold');
    return data;
  },

  // Cancel Hold Reservation
  cancelHold: async (reservationId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/reservations/cancel/${reservationId}`, {
      method: 'POST',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to cancel hold');
    return data;
  },

  // Return Book immediately (Member/Admin)
  returnBook: async (loanId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/loans/return`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ loanId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to process return');
    return data;
  },

  // Pay Overdue Fine
  payFine: async (loanId: string, paymentAmount: number) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/loans/pay-fine`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ loanId, paymentAmount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Fine payment failed');
    return data;
  },

  // Admin: Get all members
  getMembers: async (): Promise<User[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/members`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch members list');
    return data.members || [];
  },

  // Admin: Block/Unblock member status
  updateMemberStatus: async (memberId: string, status: 'active' | 'blocked') => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/members/${memberId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update member status');
    return data;
  },

  // Admin: Delete user account
  deleteUser: async (userId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/members/${userId}`, {
      method: 'DELETE',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete user');
    return data;
  },

  // Admin/Librarian: Add Book
  addBook: async (bookData: { title: string; author: string; category: string; isbn: string; quantity: number; rackNumber: string; coverUrl?: string; description?: string }) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bookData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add book');
    return data;
  },

  // Admin/Librarian: Update Book
  updateBook: async (bookId: string, bookData: { title: string; author: string; category: string; isbn: string; quantity: number; rackNumber: string; coverUrl?: string; description?: string }) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/books/${bookId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(bookData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update book');
    return data;
  },

  // Admin/Librarian: Delete Book
  deleteBook: async (bookId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/books/${bookId}`, {
      method: 'DELETE',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete book');
    return data;
  },

  // Admin/Librarian: Issue Book
  issueBook: async (bookId: string, memberId: string, dueDate: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/loans/issue`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bookId, memberId, dueDate })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to issue book');
    return data;
  },

  // Admin/Librarian: Update Reservation Status (Approve/Reject)
  updateReservationStatus: async (reservationId: string, status: 'active' | 'rejected') => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/reservations/${reservationId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update reservation status');
    return data;
  },

  // Admin: Approve Librarian/Staff request
  approveLibrarian: async (memberId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/members/${memberId}/approve`, {
      method: 'PUT',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to approve staff account');
    return data;
  },

  // Admin: Create User
  createUser: async (userData: any) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/members`, {
      method: 'POST',
      headers,
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create user');
    return data;
  },

  // User Profile: Update Profile
  updateProfile: async (profileData: { name: string; phone: string; address: string; avatar?: string }) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/members/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile');
    return data;
  },

  // User Profile: Change Password
  changePassword: async (currentPassword?: string, newPassword?: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/members/profile/password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to change password');
    return data;
  },

  // Notifications
  getNotifications: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/notifications`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch notifications');
    return data;
  },

  markNotificationRead: async (notificationId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to mark notification as read');
    return data;
  },

  markAllNotificationsRead: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PUT',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to mark all notifications as read');
    return data;
  },

  // System Settings
  getSystemSettings: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/system/settings`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch settings');
    return data;
  },

  updateSystemSettings: async (settingsData: any) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/system/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(settingsData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update settings');
    return data;
  },

  // Audit Logs
  getSystemLogs: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/system/logs`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch system logs');
    return data;
  },

  deleteSystemLog: async (logId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/system/logs/${logId}`, {
      method: 'DELETE',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete log entry');
    return data;
  },

  clearSystemLogs: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/system/logs`, {
      method: 'DELETE',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to clear system logs');
    return data;
  },

  resetSystemLogs: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/system/logs/reset`, {
      method: 'POST',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to reset system logs');
    return data;
  },

  // Backup & Restore
  getSystemBackup: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/system/backup`, {
      method: 'POST',
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to generate system backup');
    return data;
  },

  restoreSystemBackup: async (backupData: any) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/system/restore`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ backupData })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to restore system backup');
    return data;
  }
};

