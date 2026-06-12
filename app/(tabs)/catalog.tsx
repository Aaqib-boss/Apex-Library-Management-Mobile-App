import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image,
  Alert,
  SafeAreaView,
  Modal,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { api, Book } from '../../utils/api';

const CATEGORIES = ['All', 'Technology', 'Fantasy', 'Fiction', 'Science', 'Biography'];

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

export default function BookCatalogScreen() {
  const { user, settings } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const isFeatureEnabled = (featureId: string) => {
    if (!settings || !settings.features) return true;
    const f = settings.features.find(item => item.id === featureId);
    return f ? f.enabled !== false : true;
  };

  // eBook reader modal state
  const [selectedEbook, setSelectedEbook] = useState<Book | null>(null);
  const [ebookPage, setEbookPage] = useState(0);

  // Reviews modal state
  const [selectedBookForReviews, setSelectedBookForReviews] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, [selectedCategory]);

  const fetchBooks = async (query = search) => {
    setLoading(true);
    try {
      const list = await api.getCatalog(query, selectedCategory);
      setBooks(list);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to retrieve catalog books.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
  };

  const handleSearchSubmit = () => {
    fetchBooks(search);
  };

  const handlePlaceHold = async (book: Book) => {
    const isAvailable = book.availableCopies > 0;
    Alert.alert(
      isAvailable ? 'Request Book' : 'Reserve / Place Hold',
      `Place a hold request for "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: isAvailable ? 'Request Copy' : 'Place Hold', 
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.placeHold(book._id);
              if (res.success) {
                Alert.alert(
                  'Success', 
                  isAvailable 
                    ? 'Request submitted successfully! Go to Dashboard or collect it from the desk.'
                    : 'Placed in hold queue! You will be notified once stock becomes available.'
                );
                fetchBooks();
              }
            } catch (err: any) {
              Alert.alert('Reservation Failed', err.message || 'Error creating hold reservation.');
              fetchBooks();
            }
          }
        }
      ]
    );
  };

  // eBook Reader trigger
  const handleOpenEbook = (book: Book) => {
    setSelectedEbook(book);
    setEbookPage(0);
  };

  // Reviews trigger
  const handleOpenReviews = async (book: Book) => {
    setSelectedBookForReviews(book);
    setUserRating(5);
    setUserComment('');
    try {
      const saved = await AsyncStorage.getItem(`reviews_${book._id}`);
      const list = saved ? JSON.parse(saved) : [
        { name: 'Alice Smith', rating: 5, comment: 'An absolute masterpiece! Highly recommended for book clubs.', date: new Date().toISOString() },
        { name: 'David Jones', rating: 4, comment: 'Very well structured and easy to follow.', date: new Date().toISOString() }
      ];
      setReviews(list);
    } catch (e) {
      setReviews([]);
    }
  };

  const handleAddReview = async () => {
    if (!selectedBookForReviews) return;
    if (!userComment.trim()) {
      Alert.alert('Validation Error', 'Please write a review comment.');
      return;
    }

    setSubmittingReview(true);
    try {
      const newReview = {
        name: user?.name || 'Anonymous Member',
        rating: userRating,
        comment: userComment,
        date: new Date().toISOString()
      };

      const updated = [newReview, ...reviews];
      setReviews(updated);
      await AsyncStorage.setItem(`reviews_${selectedBookForReviews._id}`, JSON.stringify(updated));
      setUserComment('');
      Alert.alert('Success', 'Thank you! Review posted successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save review comment.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    const hasImage = item.coverImage || item.coverUrl;
    const isAvailable = item.availableCopies > 0;

    return (
      <View style={styles.bookCard}>
        {/* Cover image thumbnail */}
        <View style={styles.imageContainer}>
          {hasImage ? (
            <Image 
              source={{ uri: item.coverImage || item.coverUrl }} 
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverFallback}>
              <Text style={styles.coverFallbackText}>📖</Text>
            </View>
          )}
        </View>

        {/* Text details */}
        <View style={styles.detailsContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.genreText}>{item.category}</Text>
            <Text style={[styles.statusText, isAvailable ? styles.statusInStock : styles.statusOutOfStock]}>
              {isAvailable ? `In Stock (${item.availableCopies})` : 'Out of Stock'}
            </Text>
          </View>
          
          <Text style={styles.titleText} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.authorText}>By {item.author}</Text>
          <Text style={styles.isbnText}>ISBN: {item.isbn} • Rack: {item.rackNumber}</Text>

          <TouchableOpacity 
            style={[styles.holdBtn, !isAvailable && styles.holdBtnReserved]}
            onPress={() => handlePlaceHold(item)}
          >
            <Text style={styles.holdBtnText}>
              {isAvailable ? '📘 Request Book' : '⏳ Reserve / Place Hold'}
            </Text>
          </TouchableOpacity>

          {/* Read / Review button rows */}
          {(isFeatureEnabled('ebooks') || isFeatureEnabled('reviews')) && (
            <View style={styles.addonButtonsRow}>
              {isFeatureEnabled('ebooks') && (
                <TouchableOpacity style={styles.addonBtn} onPress={() => handleOpenEbook(item)}>
                  <Text style={styles.addonBtnText}>📖 Read</Text>
                </TouchableOpacity>
              )}
              {isFeatureEnabled('reviews') && (
                <TouchableOpacity style={styles.addonBtn} onPress={() => handleOpenReviews(item)}>
                  <Text style={styles.addonBtnText}>💬 Reviews</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Search by title, author, ISBN..."
          placeholderTextColor="#8a8f9d"
          value={search}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Horizontal Selector */}
      <View style={{ height: 42, marginBottom: 12 }}>
        <FlatList 
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoriesContainer}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item;
            return (
              <TouchableOpacity 
                style={[styles.categoryBadge, isActive && styles.categoryBadgeActive]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text style={[styles.categoryBadgeText, isActive && styles.categoryBadgeTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Books List */}
      {loading && books.length === 0 ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList 
          data={books}
          keyExtractor={(item) => item._id}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No catalog books matches the parameters.</Text>
            </View>
          }
        />
      )}

      {/* EBOOK READER PREVIEW MODAL */}
      <Modal visible={selectedEbook !== null} transparent={false} animationType="slide" onRequestClose={() => setSelectedEbook(null)}>
        <View style={styles.ebookContainer}>
          <View style={styles.ebookHeaderRow}>
            <Text style={styles.ebookBookTitle} numberOfLines={1}>{selectedEbook?.title}</Text>
            <TouchableOpacity onPress={() => setSelectedEbook(null)}>
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

      {/* REVIEWS MODAL */}
      <Modal visible={selectedBookForReviews !== null} transparent={true} animationType="slide" onRequestClose={() => setSelectedBookForReviews(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle} numberOfLines={1}>Reviews: {selectedBookForReviews?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedBookForReviews(null)}>
                <Text style={styles.closeBtn}>&times;</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Existing Reviews */}
              <Text style={styles.modalSectionTitle}>Member Reviews</Text>
              {reviews.length === 0 ? (
                <Text style={styles.emptyReviewsText}>No reviews left for this book yet. Be the first!</Text>
              ) : (
                reviews.map((r, idx) => (
                  <View key={idx} style={styles.reviewCardCompact}>
                    <View style={styles.reviewHeaderRowCompact}>
                      <Text style={styles.reviewAuthor}>{r.name}</Text>
                      <Text style={styles.reviewRatingText}>⭐ {r.rating}/5</Text>
                    </View>
                    <Text style={styles.reviewCommentText}>{r.comment}</Text>
                    <Text style={styles.reviewDate}>{new Date(r.date).toLocaleDateString()}</Text>
                  </View>
                ))
              )}

              {/* Leave Review Form */}
              <Text style={styles.modalSectionTitle}>Leave a Review</Text>
              
              <Text style={styles.formLabel}>Rating (1-5 Stars)</Text>
              <View style={styles.ratingStarsRow}>
                {[1, 2, 3, 4, 5].map(num => (
                  <TouchableOpacity 
                    key={num} 
                    style={[styles.starBtn, userRating === num && styles.starBtnActive]}
                    onPress={() => setUserRating(num)}
                  >
                    <Text style={[styles.starText, userRating === num && styles.starTextActive]}>{num} ★</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Comments / Review Text</Text>
              <TextInput 
                style={[styles.formInput, { height: 60 }]} 
                multiline 
                numberOfLines={3} 
                placeholder="Share your thoughts about this book..." 
                placeholderTextColor="#6e7787"
                value={userComment}
                onChangeText={setUserComment}
              />

              <TouchableOpacity style={styles.submitReviewBtn} onPress={handleAddReview} disabled={submittingReview}>
                {submittingReview ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitReviewBtnText}>Submit Review</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  searchBarContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#161b26',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242b3d',
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 14,
  },
  searchBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    fontSize: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: '#161b26',
    borderWidth: 1,
    borderColor: '#242b3d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  categoryBadgeActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryBadgeText: {
    color: '#9ba2b2',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadgeTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCard: {
    backgroundColor: '#161b26',
    borderWidth: 1,
    borderColor: '#242b3d',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    width: 90,
    height: 130,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0f131c',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverFallbackText: {
    fontSize: 32,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  genreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8a8f9d',
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusInStock: {
    color: '#10b981',
  },
  statusOutOfStock: {
    color: '#ef4444',
  },
  titleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  authorText: {
    fontSize: 12,
    color: '#ccd3e0',
    marginBottom: 2,
  },
  isbnText: {
    fontSize: 10,
    color: '#8a8f9d',
    marginBottom: 8,
  },
  holdBtn: {
    backgroundColor: '#3b82f6',
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdBtnReserved: {
    backgroundColor: '#f59e0b',
  },
  holdBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addonButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  addonBtn: {
    flex: 1,
    height: 28,
    backgroundColor: '#1f293d',
    borderWidth: 1,
    borderColor: '#2d3b55',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#8a8f9d',
    fontSize: 14,
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
  modalSectionTitle: {
    fontSize: 13,
    color: '#8a8f9d',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 10,
    borderBottomWidth: 1,
    borderColor: '#242f49',
    paddingBottom: 4,
  },
  emptyReviewsText: {
    color: '#8a8f9d',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 10,
    textAlign: 'center',
  },
  reviewCardCompact: {
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  reviewHeaderRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  reviewRatingText: {
    fontSize: 11,
    color: '#f59e0b',
  },
  reviewCommentText: {
    fontSize: 12,
    color: '#ccd3e0',
    lineHeight: 16,
  },
  reviewDate: {
    fontSize: 9,
    color: '#8a8f9d',
    marginTop: 4,
    textAlign: 'right',
  },
  formLabel: {
    fontSize: 11,
    color: '#8a8f9d',
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  starBtn: {
    flex: 1,
    backgroundColor: '#0f131c',
    borderWidth: 1,
    borderColor: '#242f49',
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  starText: {
    color: '#8a8f9d',
    fontSize: 11,
    fontWeight: 'bold',
  },
  starTextActive: {
    color: '#fff',
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
  submitReviewBtn: {
    height: 38,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitReviewBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
