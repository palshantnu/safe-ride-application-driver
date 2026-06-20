// BAParcelHistoryScreen.js
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
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { useSelector } from 'react-redux';

import CurvedHeader from '../../components/CurvedHeader';

const EmptyState = ({ navigation }) => (
  <View style={styles.emptyContainer}>
    <FontAwesome5 name="inbox" size={52} color="#DDD" />
    <Text style={styles.emptyTitle}>No Parcels Found</Text>
    <Text style={styles.emptyText}>Your parcel history will appear here.</Text>
    <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
      <Text style={styles.goBackText}>Go Back</Text>
    </TouchableOpacity>
  </View>
);

const BAParcelHistoryScreen = ({ navigation }) => {
  const [parcels, setParcels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
  });

  const loginToken = useSelector((state) => state?.auth?.loginToken);
  const { userData } = useSelector((state) => state.auth);

  const PARCEL_API = {
    LIST: 'https://sigiride.com/api/parcel/ba/list',
  };

  const fetchParcelHistory = async (pageNum = 1, shouldAppend = false) => {
    if (!loginToken) return;
    
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await axios.get(PARCEL_API.LIST, {
        headers: {
          Authorization: `Bearer ${loginToken}`,
        },
        params: {
          page: pageNum,
          limit: limit,
        },
      });

      console.log('Parcel history response:', response.data);

      if (response.data?.status && response.data?.data) {
        const formattedHistory = response.data.data.map(parcel => formatParcelData(parcel));
        
        if (shouldAppend) {
          setParcels(prev => [...prev, ...formattedHistory]);
        } else {
          setParcels(formattedHistory);
          // Calculate stats from all data
          calculateStats(formattedHistory);
        }

        if (response.data?.pagination) {
          setTotalCount(response.data.pagination.total);
          setHasMore(pageNum < response.data.pagination.total_pages);
        }
      } else {
        if (!shouldAppend) {
          setParcels([]);
          setStats({
            totalDeliveries: 0,
            totalEarnings: 0,
            pendingDeliveries: 0,
            completedDeliveries: 0,
          });
        }
        setHasMore(false);
      }
    } catch (error) {
      console.log('Error fetching parcel history:', error);
      Alert.alert('Error', 'Failed to fetch parcel history');
    } finally {
      if (pageNum === 1) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const formatParcelData = (parcel) => {
    const status = parcel.status?.toLowerCase() || 'pending';
    const driverStatus = parcel.driver_status?.toLowerCase() || '';
    
    let displayStatus = status;
    if (driverStatus === 'assigned') displayStatus = 'assigned';
    if (driverStatus === 'accepted') displayStatus = 'accepted';
    if (driverStatus === 'arrived') displayStatus = 'arrived';
    if (driverStatus === 'picked_up') displayStatus = 'picked_up';
    if (driverStatus === 'delivered') displayStatus = 'delivered';

    return {
      id: parcel.id,
      parcel_booking_id: parcel.parcel_booking_id,
      pickup_address: parcel.pickup_address,
      pickup_city: parcel.pickup_city,
      pickup_landmark: parcel.pickup_landmark,
      pickup_date: parcel.pickup_date,
      pickup_time: parcel.pickup_time,
      drop_address: parcel.drop_address,
      drop_city: parcel.drop_city,
      drop_landmark: parcel.drop_landmark,
      receiver_name: parcel.receiver_name,
      receiver_mobile: parcel.receiver_mobile,
      approx_weight: parcel.approx_weight,
      packaging_material_type: parcel.packaging_material_type,
      loading_unloading: parcel.loading_unloading,
      remarks: parcel.remarks,
      amount: parseFloat(parcel.amount),
      token_amount: parseFloat(parcel.token_amount),
      balance_amount: parseFloat(parcel.balance_amount),
      status: displayStatus,
      original_status: status,
      driver_status: driverStatus,
        user_status: parcel.user_status,
      driver_name: parcel.driver_name,
      driver_phone: parcel.driver_phone,
      user_name: parcel.user_name,
      user_mobile: parcel.user_mobile,
      plan_name: parcel.plan_name,
      created_at: parcel.created_at,
      updated_at: parcel.updated_at,
      completed_at: parcel.completed_at,
      delivered_at: parcel.delivered_at,
    };
  };

  const calculateStats = (parcelsList) => {
    const completed = parcelsList.filter(p => p.status === 'delivered' || p.original_status === 'delivered');
    const pending = parcelsList.filter(p => p.status !== 'delivered' && p.status !== 'cancelled');
    const totalEarnings = completed.reduce((sum, p) => sum + p.amount, 0);

    setStats({
      totalDeliveries: parcelsList.length,
      totalEarnings: totalEarnings,
      pendingDeliveries: pending.length,
      completedDeliveries: completed.length,
    });
  };

  useEffect(() => {
    fetchParcelHistory(1, false);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchParcelHistory(1, false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchParcelHistory(nextPage, true);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'pending': '#FF9800',
      'accepted': '#2196F3',
      'assigned': '#2196F3',
      'arrived': '#00BCD4',
      'picked_up': '#9C27B0',
      'delivered': '#4CAF50',
      'completed': '#4CAF50',
      'cancelled': '#F44336',
    };
    return statusMap[status] || '#757575';
  };

  const getStatusText = (status) => {
    const textMap = {
      'pending': 'Pending',
      'accepted': 'Accepted',
      'assigned': 'Assigned',
      'arrived': 'Arrived',
      'picked_up': 'Picked Up',
      'delivered': 'Delivered',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'token_paid': 'Token Paid',
    };
    return textMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    const [hours, minutes] = timeString.split(':');
    const t = new Date();
    t.setHours(parseInt(hours, 10));
    t.setMinutes(parseInt(minutes, 10));
    return t.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleParcelPress = (parcel) => {
    navigation.navigate('BAParcelDetail', { parcel });
  };

  const renderParcelCard = ({ item }) => {
    const status = item.status;

    return (
      <TouchableOpacity
        style={styles.card}
        // onPress={() => handleParcelPress(item)}
        activeOpacity={0.7}
        disabled={true} // Disable press for now since details screen is not implemented
      >
        <View style={styles.cardHeader}>
          <View style={styles.idContainer}>
            <Text style={styles.idText}>ID: {item.parcel_booking_id}</Text>
            <Text style={styles.subText}>
              {formatDateTime(item.pickup_date)} • {formatTime(item.pickup_time)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusText}>{getStatusText(status)}</Text>
          </View>
        </View>
<View style={[styles.statusBadge ]}>
             <Text style={{...styles.statusText,color:'black',fontSize:16}}>USER STATUS : {getStatusText(delivery.user_status)}</Text>
          </View>
        <View style={styles.routeRow}>
          <View style={styles.routeCol}>
            <View style={styles.pickupDot} />
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeValue} numberOfLines={2}>
              {item.pickup_address}, {item.pickup_city}
            </Text>
            {item.pickup_landmark ? (
              <Text style={styles.landmarkText}>📍 {item.pickup_landmark}</Text>
            ) : null}
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routeCol}>
            <View style={styles.dropDot} />
            <Text style={styles.routeLabel}>Drop</Text>
            <Text style={styles.routeValue} numberOfLines={2}>
              {item.drop_address}, {item.drop_city}
            </Text>
            {item.drop_landmark ? (
              <Text style={styles.landmarkText}>📍 {item.drop_landmark}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <FontAwesome5 name="user" size={12} color="#666" />
            <Text style={styles.detailText}>Sender: {item.user_name || 'N/A'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="call-outline" size={12} color="#666" />
            <Text style={styles.detailText}>{item.user_mobile || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <FontAwesome5 name="user-friends" size={12} color="#666" />
            <Text style={styles.detailText}>Receiver: {item.receiver_name}</Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="call-outline" size={12} color="#666" />
            <Text style={styles.detailText}>{item.receiver_mobile}</Text>
          </View>
        </View>

        {item.driver_name && (
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Icon name="car-outline" size={12} color="#666" />
              <Text style={styles.detailText}>Driver: {item.driver_name}</Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="call-outline" size={12} color="#666" />
              <Text style={styles.detailText}>{item.driver_phone}</Text>
            </View>
          </View>
        )}

        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <FontAwesome5 name="weight-hanging" size={14} color="#666" />
            <Text style={styles.footerText}>{item.approx_weight} kg</Text>
          </View>
          <View style={styles.footerItem}>
            <Icon name="cube-outline" size={14} color="#666" />
            <Text style={styles.footerText}>{item.packaging_material_type || '—'}</Text>
          </View>
          <View style={styles.footerItem}>
            <Icon name="people-outline" size={14} color="#666" />
            <Text style={styles.footerText}>{item.loading_unloading || '—'}</Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>₹{item.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Token</Text>
            <Text style={styles.tokenAmount}>₹{item.token_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>₹{item.balance_amount.toFixed(2)}</Text>
          </View>
        </View>

        {item.remarks ? (
          <View style={styles.remarksContainer}>
            <Icon name="chatbubble-outline" size={12} color="#FF9800" />
            <Text style={styles.remarksText} numberOfLines={2}>{item.remarks}</Text>
          </View>
        ) : null}

        {/* <View style={styles.detailsIndicator}>
          <Text style={styles.detailsText}>View details</Text>
          <Icon name="chevron-forward" size={14} color="#FF9800" />
        </View> */}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={['#FF9800', '#FF9800', '#F57C00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Parcel History</Text>
      </LinearGradient>

      <View style={styles.statsHeader}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="cube-outline" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{stats.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Total Parcels</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="cash-outline" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>₹{stats.totalEarnings.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statsCardSmall}>
            <Text style={styles.statsSmallNumber}>{stats.pendingDeliveries}</Text>
            <Text style={styles.statsSmallLabel}>Pending</Text>
          </View>
          <View style={styles.statsCardSmall}>
            <Text style={styles.statsSmallNumber}>{stats.completedDeliveries}</Text>
            <Text style={styles.statsSmallLabel}>Completed</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>All Parcels</Text>
      </View>
    </>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FF9800" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  if (isLoading && parcels.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF9800" />
        <CurvedHeader title="Parcel History" navigation={navigation} showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>Loading parcels...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9800" />
      <CurvedHeader title="Parcel History" navigation={navigation} showBack />

      <FlatList
        data={parcels}
        keyExtractor={(item, idx) => (item?.id ?? idx).toString()}
        renderItem={renderParcelCard}
        contentContainerStyle={styles.listContent}
        // ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={<EmptyState navigation={navigation} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF9800']}
            tintColor="#FF9800"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 10,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  statsHeader: {
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
    paddingHorizontal: 5,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  statsCardSmall: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    elevation: 1,
  },
  statsSmallNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  statsSmallLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginHorizontal: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  idContainer: {
    flex: 1,
  },
  idText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  subText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeCol: {
    flex: 1,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  dropDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5252',
  },
  routeLine: {
    width: 16,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 10,
    marginTop: 4,
  },
  routeLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  routeValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    lineHeight: 18,
  },
  landmarkText: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#666',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#666',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  amountItem: {
    alignItems: 'center',
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    color: '#999',
  },
  amountValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  tokenAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 2,
  },
  remarksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  remarksText: {
    flex: 1,
    fontSize: 11,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  detailsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    gap: 4,
  },
  detailsText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FF9800',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  goBackBtn: {
    marginTop: 20,
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  goBackText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});

export default BAParcelHistoryScreen;