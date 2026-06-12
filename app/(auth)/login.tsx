import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot' | 'reset' | 'otp'>('login');
  const [role, setRole] = useState<'admin' | 'librarian' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const { login, verify2FA } = useAuth();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // 2FA OTP States
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [simulatedCode, setSimulatedCode] = useState('');

  // Registration States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // Password Recovery States
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');

  // Dynamic colors based on role tab
  const primaryColor = role === 'member' ? '#ec4899' : '#6366f1';
  const labelColor = role === 'member' ? '#f472b6' : '#818cf8';

  const handleRoleChange = (r: 'admin' | 'librarian' | 'member') => {
    setRole(r);
    setEmail('');
    setPassword('');
    setShowPass(false);
    setOtpCode('');
    setTempToken('');
    setSimulatedCode('');
    setAuthTab('login');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password, role);
    setLoading(false);
    if (result.success) {
      if (result.require2FA) {
        setTempToken(result.tempToken || '');
        setSimulatedCode(result.code || '');
        setOtpCode('');
        setAuthTab('otp');
        if (result.code) {
          Alert.alert('2FA Verification Required', `Simulated OTP Code: ${result.code}`);
        } else {
          Alert.alert('2FA Verification Required', 'Simulated OTP code sent to Alerts Drawer.');
        }
      }
    } else {
      Alert.alert('Login Failed', result.message || 'Check your credentials.');
    }
  };

  const handleOtpVerify = async () => {
    if (!otpCode || otpCode.length < 6) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit OTP code.');
      return;
    }
    setLoading(true);
    const result = await verify2FA(otpCode, tempToken);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Verification Failed', result.message || 'Invalid verification code.');
    }
  };

  const handleRegisterSubmit = async () => {
    if (!regName || !regEmail || !regPassword || !regPhone || !regAddress) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    if (regPassword !== regConfirm) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }
    if (regPassword.length !== 5) {
      Alert.alert('Validation Error', 'Password must be exactly 5 characters long.');
      return;
    }
    if (regPhone.length !== 10) {
      Alert.alert('Validation Error', 'Phone number must be exactly 10 digits.');
      return;
    }

    setLoading(true);
    // Simulate API delay / registration request
    setTimeout(() => {
      setLoading(false);
      if (role === 'librarian') {
        Alert.alert(
          'Application Submitted',
          `Your application for a Staff (Librarian) account using email ${regEmail} has been received. Admin will review and approve it.`,
          [{ text: 'OK', onPress: () => setAuthTab('login') }]
        );
      } else {
        Alert.alert(
          'Success',
          'Your Member account was successfully created! You can now sign in.',
          [{ text: 'OK', onPress: () => {
            setEmail(regEmail);
            setAuthTab('login');
          }}]
        );
      }
    }, 1500);
  };

  const handleForgotSubmit = () => {
    if (!recoveryEmail) {
      Alert.alert('Validation Error', 'Please enter your email.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Code Sent',
        'A simulated 6-digit OTP code has been generated. Code: 123456',
        [{ text: 'Proceed', onPress: () => setAuthTab('reset') }]
      );
    }, 1000);
  };

  const handleResetSubmit = () => {
    if (!resetCode || !resetNewPass || !resetConfirmPass) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }
    if (resetNewPass.length !== 5) {
      Alert.alert('Validation Error', 'Password must be exactly 5 characters.');
      return;
    }
    if (resetCode !== '123456') {
      Alert.alert('Error', 'Invalid verification code.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Success',
        'Password has been reset successfully!',
        [{ text: 'Go to Login', onPress: () => setAuthTab('login') }]
      );
    }, 1000);
  };

  const autofill = (r: 'admin' | 'librarian' | 'member') => {
    setRole(r);
    setAuthTab('login');
    if (r === 'admin') {
      setEmail('admin@library.com');
      setPassword('admin123');
    } else if (r === 'librarian') {
      setEmail('librarian@library.com');
      setPassword('librarian123');
    } else {
      setEmail('john.doe@email.com');
      setPassword('member123');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>👑</Text>
          </View>
          <Text style={styles.logoText}>APEX LIBRARY SYSTEM</Text>
          <Text style={styles.subtitleText}>Where knowledge meets innovation</Text>
        </View>

        {/* Auth Forms Box */}
        <View style={styles.formContainer}>
          {authTab === 'login' && (
            <>
              {/* Role Selection Tabs */}
              <View style={styles.roleTabRow}>
                <TouchableOpacity
                  style={[styles.roleTabBtn, role === 'admin' && { backgroundColor: '#6366f1' }]}
                  onPress={() => handleRoleChange('admin')}
                >
                  <Text style={[styles.roleTabBtnText, role === 'admin' && styles.activeTabText]}>
                    👨‍💼 ADMIN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleTabBtn, role === 'librarian' && { backgroundColor: '#6366f1' }]}
                  onPress={() => handleRoleChange('librarian')}
                >
                  <Text style={[styles.roleTabBtnText, role === 'librarian' && styles.activeTabText]}>
                    📚 STAFF
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleTabBtn, role === 'member' && { backgroundColor: '#ec4899' }]}
                  onPress={() => handleRoleChange('member')}
                >
                  <Text style={[styles.roleTabBtnText, role === 'member' && styles.activeTabText]}>
                    👤 MEMBER
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Login Inputs */}
              <Text style={[styles.label, { color: labelColor }]}>✉ Email Address</Text>
              <TextInput 
                style={styles.input}
                placeholder="enter your library email..."
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={[styles.label, { color: labelColor }]}>🔑 Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput 
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Text style={styles.eyeBtnText}>{showPass ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.button, { backgroundColor: primaryColor }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.buttonText}>
                    ➜ Sign In as {role === 'admin' ? 'Admin' : role === 'librarian' ? 'Staff' : 'Member'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.forgotBtn} 
                onPress={() => setAuthTab('forgot')}
              >
                <Text style={styles.forgotBtnText}>❓ Forgot Password?</Text>
              </TouchableOpacity>

              {role === 'member' ? (
                <View style={styles.registerPrompt}>
                  <Text style={styles.dividerText}>New member?</Text>
                  <TouchableOpacity 
                    style={styles.outlineBtn}
                    onPress={() => setAuthTab('register')}
                  >
                    <Text style={styles.outlineBtnText}>👤 Create Member Account</Text>
                  </TouchableOpacity>
                </View>
              ) : role === 'librarian' ? (
                <View style={styles.registerPrompt}>
                  <Text style={styles.dividerText}>New staff?</Text>
                  <TouchableOpacity 
                    style={styles.outlineBtn}
                    onPress={() => setAuthTab('register')}
                  >
                    <Text style={styles.outlineBtnText}>📚 Apply as Staff</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          )}

          {authTab === 'register' && (
            <>
              {/* Header inside Card */}
              <View style={[styles.cardSubHeader, { backgroundColor: primaryColor }]}>
                <Text style={styles.cardHeaderIcon}>{role === 'member' ? '📖' : '📚'}</Text>
                <Text style={styles.cardHeaderTitle}>
                  {role === 'member' ? 'Register Member' : 'Apply as Staff'}
                </Text>
                <Text style={styles.cardHeaderSubtitle}>
                  {role === 'member' ? 'Join Apex Library Catalog' : 'Submit Librarian Application'}
                </Text>
              </View>

              <View style={styles.registerForm}>
                <Text style={[styles.label, { color: labelColor }]}>👤 Full Name</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#64748b"
                  value={regName}
                  onChangeText={setRegName}
                />

                <Text style={[styles.label, { color: labelColor }]}>📞 Contact Phone</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="10-digit number"
                  placeholderTextColor="#64748b"
                  value={regPhone}
                  onChangeText={setRegPhone}
                  keyboardType="numeric"
                  maxLength={10}
                />

                <Text style={[styles.label, { color: labelColor }]}>✉ Email Address</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="you@domain.com"
                  placeholderTextColor="#64748b"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={[styles.label, { color: labelColor }]}>🔑 Password (exactly 5 chars)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Enter 5 characters"
                  placeholderTextColor="#64748b"
                  value={regPassword}
                  onChangeText={setRegPassword}
                  maxLength={5}
                  secureTextEntry
                />

                <Text style={[styles.label, { color: labelColor }]}>🔑 Confirm Password</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor="#64748b"
                  value={regConfirm}
                  onChangeText={setRegConfirm}
                  maxLength={5}
                  secureTextEntry
                />

                <Text style={[styles.label, { color: labelColor }]}>📍 Home Address</Text>
                <TextInput 
                  style={[styles.input, { height: 64 }]}
                  placeholder="Street, City, Zip"
                  placeholderTextColor="#64748b"
                  value={regAddress}
                  onChangeText={setRegAddress}
                  multiline
                />

                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: primaryColor }]}
                  onPress={handleRegisterSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {role === 'member' ? '👤 Create Account' : '✉ Submit Application'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.outlineBtn, { marginTop: 12 }]}
                  onPress={() => setAuthTab('login')}
                >
                  <Text style={styles.outlineBtnText}>➜ Login Here</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {authTab === 'forgot' && (
            <>
              <View style={[styles.cardSubHeader, { backgroundColor: '#6366f1' }]}>
                <Text style={styles.cardHeaderIcon}>🔑</Text>
                <Text style={styles.cardHeaderTitle}>Forgot Password</Text>
                <Text style={styles.cardHeaderSubtitle}>Library Reset Service (Step 1)</Text>
              </View>

              <View style={styles.registerForm}>
                <Text style={styles.recoveryText}>
                  Enter your email address and we'll send a password recovery code to your alerts.
                </Text>

                <Text style={[styles.label, { color: '#818cf8' }]}>✉ Registered Email</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="your-email@library.com"
                  placeholderTextColor="#64748b"
                  value={recoveryEmail}
                  onChangeText={setRecoveryEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: '#6366f1' }]}
                  onPress={handleForgotSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.buttonText}>🚀 Send Reset Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.outlineBtn, { marginTop: 12 }]}
                  onPress={() => setAuthTab('login')}
                >
                  <Text style={styles.outlineBtnText}>⬅ Back to Login</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {authTab === 'reset' && (
            <>
              <View style={[styles.cardSubHeader, { backgroundColor: '#6366f1' }]}>
                <Text style={styles.cardHeaderIcon}>🔑</Text>
                <Text style={styles.cardHeaderTitle}>Reset Password</Text>
                <Text style={styles.cardHeaderSubtitle}>Library Reset Service (Step 2)</Text>
              </View>

              <View style={styles.registerForm}>
                <View style={styles.alertBox}>
                  <Text style={styles.alertText}>🔑 SIMULATOR RESET CODE: 123456</Text>
                </View>

                <Text style={[styles.label, { color: '#818cf8' }]}>🔢 Verification OTP Code</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Enter 123456"
                  placeholderTextColor="#64748b"
                  value={resetCode}
                  onChangeText={setResetCode}
                  keyboardType="numeric"
                />

                <Text style={[styles.label, { color: '#818cf8' }]}>🔑 New Password (exactly 5 chars)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Enter 5 characters"
                  placeholderTextColor="#64748b"
                  value={resetNewPass}
                  onChangeText={setResetNewPass}
                  maxLength={5}
                  secureTextEntry
                />

                <Text style={[styles.label, { color: '#818cf8' }]}>🔑 Confirm New Password</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#64748b"
                  value={resetConfirmPass}
                  onChangeText={setResetConfirmPass}
                  maxLength={5}
                  secureTextEntry
                />

                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: '#6366f1' }]}
                  onPress={handleResetSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.buttonText}>✓ Update Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.outlineBtn, { marginTop: 12 }]}
                  onPress={() => setAuthTab('login')}
                >
                  <Text style={styles.outlineBtnText}>⬅ Cancel & Return</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {authTab === 'otp' && (
            <>
              {/* Header inside Card */}
              <View style={[styles.cardSubHeader, { backgroundColor: primaryColor }]}>
                <Text style={styles.cardHeaderIcon}>🔑</Text>
                <Text style={styles.cardHeaderTitle}>Two-Factor Security</Text>
                <Text style={styles.cardHeaderSubtitle}>Session Verification Required</Text>
              </View>

              <View style={{ paddingHorizontal: 2 }}>
                <Text style={styles.recoveryText}>
                  A simulated 6-digit OTP code has been sent to your simulated alerts drawer. Please enter the digits below to authenticate.
                </Text>

                {simulatedCode ? (
                  <View style={styles.alertBox}>
                    <Text style={styles.alertText}>
                      🔑 SIMULATOR SECURITY CODE: {simulatedCode}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.label, { color: labelColor }]}>🔒 6-Digit OTP Code</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. 123456"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                />

                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: primaryColor }]}
                  onPress={handleOtpVerify}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.buttonText}>✓ Verify & Authenticate</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.outlineBtn, { marginTop: 12 }]}
                  onPress={() => { setAuthTab('login'); setOtpCode(''); }}
                >
                  <Text style={styles.outlineBtnText}>Cancel & Go Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Secure SSL footer */}
          <View style={styles.footerSecure}>
            <Text style={styles.footerSecureText}>🔒 Secure SSL Encrypted Gateway</Text>
          </View>
        </View>

        {/* QUICK DEMO SHORTCUTS */}
        {authTab === 'login' && (
          <View style={styles.shortcutsBox}>
            <Text style={styles.shortcutsTitle}>QUICK DEMO PORTALS</Text>
            <View style={styles.shortcutsGrid}>
              <TouchableOpacity style={styles.shortcutBtn} onPress={() => autofill('admin')}>
                <Text style={styles.shortcutBtnText}>🔑 Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutBtn} onPress={() => autofill('librarian')}>
                <Text style={styles.shortcutBtnText}>📚 Staff</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutBtn} onPress={() => autofill('member')}>
                <Text style={styles.shortcutBtnText}>👤 Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19', // Dark premium web background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#ffd700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 34,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
  },
  subtitleText: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#151c2c', // Matches --bg-card in dark mode
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242f49', // Matches --border-color in dark mode
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  roleTabRow: {
    flexDirection: 'row',
    backgroundColor: '#090d16',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#242f49',
    marginBottom: 22,
  },
  roleTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTabBtnText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#fff',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 46,
    backgroundColor: '#090d16',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#f1f5f9',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#242f49',
    marginBottom: 18,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242f49',
    marginBottom: 22,
  },
  passwordInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 14,
    color: '#f1f5f9',
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    height: 46,
    justifyContent: 'center',
  },
  eyeBtnText: {
    fontSize: 16,
  },
  button: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
  },
  forgotBtnText: {
    color: '#94a3b8',
    fontSize: 12.5,
    fontWeight: '600',
  },
  registerPrompt: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    marginTop: 18,
    paddingTop: 18,
  },
  dividerText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  outlineBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  outlineBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  cardSubHeader: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  registerForm: {
    paddingHorizontal: 2,
  },
  recoveryText: {
    color: '#94a3b8',
    fontSize: 12.5,
    lineHeight: 1.6,
    textAlign: 'center',
    marginBottom: 18,
  },
  alertBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 18,
  },
  alertText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footerSecure: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    marginTop: 22,
    paddingTop: 14,
    alignItems: 'center',
  },
  footerSecureText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  shortcutsBox: {
    marginTop: 26,
    alignItems: 'center',
  },
  shortcutsTitle: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcutBtn: {
    backgroundColor: '#151c2c',
    borderWidth: 1,
    borderColor: '#242f49',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shortcutBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
});
