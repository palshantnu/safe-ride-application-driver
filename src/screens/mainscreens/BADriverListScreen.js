import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useDispatch } from 'react-redux';
import { BA_GET_DRIVER_LIST } from '../../redux/actions/action-creator';

const BADriverListScreen = ({ navigation }) => {
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    fetchDriverList();
  }, []);

  const fetchDriverList = async () => {
    setIsLoading(true);
    try {
      const res = await dispatch(BA_GET_DRIVER_LIST());
      if (res?.status && res?.data) {
        setDrivers(Array.isArray(res.data) ? res.data : []);
      } else {
        setDrivers([]);
      }
    } catch (e) {
      console.log('Error fetching driver list:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDriverList();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    if (!status) return '#9E9E9E';
    const s = status.toString().toLowerCase();
    if (s === 'active' || s === '1') return '#4CAF50';
    if (s === 'inactive' || s === '0') return '#FF5252';
    return '#FF9800';
  };

  const getStatusLabel = (status) => {
    if (!status) return 'Unknown';
    const s = status.toString().toLowerCase();
    if (s === 'active' || s === '1') return 'Active';
    if (s === 'inactive' || s === '0') return 'Inactive';
    return status;
  };

  const renderDriverCard = ({ item }) => (
    <View style={styles.driverCard}>
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Icon name="user" size={26} color="#FF1493" />
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.full_name || item.name || 'N/A'}</Text>
          <View style={styles.phoneRow}>
            <Icon name="phone" size={13} color="#888" />
            <Text style={styles.driverPhone}>{item.phone || item.mobile || 'N/A'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBottom}>
        {item.service_name || item.service ? (
          <View style={styles.detailItem}>
            <Icon name="briefcase" size={13} color="#888" />
            <Text style={styles.detailText}>{item.service_name || item.service}</Text>
          </View>
        ) : null}
        {item.sub_service_name || item.sub_service ? (
          <View style={styles.detailItem}>
            <Icon name="tag" size={13} color="#888" />
            <Text style={styles.detailText}>{item.sub_service_name || item.sub_service}</Text>
          </View>
        ) : null}
        {item.pincode ? (
          <View style={styles.detailItem}>
            <Icon name="map-pin" size={13} color="#888" />
            <Text style={styles.detailText}>{item.pincode}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF1493" />
        <Text style={styles.loadingText}>Loading drivers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#810a45" />

      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Drivers</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddDriver')}
        >
          <Icon name="user-plus" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={drivers}
        keyExtractor={(item, index) => (item.id?.toString() || index.toString())}
        renderItem={renderDriverCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF1493']}
            tintColor="#FF1493"
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.totalText}>{drivers.length} Driver{drivers.length !== 1 ? 's' : ''}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="users" size={70} color="#ddd" />
            <Text style={styles.emptyTitle}>No Drivers Yet</Text>
            <Text style={styles.emptySubtitle}>Add your first driver to get started</Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={() => navigation.navigate('AddDriver')}
            >
              <Icon name="user-plus" size={18} color="#fff" />
              <Text style={styles.addFirstBtnText}>Add Driver</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  addBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 12,
  },
  totalText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff0f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF1493',
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driverPhone: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF1493',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  addFirstBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default BADriverListScreen;
