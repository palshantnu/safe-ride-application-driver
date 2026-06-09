import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList as RNFlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch } from 'react-redux';

import { BA_GET_DRIVER_LIST, BA_ASSIGN_DRIVER, BA_ASSIGN_DRIVER_SELF_SHARING } from '../../redux/actions/action-creator';
import SelfSharingService from '../../services/SelfSharingService';

const SelfSharingMyTripsBAAssignScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'self_sharing', 'inter_city'

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningTripId, setAssigningTripId] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const PAGE_LIMIT = 10;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  const fetchTrips = useCallback(
    async (nextPage = 1, { append = false } = {}) => {
      if (append && (fetchingMore || !hasMore)) return;

      if (append) setFetchingMore(true);
      else setLoading(true);

      try {
        const res = await SelfSharingService.getMyTrips(nextPage, PAGE_LIMIT);

        const list =
          res?.data?.data ??
          res?.data ??
          res ??
          [];
        console.log('Fetched trips:', list);
        const normalized = Array.isArray(list) ? list : [];
        setTrips((prev) => (append ? [...prev, ...normalized] : normalized));

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
    [fetchingMore, hasMore]
  );

  // Apply filter to trips
  useEffect(() => {
    if (selectedFilter === 'all') {
      setFilteredTrips(trips);
    } else if (selectedFilter === 'self_sharing') {
      setFilteredTrips(trips.filter(trip => trip.service_id === 72));
    } else if (selectedFilter === 'inter_city') {
      setFilteredTrips(trips.filter(trip => trip.service_id === 73));
    }
  }, [trips, selectedFilter]);

  const fetchDrivers = useCallback(async (service_id) => {
    try {
      const res = await dispatch(BA_GET_DRIVER_LIST());
      const list = res?.data?.data ?? res?.data ?? res ?? [];
      console.log('Fetched drivers:', list);
      const matchedDriver = Array.isArray(list)
        ? list.find(item => item.service_id === service_id)
        : null;

      setDrivers(matchedDriver ? [matchedDriver] : []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('fetchDrivers error:', e);
      setDrivers([]);
    }
  }, [dispatch]);

  useEffect(() => {
    let isMounted = true;

    const doFetch = async () => {
      if (!isMounted) return;
      await fetchTrips(1, { append: false });
    };

    doFetch();

    const unsubscribe = navigation.addListener('focus', () => {
      doFetch();
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigation, fetchTrips]);

  const openAssignModal = async (trip) => {
    const tripId = trip?.trip_id || trip?.id;
    if (!tripId) {
      Alert.alert('Error', 'Trip id not found');
      return;
    }
    console.log('Opening assign modal for trip:', trip);
    setAssigningTripId(tripId);
    setAssignModalVisible(true);
    await fetchDrivers(trip?.service_id);
  };

  const handleAssignDriver = async (driver) => {
    if (!assigningTripId) return;
    const driverId = driver?.id ?? driver?.driver_id;
    if (!driverId) {
      Alert.alert('Error', 'Driver id not found');
      return;
    }

    setIsAssigning(true);
    try {
      const res = await dispatch(
        BA_ASSIGN_DRIVER_SELF_SHARING({
          trip_id: assigningTripId,
          driver_id: driverId,
        })
      );
      console.log('Assign driver response:', res);
      const ok = res?.status ?? res?.success ?? true;
      if (ok) {
        Alert.alert('Success', 'Captain assigned successfully');
        setAssignModalVisible(false);
        setAssigningTripId(null);
        await fetchTrips();
      } else {
        Alert.alert('Error', res?.message || 'Failed to assign driver');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to assign driver');
      // eslint-disable-next-line no-console
      console.log('handleAssignDriver error:', e);
    } finally {
      setIsAssigning(false);
    }
  };

  const FilterButton = ({ label, value, icon }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === value && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      {icon && <Icon name={icon} size={16} color={selectedFilter === value ? '#fff' : '#666'} style={styles.filterIcon} />}
      <Text style={[
        styles.filterButtonText,
        selectedFilter === value && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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
    const assigned_driver_name = item?.assigned_driver_name;
    const serviceType = item?.service_id === 72 ? 'Self Sharing' : item?.service_id === 73 ? 'Inter City' : 'Other';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={styles.tripHeader}>
              <Text style={styles.title}>{tripId}</Text>
              <View style={[
                styles.serviceBadge,
                item?.service_id === 72 ? styles.selfSharingBadge : styles.interCityBadge
              ]}>
                <Text style={styles.serviceBadgeText}>{serviceType}</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              {item.from_city || item.fromCity || item.from || '—'} →{' '}
              {item.to_city || item.toCity || item.to || '—'}
            </Text>
            <Text style={styles.subtitle}>{departureDateTime}</Text>
          </View>
        </View>

        {assigned_driver_name ? 
          <TouchableOpacity
            style={[styles.assignBtn, { opacity: loading ? 0.7 : 1, backgroundColor: '#4CAF50' }]}
            disabled={true}
          > 
            <Text style={styles.assignBtnText}>Assign To Captain : {assigned_driver_name}</Text> 
          </TouchableOpacity> :
          <TouchableOpacity
            style={[styles.assignBtn, { opacity: loading ? 0.7 : 1 }]}
            onPress={() => openAssignModal(item)}
            disabled={loading}
          >
            <Icon name="user-check" size={18} color="#fff" />
            <Text style={styles.assignBtnText}>Assign Captain</Text>
          </TouchableOpacity>
        }
      </View>
    );
  };

  const getFilterCounts = () => {
    const total = trips.length;
    const selfSharing = trips.filter(t => t.service_id === 72).length;
    const interCity = trips.filter(t => t.service_id === 73).length;
    return { total, selfSharing, interCity };
  };

  const counts = getFilterCounts();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Trips</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <FilterButton 
          label={`All (${counts.total})`} 
          value="all" 
          icon="grid" 
        />
        <FilterButton 
          label={`Self Sharing (${counts.selfSharing})`} 
          value="self_sharing" 
          icon="users" 
        />
        <FilterButton 
          label={`Inter City (${counts.interCity})`} 
          value="inter_city" 
          icon="map-pin" 
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF1493" />
        </View>
      ) : filteredTrips?.length ? (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item, i) => String(item?.trip_id || item?.id || i)}
          contentContainerStyle={styles.list}
          renderItem={renderTrip}
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
          <Text style={styles.emptyText}>No trips found</Text>
          <Text style={styles.emptySub}>
            {selectedFilter === 'all' 
              ? 'Create a trip to see it here.' 
              : selectedFilter === 'self_sharing' 
              ? 'No self sharing trips available.' 
              : 'No inter city trips available.'}
          </Text>
        </View>
      )}

      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setAssignModalVisible(false);
          setAssigningTripId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Assign Captain</Text>
              <TouchableOpacity
                onPress={() => {
                  setAssignModalVisible(false);
                  setAssigningTripId(null);
                }}
                style={styles.modalCloseBtn}
              >
                <Icon name="x" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubText}>
              Trip: {assigningTripId || '—'}
            </Text>

            {drivers?.length ? (
              <RNFlatList
                data={drivers}
                keyExtractor={(item, i) => String(item?.id ?? item?.driver_id ?? i)}
                style={{ marginTop: 12, maxHeight: 340 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.driverItem}
                    onPress={() => handleAssignDriver(item)}
                    disabled={isAssigning}
                  >
                    <View style={styles.driverLeft}>
                      <View style={styles.driverAvatar}>
                        <Icon name="user" size={18} color="#FF1493" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.driverName} numberOfLines={1}>
                          {item.full_name || item.name || 'Driver'}
                        </Text>
                        <Text style={styles.driverPhone} numberOfLines={1}>
                          {item.phone || item.mobile || '—'}
                        </Text>
                        <Text style={styles.driverPhone} numberOfLines={1}>
                          {item.service_name || '—'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyDriverText}>No drivers available</Text>
                }
              />
            ) : (
              <View style={{ marginTop: 14 }}>
                <ActivityIndicator size="small" color="#FF1493" />
                <Text style={styles.emptyDriverText}>Loading drivers...</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={() => {
                setAssignModalVisible(false);
                setAssigningTripId(null);
              }}
              disabled={isAssigning}
            >
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  filterContainer: {
    // flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  filterButton: {
    // flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#FF1493',
    borderColor: '#FF1493',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 14, fontWeight: '800', color: '#111827', flex: 1 },
  serviceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  selfSharingBadge: {
    backgroundColor: '#E8F5E9',
  },
  interCityBadge: {
    backgroundColor: '#FFF3E0',
  },
  serviceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  assignBtn: {
    marginTop: 12,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  assignBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  modalSubText: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#6B7280' },

  driverItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  driverLeft: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff0f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  driverName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  driverPhone: { fontSize: 12, color: '#6B7280', fontWeight: '700', marginTop: 3 },
  emptyDriverText: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 10 },

  modalBtn: {
    marginTop: 14,
    backgroundColor: '#FF1493',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: '#9CA3AF' },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});

export default SelfSharingMyTripsBAAssignScreen;