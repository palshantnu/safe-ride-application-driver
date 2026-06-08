import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import SelfSharingService from '../../services/SelfSharingService';

const SelfSharingMyTripsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await SelfSharingService.getMyTrips();

      // API might return:
      // 1) { data: { data: [...] } }
      // 2) { data: [...] }
      // 3) [...]
      const list =
        res?.data?.data ??
        res?.data ??
        res ??
        [];

      setTrips(Array.isArray(list) ? list : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load my trips');
      // eslint-disable-next-line no-console
      console.log('fetchTrips error:', e);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const doFetch = async () => {
      if (!isMounted) return;
      await fetchTrips();
    };

    // Initial load
    doFetch();

    // Refresh on back to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      doFetch();
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigation, fetchTrips]);

  const renderTrip = ({ item }) => {
    const tripId = item?.trip_id || item?.id;
    if (!tripId) return null;

    const departureDateTime = new Date(
      item.departure_time || item.created_at
    ).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const status = item.status || 'unknown';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('SelfSharingTripDetails', { tripId, status })
        }
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          <Text style={styles.title}>{tripId}</Text>
          <Text style={styles.subtitle}>
            {item.from_city || item.fromCity || item.from || '—'} →{' '}
            {item.to_city || item.toCity || item.to || '—'}
          </Text>
          <Text style={styles.subtitle}>{departureDateTime}</Text>
        </View>
        <Icon name="chevron-right" size={18} color="#ccc" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Trips</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF1493" />
        </View>
      ) : trips?.length ? (
        <FlatList
          data={trips}
          keyExtractor={(item, i) =>
            String(item?.trip_id || item?.id || i)
          }
          contentContainerStyle={styles.list}
          renderItem={renderTrip}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchTrips}
        />
      ) : (
        <View style={styles.empty}>
          <Icon name="inbox" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No trips</Text>
          <Text style={styles.emptySub}>Create a trip to see it here.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  left: { flex: 1, paddingRight: 10 },
  title: { fontSize: 14, fontWeight: '800', color: '#111827' },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default SelfSharingMyTripsScreen;

