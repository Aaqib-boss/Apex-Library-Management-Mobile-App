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
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { api, Loan, Reservation, DashboardMetrics } from '../utils/api';

const ROOMS = ['Private Study Pod A', 'Private Study Pod B', 'Group Study Room 1', 'Group Study Room 2'];
const TIME_SLOTS = ['09:00 AM - 11:00 AM', '11:00 AM - 01:00 PM', '01:00 PM - 03:00 PM', '03:00 PM - 05:00 PM'];

// Mock eBook Chapters
const EBOOK_CHAPTERS = [
  {
    chapter: 'Chapter 1: The Gateway of Discovery',
    text: `The air inside the great repository was thick with the scent of aged parchment and leather bindings. Every column of shelving stretched high toward vaulting ceilings, lost in shadows. For generations, this place had stood as a silent witness to the rise and fall of great empires, housing the thoughts, struggles, and triumphs of humanity.\n\nHe stepped forward, his boots clicking softly on the polished stone floor. In his hand, he held a single brass key. The key to the locked archive. What lay beyond those heavy oak doors was more than mere history—it was a truth that would alter the course of their lives forever.\n\n"You should not be here," a voice whispered from the darkness of Aisle 4.`
  },
  {
    chapter: 'Chapter 2: Deciphering the Runes',
    text: `As the dust settled, the ledger lay open under the pale beam of his lantern. The writing was not in any tongue he recognized, yet there was a strange, rhythmic familiarity to the strokes. He traced his fingers over the gold-embossed margins, feeling a faint, warm vibration.\n\n"It is a map," he muttered to himself, his breath fogging in the chill night air. "Not of land, but of memory."\n\nEach page turned revealed a new layer of geometric charts and planetary alignments. The ancient keepers had not merely written records; they had woven a complex tapestry of coordinates that matched the stars above the library roof.`
  },
  {
    chapter: 'Chapter 3: The Library\'s Secret',
    text: `With a sudden, metallic click, the secret wall partition slid back, revealing a spiral staircase winding down into the core of the foundations. The scent of ozone and cold water wafted up. From somewhere deep below, he could hear a low hum like a heartbeat.\n\nHe hesitated, then descended. The steps were worn smooth by centuries of footsteps. At the bottom, in a room illuminated by glowing blue crystals, sat a single podium. Atop it sat a mechanical device, its gear-wheels turning in absolute silence.`
  }
];

