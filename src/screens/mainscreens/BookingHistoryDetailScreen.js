import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

const STATUS_CONFIG = {
  completed:  { bg: '#DCFCE7', color: '#16A34A', label: 'Completed' },
  cancelled:  { bg: '#FEE2E2', color: '#DC2626', label: 'Cancelled' },
  accepted:   { bg: '#DBEAFE', color: '#2563EB', label: 'Accepted' },
  ongoing:    { bg: '#FEF9C3', color: '#CA8A04', label: 'Ongoing' },
  pending:    { bg: '#F3F4F6', color: '#6B7280', label: 'Pending' },
};

const getStatusCfg = (status) =>
  STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.pending;

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    '  ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const Section = ({ title, icon, children }) => (
  <View style={s.section}>
    <View style={s.sectionHeader}>
      <Icon name={icon} size={16} color="#810a45" />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
    <View style={s.sectionBody}>{children}</View>
  </View>
);

const Row = ({ label, value, valueStyle }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={[s.rowValue, valueStyle]}>{value ?? '—'}</Text>
  </View>
);

const BookingHistoryDetailScreen = ({ navigation, route }) => {
  const { ride } = route.params;

  const statusCfg = getStatusCfg(ride.status);
  const totalTopup = ride.topups?.reduce((sum, t) => sum + parseFloat(t.topup_amount || 0), 0) || 0;

  const callCustomer = () => {
    if (ride.userMobile) Linking.openURL(`tel:${ride.userMobile}`);
  };


  const [selectedImage, setSelectedImage] = useState(null);
const [imageModalVisible, setImageModalVisible] = useState(false);

const openImage = (image) => {
  setSelectedImage(image);
  setImageModalVisible(true);
};


  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ride Details</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Booking ID + Status */}
        <View style={s.topCard}>
          <View style={s.topCardLeft}>
            <Text style={s.bookingIdLabel}>Booking ID</Text>
            <Text style={s.bookingId}>{ride.booking_id}</Text>
            <Text style={s.createdAt}>Created: {formatDate(ride.created_at)}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* In-City tag */}
        {ride.is_incity && (
          <View style={s.incityTag}>
            <Icon name="navigation" size={12} color="#fff" />
            <Text style={s.incityTagText}>In-City Ride</Text>
          </View>
        )}

        {/* Route */}
        <Section title="Route" icon="map-pin">
          <View style={s.routeWrap}>
            <View style={s.routeEntryRow}>
              <View style={s.routeDotCol}>
                <View style={s.routeDotStart} />
                <View style={s.routeConnectLine} />
              </View>
              <View style={s.routeItem}>
                <Text style={s.routeItemLabel}>Pickup</Text>
                <Text style={s.routeItemValue}>
                  {ride.pickup_address || ride.pickup_city || ride.pickup || '—'}
                </Text>
              </View>
            </View>
            <View style={s.routeEntryRow}>
              <View style={s.routeDotCol}>
                <View style={s.routeDotEnd} />
                {ride.service_name?.includes('Rental') && ride.to_city ? <View style={s.routeConnectLine} /> : null}
                {ride.service_name?.includes('Driver') && ride.to_city ? <View style={s.routeConnectLine} /> : null}
              </View>
              <View style={s.routeItem}>
                <Text style={s.routeItemLabel}>Drop</Text>
                <Text style={s.routeItemValue}>
                  {ride.drop_address || ride.drop_city || ride.destination || '—'}
                </Text>
              </View>
            </View>
            {ride.service_name?.includes('Rental') && ride.to_city ? (
              <View style={s.routeEntryRow}>
                <View style={s.routeDotCol}>
                  <View style={s.routeDotCity} />
                </View>
                <View style={s.routeItem}>
                  <Text style={s.routeItemLabel}>To City</Text>
                  <Text style={[s.routeItemValue, s.toCityValue]}>{ride.to_city}</Text>
                </View>
              </View>
            ) : null}
            {ride.service_name?.includes('Driver') && ride.to_city ? (
              <View style={s.routeEntryRow}>
                <View style={s.routeDotCol}>
                  <View style={s.routeDotCity} />
                </View>
                <View style={s.routeItem}>
                  <Text style={s.routeItemLabel}>To City</Text>
                  <Text style={[s.routeItemValue, s.toCityValue]}>{ride.to_city}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </Section>

        {/* Trip Info */}
        <Section title="Trip Info" icon="info">
          <Row label="Schedule Date" value={formatDate(ride.schedule_date || ride.date)} />
          <Row label="Passengers" value={ride.person ? `${ride.person} person(s)` : '—'} />
          {ride.distance > 0 && <Row label="Distance" value={`${ride.distance} km`} />}
          {ride.duration > 0 && <Row label="Duration" value={`${ride.duration} hr(s)`} />}
        </Section>

        {/* Plan */}
        <Section title="Plan Details" icon="package">
          <Row label="Plan Name" value={ride.vehicle?.name || ride.plan_name || '—'} />
          <Row
            label="Base Fare"
            value={ride.basePrice != null ? `₹${parseFloat(ride.basePrice).toFixed(2)}` : ride.plan_price ? `₹${parseFloat(ride.plan_price).toFixed(2)}` : '—'}
          />
        </Section>

        {/* Fare Breakdown */}
        <Section title="Fare Breakdown" icon="credit-card">
          <Row label="Plan Price" value={ride.plan_price ? `₹${parseFloat(ride.plan_price).toFixed(2)}` : '—'} />
          {totalTopup > 0 && (
            <Row
              label={`Topup (${ride.topups?.length || 0})`}
              value={`+₹${totalTopup.toFixed(2)}`}
              valueStyle={s.topupValue}
            />
          )}
          {ride.actual_fare != null && (
            <Row label="Actual Fare" value={`₹${parseFloat(ride.actual_fare).toFixed(2)}`} />
          )}
          <View style={s.divider} />
          <Row
            label="Final Fare"
            value={`₹${parseFloat(ride.final_fare || ride.price || 0).toFixed(2)}`}
            valueStyle={s.finalFare}
          />
        </Section>

        {/* Status Details */}
        <Section title="Status Details" icon="activity">
          <Row label="Overall Status" value={ride.status || '—'} />
          {ride.driver_status && <Row label="Driver Status" value={ride.driver_status} />}
          {ride.user_status && <Row label="User Status" value={ride.user_status} />}
        </Section>

        {/* Customer */}
        <Section title="Customer" icon="user">
          <Row label="Name" value={ride.riderName || '—'} />
          {/* {ride.userMobile ? (
            <View style={s.row}>
              <Text style={s.rowLabel}>Mobile</Text>
              <TouchableOpacity onPress={callCustomer} style={s.callRow}>
                <Text style={s.callText}>{ride.userMobile}</Text>
                <Icon name="phone" size={14} color="#810a45" />
              </TouchableOpacity>
            </View>
          ) : (
            <Row label="Mobile" value="—" />
          )} */}
        </Section>

        {/* Topups */}
        {ride.topups && ride.topups.length > 0 && (
          <Section title={`Topups (${ride.topups.length})`} icon="trending-up">
            {ride.topups.map((t, i) => (
              <View key={i} style={s.topupCard}>
                <View style={s.topupRow}>
                  <Text style={s.topupAmount}>+₹{parseFloat(t.topup_amount).toFixed(2)}</Text>
                  {t.status && (
                    <View style={[s.statusBadge, { backgroundColor: getStatusCfg(t.status).bg }]}>
                      <Text style={[s.statusText, { color: getStatusCfg(t.status).color }]}>{t.status}</Text>
                    </View>
                  )}
                </View>
                {t.reason && <Text style={s.topupReason}>{t.reason}</Text>}
                {t.extra_km > 0 && <Text style={s.topupMeta}>Extra KM: {t.extra_km}</Text>}
              </View>
            ))}
          </Section>
        )}
        {console.log('ride.meter_images',ride.meter_images)}

        {/* Meter Images */}
   {ride.meter_images && ride.meter_images.length > 0 && (
  <Section title={`Meter Images (${ride.meter_images.length})`} icon="camera">
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.imageScroll}
    >
      {ride.meter_images.map((img, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => openImage(`https://sigiride.com/${img?.image}`)}
        >
          <Image
            source={{ uri: `https://sigiride.com/${img?.image}` }}
            style={s.meterImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  </Section>
)}

        <View style={s.footer} />
      </ScrollView>
      <Modal
  visible={imageModalVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setImageModalVisible(false)}
>
  <View style={s.modalContainer}>
    <TouchableOpacity
      style={s.closeBtn}
      onPress={() => setImageModalVisible(false)}
    >
      <Icon name="close" size={30} color="#fff" />
    </TouchableOpacity>

    <Image
      source={{ uri: selectedImage }}
      style={s.fullImage}
      resizeMode="contain"
    />
  </View>
</Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: { position: 'absolute', left: 16 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },

  scroll: { padding: 16 },

  topCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  topCardLeft: { flex: 1 },
  bookingIdLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  bookingId: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  createdAt: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },

  incityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#6366F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
    marginBottom: 10,
  },
  incityTagText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBody: { paddingHorizontal: 16, paddingVertical: 8 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  rowLabel: { fontSize: 14, color: '#6B7280', flex: 1 },
  rowValue: { fontSize: 14, color: '#111827', fontWeight: '500', textAlign: 'right', flex: 1 },

  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  topupValue: { color: '#F59E0B', fontWeight: '600' },
  finalFare: { fontSize: 16, fontWeight: '700', color: '#16A34A' },

  callRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  callText: { fontSize: 14, color: '#810a45', fontWeight: '600', textDecorationLine: 'underline' },

  routeWrap: { paddingVertical: 12 },
  routeEntryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  routeDotCol: { alignItems: 'center', width: 20, marginRight: 10 },
  routeDotStart: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#810a45', marginTop: 4 },
  routeDotEnd: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16A34A', marginTop: 4 },
  routeDotCity: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#810a45', marginTop: 4 },
  routeConnectLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: '#E5E7EB', marginVertical: 3 },
  routeItem: { flex: 1, paddingBottom: 16 },
  routeItemLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  routeItemValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  toCityValue: { color: '#810a45', fontWeight: '600' },

  topupCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  topupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  topupAmount: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
  topupReason: { fontSize: 13, color: '#6B7280' },
  topupMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  imageScroll: { marginVertical: 8 },
  meterImage: { width: 120, height: 90, borderRadius: 10, marginRight: 10 },

  footer: { height: 30 },
   modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "85%",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
});

export default BookingHistoryDetailScreen;
