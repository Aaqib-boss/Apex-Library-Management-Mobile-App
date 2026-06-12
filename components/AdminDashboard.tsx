import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  TextInput,
  Image,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, User, Book, Loan, Reservation, SystemSettings, AuditLog } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'Technology', 'Fantasy', 'Fiction', 'Science', 'Biography'];
const BOOK_CATEGORIES_WITHOUT_ALL = ['Technology', 'Fantasy', 'Fiction', 'Science', 'Biography'];

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // Tab selector state
  const [activeTab, setActiveTab] = useState<'users' | 'books' | 'loans' | 'settings' | 'logs' | 'analytics'>('users');
  
  // Sub-tabs
  const [directoryTab, setDirectoryTab] = useState<'active' | 'pending'>('active');
  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'policies' | 'contact' | 'socials' | 'branches' | 'features'>('profile');
  
  // Datasets
  const [members, setMembers] = useState<User[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [genreData, setGenreData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Shared States
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Settings state matching web
  const [sysSettings, setSysSettings] = useState<SystemSettings>({
    libraryName: 'Apex Library',
    address: '123 Library St, Cityville',
    phone: '+1 (555) 123-4567',
    email: 'info@apexlibrary.com',
    fineRatePerDay: 1.0,
    maxActiveLoans: 5,
    loanDurationDays: 14,
    is2FAEnforcedForStaff: true,
    isSelfRegistrationEnabled: true,
    isBruteForceLimiterEnabled: true,
    isLoanLimitEnforced: true,
    description: 'Your premium neighborhood knowledge hub and archive center.',
    whatsappUrl: 'https://www.whatsapp.com',
    instagramUrl: 'https://www.instagram.com',
    twitterUrl: 'https://x.com',
    facebookUrl: 'https://www.facebook.com',
    branches: 'Central Hub - 123 Library St\nEastside Study - 45 East Ave\nWestside Annex - 78 West Blvd',
    workingHours: 'Mon - Sat: 8:00 AM – 6:00 PM\nSunday: Closed',
    mapEmbedUrl: '',
    customSocialLinks: [],
    features: [
      { id: '2fa', key: 'is2FAEnforcedForStaff', name: 'Staff Two-Factor Authentication (2FA)', description: 'Require staff to enter a simulated 6-digit OTP code sent to their alerts inbox upon login.', enabled: true, isSystem: true },
      { id: 'registration', key: 'isSelfRegistrationEnabled', name: 'Allow Member Self-Registration', description: 'Show registration forms and allow new members to self-register accounts on the login portal.', enabled: true, isSystem: true },
      { id: 'lockout', key: 'isBruteForceLimiterEnabled', name: 'Enforce Brute-Force Password Lockout', description: 'Automatically lock accounts for 15 minutes after 5 consecutive failed login attempts.', enabled: true, isSystem: true },
      { id: 'loan_limit', key: 'isLoanLimitEnforced', name: 'Enforce Member Book Loan Limits', description: 'Strictly prevent checkout transactions if a member has reached the maximum active loan capacity.', enabled: true, isSystem: true },
      { id: 'reviews', key: 'isReviewsEnabled', name: 'Book Ratings & Reviews', description: 'Allow library members to rate and review books from the catalog.', enabled: true, isSystem: false },
      { id: 'ebooks', key: 'isEbooksEnabled', name: 'Digital eBook Previews', description: 'Allow library members to view digital previews of book chapters.', enabled: true, isSystem: false },
      { id: 'rooms', key: 'isRoomsEnabled', name: 'Study Room booking', description: 'Allow library members to book study spaces and computer desks online.', enabled: true, isSystem: false },
      { id: 'fines', key: 'isFinesEnabled', name: 'Online Late Fee Payment', description: 'Allow members to pay off accumulated fines using simulated payment cards.', enabled: true, isSystem: false }
    ]
  });

  // Settings: New Custom Feature Form States
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDesc, setNewFeatureDesc] = useState('');
  const [newFeatureType, setNewFeatureType] = useState('custom');

  // Add User Form States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserAddress, setNewUserAddress] = useState('');
  const [newUserRole, setNewUserRole] = useState<'member' | 'librarian'>('member');
  const [creatingUser, setCreatingUser] = useState(false);

  // Digital Card Modal
  const [selectedMemberForCard, setSelectedMemberForCard] = useState<User | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // Book Add/Edit Modal
  const [showBookModal, setShowBookModal] = useState(false);
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCategory, setBookCategory] = useState('Technology');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookQty, setBookQty] = useState('1');
  const [bookRack, setBookRack] = useState('A-1');
  const [bookCoverUrl, setBookCoverUrl] = useState('');
  const [bookDesc, setBookDesc] = useState('');
  const [savingBook, setSavingBook] = useState(false);
  const [isbnLoading, setIsbnLoading] = useState(false);

  // Issue Book Modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBookForIssue, setSelectedBookForIssue] = useState<Book | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issuing, setIssuing] = useState(false);

  // Restore DB Input simulation
  const [restoreJsonText, setRestoreJsonText] = useState('');
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, directoryTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const list = await api.getMembers();
        setMembers(list);
      } else if (activeTab === 'books') {
        const list = await api.getCatalog(searchQuery);
        setBooks(list);
      } else if (activeTab === 'loans') {
        const loanList = await api.getLoans();
        setLoans(loanList);
        const resvList = await api.getReservations();
        setReservations(resvList);
        const list = await api.getMembers();
        setMembers(list.filter(m => m.role === 'member' && m.status === 'active'));
      } else if (activeTab === 'settings') {
        const data = await api.getSystemSettings();
        if (data.success && data.settings) {
          setSysSettings(data.settings);
        }
      } else if (activeTab === 'logs') {
        setLogsLoading(true);
        const data = await api.getSystemLogs();
        if (data.success) {
          setAuditLogs(data.logs || []);
        }
        setLogsLoading(false);
      } else if (activeTab === 'analytics') {
        const data = await api.getDashboardMetrics();
        if (data.success) {
          setMetrics(data.metrics);
          setGenreData(data.genreData || []);
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to retrieve requested administrative dataset.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
  };

  // Google Books Resolver
  const handleIsbnBlur = async () => {
    if (!bookIsbn || bookIsbn.length < 10) return;
    setIsbnLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${bookIsbn}`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        setBookTitle(info.title || '');
        setBookAuthor(info.authors ? info.authors.join(', ') : '');
        setBookDesc(info.description ? info.description.substring(0, 300) + '...' : '');
        if (info.imageLinks && info.imageLinks.thumbnail) {
          setBookCoverUrl(info.imageLinks.thumbnail.replace('http://', 'https://'));
        }
        if (info.categories && info.categories.length > 0) {
          const cat = info.categories[0].toLowerCase();
          if (cat.includes('computer') || cat.includes('tech')) setBookCategory('Technology');
          else if (cat.includes('science')) setBookCategory('Science');
          else if (cat.includes('fantasy') || cat.includes('fiction')) setBookCategory('Fantasy');
          else if (cat.includes('biography')) setBookCategory('Biography');
          else setBookCategory('Fiction');
        }
        Alert.alert('Success', 'Google Books metadata auto-filled!');
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setIsbnLoading(false);
    }
  };

  // Save Book
  const handleSaveBook = async () => {
    if (!bookTitle || !bookAuthor || !bookIsbn || !bookQty) {
      Alert.alert('Validation Error', 'Required details are missing.');
      return;
    }
    setSavingBook(true);
    try {
      const payload = {
        title: bookTitle,
        author: bookAuthor,
        category: bookCategory,
        isbn: bookIsbn,
        quantity: parseInt(bookQty, 10),
        rackNumber: bookRack,
        coverUrl: bookCoverUrl,
        description: bookDesc
      };
      if (editBookId) {
        await api.updateBook(editBookId, payload);
        Alert.alert('Success', 'Book updated.');
      } else {
        await api.addBook(payload);
        Alert.alert('Success', 'Book added.');
      }
      setShowBookModal(false);
      clearBookForm();
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save book.');
    } finally {
      setSavingBook(false);
    }
  };

  const clearBookForm = () => {
    setEditBookId(null);
    setBookTitle('');
    setBookAuthor('');
    setBookCategory('Technology');
    setBookIsbn('');
    setBookQty('1');
    setBookRack('A-1');
    setBookCoverUrl('');
    setBookDesc('');
  };

  const handleEditBook = (book: Book) => {
    setEditBookId(book._id);
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookCategory(book.category);
    setBookIsbn(book.isbn);
    setBookQty(book.totalCopies?.toString() || '1');
    setBookRack(book.rackNumber);
    setBookCoverUrl(book.coverImage || book.coverUrl || '');
    setBookDesc(book.description || '');
    setShowBookModal(true);
  };

  const handleDeleteBook = (book: Book) => {
    Alert.alert(
      '⚠️ Delete Book',
      `Delete "${book.title}" from catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.deleteBook(book._id);
              Alert.alert('Deleted', 'Book removed.');
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete book.');
              fetchData();
            }
          }
        }
      ]
    );
  };

  const handleOpenIssue = (book: Book) => {
    setSelectedBookForIssue(book);
    setSelectedMemberId('');
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14);
    setDueDate(defaultDue.toISOString().split('T')[0]);
    setShowIssueModal(true);
  };

  const handleIssueSubmit = async () => {
    if (!selectedBookForIssue || !selectedMemberId || !dueDate) {
      Alert.alert('Validation Error', 'Fields are incomplete.');
      return;
    }
    setIssuing(true);
    try {
      await api.issueBook(selectedBookForIssue._id, selectedMemberId, dueDate);
      Alert.alert('Success', 'Book checked out!');
      setShowIssueModal(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Error checking out book.');
    } finally {
      setIssuing(false);
    }
  };

  const handleReturnBook = async (loanId: string) => {
    Alert.alert(
      'Return Book',
      'Process return ledger entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);
              const data = await api.returnBook(loanId);
              if (data.success) {
                Alert.alert('Returned', `Book returned. Late fine computed: $${(data.fineAmount || 0).toFixed(2)}`);
                fetchData();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to return.');
              fetchData();
            }
          }
        }
      ]
    );
  };

  const handleApproveReservation = async (reservation: Reservation) => {
    try {
      setLoading(true);
      await api.updateReservationStatus(reservation._id, 'active');
      Alert.alert('Approved', 'Hold status upgraded.');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed.');
      fetchData();
    }
  };

  const handleRejectReservation = async (reservation: Reservation) => {
    try {
      setLoading(true);
      await api.updateReservationStatus(reservation._id, 'rejected');
      Alert.alert('Rejected', 'Request removed.');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed.');
      fetchData();
    }
  };

  // User management
  const handleToggleBlock = async (member: User) => {
    const nextStatus = member.status === 'blocked' ? 'active' : 'blocked';
    try {
      setLoading(true);
      const res = await api.updateMemberStatus(member._id, nextStatus);
      if (res.success) {
        Alert.alert('Updated', `User status updated to ${nextStatus}.`);
        fetchData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed.');
      fetchData();
    }
  };

  const handleDeleteUser = async (member: User) => {
    Alert.alert(
      '⚠️ Delete User',
      `Permanently delete user "${member.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.deleteUser(member._id);
              Alert.alert('Deleted', 'Account deleted.');
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed.');
              fetchData();
            }
          }
        }
      ]
    );
  };

  const handleApproveLibrarian = async (member: User) => {
    try {
      setLoading(true);
      await api.approveLibrarian(member._id);
      Alert.alert('Approved', `Staff approved for "${member.name}".`);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed.');
      fetchData();
    }
  };

  const handleRejectLibrarian = async (member: User) => {
    try {
      setLoading(true);
      await api.deleteUser(member._id);
      Alert.alert('Rejected', 'Staff request rejected and deleted.');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed.');
      fetchData();
    }
  };

  const handleAddUserSubmit = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserPhone || !newUserAddress) {
      Alert.alert('Validation Error', 'Fields are incomplete.');
      return;
    }
    setCreatingUser(true);
    try {
      await api.createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        phone: newUserPhone,
        address: newUserAddress,
        role: newUserRole
      });
      Alert.alert('Success', 'User account created!');
      setShowAddUserModal(false);
      clearAddUserForm();
      fetchData();
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Failed.');
    } finally {
      setCreatingUser(false);
    }
  };

  const clearAddUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserPhone('');
    setNewUserAddress('');
    setNewUserRole('member');
  };

  // Settings save handler
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await api.updateSystemSettings(sysSettings);
      if (res.success) {
        Alert.alert('Success', 'Global system settings saved successfully!');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save system settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Audit compliance logs handlers
  const handleDeleteLog = async (logId: string) => {
    Alert.alert(
      'Delete Log Record',
      'Remove this log entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              await api.deleteSystemLog(logId);
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed.');
              fetchData();
            }
          }
        }
      ]
    );
  };

  const handleClearLogs = async () => {
    Alert.alert(
      '⚠️ Clear Logs',
      'Permanently delete all audit log records? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.clearSystemLogs();
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed.');
              fetchData();
            }
          }
        }
      ]
    );
  };

  const handleResetLogs = async () => {
    try {
      setLoading(true);
      await api.resetSystemLogs();
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed.');
      fetchData();
    }
  };

  // Backups and restoration console
  const handleGenerateBackup = async () => {
    try {
      const res = await api.getSystemBackup();
      if (res.success) {
        const text = JSON.stringify(res.backupData, null, 2);
        setRestoreJsonText(text);
        Alert.alert(
          'Backup Generated',
          'JSON backup dump generated and pasted in the text area below. Copy it to save locally.',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed.');
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreJsonText.trim()) {
      Alert.alert('Validation Error', 'Paste backup JSON payload first.');
      return;
    }
    setRestoring(true);
    try {
      const backupData = JSON.parse(restoreJsonText);
      const res = await api.restoreSystemBackup(backupData);
      if (res.success) {
        Alert.alert('Success', 'Database restored successfully!');
        setRestoreJsonText('');
        fetchData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Invalid backup JSON payload file format.');
    } finally {
      setRestoring(false);
    }
  };

  const getQRCodeUrl = (memberId: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${memberId}`;
  };

  // Filter lists based on search
  const displayedMembers = members.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = q === '' || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.phone?.includes(q);
    if (!matchesSearch) return false;

    if (directoryTab === 'pending') {
      return m.role === 'librarian' && m.status === 'blocked'; // on backend pending librarian status is blocked/pending
    } else {
      return !(m.role === 'librarian' && m.status === 'blocked');
    }
  });

  const getActionBadgeColor = (action: string) => {
    const successActions = ['USER_LOGIN', 'LOGIN_SUCCESS_2FA', 'LOAN_ISSUE', 'LOAN_RETURN', 'LOAN_FINE_PAY', 'LIBRARIAN_APPROVE', 'MEMBER_UNBLOCK'];
    const infoActions = ['BOOK_ADD', 'BOOK_UPDATE', 'PROFILE_UPDATE', 'PASSWORD_CHANGE', 'PASSWORD_RESET_SUCCESS', 'RESERVE_PLACE', 'RESERVE_CANCEL', 'MEMBER_CREATE'];
    const dangerActions = ['BOOK_DELETE', 'MEMBER_DELETE', 'USER_DELETE', 'SYSTEM_RESTORE', 'SYSTEM_LOGS_CLEAR'];
    if (successActions.includes(action)) return '#10b981';
    if (infoActions.includes(action)) return '#3b82f6';
    if (dangerActions.includes(action)) return '#ef4444';
    return '#f59e0b';
  };

  return (
    <View style={styles.container}>
      {/* Top Main Navigation Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContentContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'users' && styles.tabButtonActive]} onPress={() => { setActiveTab('users'); setSearchQuery(''); }}>
            <Text style={[styles.tabButtonText, activeTab === 'users' && styles.tabButtonTextActive]}>👥 Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'books' && styles.tabButtonActive]} onPress={() => { setActiveTab('books'); setSearchQuery(''); }}>
            <Text style={[styles.tabButtonText, activeTab === 'books' && styles.tabButtonTextActive]}>📚 Books</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'loans' && styles.tabButtonActive]} onPress={() => { setActiveTab('loans'); setSearchQuery(''); }}>
            <Text style={[styles.tabButtonText, activeTab === 'loans' && styles.tabButtonTextActive]}>🔄 Loans</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]} onPress={() => { setActiveTab('settings'); setSearchQuery(''); }}>
            <Text style={[styles.tabButtonText, activeTab === 'settings' && styles.tabButtonTextActive]}>⚙️ Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'logs' && styles.tabButtonActive]} onPress={() => { setActiveTab('logs'); setSearchQuery(''); }}>
            <Text style={[styles.tabButtonText, activeTab === 'logs' && styles.tabButtonTextActive]}>📜 Audit Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'analytics' && styles.tabButtonActive]} onPress={() => { setActiveTab('analytics'); setSearchQuery(''); }}>
            <Text style={[styles.tabButtonText, activeTab === 'analytics' && styles.tabButtonTextActive]}>📈 Stats</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main content body */}
      <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {loading && activeTab !== 'logs' ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <View style={{ paddingBottom: 30 }}>

            {/* TAB 1: USERS DIRECTORY */}
            {activeTab === 'users' && (
              <View style={styles.paneContainer}>
                {/* Directory Sub Tabs */}
                <View style={styles.subTabsRow}>
                  <TouchableOpacity style={[styles.subTabBtn, directoryTab === 'active' && styles.subTabBtnActive]} onPress={() => setDirectoryTab('active')}>
                    <Text style={[styles.subTabBtnText, directoryTab === 'active' && styles.subTabBtnTextActive]}>Active Directory</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.subTabBtn, directoryTab === 'pending' && styles.subTabBtnActive]} onPress={() => setDirectoryTab('pending')}>
                    <Text style={[styles.subTabBtnText, directoryTab === 'pending' && styles.subTabBtnTextActive]}>Staff Requests</Text>
                  </TouchableOpacity>
                </View>

                {/* Toolbar */}
                <View style={styles.toolbarRow}>
                  <TextInput 
                    style={styles.searchInput} 
                    placeholder="Search by name, email..." 
                    placeholderTextColor="#8a8f9d" 
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity style={styles.searchIconBtn} onPress={handleSearch}>
                    <Text style={{ color: '#fff' }}>🔍</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnCreateUser} onPress={() => { clearAddUserForm(); setShowAddUserModal(true); }}>
                    <Text style={styles.btnCreateUserText}>＋ Create</Text>
                  </TouchableOpacity>
                </View>

                {/* List */}
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                  {displayedMembers.length === 0 ? (
                    <Text style={styles.emptyText}>No users matched current parameters.</Text>
                  ) : (
                    displayedMembers.map((item) => (
                      <View key={item._id} style={styles.recordCard}>
                        <View style={styles.recordHeaderCompact}>
                          <View style={styles.avatarLeft}>
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.recordTitle}>{item.name}</Text>
                            <Text style={styles.recordSubtitle}>{item.email}</Text>
                          </View>
                        </View>
                        <View style={styles.recordDetailsRow}>
                          <Text style={styles.infoText}>Role: <Text style={styles.boldText}>{item.role === 'admin' ? 'Admin' : item.role === 'librarian' ? 'Staff' : 'Member'}</Text></Text>
                          <Text style={[styles.badge, item.status === 'blocked' ? styles.badgeBlocked : styles.badgeActive]}>
                            {item.status}
                          </Text>
                        </View>

                        {directoryTab === 'pending' ? (
                          <View style={styles.btnRow}>
                            <TouchableOpacity style={[styles.actionBtn, styles.btnSuccess]} onPress={() => handleApproveLibrarian(item)}>
                              <Text style={styles.actionBtnText}>✓ Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, styles.btnDanger]} onPress={() => handleRejectLibrarian(item)}>
                              <Text style={styles.actionBtnText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.btnRow}>
                            <TouchableOpacity style={[styles.actionBtn, styles.btnCardColor]} onPress={() => { setSelectedMemberForCard(item); setShowCardModal(true); }}>
                              <Text style={styles.actionBtnText}>🪪 Card</Text>
                            </TouchableOpacity>
                            {item.role !== 'admin' && (
                              <>
                                <TouchableOpacity 
                                  style={[styles.actionBtn, item.status === 'blocked' ? styles.btnSuccess : styles.btnWarning]} 
                                  onPress={() => handleToggleBlock(item)}
                                >
                                  <Text style={styles.actionBtnText}>{item.status === 'blocked' ? 'Unblock' : 'Block'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, styles.btnDanger]} onPress={() => handleDeleteUser(item)}>
                                  <Text style={styles.actionBtnText}>Delete</Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* TAB 2: BOOKS CATALOG (INVENTORY) */}
            {activeTab === 'books' && (
              <View style={styles.paneContainer}>
                {/* Search Bar */}
                <View style={styles.toolbarRow}>
                  <TextInput 
                    style={styles.searchInput} 
                    placeholder="Search title, author, isbn..." 
                    placeholderTextColor="#8a8f9d" 
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity style={styles.searchIconBtn} onPress={handleSearch}>
                    <Text style={{ color: '#fff' }}>🔍</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnCreateUser} onPress={() => { clearBookForm(); setShowBookModal(true); }}>
                    <Text style={styles.btnCreateUserText}>＋ Add Book</Text>
                  </TouchableOpacity>
                </View>

                {/* List */}
                <View style={{ paddingHorizontal: 16, gap: 14 }}>
                  {books.length === 0 ? (
                    <Text style={styles.emptyText}>No catalog books found.</Text>
                  ) : (
                    books.map((item) => (
                      <View key={item._id} style={styles.recordCardFlex}>
                        <View style={styles.cardCoverWrapper}>
                          {item.coverImage || item.coverUrl ? (
                            <Image source={{ uri: item.coverImage || item.coverUrl }} style={styles.coverThumbnail} resizeMode="cover" />
                          ) : (
                            <View style={[styles.coverThumbnail, styles.fallbackCover]}>
                              <Text style={{ fontSize: 24 }}>📖</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.cardRightInfo}>
                          <View style={styles.recordHeader}>
                            <Text style={styles.recordTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.recordSubtitle}>By {item.author}</Text>
                          </View>
                          <Text style={styles.infoText}>Genre: <Text style={styles.boldText}>{item.category}</Text></Text>
                          <Text style={styles.infoText}>Copies: <Text style={styles.boldText}>{item.availableCopies} / {item.totalCopies}</Text></Text>
                          
                          <View style={styles.btnRowCompact}>
                            <TouchableOpacity style={[styles.actionBtnCompact, styles.btnPrimaryColor]} onPress={() => handleOpenIssue(item)}>
                              <Text style={styles.actionBtnTextCompact}>Issue</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtnCompact, styles.btnEditColor]} onPress={() => handleEditBook(item)}>
                              <Text style={styles.actionBtnTextCompact}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtnCompact, styles.btnDeleteColor]} onPress={() => handleDeleteBook(item)}>
                              <Text style={styles.actionBtnTextCompact}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* TAB 3: LOANS AND RESERVATIONS */}
            {activeTab === 'loans' && (
              <View style={styles.paneContainer}>
                {/* Active Loans */}
                <Text style={styles.sectionHeader}>Active Loans Ledger</Text>
                <View style={{ paddingHorizontal: 16, gap: 12, marginBottom: 20 }}>
                  {loans.length === 0 ? (
                    <Text style={styles.emptyText}>No checkouts recorded.</Text>
                  ) : (
                    loans.map((item) => (
                      <View key={item._id} style={styles.recordCard}>
                        <Text style={styles.recordTitle}>{item.bookId?.title || 'Deleted Book'}</Text>
                        <Text style={styles.recordSubtitle}>Borrower: {item.userId?.name || 'Deleted Member'} ({item.userId?.email})</Text>
                        <View style={styles.detailsRowSpacer}>
                          <Text style={styles.infoText}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                          <Text style={[styles.badge, item.status === 'overdue' ? styles.badgeBlocked : styles.badgeActive]}>
                            {item.status}
                          </Text>
                        </View>
                        {item.fineAmount > 0 && (
                          <View style={styles.fineBoxCompact}>
                            <Text style={styles.fineTextText}>Fine: <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>${item.fineAmount.toFixed(2)}</Text> ({item.fineStatus})</Text>
                          </View>
                        )}
                        {item.status !== 'returned' && (
                          <TouchableOpacity style={styles.btnFullWidthAction} onPress={() => handleReturnBook(item._id)}>
                            <Text style={styles.btnFullWidthActionText}>🔄 Process Return</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>

                {/* Holds Reservations */}
                <Text style={styles.sectionHeader}>Reservation Holds Queue</Text>
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                  {reservations.filter(r => r.status === 'pending' || r.status === 'active').length === 0 ? (
                    <Text style={styles.emptyText}>No reservation queue requested.</Text>
                  ) : (
                    reservations.filter(r => r.status === 'pending' || r.status === 'active').map((item) => (
                      <View key={item._id} style={styles.recordCard}>
                        <Text style={styles.recordTitle}>{item.bookId?.title || 'Deleted Book'}</Text>
                        <Text style={styles.recordSubtitle}>Requested By: {item.userId?.name || 'Deleted Member'} ({item.userId?.email})</Text>
                        <View style={styles.detailsRowSpacer}>
                          <Text style={styles.infoText}>Date: {new Date(item.reservationDate).toLocaleDateString()}</Text>
                          <Text style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgeWarning]}>
                            {item.status}
                          </Text>
                        </View>
                        <View style={styles.btnRow}>
                          <TouchableOpacity style={[styles.actionBtn, styles.btnSuccess]} onPress={() => handleApproveReservation(item)}>
                            <Text style={styles.actionBtnText}>✓ Approve Hold</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, styles.btnDanger]} onPress={() => handleRejectReservation(item)}>
                            <Text style={styles.actionBtnText}>Reject Request</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* TAB 4: SYSTEM SETTINGS */}
            {activeTab === 'settings' && (
              <View style={styles.paneContainer}>
                {/* Horizontal Settings sub tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsSubTabsRow}>
                  {[
                    { id: 'profile', label: 'General', icon: '🏢' },
                    { id: 'policies', label: 'Policies', icon: '⚖️' },
                    { id: 'contact', label: 'Contact', icon: '📞' },
                    { id: 'socials', label: 'Socials', icon: '🌐' },
                    { id: 'branches', label: 'Branches', icon: '📍' },
                    { id: 'features', label: 'Features', icon: '🛡️' }
                  ].map((sub) => (
                    <TouchableOpacity key={sub.id} style={[styles.subTabBtnCompact, settingsSubTab === sub.id && styles.subTabBtnCompactActive]} onPress={() => setSettingsSubTab(sub.id as any)}>
                      <Text style={[styles.subTabBtnCompactText, settingsSubTab === sub.id && styles.subTabBtnCompactTextActive]}>{sub.icon} {sub.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.settingsFormBody}>
                  {/* settings content by sub tab */}
                  {settingsSubTab === 'profile' && (
                    <View>
                      <Text style={styles.formTitle}>🏢 General Library Profile</Text>
                      <Text style={styles.formLabel}>Library Center Name</Text>
                      <TextInput 
                        style={styles.formInput} 
                        value={sysSettings.libraryName}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, libraryName: text })}
                      />
                      <Text style={styles.formLabel}>Bio Summary / Footer Description</Text>
                      <TextInput 
                        style={[styles.formInput, { height: 70 }]} 
                        multiline
                        numberOfLines={4}
                        placeholder="Bio displayed in footers..."
                        placeholderTextColor="#8a8f9d"
                        value={sysSettings.description || ''}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, description: text })}
                      />
                    </View>
                  )}

                  {settingsSubTab === 'policies' && (
                    <View>
                      <Text style={styles.formTitle}>⚖️ Rules & Policies</Text>
                      <Text style={styles.formLabel}>Standard Borrow Duration (Days)</Text>
                      <TextInput 
                        style={styles.formInput} 
                        keyboardType="numeric"
                        value={sysSettings.loanDurationDays.toString()}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, loanDurationDays: parseInt(text, 10) || 14 })}
                      />
                      <Text style={styles.formLabel}>Daily Late Fine Rate ($)</Text>
                      <TextInput 
                        style={styles.formInput} 
                        keyboardType="numeric"
                        value={sysSettings.fineRatePerDay.toString()}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, fineRatePerDay: parseFloat(text) || 0 })}
                      />
                      <Text style={styles.formLabel}>Max Active Loans per Member</Text>
                      <TextInput 
                        style={styles.formInput} 
                        keyboardType="numeric"
                        value={sysSettings.maxActiveLoans.toString()}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, maxActiveLoans: parseInt(text, 10) || 5 })}
                      />
                    </View>
                  )}

                  {settingsSubTab === 'contact' && (
                    <View>
                      <Text style={styles.formTitle}>📞 Core Contact Details</Text>
                      <Text style={styles.formLabel}>Contact Phone</Text>
                      <TextInput 
                        style={styles.formInput} 
                        value={sysSettings.phone}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, phone: text })}
                      />
                      <Text style={styles.formLabel}>Support Email</Text>
                      <TextInput 
                        style={styles.formInput} 
                        keyboardType="email-address"
                        value={sysSettings.email}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, email: text })}
                      />
                      <Text style={styles.formLabel}>Main Branch Address</Text>
                      <TextInput 
                        style={[styles.formInput, { height: 60 }]} 
                        multiline
                        numberOfLines={3}
                        value={sysSettings.address}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, address: text })}
                      />
                    </View>
                  )}

                  {settingsSubTab === 'socials' && (
                    <View>
                      <Text style={styles.formTitle}>🌐 Social Media Accounts</Text>
                      
                      <Text style={styles.formLabel}>WhatsApp Link</Text>
                      <TextInput style={styles.formInput} value={sysSettings.whatsappUrl} onChangeText={(text) => setSysSettings({ ...sysSettings, whatsappUrl: text })} />

                      <Text style={styles.formLabel}>Instagram Link</Text>
                      <TextInput style={styles.formInput} value={sysSettings.instagramUrl} onChangeText={(text) => setSysSettings({ ...sysSettings, instagramUrl: text })} />

                      <Text style={styles.formLabel}>Twitter / X Link</Text>
                      <TextInput style={styles.formInput} value={sysSettings.twitterUrl} onChangeText={(text) => setSysSettings({ ...sysSettings, twitterUrl: text })} />

                      <Text style={styles.formLabel}>Facebook Link</Text>
                      <TextInput style={styles.formInput} value={sysSettings.facebookUrl} onChangeText={(text) => setSysSettings({ ...sysSettings, facebookUrl: text })} />
                    </View>
                  )}

                  {settingsSubTab === 'branches' && (
                    <View>
                      <Text style={styles.formTitle}>📍 Branches & Operating Hours</Text>
                      <Text style={styles.formLabel}>Branches (One per line)</Text>
                      <TextInput 
                        style={[styles.formInput, { height: 80 }]} 
                        multiline
                        numberOfLines={4}
                        value={sysSettings.branches}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, branches: text })}
                      />
                      <Text style={styles.formLabel}>Working Hours (One per line)</Text>
                      <TextInput 
                        style={[styles.formInput, { height: 80 }]} 
                        multiline
                        numberOfLines={4}
                        value={sysSettings.workingHours}
                        onChangeText={(text) => setSysSettings({ ...sysSettings, workingHours: text })}
                      />
                    </View>
                  )}

                  {settingsSubTab === 'features' && (
                    <View>
                      <Text style={styles.formTitle}>🛡️ System Features & Safety</Text>
                      
                      <View style={{ gap: 14 }}>
                        {(sysSettings.features || []).map((feature) => (
                          <View key={feature.id} style={styles.featureItemCard}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.featureItemName}>{feature.name}</Text>
                              <Text style={styles.featureItemDesc}>{feature.description}</Text>
                              {!feature.isSystem && (
                                <TouchableOpacity 
                                  style={{ marginTop: 8 }}
                                  onPress={() => {
                                    const updated = sysSettings.features.filter(f => f.id !== feature.id);
                                    const next = { ...sysSettings, features: updated };
                                    if (feature.key) {
                                      (next as any)[feature.key] = false;
                                    }
                                    setSysSettings(next);
                                  }}
                                >
                                  <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>🗑 Remove Feature</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                            
                            {/* Simple Switch simulation using TouchableOpacity */}
                            <TouchableOpacity 
                              style={[styles.switchTrack, feature.enabled !== false ? styles.switchTrackOn : styles.switchTrackOff]}
                              onPress={() => {
                                const nextVal = feature.enabled === false;
                                const updated = sysSettings.features.map(f => f.id === feature.id ? { ...f, enabled: nextVal } : f);
                                const next = { ...sysSettings, features: updated };
                                if (feature.key) {
                                  (next as any)[feature.key] = nextVal;
                                }
                                setSysSettings(next);
                              }}
                            >
                              <View style={[styles.switchThumb, feature.enabled !== false ? styles.switchThumbOn : styles.switchThumbOff]} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>

                      {/* Add Custom Feature Form */}
                      <View style={styles.addFeatureWrapper}>
                        <Text style={[styles.formLabel, { color: '#ffd700', marginTop: 0 }]}>➕ Add Custom Feature Add-on</Text>
                        <TextInput style={styles.formInput} placeholder="Feature Name (e.g. Chat Room)" placeholderTextColor="#6e7787" value={newFeatureName} onChangeText={setNewFeatureName} />
                        <TextInput style={styles.formInput} placeholder="Description" placeholderTextColor="#6e7787" value={newFeatureDesc} onChangeText={setNewFeatureDesc} />
                        
                        <TouchableOpacity 
                          style={styles.btnAddFeature} 
                          onPress={() => {
                            if (!newFeatureName.trim()) {
                              Alert.alert('Error', 'Feature name is required');
                              return;
                            }
                            const id = `custom-${Date.now()}`;
                            const key = `isCustom_${Date.now()}`;
                            const newFeatureObj = {
                              id,
                              key,
                              name: newFeatureName,
                              description: newFeatureDesc,
                              enabled: true,
                              isSystem: false
                            };
                            const updated = [...(sysSettings.features || []), newFeatureObj];
                            setSysSettings({
                              ...sysSettings,
                              features: updated,
                              [key]: true
                            });
                            setNewFeatureName('');
                            setNewFeatureDesc('');
                            Alert.alert('Success', 'Custom feature added to list. Remember to Save configurations.');
                          }}
                        >
                          <Text style={styles.btnAddFeatureText}>Add Custom Feature</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* SAVE SETTINGS BUTTON */}
                  <TouchableOpacity style={styles.btnSaveSettings} onPress={handleSaveSettings} disabled={savingSettings}>
                    {savingSettings ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveSettingsText}>💾 Save Configurations</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB 5: SYSTEM COMPLIANCE AUDIT LOGS & PORTABILITY */}
            {activeTab === 'logs' && (
              <View style={styles.paneContainer}>
                
                {/* 1. Database Backups and Portability panels */}
                <Text style={styles.sectionHeader}>Database Compliance Portability</Text>
                
                <View style={styles.portabilityCard}>
                  <Text style={styles.cardHeaderTitle}>💾 DB Backup & Restoration</Text>
                  <Text style={styles.recordSubtitle}>Generate and restore full system collections dumps via JSON paste string.</Text>
                  
                  <TouchableOpacity style={[styles.actionBtn, styles.btnSuccess, { marginTop: 12, height: 38, justifyContent: 'center' }]} onPress={handleGenerateBackup}>
                    <Text style={styles.actionBtnText}>Generate JSON Backup</Text>
                  </TouchableOpacity>

                  <Text style={[styles.formLabel, { marginTop: 14 }]}>Database Restore Input Payload</Text>
                  <TextInput 
                    style={[styles.formInput, { height: 90, textAlignVertical: 'top' }]}
                    multiline
                    numberOfLines={6}
                    placeholder="Paste database backup JSON dump here to restore..."
                    placeholderTextColor="#6e7787"
                    value={restoreJsonText}
                    onChangeText={setRestoreJsonText}
                  />

                  <TouchableOpacity style={[styles.actionBtn, styles.btnDanger, { height: 38, justifyContent: 'center' }]} onPress={handleRestoreBackup} disabled={restoring}>
                    {restoring ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>⚠️ Restore DB from JSON</Text>}
                  </TouchableOpacity>
                </View>

                {/* 2. Audit compliance logs list */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8, paddingHorizontal: 16 }}>
                  <Text style={[styles.sectionHeader, { marginTop: 0, paddingHorizontal: 0 }]}>Compliance Activity Logs</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={styles.logHeaderBtn} onPress={handleResetLogs}>
                      <Text style={styles.logHeaderBtnText}>Reset Seed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.logHeaderBtn, { backgroundColor: '#ef4444' }]} onPress={handleClearLogs}>
                      <Text style={styles.logHeaderBtnText}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ paddingHorizontal: 16, gap: 10 }}>
                  {logsLoading ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : auditLogs.length === 0 ? (
                    <Text style={styles.emptyText}>No activity logged.</Text>
                  ) : (
                    auditLogs.map((log) => (
                      <View key={log._id} style={[styles.logCard, { borderLeftColor: getActionBadgeColor(log.action) }]}>
                        <View style={styles.logHeaderRow}>
                          <Text style={styles.logActor}>{log.userName}</Text>
                          <Text style={[styles.logActionBadge, { backgroundColor: getActionBadgeColor(log.action) }]}>{log.action}</Text>
                        </View>
                        <Text style={styles.logDetails}>{log.details}</Text>
                        <View style={styles.logFooterRow}>
                          <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString()}</Text>
                          <TouchableOpacity onPress={() => handleDeleteLog(log._id)}>
                            <Text style={styles.logDeleteBtnText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>

              </View>
            )}

            {/* TAB 6: ANALYTICS CHARTS */}
            {activeTab === 'analytics' && metrics && (
              <View style={styles.paneContainer}>
                
                {/* Stat Cards Grid */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCardBig}>
                    <Text style={styles.metricIconBig}>📚</Text>
                    <Text style={styles.metricLabelBig}>Total Books</Text>
                    <Text style={styles.metricNumberBig}>{metrics.totalBooks}</Text>
                  </View>
                  <View style={styles.metricCardBig}>
                    <Text style={styles.metricIconBig}>👥</Text>
                    <Text style={styles.metricLabelBig}>Registered Users</Text>
                    <Text style={styles.metricNumberBig}>{metrics.registeredMembers}</Text>
                  </View>
                  <View style={styles.metricCardBig}>
                    <Text style={styles.metricIconBig}>🔄</Text>
                    <Text style={styles.metricLabelBig}>Active Loans</Text>
                    <Text style={styles.metricNumberBig}>{metrics.issuedBooks}</Text>
                  </View>
                  <View style={styles.metricCardBig}>
                    <Text style={styles.metricIconBig}>⚠️</Text>
                    <Text style={styles.metricLabelBig}>Overdue Loans</Text>
                    <Text style={styles.metricNumberBig}>{metrics.overdueBooks}</Text>
                  </View>
                </View>

                {/* Availability Ring Ratio */}
                <View style={styles.panelCard}>
                  <Text style={styles.panelTitle}>Global Catalog Availability</Text>
                  <View style={styles.wheelRow}>
                    <View style={styles.progressCircle}>
                      <Text style={styles.progressPercent}>{metrics.availabilityRatio}%</Text>
                      <Text style={styles.progressSub}>Available</Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.wheelDetailText}>Ratio of books in stock compared to total checked out books across the system catalog.</Text>
                    </View>
                  </View>
                </View>

                {/* Genre bar charts */}
                <View style={styles.panelCard}>
                  <Text style={styles.panelTitle}>Genre Stock Distribution</Text>
                  {genreData.length === 0 ? (
                    <Text style={styles.emptyText}>No distribution data compiled.</Text>
                  ) : (
                    genreData.map((item, idx) => {
                      const maxVal = Math.max(...genreData.map(g => g.stock), 1);
                      const percent = Math.round((item.stock / maxVal) * 100);
                      return (
                        <View key={idx} style={styles.genreBarRow}>
                          <Text style={styles.genreLabel}>{item.genre}</Text>
                          <View style={styles.genreBarOuter}>
                            <View style={[styles.genreBarInner, { width: `${percent}%` }]} />
                          </View>
                          <Text style={styles.genreValue}>{item.stock}</Text>
                        </View>
                      );
                    })
                  )}
                </View>

              </View>
            )}

          </View>
        )}
      </ScrollView>

      {/* MODAL: CREATE USER */}
      <Modal visible={showAddUserModal} transparent={true} animationType="slide" onRequestClose={() => setShowAddUserModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>＋ Create User Account</Text>
              <TouchableOpacity onPress={() => setShowAddUserModal(false)}>
                <Text style={styles.closeBtn}>&times;</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBodyScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Full Name</Text>
              <TextInput style={styles.formInput} placeholder="John Doe" placeholderTextColor="#6e7787" value={newUserName} onChangeText={setNewUserName} />

              <Text style={styles.formLabel}>Email Address</Text>
              <TextInput style={styles.formInput} keyboardType="email-address" placeholder="john@example.com" placeholderTextColor="#6e7787" value={newUserEmail} onChangeText={setNewUserEmail} />

              <Text style={styles.formLabel}>Password (Exactly 5 chars)</Text>
              <TextInput style={styles.formInput} placeholder="5 chars" placeholderTextColor="#6e7787" maxLength={5} secureTextEntry value={newUserPassword} onChangeText={setNewUserPassword} />

              <Text style={styles.formLabel}>Phone Number (Exactly 10 digits)</Text>
              <TextInput style={styles.formInput} placeholder="10 digits" placeholderTextColor="#6e7787" keyboardType="numeric" maxLength={10} value={newUserPhone} onChangeText={setNewUserPhone} />

              <Text style={styles.formLabel}>Home Address</Text>
              <TextInput style={[styles.formInput, { height: 60 }]} multiline numberOfLines={3} placeholder="Residential address..." placeholderTextColor="#6e7787" value={newUserAddress} onChangeText={setNewUserAddress} />

              <Text style={styles.formLabel}>System Role</Text>
              <View style={styles.rolePickerReplacement}>
                <TouchableOpacity style={[styles.rolePickBtn, newUserRole === 'member' && styles.rolePickBtnActive]} onPress={() => setNewUserRole('member')}>
                  <Text style={[styles.rolePickText, newUserRole === 'member' && styles.rolePickTextActive]}>Library Member</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rolePickBtn, newUserRole === 'librarian' && styles.rolePickBtnActive]} onPress={() => setNewUserRole('librarian')}>
                  <Text style={[styles.rolePickText, newUserRole === 'librarian' && styles.rolePickTextActive]}>Librarian Staff</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddUserSubmit} disabled={creatingUser}>
                {creatingUser ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create User Account</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: MEMBERSHIP CARD */}
      <Modal visible={showCardModal} transparent={true} animationType="fade" onRequestClose={() => setShowCardModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>🪪 Membership Card</Text>
              <TouchableOpacity onPress={() => setShowCardModal(false)}>
                <Text style={styles.closeBtn}>&times;</Text>
              </TouchableOpacity>
            </View>

            {selectedMemberForCard && (
              <View style={styles.membershipCardFrame}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardBrand}>Apex Library</Text>
                  <Text style={[styles.cardTypeLabel, selectedMemberForCard.role === 'librarian' && styles.cardTypeStaff]}>
                    {selectedMemberForCard.role.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardPhotoPlaceholder}>
                    <Text style={{ fontSize: 32 }}>👤</Text>
                  </View>
                  <View style={styles.cardUserContainer}>
                    <Text style={styles.cardUserName}>{selectedMemberForCard.name}</Text>
                    <Text style={styles.cardUserId}>ID: {selectedMemberForCard._id}</Text>
                    <Text style={styles.cardUserJoin}>Joined: {selectedMemberForCard.joinDate ? new Date(selectedMemberForCard.joinDate).toLocaleDateString() : '—'}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterAuth}>ISSUED BY APEX LIBRARY</Text>
                  <Image source={{ uri: getQRCodeUrl(selectedMemberForCard._id) }} style={styles.cardQrCode} />
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCardModal(false)}>
              <Text style={styles.modalCloseBtnText}>Close Card View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: BOOK ADD/EDIT */}
      <Modal visible={showBookModal} transparent={true} animationType="slide" onRequestClose={() => setShowBookModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{editBookId ? '📝 Edit Book Catalog' : '＋ Add New Book Catalog'}</Text>
              <TouchableOpacity onPress={() => setShowBookModal(false)}>
                <Text style={styles.closeBtn}>&times;</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>ISBN Code (Auto-fills details via Google Books)</Text>
              <View style={styles.isbnResolverRow}>
                <TextInput 
                  style={[styles.formInput, { flex: 1, marginBottom: 0 }]} 
                  placeholder="ISBN-10 or ISBN-13" 
                  placeholderTextColor="#6e7787" 
                  value={bookIsbn}
                  onChangeText={setBookIsbn}
                  onBlur={handleIsbnBlur}
                />
                {isbnLoading && <ActivityIndicator color="#6366f1" style={{ marginLeft: 10 }} />}
              </View>

              <Text style={styles.formLabel}>Book Title</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Clean Code" placeholderTextColor="#6e7787" value={bookTitle} onChangeText={setBookTitle} />

              <Text style={styles.formLabel}>Author</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Robert C. Martin" placeholderTextColor="#6e7787" value={bookAuthor} onChangeText={setBookAuthor} />

              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.pickerReplacementRow}>
                {BOOK_CATEGORIES_WITHOUT_ALL.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.pickerAltItem, bookCategory === cat && styles.pickerAltItemActive]}
                    onPress={() => setBookCategory(cat)}
                  >
                    <Text style={[styles.pickerAltText, bookCategory === cat && styles.pickerAltTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Stock Qty</Text>
                  <TextInput style={styles.formInput} keyboardType="numeric" value={bookQty} onChangeText={setBookQty} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Rack Number</Text>
                  <TextInput style={styles.formInput} value={bookRack} onChangeText={setBookRack} />
                </View>
              </View>

              <Text style={styles.formLabel}>Cover Image URL</Text>
              <TextInput style={styles.formInput} placeholder="https://example.com/cover.jpg" placeholderTextColor="#6e7787" value={bookCoverUrl} onChangeText={setBookCoverUrl} />

              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={[styles.formInput, { height: 60 }]} multiline numberOfLines={3} placeholder="Brief summary of the book..." placeholderTextColor="#6e7787" value={bookDesc} onChangeText={setBookDesc} />
              
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBook} disabled={savingBook}>
                {savingBook ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Catalog Record</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: ISSUE BOOK */}
      <Modal visible={showIssueModal} transparent={true} animationType="fade" onRequestClose={() => setShowIssueModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>📘 Issue Book Loan</Text>
              <TouchableOpacity onPress={() => setShowIssueModal(false)}>
                <Text style={styles.closeBtn}>&times;</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.issuePreviewBox}>
              <Text style={styles.issueBookTitle}>{selectedBookForIssue?.title}</Text>
              <Text style={styles.issueBookDetails}>ISBN: {selectedBookForIssue?.isbn} • Rack: {selectedBookForIssue?.rackNumber}</Text>
            </View>

            <Text style={styles.formLabel}>Select Active Member</Text>
            <ScrollView style={{ maxHeight: 150, marginBottom: 12 }}>
              {members.length === 0 ? (
                <Text style={styles.noMembersText}>No active library members found to issue to.</Text>
              ) : (
                members.map(m => (
                  <TouchableOpacity 
                    key={m._id} 
                    style={[styles.memberSelectItem, selectedMemberId === m._id && styles.memberSelectItemActive]}
                    onPress={() => setSelectedMemberId(m._id)}
                  >
                    <Text style={[styles.memberSelectText, selectedMemberId === m._id && styles.memberSelectTextActive]}>{m.name} ({m.email})</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <Text style={styles.formLabel}>Due Date</Text>
            <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor="#6e7787" value={dueDate} onChangeText={setDueDate} />

            <TouchableOpacity style={styles.submitBtn} onPress={handleIssueSubmit} disabled={issuing || !selectedMemberId}>
              {issuing ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Issue Book Now</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderColor: '#242f49',
    backgroundColor: '#0f1422',
  },
  tabContentContainer: {
    padding: 12,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    height: 36,
    backgroundColor: '#161c2c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242f49',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  tabButtonText: {
    color: '#9ba2b2',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  paneContainer: {
    paddingTop: 10,
  },
  subTabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  subTabBtn: {
    flex: 1,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  subTabBtnActive: {
    backgroundColor: '#6366f1',
  },
  subTabBtnText: {
    color: '#8a8f9d',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subTabBtnTextActive: {
    color: '#fff',
  },
  toolbarRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#161c2c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242f49',
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 13,
  },
  searchIconBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#1c2538',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242f49',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCreateUser: {
    backgroundColor: '#6366f1',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCreateUserText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingWrapper: {
    paddingTop: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordCard: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  recordCardFlex: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  cardCoverWrapper: {
    width: 90,
    height: 130,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0f131c',
  },
  coverThumbnail: {
    width: '100%',
    height: '100%',
  },
  fallbackCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRightInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  recordHeader: {
    marginBottom: 4,
  },
  recordHeaderCompact: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarLeft: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  recordSubtitle: {
    fontSize: 12,
    color: '#8a8f9d',
  },
  recordDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#242f49',
    paddingTop: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#ccd3e0',
  },
  boldText: {
    fontWeight: '700',
    color: '#fff',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
  },
  badgeBlocked: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: '#242f49',
    paddingTop: 10,
  },
  btnRowCompact: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  actionBtnCompact: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionBtnTextCompact: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  btnSuccess: {
    backgroundColor: '#10b981',
  },
  btnWarning: {
    backgroundColor: '#f59e0b',
  },
  btnDanger: {
    backgroundColor: '#ef4444',
  },
  btnCardColor: {
    backgroundColor: '#3b82f6',
  },
  btnPrimaryColor: {
    backgroundColor: '#6366f1',
  },
  btnEditColor: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnDeleteColor: {
    backgroundColor: '#ef4444',
  },
  emptyText: {
    color: '#8a8f9d',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  detailsRowSpacer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  fineBoxCompact: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  fineTextText: {
    color: '#ccd3e0',
    fontSize: 12,
  },
  btnFullWidthAction: {
    backgroundColor: '#1e2538',
    borderWidth: 1,
    borderColor: '#242f49',
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnFullWidthActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  settingsSubTabsRow: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#242f49',
    marginBottom: 14,
  },
  subTabBtnCompact: {
    paddingHorizontal: 12,
    height: 30,
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTabBtnCompactActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  subTabBtnCompactText: {
    color: '#8a8f9d',
    fontSize: 11,
    fontWeight: 'bold',
  },
  subTabBtnCompactTextActive: {
    color: '#fff',
  },
  settingsFormBody: {
    paddingHorizontal: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8a8f9d',
    marginBottom: 6,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  formInput: {
    height: 38,
    backgroundColor: '#0f131c',
    borderRadius: 6,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#242f49',
    marginBottom: 12,
  },
  featureItemCard: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureItemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  featureItemDesc: {
    fontSize: 11,
    color: '#8a8f9d',
    marginTop: 2,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  switchTrackOn: {
    backgroundColor: '#6366f1',
  },
  switchTrackOff: {
    backgroundColor: '#475569',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  addFeatureWrapper: {
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: '#242f49',
    paddingTop: 16,
    gap: 4,
  },
  btnAddFeature: {
    height: 38,
    backgroundColor: '#1e2538',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  btnAddFeatureText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnSaveSettings: {
    height: 40,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  btnSaveSettingsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  portabilityCard: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  logHeaderBtn: {
    backgroundColor: '#1c2538',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  logHeaderBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logCard: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logActor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  logActionBadge: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 3,
  },
  logDetails: {
    color: '#ccd3e0',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 6,
  },
  logFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    paddingTop: 6,
  },
  logTime: {
    color: '#8a8f9d',
    fontSize: 9.5,
  },
  logDeleteBtnText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  metricCardBig: {
    width: '48%',
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  metricIconBig: {
    fontSize: 22,
    marginBottom: 6,
  },
  metricLabelBig: {
    fontSize: 11,
    color: '#8a8f9d',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricNumberBig: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  panelCard: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f131c',
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressSub: {
    fontSize: 8,
    color: '#8a8f9d',
    textTransform: 'uppercase',
  },
  wheelDetailText: {
    fontSize: 12,
    color: '#ccd3e0',
    lineHeight: 18,
  },
  genreBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  genreLabel: {
    width: 80,
    fontSize: 12,
    color: '#ccd3e0',
  },
  genreBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: '#0f131c',
    borderRadius: 4,
    overflow: 'hidden',
  },
  genreBarInner: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  genreValue: {
    width: 24,
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#151c2c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#242f49',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeBtn: {
    fontSize: 24,
    color: '#8a8f9d',
  },
  modalBodyScroll: {
    marginBottom: 20,
  },
  rolePickerReplacement: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  rolePickBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rolePickBtnActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  rolePickText: {
    color: '#8a8f9d',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rolePickTextActive: {
    color: '#fff',
  },
  submitBtn: {
    height: 40,
    backgroundColor: '#6366f1',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  membershipCardFrame: {
    backgroundColor: '#0b0f19',
    borderWidth: 1.5,
    borderColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#242f49',
    paddingBottom: 8,
    marginBottom: 12,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardTypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
    backgroundColor: 'rgba(99, 102, 248, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  cardTypeStaff: {
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardUserContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardUserName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardUserId: {
    fontSize: 11,
    color: '#8a8f9d',
  },
  cardUserJoin: {
    fontSize: 11,
    color: '#ccd3e0',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderColor: '#242f49',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterAuth: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8a8f9d',
  },
  cardQrCode: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  modalCloseBtn: {
    height: 38,
    backgroundColor: '#1c2538',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalScrollBody: {
    maxHeight: 400,
    marginBottom: 15,
  },
  isbnResolverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerReplacementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  pickerAltItem: {
    paddingHorizontal: 10,
    height: 28,
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerAltItemActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  pickerAltText: {
    color: '#8a8f9d',
    fontSize: 11,
  },
  pickerAltTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  issuePreviewBox: {
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  issueBookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  issueBookDetails: {
    fontSize: 11,
    color: '#8a8f9d',
    marginTop: 2,
  },
  memberSelectItem: {
    padding: 10,
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 6,
    marginBottom: 6,
  },
  memberSelectItemActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  memberSelectText: {
    color: '#ccd3e0',
    fontSize: 12,
  },
  memberSelectTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noMembersText: {
    color: '#8a8f9d',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
  },
  noMeetingsText: {
    color: '#8a8f9d',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
