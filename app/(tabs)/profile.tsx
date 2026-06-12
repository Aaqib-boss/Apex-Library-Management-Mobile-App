import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const AVATAR_TEMPLATES = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo to purple
  'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', // Blue to cyan
  'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', // Emerald to blue
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', // Amber to red
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', // Pink to violet
];

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();

  // Profile forms
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password forms
  const [showPassModal, setShowPassModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out of Apex Library mobile portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', onPress: () => logout() }
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!name || !phone || !address) {
      Alert.alert('Validation Error', 'Please fill in all profile fields.');
      return;
    }
    if (phone.length !== 10) {
      Alert.alert('Validation Error', 'Phone number must be exactly 10 digits.');
      return;
    }

    setSavingProfile(true);
    try {
      await api.updateProfile({
        name,
        phone,
        address,
        avatar: AVATAR_TEMPLATES[avatarIndex]
      });
      Alert.alert('Success', 'Profile information updated successfully!');
      await refreshUser();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length !== 5) {
      Alert.alert('Validation Error', 'New password must be exactly 5 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password updated successfully!');
      setShowPassModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const getGradientColors = () => {
    const defaultGrad = '#3b82f6';
    const activeGrad = AVATAR_TEMPLATES[avatarIndex];
    if (activeGrad.includes('#ec4899')) return '#ec4899';
    if (activeGrad.includes('#6366f1')) return '#6366f1';
    if (activeGrad.includes('#10b981')) return '#10b981';
    if (activeGrad.includes('#f59e0b')) return '#f59e0b';
    return defaultGrad;
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Avatar and Basic Info */}
        <View style={styles.headerCard}>
          <View style={[styles.avatar, { backgroundColor: getGradientColors() }]}>
            <Text style={styles.avatarText}>
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.nameText}>{name || 'Apex User'}</Text>
          <Text style={styles.roleBadge}>{user?.role?.toUpperCase() || 'MEMBER'}</Text>

          {/* Quick Avatar Gradient Selector */}
          <Text style={styles.gradLabel}>Choose Avatar Theme</Text>
          <View style={styles.gradList}>
            {AVATAR_TEMPLATES.map((color, idx) => {
              let dotColor = '#3b82f6';
              if (color.includes('#ec4899')) dotColor = '#ec4899';
              else if (color.includes('#6366f1')) dotColor = '#6366f1';
              else if (color.includes('#10b981')) dotColor = '#10b981';
              else if (color.includes('#f59e0b')) dotColor = '#f59e0b';

              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.gradDot, { backgroundColor: dotColor }, avatarIndex === idx && styles.gradDotActive]}
                  onPress={() => setAvatarIndex(idx)}
                />
              );
            })}
          </View>
        </View>

        {/* Editable profile fields */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          
          <Text style={styles.formLabel}>User ID</Text>
          <TextInput style={[styles.formInput, styles.inputDisabled]} value={user?.id || user?._id} editable={false} />

          <Text style={styles.formLabel}>Email Address</Text>
          <TextInput style={[styles.formInput, styles.inputDisabled]} value={user?.email} editable={false} />

          <Text style={styles.formLabel}>Full Name</Text>
          <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#6e7787" />

          <Text style={styles.formLabel}>Phone Number</Text>
          <TextInput style={styles.formInput} value={phone} onChangeText={setPhone} keyboardType="numeric" maxLength={10} placeholder="10-digit phone number" placeholderTextColor="#6e7787" />

          <Text style={styles.formLabel}>Home Address</Text>
          <TextInput style={[styles.formInput, { height: 60 }]} multiline numberOfLines={3} value={address} onChangeText={setAddress} placeholder="Residential address" placeholderTextColor="#6e7787" />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 Save Changes</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.passBtn} onPress={() => { setShowPassModal(true); }}>
          <Text style={styles.passBtnText}>🔒 Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out Securely</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* PASSWORD CHANGE MODAL */}
      <Modal visible={showPassModal} transparent={true} animationType="fade" onRequestClose={() => setShowPassModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>🔒 Update Password</Text>
              <TouchableOpacity onPress={() => setShowPassModal(false)}>
                <Text style={styles.closeBtn}>&times;</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Current Password</Text>
            <TextInput style={styles.formInput} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" placeholderTextColor="#6e7787" />

            <Text style={styles.formLabel}>New Password</Text>
            <TextInput style={styles.formInput} secureTextEntry maxLength={5} value={newPassword} onChangeText={setNewPassword} placeholder="Exactly 5 characters" placeholderTextColor="#6e7787" />

            <Text style={styles.formLabel}>Confirm New Password</Text>
            <TextInput style={styles.formInput} secureTextEntry maxLength={5} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter new password" placeholderTextColor="#6e7787" />

            <TouchableOpacity style={styles.submitPassBtn} onPress={handlePasswordSubmit} disabled={savingPassword}>
              {savingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitPassBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#161b26',
    borderWidth: 1,
    borderColor: '#242b3d',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  gradLabel: {
    fontSize: 11,
    color: '#8a8f9d',
    marginBottom: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  gradList: {
    flexDirection: 'row',
    gap: 8,
  },
  gradDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#161b26',
  },
  gradDotActive: {
    borderColor: '#fff',
  },
  infoSection: {
    backgroundColor: '#161b26',
    borderWidth: 1,
    borderColor: '#242b3d',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderColor: '#242b3d',
    paddingBottom: 6,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8a8f9d',
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
    borderColor: '#242b3d',
    marginBottom: 14,
  },
  inputDisabled: {
    backgroundColor: '#151c2c',
    color: '#8a8f9d',
  },
  saveBtn: {
    height: 38,
    backgroundColor: '#10b981',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  passBtn: {
    height: 38,
    backgroundColor: '#1c2538',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242b3d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  passBtnText: {
    color: '#ccd3e0',
    fontSize: 13,
    fontWeight: 'bold',
  },
  logoutButton: {
    height: 38,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#161b26',
    borderWidth: 1,
    borderColor: '#242b3d',
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
  submitPassBtn: {
    height: 38,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitPassBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
