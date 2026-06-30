// ParcelDeliveryDetail.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';

const ParcelDeliveryDetail = ({ navigation, route }) => {
  const { delivery } = route.params;
  const dispatch = useDispatch();
  const loginToken = useSelector((state) => state?.auth?.loginToken);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const getStatusColor = (status) => {
    const statusMap = {
      'delivered': '#4CAF50',
      'completed': '#4CAF50',
      'accepted': '#2196F3',
      'arrived': '#00BCD4',
      'picked_up': '#FF9800',
      'pending': '#FF9800',
      'cancelled': '#F44336',
    };
    return statusMap[status] || '#757575';
  };

  const getStatusText = (status) => {
    const textMap = {
      'delivered': 'Delivered',
      'completed': 'Completed',
      'accepted': 'Accepted',
      'arrived': 'Arrived at Pickup',
      'picked_up': 'Picked Up',
      'pending': 'Pending',
      'cancelled': 'Cancelled',
    };
    return textMap[status] || status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewImage = (imageUri) => {
    if (imageUri) {
      setSelectedImage(imageUri);
      setShowImageModal(true);
    }
  };

  const renderTimeline = () => {
    const timelineItems = [
      {
        status: 'accepted',
        title: 'Order Accepted',
        icon: 'checkmark-circle-outline',
        time: delivery.created_at,
        completed: delivery.status !== 'cancelled',
      },
      {
        status: 'arrived',
        title: 'Arrived at Pickup',
        icon: 'navigate-circle-outline',
        time: delivery.driver_status === 'ARRIVED' ? delivery.updated_at : null,
        completed: delivery.driver_status === 'ARRIVED' || delivery.status === 'picked_up' || delivery.status === 'delivered',
      },
      {
        status: 'picked_up',
        title: 'Parcel Picked Up',
        icon: 'cube-outline',
        time: delivery.pickup_otp_verified === 1 ? delivery.updated_at : null,
        completed: delivery.pickup_otp_verified === 1,
      },
      {
        status: 'delivered',
        title: 'Delivered',
        icon: 'gift-outline',
        time: delivery.delivery_otp_verified === 1 ? delivery.updated_at : null,
        completed: delivery.delivery_otp_verified === 1,
      },
    ];

    if (delivery.status === 'cancelled') {
      timelineItems.push({
        status: 'cancelled',
        title: 'Order Cancelled',
        icon: 'close-circle-outline',
        time: delivery.updated_at,
        completed: true,
        isCancelled: true,
      });
    }

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.sectionTitle}>Delivery Timeline</Text>
        {timelineItems.map((item, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[
                styles.timelineIcon,
                item.completed && !item.isCancelled && styles.timelineIconCompleted,
                item.isCancelled && styles.timelineIconCancelled,
              ]}>
                <Icon 
                  name={item.icon} 
                  size={20} 
                  color={item.completed && !item.isCancelled ? '#fff' : item.isCancelled ? '#fff' : '#999'} 
                />
              </View>
              {index < timelineItems.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  item.completed && !item.isCancelled && styles.timelineLineCompleted,
                ]} />
              )}
            </View>
            <View style={styles.timelineRight}>
              <Text style={[
                styles.timelineTitle,
                item.completed && styles.timelineTitleCompleted,
                item.isCancelled && styles.timelineTitleCancelled,
              ]}>
                {item.title}
              </Text>
              {item.time && (
                <Text style={styles.timelineTime}>{formatDateTime(item.time)}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderInfoCard = (title, icon, children) => (
    <View style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <Icon name={icon} size={20} color="#FF9800" />
        <Text style={styles.infoCardTitle}>{title}</Text>
      </View>
      <View style={styles.infoCardContent}>
        {children}
      </View>
    </View>
  );

  const renderInfoRow = (label, value, icon = null) => (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        {icon && <Icon name={icon} size={16} color="#999" />}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#FF9800', '#FF9800', '#F57C00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Details</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: getStatusColor(delivery.status) }]}>
        <Icon name={delivery.status === 'delivered' ? 'checkmark-circle' : 'time'} size={24} color="#fff" />
        <Text style={styles.statusBannerText}>{getStatusText(delivery.status)}</Text>
      </View>

      {/* Booking ID */}
      <View style={styles.bookingIdContainer}>
        <Text style={styles.bookingIdLabel}>Booking ID</Text>
        <Text style={styles.bookingIdValue}>{delivery.booking_id}</Text>
      </View>

      {/* Pickup Information */}
      {renderInfoCard('Pickup Information', 'location-outline', (
        <>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>{delivery.pickup_address}</Text>
            <Text style={styles.cityText}>{delivery.pickup_city}</Text>
            {delivery.pickup_landmark && (
              <View style={styles.landmarkContainer}>
                <Icon name="flag-outline" size={12} color="#FF9800" />
                <Text style={styles.landmarkText}>Landmark: {delivery.pickup_landmark}</Text>
              </View>
            )}
          </View>
          <View style={styles.divider} />
          {renderInfoRow('Pickup Date', formatDate(delivery.pickup_date), 'calendar-outline')}
          {renderInfoRow('Pickup Time', formatTime(delivery.pickup_time), 'time-outline')}
          {renderInfoRow('Customer Name', delivery.customerName, 'person-outline')}
          {renderInfoRow('Customer Phone', delivery.customerPhone, 'call-outline')}
          {delivery.pickup_otp_verified === 1 && (
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.verifiedBadgeText}>Pickup OTP Verified</Text>
            </View>
          )}
        </>
      ))}

      {/* Delivery Information */}
      {renderInfoCard('Delivery Information', 'gift-outline', (
        <>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>{delivery.delivery_address}</Text>
            <Text style={styles.cityText}>{delivery.delivery_city}</Text>
            {delivery.delivery_landmark && (
              <View style={styles.landmarkContainer}>
                <Icon name="flag-outline" size={12} color="#FF9800" />
                <Text style={styles.landmarkText}>Landmark: {delivery.delivery_landmark}</Text>
              </View>
            )}
          </View>
          <View style={styles.divider} />
          {renderInfoRow('Receiver Name', delivery.receiver_name, 'person-outline')}
          {renderInfoRow('Receiver Phone', delivery.receiver_mobile, 'call-outline')}
          {delivery.delivery_otp_verified === 1 && (
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.verifiedBadgeText}>Delivery OTP Verified</Text>
            </View>
          )}
        </>
      ))}

      {/* Parcel Details */}
      {renderInfoCard('Parcel Details', 'cube-outline', (
        <>
          {renderInfoRow('Weight', `${delivery.parcel_weight} kg`, 'scale-outline')}
          {renderInfoRow('Packaging Type', delivery.packaging_material, 'archive-outline')}
          {renderInfoRow('Loading/Unloading', delivery.loading_unloading, 'swap-horizontal-outline')}
          {delivery.remarks && (
            <View style={styles.remarksContainer}>
              <Icon name="chatbubble-outline" size={14} color="#FF9800" />
              <Text style={styles.remarksText}>Remarks: {delivery.remarks}</Text>
            </View>
          )}
        </>
      ))}

      {/* Payment Details */}
      {renderInfoCard('Payment Details', 'card-outline', (
        <>
          {renderInfoRow('Your amount ', `₹${delivery.amount?.toFixed(2) || '0.00'}`, 'cash-outline')}
          {renderInfoRow('Token Amount', `₹${delivery.token_amount?.toFixed(2) || '0.00'}`, 'key-outline')}
          {renderInfoRow('Balance Amount', `₹${delivery.balance_amount?.toFixed(2) || '0.00'}`, 'cash-outline')}
          {delivery.earnings && (
            <View style={styles.earningsContainer}>
              <Icon name="trophy-outline" size={14} color="#4CAF50" />
              <Text style={styles.earningsText}>Your Earnings: ₹{delivery.earnings?.toFixed(2) || '0.00'}</Text>
            </View>
          )}
        </>
      ))}

      {/* Images Section */}
      {(delivery.pickup_image || delivery.delivery_image) && (
        <View style={styles.imagesContainer}>
          <Text style={styles.sectionTitle}>Proof Images</Text>
          <View style={styles.imagesRow}>
            {delivery.pickup_image && (
              <TouchableOpacity 
                style={styles.imageCard}
                onPress={() => handleViewImage(delivery.pickup_image)}
              >
                <Image 
                  source={{ uri: delivery.pickup_image }} 
                  style={styles.image}
                  resizeMode="cover"
                />
                <Text style={styles.imageLabel}>Pickup Image</Text>
              </TouchableOpacity>
            )}
            {delivery.delivery_image && (
              <TouchableOpacity 
                style={styles.imageCard}
                onPress={() => handleViewImage(delivery.delivery_image)}
              >
                <Image 
                  source={{ uri: delivery.delivery_image }} 
                  style={styles.image}
                  resizeMode="cover"
                />
                <Text style={styles.imageLabel}>Delivery Image</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Timeline */}
      {renderTimeline()}

      {/* Created At */}
      <View style={styles.footerInfo}>
        <Text style={styles.footerText}>
          Created on {formatDateTime(delivery.created_at)}
        </Text>
        {delivery.updated_at !== delivery.created_at && (
          <Text style={styles.footerText}>
            Last updated on {formatDateTime(delivery.updated_at)}
          </Text>
        )}
      </View>

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <Icon name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  bookingIdContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingIdLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  bookingIdValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  infoCardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '500',
  },
  cityText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  landmarkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  landmarkText: {
    fontSize: 12,
    color: '#FF9800',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  remarksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  remarksText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  earningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  earningsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  imagesContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageCard: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  image: {
    width: '100%',
    height: 120,
  },
  imageLabel: {
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 11,
    color: '#666',
    backgroundColor: '#f5f5f5',
  },
  timelineContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 40,
    marginRight: 8,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineIconCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineIconCancelled: {
    backgroundColor: '#F44336',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  timelineTitleCompleted: {
    color: '#333',
    fontWeight: '600',
  },
  timelineTitleCancelled: {
    color: '#F44336',
  },
  timelineTime: {
    fontSize: 11,
    color: '#999',
  },
  footerInfo: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 30,
    padding: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
});

export default ParcelDeliveryDetail;