export default function MemberDashboard() {
  const { 
    user, 
    refreshUser, 
    notifications, 
    unreadCount, 
    settings, 
    markNotificationRead, 
    markAllNotificationsRead 
  } = useAuth();
  
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  const isFeatureEnabled = (featureId: string) => {
    if (!settings || !settings.features) return true;
    const f = settings.features.find(item => item.id === featureId);
    return f ? f.enabled !== false : true;
  };
  
  // Dashboard metrics
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Study Space states
  const [spaceBookings, setSpaceBookings] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOTS[0]);
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Fine payment modal state
  const [activePayFineLoan, setActivePayFineLoan] = useState<Loan | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paying, setPaying] = useState(false);

  // eBook reader modal state
  const [activeEbook, setActiveEbook] = useState<Loan | null>(null);
  const [ebookPage, setEbookPage] = useState(0);

  // Membership Card modal state
  const [showCardModal, setShowCardModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await refreshUser();
      
      const metricsData = await api.getDashboardMetrics();
      if (metricsData.success) {
        setMetrics(metricsData.metrics);
      }
      
      const loansList = await api.getLoans();
      setLoans(loansList);

      const resvList = await api.getReservations();
      setReservations(resvList);

      const spacesData = await AsyncStorage.getItem('all_room_bookings');
      if (spacesData && user) {
        const parsed = JSON.parse(spacesData);
        setSpaceBookings(parsed.filter((b: any) => b.userId === user.id || b.userId === user._id));
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to retrieve dashboard details.');
    } finally {
      setLoading(false);
    }
  };

  // Immediate return
  const handleReturn = async (loan: Loan) => {
    Alert.alert(
      'Return Book',
      `Are you sure you want to return "${loan.bookId?.title || 'Book'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Return', 
          onPress: async () => {
            try {
              setLoading(true);
              const data = await api.returnBook(loan._id);
              if (data.success) {
                if (data.fineAmount > 0) {
                  Alert.alert(
                    'Late Fine Calculated',
                    `Overdue late fine: $${data.fineAmount.toFixed(2)}. Open payment gateway now?`,
                    [
                      { text: 'Later', onPress: () => fetchData() },
                      { text: 'Pay Now', onPress: () => openPaymentModal({ ...loan, fineAmount: data.fineAmount }) }
                    ]
                  );
                } else {
                  Alert.alert('Success', 'Book returned successfully with zero fines!');
                  fetchData();
                }
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

  const handleCancelHold = async (resv: Reservation) => {
    Alert.alert(
      'Cancel Hold',
      `Cancel hold queue for "${resv.bookId?.title || 'Book'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.cancelHold(resv._id);
              if (res.success) {
                Alert.alert('Hold Cancelled', 'Your reservation request was successfully removed.');
                fetchData();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel hold.');
              fetchData();
            }
          }
        }
      ]
    );
  };

  // Study space booking
  const handleBookRoom = async () => {
    if (!bookingDate) {
      Alert.alert('Validation Error', 'Please select or enter a booking date.');
      return;
    }

    setBookingLoading(true);
    try {
      const stored = await AsyncStorage.getItem('all_room_bookings');
      const all = stored ? JSON.parse(stored) : [];
      
      // Check double-booking
      const isDoubleBooked = all.some(
        (b: any) => b.room === selectedRoom && b.date === bookingDate && b.timeSlot === selectedTimeSlot && (b.status === 'Confirmed' || b.status === 'Pending')
      );

      if (isDoubleBooked) {
        Alert.alert('Double Booked', `${selectedRoom} is already reserved for this date and time.`);
        setBookingLoading(false);
        return;
      }

      const newBooking = {
        id: `booking-${Date.now()}`,
        userId: user?.id || user?._id,
        userName: user?.name || 'Member',
        userEmail: user?.email || '',
        room: selectedRoom,
        date: bookingDate,
        timeSlot: selectedTimeSlot,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      const updated = [newBooking, ...all];
      await AsyncStorage.setItem('all_room_bookings', JSON.stringify(updated));
      
      Alert.alert('Success', `Study space requested for ${selectedRoom}. Waiting for approval!`);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to request study space.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelRoomBooking = async (id: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this study pod request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem('all_room_bookings');
              const all = stored ? JSON.parse(stored) : [];
              const updated = all.filter((b: any) => b.id !== id);
              await AsyncStorage.setItem('all_room_bookings', JSON.stringify(updated));
              Alert.alert('Cancelled', 'Study space request cancelled.');
              fetchData();
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel room booking.');
            }
          }
        }
      ]
    );
  };

  // Fine payment
  const openPaymentModal = (loan: Loan) => {
    setActivePayFineLoan(loan);
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  };

  const handlePaymentSubmit = async () => {
    if (!activePayFineLoan) return;

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3) {
      Alert.alert('Validation Error', 'Please enter a valid 16-digit card, expiry, and CVV codes.');
      return;
    }
    setPaying(true);
    try {
      const res = await api.payFine(activePayFineLoan._id, activePayFineLoan.fineAmount);
      if (res.success) {
        Alert.alert('Payment Successful', `Fine of $${activePayFineLoan.fineAmount.toFixed(2)} paid successfully.`);
        setActivePayFineLoan(null);
        fetchData();
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  // Google QR Code API
  const getQRCodeUrl = (memberId: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${memberId}`;
  };

  if (loading && !metrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  // Calculate simulated circular stats ratio (e.g. books availability or returned ratio)
  const returnedRatio = loans.length > 0 
    ? Math.round((loans.filter(l => l.status === 'returned').length / loans.length) * 100)
    : 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* Greeting and Digital Card Quick Launch */}
      <View style={styles.welcomeContainer}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.usernameText}>{user?.name || 'Member'}</Text>
        </View>
        <TouchableOpacity style={styles.cardBtn} onPress={() => setShowCardModal(true)}>
          <Text style={styles.cardBtnText}>🪪 Card</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Inbox Panel */}
      <View style={styles.notificationsPanelCard}>
        <View style={styles.notificationsHeader}>
          <View style={styles.notificationsTitleRow}>
            <Text style={styles.panelTitle}>📬 Notifications Inbox</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {notifications.length > 0 && unreadCount > 0 && (
            <TouchableOpacity onPress={markAllNotificationsRead}>
              <Text style={styles.markAllReadText}>✓ Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {notifications.length === 0 ? (
          <Text style={styles.noNotificationsText}>No notifications in your inbox.</Text>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.slice(0, showAllNotifications ? undefined : 3).map((item) => (
              <TouchableOpacity 
                key={item._id} 
                style={[styles.notificationItem, !item.readStatus && styles.notificationItemUnread]}
                onPress={() => !item.readStatus && markNotificationRead(item._id)}
              >
                <View style={styles.notificationHeaderRow}>
                  <Text style={[styles.notificationActionText, !item.readStatus && styles.boldText]}>
                    {item.action}
                  </Text>
                  <Text style={styles.notificationTimeText}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.notificationDetailsText} numberOfLines={2}>
                  {item.details}
                </Text>
                {!item.readStatus && (
                  <View style={styles.unreadIndicatorDot} />
                )}
              </TouchableOpacity>
            ))}
            
            {notifications.length > 3 && (
              <TouchableOpacity 
                style={styles.showMoreBtn} 
                onPress={() => setShowAllNotifications(!showAllNotifications)}
              >
                <Text style={styles.showMoreBtnText}>
                  {showAllNotifications ? 'Show Less' : `Show All (${notifications.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Metrics Row with pink-gradient background styling */}
      {metrics && (
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardPink]}>
            <Text style={styles.metricIcon}>📖</Text>
            <Text style={styles.metricNumber}>{metrics.borrowedBooks}</Text>
            <Text style={styles.metricLabel}>Borrowed</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardOrange]}>
            <Text style={styles.metricIcon}>⏳</Text>
            <Text style={styles.metricNumber}>{metrics.activeHolds}</Text>
            <Text style={styles.metricLabel}>Holds</Text>
          </View>
          {isFeatureEnabled('fines') && (
            <View style={[styles.metricCard, styles.metricCardRed, metrics.pendingFines > 0 && styles.metricCardAlert]}>
              <Text style={styles.metricIcon}>💰</Text>
              <Text style={styles.metricNumber}>${metrics.pendingFines.toFixed(2)}</Text>
              <Text style={styles.metricLabel}>Fines</Text>
            </View>
          )}
        </View>
      )}

      {/* Polish Indicator: Concentric circular progress visualizer */}
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Your Reading Return Ratio</Text>
        <View style={styles.ratioWrapper}>
          <View style={styles.ratioCircle}>
            <Text style={styles.ratioPercentText}>{returnedRatio}%</Text>
            <Text style={styles.ratioSubText}>Returned</Text>
          </View>
          <View style={styles.ratioDetails}>
            <Text style={styles.ratioDetailText}>Total Checked Out: <Text style={styles.boldText}>{loans.length}</Text></Text>
            <Text style={styles.ratioDetailText}>Active Loans: <Text style={styles.boldText}>{loans.filter(l => l.status !== 'returned').length}</Text></Text>
          </View>
        </View>
      </View>

      {/* Borrowed Books */}
      <Text style={styles.sectionHeader}>My Borrowed Books</Text>
      {loans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>You currently have no checked-out books.</Text>
        </View>
      ) : (
        loans.map((item) => (
          <View key={item._id} style={styles.transactionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.bookTitle} numberOfLines={1}>{item.bookId?.title || 'Deleted Book'}</Text>
              <Text style={styles.bookAuthor}>By {item.bookId?.author || 'Unknown'}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.infoText}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
              <Text style={[styles.badge, item.status === 'overdue' ? styles.badgeOverdue : styles.badgeActive]}>
                {item.status}
              </Text>
            </View>

            {isFeatureEnabled('fines') && item.fineAmount > 0 && (
              <View style={styles.fineRow}>
                <Text style={styles.fineText}>
                  Fine: <Text style={styles.fineValue}>${item.fineAmount.toFixed(2)}</Text> ({item.fineStatus})
                </Text>
                {item.fineStatus === 'unpaid' && (
                  <TouchableOpacity style={styles.payBtn} onPress={() => openPaymentModal(item)}>
                    <Text style={styles.payBtnText}>💳 Pay Fine</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.btnRow}>
              {item.status !== 'returned' && (
                <TouchableOpacity style={styles.returnBtn} onPress={() => handleReturn(item)}>
                  <Text style={styles.returnBtnText}>🔄 Return Book</Text>
                </TouchableOpacity>
              )}
              {isFeatureEnabled('ebooks') && item.status !== 'returned' && (
                <TouchableOpacity 
                  style={styles.readBtn} 
                  onPress={() => {
                    setActiveEbook(item);
                    setEbookPage(0);
                  }}
                >
                  <Text style={styles.readBtnText}>📖 Read eBook</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}

      {/* Reservations */}
      <Text style={styles.sectionHeader}>My Hold Reservations</Text>
      {reservations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active hold reservations.</Text>
        </View>
      ) : (
        reservations.map((item) => (
          <View key={item._id} style={styles.transactionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.bookTitle} numberOfLines={1}>{item.bookId?.title || 'Deleted Book'}</Text>
              <Text style={styles.bookAuthor}>ISBN: {item.bookId?.isbn || '—'}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.infoText}>Requested: {new Date(item.reservationDate).toLocaleDateString()}</Text>
              <Text style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgePending]}>
                {item.status}
              </Text>
            </View>

            {(item.status === 'pending' || item.status === 'active') && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelHold(item)}>
                <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      {/* Space Booking Simulator Panel */}
      {isFeatureEnabled('rooms') && (
        <>
          <Text style={styles.sectionHeader}>🏛️ Study Spaces Booking Simulator</Text>
          <View style={styles.bookingFormCard}>
            <Text style={styles.formLabel}>Select Study Space / Room</Text>
            <View style={styles.pickerAlternative}>
              {ROOMS.map(r => (
                <TouchableOpacity 
                  key={r} 
                  style={[styles.pickerAltItem, selectedRoom === r && styles.pickerAltItemActive]} 
                  onPress={() => setSelectedRoom(r)}
                >
                  <Text style={[styles.pickerAltText, selectedRoom === r && styles.pickerAltTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Select Time Slot</Text>
            <View style={styles.pickerAlternative}>
              {TIME_SLOTS.map(t => (
                <TouchableOpacity 
                  key={t} 
                  style={[styles.pickerAltItem, selectedTimeSlot === t && styles.pickerAltItemActive]} 
                  onPress={() => setSelectedTimeSlot(t)}
                >
                  <Text style={[styles.pickerAltText, selectedTimeSlot === t && styles.pickerAltTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={styles.formInput} 
              value={bookingDate} 
              onChangeText={setBookingDate} 
              placeholder="e.g. 2026-06-08" 
              placeholderTextColor="#8a8f9d" 
            />

            <TouchableOpacity style={styles.bookingSubmitBtn} onPress={handleBookRoom} disabled={bookingLoading}>
              {bookingLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookingSubmitBtnText}>Book Room Pod Now</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Active Space Bookings */}
      {isFeatureEnabled('rooms') && spaceBookings.length > 0 && (
        <View style={styles.spaceListContainer}>
          <Text style={styles.smallSectionHeader}>Active Space Bookings</Text>
          {spaceBookings.map((b: any) => (
            <View key={b.id} style={styles.spaceCardCompact}>
              <View style={{ flex: 1 }}>
                <Text style={styles.spaceCardRoom}>{b.room}</Text>
                <Text style={styles.spaceCardTime}>{b.date} • {b.timeSlot}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={[styles.badge, b.status === 'Confirmed' ? styles.badgeActive : b.status === 'Rejected' ? styles.badgeOverdue : styles.badgePending]}>
                  {b.status}
                </Text>
                <TouchableOpacity onPress={() => handleCancelRoomBooking(b.id)}>
                  <Text style={styles.cancelTextBtn}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* DIGITAL MEMBERSHIP CARD MODAL */}
      <Modal visible={showCardModal} transparent={true} animationType="fade" onRequestClose={() => setShowCardModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>🪪 Membership Card</Text>
              <TouchableOpacity onPress={() => setShowCardModal(false)}>
                <Text style={styles.closeBtn}>&times;</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.membershipCardFrame}>
              <View style={styles.memberCardHeader}>
                <Text style={styles.cardBrand}>Apex Library</Text>
                <Text style={styles.cardTypeLabel}>MEMBER</Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardPhotoPlaceholder}>
                  <Text style={{ fontSize: 32 }}>👤</Text>
                </View>
                <View style={styles.cardUserContainer}>
                  <Text style={styles.cardUserName}>{user?.name}</Text>
                  <Text style={styles.cardUserId}>ID: {user?.id || user?._id}</Text>
                  <Text style={styles.cardUserJoin}>Role: Member</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterAuth}>ISSUED BY APEX LIBRARY</Text>
                <Image source={{ uri: getQRCodeUrl(user?.id || user?._id || '') }} style={styles.cardQrCode} />
              </View>
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCardModal(false)}>
              <Text style={styles.modalCloseBtnText}>Close Card View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EBOOK READER MODAL */}
      <Modal visible={activeEbook !== null} transparent={false} animationType="slide" onRequestClose={() => setActiveEbook(null)}>
        <View style={styles.ebookContainer}>
          <View style={styles.ebookHeaderRow}>
            <Text style={styles.ebookBookTitle} numberOfLines={1}>{activeEbook?.bookId?.title}</Text>
            <TouchableOpacity onPress={() => setActiveEbook(null)}>
              <Text style={styles.ebookCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ebookPageCard}>
            <Text style={styles.ebookChapterTitle}>{EBOOK_CHAPTERS[ebookPage]?.chapter}</Text>
            <ScrollView style={{ flex: 1 }}>
              <Text style={styles.ebookPageText}>{EBOOK_CHAPTERS[ebookPage]?.text}</Text>
            </ScrollView>
          </View>

          <View style={styles.ebookFooter}>
            <TouchableOpacity 
              style={[styles.ebookNavBtn, ebookPage === 0 && styles.ebookNavBtnDisabled]} 
              disabled={ebookPage === 0}
              onPress={() => setEbookPage(prev => prev - 1)}
            >
              <Text style={styles.ebookNavText}>◀ Prev Page</Text>
            </TouchableOpacity>
            <Text style={styles.ebookPageNumText}>Page {ebookPage + 1} of {EBOOK_CHAPTERS.length}</Text>
            <TouchableOpacity 
              style={[styles.ebookNavBtn, ebookPage === EBOOK_CHAPTERS.length - 1 && styles.ebookNavBtnDisabled]} 
              disabled={ebookPage === EBOOK_CHAPTERS.length - 1}
              onPress={() => setEbookPage(prev => prev + 1)}
            >
              <Text style={styles.ebookNavText}>Next Page ▶</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FINE PAYMENT MODAL */}
      {activePayFineLoan && (
        <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setActivePayFineLoan(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>💳 Fine Payment</Text>
                <TouchableOpacity onPress={() => setActivePayFineLoan(null)}>
                  <Text style={styles.closeBtn}>&times;</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Outstanding Late Fee</Text>
                <Text style={styles.amountVal}>${activePayFineLoan.fineAmount.toFixed(2)}</Text>
                <Text style={styles.amountBook} numberOfLines={1}>Book: {activePayFineLoan.bookId?.title}</Text>
              </View>

              <Text style={styles.formLabel}>Cardholder Name</Text>
              <TextInput style={styles.formInput} value={user?.name} editable={false} />

              <Text style={styles.formLabel}>16-Digit Card Number</Text>
              <TextInput 
                style={styles.formInput} 
                placeholder="4000 1234 5678 9010"
                placeholderTextColor="#6e7787"
                keyboardType="numeric"
                maxLength={19}
                value={cardNumber}
                onChangeText={(text) => {
                  const clean = text.replace(/\D/g, '').slice(0, 16);
                  const formatted = clean.replace(/(\d{4})(?=\d)/g, '$1 ');
                  setCardNumber(formatted);
                }}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Expiry Date</Text>
                  <TextInput 
                    style={styles.formInput} 
                    placeholder="MM/YY"
                    placeholderTextColor="#6e7787"
                    maxLength={5}
                    value={cardExpiry}
                    onChangeText={(text) => {
                      const clean = text.replace(/\D/g, '').slice(0, 4);
                      let formatted = clean;
                      if (clean.length > 2) {
                        formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
                      }
                      setCardExpiry(formatted);
                    }}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.formLabel}>CVV Code</Text>
                  <TextInput 
                    style={styles.formInput} 
                    placeholder="123"
                    placeholderTextColor="#6e7787"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={3}
                    value={cardCvv}
                    onChangeText={(text) => setCardCvv(text.replace(/\D/g, ''))}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.submitPayBtn} onPress={handlePaymentSubmit} disabled={paying}>
                {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitPayBtnText}>Clear Fine Now</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#9ba2b2',
  },
  usernameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardBtn: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  metricCardPink: {
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    borderColor: 'rgba(236, 72, 153, 0.25)',
  },
  metricCardOrange: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  metricCardRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  metricCardAlert: {
    borderColor: '#ef4444',
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#8a8f9d',
  },
  panelCard: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  ratioWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  ratioCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f131c',
  },
  ratioPercentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  ratioSubText: {
    fontSize: 8,
    color: '#8a8f9d',
    textTransform: 'uppercase',
  },
  ratioDetails: {
    flex: 1,
    gap: 4,
  },
  ratioDetailText: {
    fontSize: 13,
    color: '#ccd3e0',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: '#151c2c',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242f49',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    color: '#8a8f9d',
    fontSize: 13,
  },
  transactionCard: {
    backgroundColor: '#151c2c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242f49',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 10,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#8a8f9d',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
  },
  badgeOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
  },
  fineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#242f49',
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  fineText: {
    fontSize: 12,
    color: '#ccd3e0',
  },
  fineValue: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  payBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  payBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  returnBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  readBtn: {
    flex: 1,
    backgroundColor: '#ec4899',
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bookingFormCard: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 11,
    color: '#8a8f9d',
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pickerAlternative: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  pickerAltItem: {
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  pickerAltItemActive: {
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
  },
  pickerAltText: {
    color: '#8a8f9d',
    fontSize: 11,
    fontWeight: '600',
  },
  pickerAltTextActive: {
    color: '#fff',
    fontWeight: 'bold',
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
    marginBottom: 14,
  },
  bookingSubmitBtn: {
    height: 38,
    backgroundColor: '#ec4899',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingSubmitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  spaceListContainer: {
    marginBottom: 24,
  },
  smallSectionHeader: {
    fontSize: 13,
    color: '#8a8f9d',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  spaceCardCompact: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  spaceCardRoom: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  spaceCardTime: {
    fontSize: 11,
    color: '#8a8f9d',
  },
  cancelTextBtn: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 16,
    padding: 20,
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
  membershipCardFrame: {
    backgroundColor: '#0b0f19',
    borderWidth: 1.5,
    borderColor: '#ec4899',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  memberCardHeader: {
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
    color: '#ec4899',
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
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
  ebookContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    padding: 20,
    paddingTop: 50,
  },
  ebookHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#242f49',
    paddingBottom: 10,
  },
  ebookBookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 10,
  },
  ebookCloseText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  ebookPageCard: {
    flex: 1,
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ebookChapterTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ec4899',
    marginBottom: 12,
    textAlign: 'center',
  },
  ebookPageText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 22,
  },
  ebookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
  },
  ebookNavBtn: {
    backgroundColor: '#1c2538',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ebookNavBtnDisabled: {
    opacity: 0.4,
  },
  ebookNavText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ebookPageNumText: {
    color: '#8a8f9d',
    fontSize: 12,
  },
  amountBox: {
    backgroundColor: '#0f131c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#242f49',
  },
  amountLabel: {
    fontSize: 12,
    color: '#8a8f9d',
    marginBottom: 4,
  },
  amountVal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 6,
  },
  amountBook: {
    fontSize: 11,
    color: '#ccd3e0',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitPayBtn: {
    height: 40,
    backgroundColor: '#10b981',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitPayBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  notificationsPanelCard: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#242f49',
    paddingBottom: 8,
  },
  notificationsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#ec4899',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  markAllReadText: {
    color: '#ec4899',
    fontSize: 11,
    fontWeight: 'bold',
  },
  noNotificationsText: {
    color: '#8a8f9d',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  notificationsList: {
    gap: 8,
  },
  notificationItem: {
    backgroundColor: '#0f131c',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242f49',
    position: 'relative',
  },
  notificationItemUnread: {
    borderColor: 'rgba(236, 72, 153, 0.4)',
    backgroundColor: 'rgba(236, 72, 153, 0.02)',
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  notificationTimeText: {
    fontSize: 10,
    color: '#8a8f9d',
  },
  notificationDetailsText: {
    fontSize: 11,
    color: '#ccd3e0',
    lineHeight: 15,
  },
  unreadIndicatorDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ec4899',
  },
  showMoreBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  showMoreBtnText: {
    color: '#ec4899',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
