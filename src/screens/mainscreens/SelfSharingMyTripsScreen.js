import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  const PAGE_LIMIT = 10;
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  const stateRef = useRef({ fetchingMore, hasMore });
  useEffect(() => {
    stateRef.current = { fetchingMore, hasMore };
  }, [fetchingMore, hasMore]);

  const fetchTrips = useCallback(
    async (nextPage = 1, { append = false } = {}) => {
      // Prevent duplicate calls
      if (append && (stateRef.current.fetchingMore || !stateRef.current.hasMore)) return;

      if (append) setFetchingMore(true);
      else setLoading(true);

      try {
        const res = await SelfSharingService.getMyTrips(nextPage, PAGE_LIMIT);

        // API might return:
        // 1) { data: { data: [...] } }
        // 2) { data: [...] }
        // 3) [...]
        const list =
          res?.data?.data ??
          res?.data ??
          res ??
          [];
console.log('fetchTrips response:', res);
        const normalized = Array.isArray(list) ? list : [];
        setTrips((prev) => (append ? [...prev, ...normalized] : normalized));
        if (res?.data?.summary) setSummary(res.data.summary);

        // Basic pagination heuristic: if less than limit returned, no more.
        setHasMore(normalized.length === PAGE_LIMIT);
        setPage(nextPage);
      } catch (e) {
        Alert.alert('Error', 'Failed to load my trips');
        // eslint-disable-next-line no-console
        console.log('fetchTrips error:', e);
        setTrips([]);
        setHasMore(false);
      } finally {
        if (append) setFetchingMore(false);
        else setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    const doFetch = async () => {
      if (!isMounted) return;
      await fetchTrips(1, { append: false });
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
    console.log('renderTrip item:', item);
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
    const blnc = item?.full_fare || 'unknown';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('SelfSharingTripDetails', { tripId, status ,blnc})
        }
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.title}>{tripId}</Text>
            <View style={[
              styles.statusBadge,
              status === 'TOKEN_PAID' && styles.statusTokenPaid,
              status === 'COMPLETED' && styles.statusCompleted,
              status === 'CANCELLED' && styles.statusCancelled,
            ]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>
          {item?.service_name ? (
            <Text style={[styles.subtitle, { color: '#810a45', fontWeight: '700' }]}>Service: {item.service_name}</Text>
          ) : null}
          <Text style={styles.subtitle}>
            {item.from_city || item.fromCity || item.from || '—'} →{' '}
            {item.to_city || item.toCity || item.to || '—'}
          </Text>
          {item?.pickup_address ? (
            <Text style={{...styles.subtitle,fontSize:17}}>Pickup: {item.pickup_address}</Text>
          ) : null}
          <Text style={{...styles.subtitle,fontSize:17}}>Departure: {departureDateTime}</Text>
          <Text style={styles.subtitle}>Total Seats {item?.total_seats}</Text>
          <Text style={styles.subtitle}>Available Seats {item?.available_seats}</Text>
          <Text style={styles.subtitle}>Amount {item?.full_fare}</Text>
          {Number(item?.rating_count) > 0 && (
            <Text style={[styles.subtitle, { color: '#FF9800', fontWeight: '600' }]}>
              ★ {Number(item.avg_rating).toFixed(1)} ({item.rating_count} {Number(item.rating_count) === 1 ? 'rating' : 'ratings'})
            </Text>
          )}
          {item?.started_at && (
            <Text style={styles.subtitle}>
              Started: {new Date(item.started_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
              })}
            </Text>
          )}
          {item?.completed_at && (
            <Text style={styles.subtitle}>
              Finished: {new Date(item.completed_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
              })}
            </Text>
          )}
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
          style={{ flex: 1 }}
          data={trips}
          keyExtractor={(item, i) =>
            String(item?.trip_id || item?.id || i)
          }
          contentContainerStyle={styles.list}
          renderItem={renderTrip}
          ListHeaderComponent={
            summary ? (
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{Number(summary.total_rides) || 0}</Text>
                  <Text style={styles.summaryLabel}>Total Rides</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{Number(summary.total_bookings) || 0}</Text>
                  <Text style={styles.summaryLabel}>Total Bookings</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>
                    ₹{Number(summary.total_earning || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Earning</Text>
                </View>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={() => fetchTrips(1, { append: false })}
          onEndReachedThreshold={0.4}
          onEndReached={() => fetchTrips(page + 1, { append: true })}
          ListFooterComponent={
            fetchingMore ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator size="small" color="#FF1493" />
              </View>
            ) : null
          }
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 17, fontWeight: '700', color: '#222' },
  summaryLabel: { fontSize: 11, color: '#777', marginTop: 4 },
  summaryDivider: { width: 1, height: 32, backgroundColor: '#EEE' },
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
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  statusTokenPaid: {
    backgroundColor: '#DBEAFE',
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
});

export default SelfSharingMyTripsScreen;

