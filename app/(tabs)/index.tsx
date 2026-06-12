import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text, SafeAreaView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import MemberDashboard from '@/components/MemberDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import LibrarianDashboard from '@/components/LibrarianDashboard';

export default function DashboardIndexScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSpacer} />
      {user?.role === 'admin' && <AdminDashboard />}
      {user?.role === 'librarian' && <LibrarianDashboard />}
      {user?.role === 'member' && <MemberDashboard />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  headerSpacer: {
    height: 12,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
