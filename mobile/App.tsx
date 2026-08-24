import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApi, API_BASE_URL } from './src/api/client';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'habits'>('dashboard');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('bloom_token');
      if (token) {
        const res = await mobileApi.get('/auth/me');
        setUser(res.data.user);
        fetchTasks();
      }
    } catch (err) {
      console.log('Auth check error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await mobileApi.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.log('Tasks error', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF85A1" />
        <Text style={styles.loadingText}>Loading Bloom for Android...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Native App Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌸 Bloom Mobile</Text>
        <Text style={styles.headerSubtitle}>Native Android Productivity</Text>
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Android Native App Active</Text>
          <Text style={styles.cardDesc}>
            Connected directly to backend server at:
          </Text>
          <Text style={styles.urlText}>{API_BASE_URL}</Text>
        </View>

        {user ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back, {user.displayName}!</Text>
            <Text style={styles.cardDesc}>User Email: {user.email}</Text>
            <Text style={styles.cardDesc}>Tasks count: {tasks.length}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Authentication</Text>
            <Text style={styles.cardDesc}>
              Log in with your existing Bloom credentials to synchronize your tasks, habits, and Google Calendar.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={styles.navText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'tasks' && styles.navItemActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={styles.navText}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'habits' && styles.navItemActive]}
          onPress={() => setActiveTab('habits')}
        >
          <Text style={styles.navText}>Habits</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
  },
  loadingText: {
    marginTop: 12,
    color: '#FF85A1',
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE3E8',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE3E8',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
  },
  urlText: {
    fontSize: 11,
    color: '#FF85A1',
    fontWeight: 'bold',
    marginTop: 4,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FFE3E8',
    paddingVertical: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF85A1',
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
});
