import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  FlatList,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, Book, Loan, Reservation, User } from '../utils/api';

// Static categories
const CATEGORIES = ['Technology', 'Fantasy', 'Fiction', 'Science', 'Biography'];

export default function LibrarianDashboard() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'lendings' | 'requests' | 'spaces'>('inventory');
  
  // Datasets
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [savingBook, setSavingBook] = useState(false);

  // Search & Filter (Inventory)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Book Modal (Add / Edit)
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

  // Issue Book Modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBookForIssue, setSelectedBookForIssue] = useState<Book | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        const list = await api.getCatalog(searchQuery, selectedCategory);
        setBooks(list);
      } else if (activeTab === 'lendings') {
        const list = await api.getLoans();
        setLoans(list);
        const membersList = await api.getMembers();
        setMembers(membersList.filter(m => m.role === 'member' && m.status === 'active'));
      } else if (activeTab === 'requests') {
        const list = await api.getReservations();
        setReservations(list.filter(r => r.status === 'pending' || r.status === 'active'));
      } else if (activeTab === 'spaces') {
        const saved = await AsyncStorage.getItem('all_room_bookings');
        setSpaces(saved ? JSON.parse(saved) : []);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to retrieve administrative datasets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
  };

  // Google Books Metadata Resolver using ISBN on Blur
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
          const thumb = info.imageLinks.thumbnail.replace('http://', 'https://');
          setBookCoverUrl(thumb);
        } else {
          setBookCoverUrl('');
        }
        
        if (info.categories && info.categories.length > 0) {
          const mainCategory = info.categories[0];
          if (mainCategory.toLowerCase().includes('computer') || mainCategory.toLowerCase().includes('tech')) {
            setBookCategory('Technology');
          } else if (mainCategory.toLowerCase().includes('science')) {
            setBookCategory('Science');
          } else if (mainCategory.toLowerCase().includes('fantasy') || mainCategory.toLowerCase().includes('fiction')) {
            setBookCategory('Fantasy');
          } else if (mainCategory.toLowerCase().includes('biography')) {
            setBookCategory('Biography');
          } else {
            setBookCategory('Fiction');
          }
        }
        Alert.alert('Success', 'Google Books metadata auto-filled!');
      } else {
        Alert.alert('Info', 'No record found for this ISBN. Enter details manually.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Google Books metadata resolution failed.');
    } finally {
      setIsbnLoading(false);
    }
  };

  // Save Book
  const handleSaveBook = async () => {
    if (!bookTitle || !bookAuthor || !bookIsbn || !bookQty) {
      Alert.alert('Validation Error', 'Please fill in all mandatory fields.');
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
        Alert.alert('Success', 'Book record updated successfully!');
      } else {
        await api.addBook(payload);
        Alert.alert('Success', 'Book added to catalog inventory!');
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
      `Permanently remove "${book.title}" from catalog inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.deleteBook(book._id);
              Alert.alert('Deleted', 'Catalog item successfully removed.');
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

  // Issue Book Submission
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
      Alert.alert('Validation Error', 'Member ID and Due Date are required.');
      return;
    }

    setIssuing(true);
    try {
      await api.issueBook(selectedBookForIssue._id, selectedMemberId, dueDate);
      Alert.alert('Success', 'Book loan transaction issued!');
      setShowIssueModal(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Issue Failed', err.message || 'Failed to issue book.');
    } finally {
      setIssuing(false);
    }
  };

  // Return book immediately
  const handleReturnBook = async (loanId: string) => {
    Alert.alert(
      'Return Book',
      'Process return ledger entry for this loan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Return',
          onPress: async () => {
            try {
              setLoading(true);
              const data = await api.returnBook(loanId);
              if (data.success) {
                if (data.fineAmount > 0) {
                  Alert.alert('Returned', `Book returned. Outstanding fine computed: $${data.fineAmount.toFixed(2)}`);
                } else {
                  Alert.alert('Success', 'Book returned with zero fine ledger entries.');
                }
                fetchData();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to process return.');
              fetchData();
            }
          }
        }
      ]
    );
  };

  // Approve Reservation
  const handleApproveReservation = async (reservation: Reservation) => {
    Alert.alert(
      'Approve Reservation',
      'Set reservation hold status to active?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setLoading(true);
              await api.updateReservationStatus(reservation._id, 'active');
              Alert.alert('Approved', 'Hold status upgraded. Proceed to issue book copy.');
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update reservation.');
              fetchData();
            }
          }
        }
      ]
    );
  };

  // Reject Reservation
  const handleRejectReservation = async (reservation: Reservation) => {
    Alert.alert(
      'Reject Reservation',
      'Reject and remove this reservation request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.updateReservationStatus(reservation._id, 'rejected');
              Alert.alert('Rejected', 'Reservation request rejected.');
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject reservation.');
              fetchData();
            }
          }
        }
      ]
    );
  };

  // Space Bookings Actions (Simulated)
  const handleConfirmSpace = async (id: string) => {
    try {
      const saved = await AsyncStorage.getItem('all_room_bookings');
      const all = saved ? JSON.parse(saved) : [];
      const updated = all.map((b: any) => b.id === id ? { ...b, status: 'Confirmed' } : b);
      await AsyncStorage.setItem('all_room_bookings', JSON.stringify(updated));
      setSpaces(updated);
      Alert.alert('Success', 'Study space reservation confirmed!');
    } catch (err) {
      Alert.alert('Error', 'Failed to update study space reservation status.');
    }
  };

  const handleRejectSpace = async (id: string) => {
    try {
      const saved = await AsyncStorage.getItem('all_room_bookings');
      const all = saved ? JSON.parse(saved) : [];
      const updated = all.map((b: any) => b.id === id ? { ...b, status: 'Rejected' } : b);
      await AsyncStorage.setItem('all_room_bookings', JSON.stringify(updated));
      setSpaces(updated);
      Alert.alert('Rejected', 'Study space reservation request rejected.');
    } catch (err) {
      Alert.alert('Error', 'Failed to update study space reservation status.');
    }
  };

  const handleDeleteSpace = async (id: string) => {
    Alert.alert(
      'Delete Record',
      'Permanently delete this space booking record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const saved = await AsyncStorage.getItem('all_room_bookings');
              const all = saved ? JSON.parse(saved) : [];
              const updated = all.filter((b: any) => b.id !== id);
              await AsyncStorage.setItem('all_room_bookings', JSON.stringify(updated));
              setSpaces(updated);
              Alert.alert('Deleted', 'Space booking record deleted.');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete space booking record.');
            }
          }
        }
      ]
    );
  };

  // Renders
  const renderBookItem = ({ item }: { item: Book }) => (
    <View style={styles.recordCard}>
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
  );

  const renderLoanItem = ({ item }: { item: Loan }) => (
    <View style={styles.recordCard}>
      <View style={styles.cardFullWidthInfo}>
        <Text style={styles.recordTitle}>{item.bookId?.title || 'Deleted Book'}</Text>
        <Text style={styles.recordSubtitle}>Borrower: {item.userId?.name || 'Deleted Member'} ({item.userId?.email || '—'})</Text>
        
        <View style={styles.detailsRowSpacer}>
          <Text style={styles.infoText}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
          <Text style={[styles.badge, item.status === 'overdue' ? styles.badgeBlocked : styles.badgeActive]}>
            {item.status}
          </Text>
        </View>

        {item.fineAmount > 0 && (
          <View style={styles.fineBoxCompact}>
            <Text style={styles.fineTextText}>Fine: <Text style={styles.boldRedText}>${item.fineAmount.toFixed(2)}</Text> ({item.fineStatus})</Text>
          </View>
        )}

        {item.status !== 'returned' && (
          <TouchableOpacity style={styles.btnFullWidthAction} onPress={() => handleReturnBook(item._id)}>
            <Text style={styles.btnFullWidthActionText}>🔄 Process Return</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderReservationItem = ({ item }: { item: Reservation }) => (
    <View style={styles.recordCard}>
      <View style={styles.cardFullWidthInfo}>
        <Text style={styles.recordTitle}>{item.bookId?.title || 'Deleted Book'}</Text>
        <Text style={styles.recordSubtitle}>Requested By: {item.userId?.name || 'Deleted Member'} ({item.userId?.email || '—'})</Text>
        
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
    </View>
  );

  const renderSpaceItem = ({ item }: { item: any }) => (
    <View style={styles.recordCard}>
      <View style={styles.cardFullWidthInfo}>
        <Text style={styles.recordTitle}>{item.room}</Text>
        <Text style={styles.recordSubtitle}>Reserved by: {item.userName} ({item.userEmail})</Text>
        <Text style={styles.infoText}>Date: <Text style={styles.boldText}>{item.date}</Text> Time: <Text style={styles.boldText}>{item.timeSlot}</Text></Text>
        
        <View style={styles.detailsRowSpacer}>
          <Text style={styles.infoText}>Status:</Text>
          <Text style={[styles.badge, item.status === 'Confirmed' ? styles.badgeActive : item.status === 'Rejected' ? styles.badgeBlocked : styles.badgeWarning]}>
            {item.status}
          </Text>
        </View>

        <View style={styles.btnRow}>
          {item.status === 'Pending' && (
            <>
              <TouchableOpacity style={[styles.actionBtn, styles.btnSuccess]} onPress={() => handleConfirmSpace(item.id)}>
                <Text style={styles.actionBtnText}>✓ Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.btnWarning]} onPress={() => handleRejectSpace(item.id)}>
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={[styles.actionBtn, styles.btnDanger]} onPress={() => handleDeleteSpace(item.id)}>
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Switcher Headers */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContentContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'inventory' && styles.tabButtonActive]} onPress={() => setActiveTab('inventory')}>
            <Text style={[styles.tabButtonText, activeTab === 'inventory' && styles.tabButtonTextActive]}>📚 Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'lendings' && styles.tabButtonActive]} onPress={() => setActiveTab('lendings')}>
            <Text style={[styles.tabButtonText, activeTab === 'lendings' && styles.tabButtonTextActive]}>🔄 Lendings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]} onPress={() => setActiveTab('requests')}>
            <Text style={[styles.tabButtonText, activeTab === 'requests' && styles.tabButtonTextActive]}>⏳ Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'spaces' && styles.tabButtonActive]} onPress={() => setActiveTab('spaces')}>
            <Text style={[styles.tabButtonText, activeTab === 'spaces' && styles.tabButtonTextActive]}>🏛️ Study Pods</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Toolbar / Actions bar */}
      {activeTab === 'inventory' && (
        <View style={styles.actionToolbar}>
          <View style={styles.searchRow}>
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search title, author, isbn..." 
              placeholderTextColor="#8a8f9d" 
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.btnSearchSubmit} onPress={handleSearch}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔍</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.categoryRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {['All', ...CATEGORIES].map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.categoryBadge, selectedCategory === cat && styles.categoryBadgeActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryBadgeText, selectedCategory === cat && styles.categoryBadgeTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btnAddBook} onPress={() => { clearBookForm(); setShowBookModal(true); }}>
              <Text style={styles.btnAddBookText}>＋ Add Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main List */}
      {loading && books.length === 0 && loans.length === 0 && reservations.length === 0 && spaces.length === 0 ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <>
          {activeTab === 'inventory' && (
            <FlatList 
              data={books}
              keyExtractor={(item) => item._id}
              renderItem={renderBookItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No matching catalog records found.</Text>
                </View>
              }
            />
          )}
          {activeTab === 'lendings' && (
            <FlatList 
              data={loans}
              keyExtractor={(item) => item._id}
              renderItem={renderLoanItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No matching lending records found.</Text>
                </View>
              }
            />
          )}
          {activeTab === 'requests' && (
            <FlatList 
              data={reservations}
              keyExtractor={(item) => item._id}
              renderItem={renderReservationItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No matching reservation requests found.</Text>
                </View>
              }
            />
          )}
          {activeTab === 'spaces' && (
            <FlatList 
              data={spaces}
              keyExtractor={(item) => item.id}
              renderItem={renderSpaceItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No study spaces reservations found.</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* BOOK EDIT/ADD DIALOG MODAL */}
      <Modal visible={showBookModal} transparent={true} animationType="slide" onRequestClose={() => setShowBookModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{editBookId ? '📝 Edit Book Catalog Entry' : '＋ Add New Book Catalog'}</Text>
              <TouchableOpacity onPress={() => setShowBookModal(false)}>
                <Text style={styles.closeBtn}>&times;</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollBody} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.formLabel}>ISBN Code (Resolves via Google Books)</Text>
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
                {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.pickerAltItem, bookCategory === cat && styles.pickerAltItemActive]}
                    onPress={() => setBookCategory(cat)}
                  >
                    <Text style={[styles.pickerAltText, bookCategory === cat && styles.pickerAltTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Stock Qty</Text>
                  <TextInput style={styles.formInput} keyboardType="numeric" value={bookQty} onChangeText={setBookQty} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.formLabel}>Rack Number</Text>
                  <TextInput style={styles.formInput} value={bookRack} onChangeText={setBookRack} />
                </View>
              </View>

              <Text style={styles.formLabel}>Cover Image URL</Text>
              <TextInput style={styles.formInput} placeholder="https://example.com/cover.jpg" placeholderTextColor="#6e7787" value={bookCoverUrl} onChangeText={setBookCoverUrl} />

              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={[styles.formInput, { height: 70 }]} multiline numberOfLines={3} placeholder="Brief summary of the book..." placeholderTextColor="#6e7787" value={bookDesc} onChangeText={setBookDesc} />
              
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBook} disabled={savingBook}>
                {savingBook ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Catalog Record</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ISSUE BOOK MODAL */}
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
            <View style={styles.pickerReplacementRowVertical}>
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
            </View>

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
  actionToolbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#242f49',
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
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
  btnSearchSubmit: {
    width: 38,
    height: 38,
    backgroundColor: '#1c2538',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242f49',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  categoryBadge: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  categoryBadgeActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryBadgeText: {
    color: '#9ba2b2',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadgeTextActive: {
    color: '#fff',
  },
  btnAddBook: {
    backgroundColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnAddBookText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordCard: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  cardCoverWrapper: {
    width: 80,
    height: 110,
    borderRadius: 6,
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
  cardFullWidthInfo: {
    flex: 1,
  },
  recordHeader: {
    marginBottom: 4,
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
  infoText: {
    fontSize: 12,
    color: '#ccd3e0',
  },
  boldText: {
    fontWeight: '700',
    color: '#fff',
  },
  detailsRowSpacer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 10,
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
  fineBoxCompact: {
    backgroundColor: '#20161a',
    borderWidth: 1,
    borderColor: '#3a2024',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  fineTextText: {
    fontSize: 11,
    color: '#e5e7eb',
  },
  boldRedText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  btnRowCompact: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  actionBtnCompact: {
    flex: 1,
    height: 26,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnTextCompact: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  btnPrimaryColor: {
    backgroundColor: '#6366f1',
  },
  btnEditColor: {
    backgroundColor: '#3b82f6',
  },
  btnDeleteColor: {
    backgroundColor: '#ef4444',
  },
  btnFullWidthAction: {
    backgroundColor: '#6366f1',
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  btnFullWidthActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
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
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#8a8f9d',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  modalScrollBody: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 11,
    color: '#8a8f9d',
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
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
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  pickerAltItemActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  pickerAltText: {
    color: '#8a8f9d',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pickerAltTextActive: {
    color: '#fff',
  },
  formRow: {
    flexDirection: 'row',
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
  issuePreviewBox: {
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  issueBookTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  issueBookDetails: {
    fontSize: 11,
    color: '#8a8f9d',
  },
  pickerReplacementRowVertical: {
    gap: 6,
    marginBottom: 16,
    maxHeight: 120,
  },
  memberSelectItem: {
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    padding: 10,
    borderRadius: 6,
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
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
