import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  StatusBar,
  Linking,
  Touchable,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import {
  GET_CURRENT_BOOKING,
  DRIVER_ARRIVED,
  START_IN_CITY_RIDE,
  COMPLETE_IN_CITY_RIDE,
  CANCEL_BOOKING,
} from '../../redux/actions/action-creator';

const MAPS_API_KEY = 'AIzaSyDbk7w0pvfAxvMsgGiCs3UMa_GTsAHTmgY';

const BRAND   = '#E91E8C';
const BLUE    = '#1565C0';
const GREEN   = '#2E7D32';
const GREEN_L = '#43A047';
const RED     = '#D32F2F';
const AMBER   = '#F57F17';
const SURFACE = '#FFFFFF';
const BG      = '#F7F8FA';
const TEXT    = '#111827';
const SUBTLE  = '#6B7280';
const BORDER  = '#E5E7EB';

const STEPS = [
  { key: 'ACCEPTED', label: 'Accepted',  icon: 'check' },
  { key: 'ARRIVED',  label: 'Arrived',   icon: 'map-pin' },
  { key: 'STARTED',  label: 'Started',   icon: 'play' },
  { key: 'COMPLETED',label: 'Completed', icon: 'flag' },
];

const STATUS_CONFIG = {
  ACCEPTED:           { color: GREEN,     bg: '#E8F5E9', label: 'Accepted'           },
  ARRIVED:            { color: BLUE,      bg: '#E3F2FD', label: 'Arrived'            },
  STARTED:            { color: AMBER,     bg: '#FFF8E1', label: 'Ride Started'       },
  WAITING_FOR_PAYMENT:{ color: AMBER,     bg: '#FFF8E1', label: 'Waiting for Payment'},
  COMPLETED:          { color: '#388E3C', bg: '#E8F5E9', label: 'Completed'          },
  CANCELLED:          { color: RED,       bg: '#FFEBEE', label: 'Cancelled'          },
};

const decodePolyline = (encoded) => {
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
};

const calcDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
};

const InCityMapScreen = ({ navigation, route }) => {
  const { booking_id, bookingData } = route.params;
  const dispatch = useDispatch();

  const [currentRide, setCurrentRide] = useState(bookingData || null);
  console.log('currentRide-===>',currentRide);
  
  const [isLoading, setIsLoading]     = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [enteredOtp, setEnteredOtp]     = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [pickupCoords, setPickupCoords]       = useState(null);
  const [routeCoords, setRouteCoords]         = useState([]);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [isRoadRoute, setIsRoadRoute]         = useState(false);

  const mapRef            = useRef(null);
  const intervalRef       = useRef(null);
  const watchIdRef        = useRef(null);
  const lastRouteFetch    = useRef(0);
  const initialCentered   = useRef(false);

  useEffect(() => {
    if (!driverLocation || initialCentered.current) return;
    initialCentered.current = true;
    mapRef.current?.animateToRegion(
      { ...driverLocation, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      800
    );
  }, [driverLocation]);

  useEffect(() => {
    if (currentRide?.status === 'WAITING_FOR_PAYMENT') {
      clearInterval(intervalRef.current);
      navigation.replace('InCityInvoice', {
        bookingData:    currentRide,
        actualDistance: '—',
        invoiceData:    currentRide,
      });
    }
  }, [currentRide?.status]);

  useEffect(() => {
    fetchCurrentRide();
    startLocationTracking();
    intervalRef.current = setInterval(fetchCurrentRide, 5000);
    return () => {
      clearInterval(intervalRef.current);
      if (watchIdRef.current != null) Geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const startLocationTracking = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        { title: 'Location Permission', message: 'This app needs your location to navigate.', buttonPositive: 'Allow' }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    watchIdRef.current = Geolocation.watchPosition(
      (pos) => setDriverLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => console.log('Location error:', err),
      { enableHighAccuracy: true, distanceFilter: 15 }
    );
  };

  const fetchCurrentRide = async () => {
    try {
      const res = await dispatch(GET_CURRENT_BOOKING());
      if (res?.status && res?.data) {
        setCurrentRide(res.data[0]);
        if (res.data[0].status === 'COMPLETED' || res.data[0].status === 'CANCELLED') {
          clearInterval(intervalRef.current);
        }
      }
    } catch (e) { console.log('fetchCurrentRide error:', e); }
  };

  const fitMap = (origin, coords) => {
    if (!mapRef.current || !coords.length) return;
    mapRef.current.fitToCoordinates(
      [{ latitude: origin.latitude, longitude: origin.longitude }, ...coords],
      { edgePadding: { top: 140, right: 60, bottom: 320, left: 60 }, animated: true }
    );
  };

  const fetchRoute = async (destination, origin) => {
    if (!origin || !destination) return;
    const now = Date.now();
    if (now - lastRouteFetch.current < 30000) return;
    lastRouteFetch.current = now;
    try {
      const orig    = `${origin.latitude},${origin.longitude}`;
      const dirUrl  = `https://maps.googleapis.com/maps/api/directions/json?origin=${orig}&destination=${encodeURIComponent(destination)}&key=${MAPS_API_KEY}`;
      const dirData = await (await fetch(dirUrl)).json();

      if (dirData.routes?.length > 0) {
        const coords    = decodePolyline(dirData.routes[0].overview_polyline.points);
        const end       = dirData.routes[0].legs[0].end_location;
        setRouteCoords(coords);
        setDestinationCoords({ latitude: end.lat, longitude: end.lng });
        setIsRoadRoute(true);
        fitMap(origin, coords);
        return;
      }

      const geoUrl  = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${MAPS_API_KEY}`;
      const geoData = await (await fetch(geoUrl)).json();

      if (geoData.results?.length > 0) {
        const loc      = geoData.results[0].geometry.location;
        const destCoord = { latitude: loc.lat, longitude: loc.lng };
        setDestinationCoords(destCoord);
        setRouteCoords([{ latitude: origin.latitude, longitude: origin.longitude }, destCoord]);
        setIsRoadRoute(false);
        fitMap(origin, [destCoord]);
      }
    } catch (e) { console.log('fetchRoute error:', e); }
  };

  useEffect(() => {
    if (!driverLocation) return;
    const rideStatus = currentRide?.status;
    if (rideStatus === 'ACCEPTED') {
      const dest = currentRide?.pickup_address || currentRide?.pickup_city
        || bookingData?.pickup_address || bookingData?.pickup_city;
      lastRouteFetch.current = 0;
      fetchRoute(dest, driverLocation);
    } else if (rideStatus === 'ARRIVED' || rideStatus === 'STARTED') {
      const dest = currentRide?.drop_address || currentRide?.drop_city
        || bookingData?.drop_address || bookingData?.drop_city;
      lastRouteFetch.current = 0;
      fetchRoute(dest, driverLocation);
    } else {
      setRouteCoords([]);
      setDestinationCoords(null);
    }
  }, [currentRide?.status, driverLocation]);

  const handleArrived = () => {
    Alert.alert('Mark as Arrived', 'Confirm you have reached the pickup location?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Arrived',
        onPress: async () => {
          setIsLoading(true);
          try {
            const res = await dispatch(DRIVER_ARRIVED({ booking_id: currentRide?.booking_id }));
            if (res?.status) { await fetchCurrentRide(); }
            else { Alert.alert('Error', res?.message || 'Failed to update status'); }
          } catch { Alert.alert('Error', 'Something went wrong'); }
          finally { setIsLoading(false); }
        },
      },
    ]);
  };

  const submitStartRide = async () => {
    if (!enteredOtp) { Alert.alert('Error', 'Please enter the OTP'); return; }
    if (!driverLocation) { Alert.alert('Error', 'Unable to get your location. Please try again.'); return; }
    setIsLoading(true);
    try {
      const res = await dispatch(START_IN_CITY_RIDE({
        booking_id: currentRide?.booking_id,
        otp: Number(enteredOtp),
        pickup_lat: String(driverLocation.latitude),
        pickup_lng: String(driverLocation.longitude),
      }));
      if (res?.status) {
        setPickupCoords({ ...driverLocation });
        setShowOtpModal(false);
        setEnteredOtp('');
        await fetchCurrentRide();
      } else { Alert.alert('Error', res?.message || 'Failed to start ride'); }
    } catch (e) { console.log('start ride error:', e); Alert.alert('Error', 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleCompleteRide = () => {
    const startLat = parseFloat(currentRide?.start_lat);
    const startLng = parseFloat(currentRide?.start_lng);
    const endLat   = parseFloat(currentRide?.end_lat);
    const endLng   = parseFloat(currentRide?.end_lng);

    let distance;
    if (startLat && startLng && endLat && endLng) {
      distance = calcDistanceKm(startLat, startLng, endLat, endLng);
    } else if (pickupCoords && driverLocation) {
      distance = calcDistanceKm(pickupCoords.latitude, pickupCoords.longitude, driverLocation.latitude, driverLocation.longitude);
    } else {
      Alert.alert('Error', 'Unable to calculate trip distance. Please try again.');
      return;
    }

   Alert.alert(
  'Complete Ride',
  'Are you sure you want to complete this ride?',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Complete', onPress: () => submitCompleteRide(distance) },
  ]
);
  };

  const submitCompleteRide = async (distance) => {
    setIsLoading(true);
    try {
      const res = await dispatch(COMPLETE_IN_CITY_RIDE({
        booking_id:      currentRide?.booking_id,
        actual_distance: String(distance),
        drop_lat:        String(driverLocation.latitude),
        drop_lng:        String(driverLocation.longitude),
      }));
      console.log('Complete Ride Response:', res);
      if (res?.status) {
        clearInterval(intervalRef.current);
        navigation.replace('InCityInvoice', {
          bookingData:    currentRide,
          actualDistance: distance,
          invoiceData:    res?.data || res,
        });
      } else {
        Alert.alert('Error', res?.message || 'Failed to complete ride');
      }
    } catch { Alert.alert('Error', 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleTrackOnMap = () => {
    const rideStatus = currentRide?.status;
    let lat, lng, addressFallback;

    if (rideStatus === 'ACCEPTED') {
      if (destinationCoords) {
        lat = destinationCoords.latitude;
        lng = destinationCoords.longitude;
      }
      addressFallback = pickup;
    } else if (rideStatus === 'ARRIVED' || rideStatus === 'STARTED') {
      if (destinationCoords) {
        lat = destinationCoords.latitude;
        lng = destinationCoords.longitude;
      }
      addressFallback = drop;
    }

    if (!lat && !addressFallback) {
      Alert.alert('Error', 'Destination not available yet');
      return;
    }

    const dest = lat ? `${lat},${lng}` : encodeURIComponent(addressFallback);

    let url;
    if (Platform.OS === 'android') {
      url = lat
        ? `google.navigation:q=${dest}`
        : `https://maps.google.com/maps?daddr=${dest}`;
    } else {
      url = lat
        ? `comgooglemaps://?daddr=${dest}&directionsmode=driving`
        : `comgooglemaps://?daddr=${dest}&directionsmode=driving`;
    }

    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) return Linking.openURL(url);
        const webUrl = lat
          ? `https://maps.google.com/maps?daddr=${dest}`
          : `https://maps.google.com/maps?daddr=${dest}`;
        return Linking.openURL(webUrl);
      })
      .catch(() => Alert.alert('Error', 'Could not open Google Maps'));
  };

  const handleCancelRide = () => {
    setCancelReason('');
    setShowCancelModal(true);
  };

  const submitCancelRide = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please enter reason');
      return;
    }
    setIsLoading(true);
    try {
      const res = await dispatch(
        CANCEL_BOOKING({
          role: 'DRIVER',
          booking_id: currentRide?.booking_id,
          cancel_reason: cancelReason.trim(),
        })
      );
      if (res?.status) {
        setShowCancelModal(false);
        navigation.goBack();
      } else {
        Alert.alert('Error', res?.message || 'Failed to cancel ride');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const status     = currentRide?.status;
  const pickup     = currentRide?.pickup_address || currentRide?.pickup_city || bookingData?.pickup_address || bookingData?.pickup_city;
  const drop       = currentRide?.drop_address   || currentRide?.drop_city   || bookingData?.drop_address   || bookingData?.drop_city;
  const distance   = currentRide?.distance   || bookingData?.distance;
  const person     = currentRide?.person     || bookingData?.person;
  const subService = currentRide?.sub_service_name || bookingData?.sub_service_name;
  const phone      = currentRide?.user_mobile;
  const userName   = currentRide?.user_name  || bookingData?.user_name;

  const statusCfg  = STATUS_CONFIG[status] || {};
  const routeColor = status === 'ACCEPTED' ? BLUE : GREEN_L;

  const mapRegion = driverLocation
    ? { ...driverLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 26.9124, longitude: 75.7873, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const stepIndex = STEPS.findIndex(s => s.key === status);

  return (
    <View style={s.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={mapRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsTraffic={false}
        moveOnMarkerPress={false}
      >
        {/* Shadow polyline (white, wider) */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="rgba(255,255,255,0.9)"
            strokeWidth={isRoadRoute ? 9 : 3}
            lineDashPattern={isRoadRoute ? undefined : [8, 6]}
            zIndex={1}
          />
        )}
        {/* Main polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={routeColor}
            strokeWidth={isRoadRoute ? 5 : 2}
            lineDashPattern={isRoadRoute ? undefined : [8, 6]}
            zIndex={2}
          />
        )}

        {/* Driver marker */}
        {driverLocation && (
          <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
            <View style={s.driverOuter}>
              <View style={s.driverInner}>
                <MaterialIcon name="car" size={16} color={SURFACE} />
              </View>
            </View>
          </Marker>
        )}

        {/* Pickup pin */}
        {destinationCoords && status === 'ACCEPTED' && (
          <Marker coordinate={destinationCoords} anchor={{ x: 0.5, y: 1 }} zIndex={9}>
            <View style={s.pinWrapper}>
              <View style={[s.pinBody, { backgroundColor: GREEN }]}>
                <MaterialIcon name="map-marker" size={16} color={SURFACE} />
              </View>
              <View style={[s.pinTip, { borderTopColor: GREEN }]} />
            </View>
          </Marker>
        )}

        {/* Drop pin */}
        {destinationCoords && (status === 'ARRIVED' || status === 'STARTED') && (
          <Marker coordinate={destinationCoords} anchor={{ x: 0.5, y: 1 }} zIndex={9}>
            <View style={s.pinWrapper}>
              <View style={[s.pinBody, { backgroundColor: RED }]}>
                <MaterialIcon name="flag-checkered" size={16} color={SURFACE} />
              </View>
              <View style={[s.pinTip, { borderTopColor: RED }]} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── HEADER ── */}
      <View style={s.header} pointerEvents="box-none">
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="arrow-left" size={20} color={TEXT} />
        </TouchableOpacity>

        <View style={s.headerCard}>
          <View>
            <Text style={s.headerTitle}>In-City Ride</Text>
            {subService ? <Text style={s.headerSub}>{subService}</Text> : null}
          </View>
          {statusCfg.label ? (
            <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <View style={[s.statusDot, { backgroundColor: statusCfg.color }]} />
              <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── BOTTOM PANEL ── */}
      <View style={s.panel}>
        <View style={s.handle} />

        {/* Step progress */}
        <View style={s.stepsRow}>
          {STEPS.map((step, i) => {
            const done    = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <React.Fragment key={step.key}>
                <View style={s.stepItem}>
                  <View style={[s.stepCircle, done && { backgroundColor: BRAND, borderColor: BRAND }]}>
                    <Icon name={step.icon} size={10} color={done ? SURFACE : '#CBD5E1'} />
                  </View>
                  <Text style={[s.stepLabel, current && { color: BRAND, fontWeight: '700' }]}>{step.label}</Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[s.stepLine, i < stepIndex && { backgroundColor: BRAND }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View style={s.divider} />

        {/* Location card */}
        <View style={s.locationCard}>
          <View style={s.locationTrack}>
            <View style={s.trackDotGreen} />
            <View style={s.trackLine} />
            <View style={s.trackDotRed} />
          </View>
          <View style={s.locationInfo}>
            <View style={s.locationBlock}>
              <Text style={s.locLabel}>Pickup</Text>
              <Text style={s.locValue} numberOfLines={2}>{pickup || '—'}</Text>
            </View>
            <View style={s.locationBlockSpacer} />
            <View style={s.locationBlock}>
              <Text style={s.locLabel}>Drop-off</Text>
              <Text style={s.locValue} numberOfLines={2}>{drop || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Meta chips */}
        <View style={s.chips}>
          {distance ? (
            <View style={s.chip}>
              <Icon name="map" size={12} color={SUBTLE} />
              <Text style={s.chipText}>{distance} km</Text>
            </View>
          ) : null}
          {/* {person ? (
            <View style={s.chip}>
              <Icon name="users" size={12} color={SUBTLE} />
              <Text style={s.chipText}>{person} {Number(person) === 1 ? 'Passenger' : 'Passengers'}</Text>
            </View>
          ) : null} */}
          {/* {phone ? (
            <View style={s.chip}>
              <Icon name="phone" size={12} color={SUBTLE} />
              <Text style={s.chipText}>{phone}</Text>
            </View>
          ) : null} */}
        </View>

        {/* Passenger row */}
        {(userName || phone) ? (
          <View style={s.driverCard}>
            <View style={s.driverRow}>
              <View style={s.driverAvatar}>
                <FontAwesome5 name="user-circle" size={36} color="#FF1493" />
              </View>
              <View style={s.driverMeta}>
                <Text style={s.driverName}>{userName || 'Passenger'}</Text>
                {phone ? (
                  <TouchableOpacity style={s.callRow} onPress={() => Linking.openURL(`tel:${phone}`)}>
                    <Icon name="phone" size={14} color="#4CAF50" />
                    <Text style={s.driverPhone}>{phone}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {phone ? (
                <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${phone}`)}>
                  <Icon name="phone-call" size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── ACTION BUTTONS ── */}
        {status === 'ACCEPTED' && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: GREEN }]} onPress={handleArrived} disabled={isLoading} activeOpacity={0.85}>
            {isLoading
              ? <ActivityIndicator color={SURFACE} size="small" />
              : <>
                  <View style={s.btnIconWrap}><Icon name="navigation" size={18} color={SURFACE} /></View>
                  <Text style={s.btnLabel}>I've Arrived at Pickup</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {status === 'ARRIVED' && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: BLUE }]} onPress={() => setShowOtpModal(true)} disabled={isLoading} activeOpacity={0.85}>
            <View style={s.btnIconWrap}><Icon name="play" size={18} color={SURFACE} /></View>
            <Text style={s.btnLabel}>Start Ride</Text>
          </TouchableOpacity>
        )}

        {status === 'STARTED' && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: BRAND }]} onPress={handleCompleteRide} disabled={isLoading} activeOpacity={0.85}>
            {isLoading
              ? <ActivityIndicator color={SURFACE} size="small" />
              : <>
                  <View style={s.btnIconWrap}><Icon name="check-circle" size={18} color={SURFACE} /></View>
                  <Text style={s.btnLabel}>Complete Ride</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {(status === 'ACCEPTED' || status === 'ARRIVED' || status === 'STARTED') && (
          <TouchableOpacity style={s.trackMapBtn} onPress={handleTrackOnMap} activeOpacity={0.8}>
            <MaterialIcon name="google-maps" size={18} color={BLUE} />
            <Text style={s.trackMapBtnText}>
              {status === 'ACCEPTED' ? 'Navigate to Pickup' : 'Navigate to Drop-off'}
            </Text>
          </TouchableOpacity>
        )}

        {status === 'COMPLETED' && (
          <View style={s.completedBox}>
            <View style={s.completedIconWrap}>
              <Icon name="check-circle" size={28} color={GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.completedTitle}>Ride Completed</Text>
              <Text style={s.completedSub}>Great job! Have a safe drive.</Text>
            </View>
            <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* {status === 'ACCEPTED' || status === 'ARRIVED' && ( */}
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancelRide} disabled={isLoading} activeOpacity={0.7}>
            <Icon name="x" size={14} color={RED} />
            <Text style={s.cancelBtnText}>Cancel Ride</Text>
          </TouchableOpacity>
        {/* )} */}
      </View>

      {/* ── OTP MODAL ── */}
      <Modal visible={showOtpModal} animationType="slide" transparent onRequestClose={() => setShowOtpModal(false)}>
        <View style={s.modalBg}>
          <View style={s.modalSheet}>
            <View style={s.handle} />

            <View style={s.otpIconWrap}>
              <MaterialIcon name="shield-key-outline" size={32} color={BLUE} />
            </View>
            <Text style={s.modalTitle}>Passenger OTP</Text>
            <Text style={s.modalSub}>Ask the passenger for the OTP to start the trip</Text>

            <TextInput
              style={s.otpInput}
              placeholder="• • • • • •"
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
              value={enteredOtp}
              onChangeText={setEnteredOtp}
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: BLUE, marginTop: 8 }]}
              onPress={submitStartRide}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color={SURFACE} size="small" />
                : <>
                    <View style={s.btnIconWrap}><Icon name="play" size={18} color={SURFACE} /></View>
                    <Text style={s.btnLabel}>Start Ride</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => { setShowOtpModal(false); setEnteredOtp(''); }}
              activeOpacity={0.7}
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── CANCEL MODAL ── */}
      <Modal visible={showCancelModal} animationType="slide" transparent onRequestClose={() => setShowCancelModal(false)}>
        <View style={s.modalBg}>
          <View style={s.modalSheet}>
            <View style={s.handle} />

            <View style={[s.otpIconWrap, { backgroundColor: '#FFEBEE' }]}>
              <MaterialIcon name="close-circle-outline" size={32} color={RED} />
            </View>
            <Text style={s.modalTitle}>Cancel Ride</Text>
            <Text style={s.modalSub}>Please enter the reason for cancellation</Text>

            <TextInput
              style={[
                s.otpInput,
                {
                  fontSize: 16,
                  height: 100,
                  paddingHorizontal: 16,
                  textAlign: 'left',
                  letterSpacing: 0,
                  paddingTop: 12,
                  textAlignVertical: 'top'
                }
              ]}
              placeholder="Enter reason"
              placeholderTextColor="#CBD5E1"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />

            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: RED, marginTop: 8 }]}
              onPress={submitCancelRide}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color={SURFACE} size="small" />
                : <>
                    <View style={s.btnIconWrap}><Icon name="x-circle" size={18} color={SURFACE} /></View>
                    <Text style={s.btnLabel}>Cancel Ride</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => { setShowCancelModal(false); setCancelReason(''); }}
              activeOpacity={0.7}
            >
              <Text style={s.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  driverCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginTop: 10,
    marginBottom: 10,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center',
  },
  driverMeta: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700', color: '#222' },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  driverPhone: { fontSize: 13, color: '#4CAF50', fontWeight: '500' },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
  },
  map:       { flex: 1 },

  /* ── Driver marker ── */
  driverOuter: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(233,30,140,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  driverInner: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: BRAND,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: SURFACE,
    elevation: 6,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
  },

  /* ── Destination pin ── */
  pinWrapper: { alignItems: 'center' },
  pinBody: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: SURFACE,
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  pinTip: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },

  /* ── Header ── */
  header: {
    position: 'absolute', top: 44, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: SURFACE,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6,
    marginRight: 10,
  },
  headerCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8,
    justifyContent: 'space-between',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  headerSub:   { fontSize: 11, color: SUBTLE, marginTop: 1, textTransform: 'capitalize' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 11, fontWeight: '700' },

  /* ── Bottom panel ── */
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28,
    elevation: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.1, shadowRadius: 16,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDE1E7', alignSelf: 'center', marginBottom: 16 },

  /* Steps */
  stepsRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepItem:   { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: '#CBD5E1',
    backgroundColor: BG,
    justifyContent: 'center', alignItems: 'center',
  },
  stepLabel:  { fontSize: 9, color: SUBTLE, fontWeight: '500' },
  stepLine:   { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginBottom: 12, marginHorizontal: 2 },

  divider: { height: 1, backgroundColor: BORDER, marginBottom: 14 },

  /* Location */
  locationCard:  { flexDirection: 'row', marginBottom: 10 },
  locationTrack: { width: 20, alignItems: 'center', paddingTop: 3, marginRight: 12 },
  trackDotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN, borderWidth: 2, borderColor: '#C8E6C9' },
  trackLine:     { width: 2, flex: 1, backgroundColor: BORDER, marginVertical: 2 },
  trackDotRed:   { width: 12, height: 12, borderRadius: 6, backgroundColor: RED,   borderWidth: 2, borderColor: '#FFCDD2' },
  locationInfo:  { flex: 1 },
  locationBlock: { paddingVertical: 3 },
  locationBlockSpacer: { height: 10 },
  locLabel: { fontSize: 10, color: SUBTLE, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  locValue: { fontSize: 13, color: TEXT, fontWeight: '500', lineHeight: 18 },

  /* Chips */
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BG, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  chipText: { fontSize: 13, color: SUBTLE, fontWeight: '500' },

  /* Passenger */
  passengerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: BG, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14, borderWidth: 1, borderColor: BORDER,
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center', alignItems: 'center',
  },
  passengerName:  { fontSize: 14, fontWeight: '600', color: TEXT },
  passengerPhone: { fontSize: 12, color: SUBTLE, marginTop: 1 },
  callChip: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Action button */
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 15, gap: 10,
    marginBottom: 10, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
  },
  btnIconWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  btnLabel: { color: SURFACE, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  /* Track on Map */
  trackMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 12,
    marginBottom: 10, borderWidth: 1.5, borderColor: BLUE,
    backgroundColor: '#EFF6FF',
  },
  trackMapBtnText: { color: BLUE, fontSize: 14, fontWeight: '600' },

  /* Cancel */
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  cancelBtnText: { color: RED, fontSize: 13, fontWeight: '600' },

  /* Completed */
  completedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#BBF7D0',
  },
  completedIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  completedTitle: { fontSize: 14, fontWeight: '700', color: '#15803D' },
  completedSub:   { fontSize: 11, color: '#4ADE80', marginTop: 1 },
  doneBtn:        { backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  doneBtnText:    { color: SURFACE, fontWeight: '700', fontSize: 13 },

  /* ── OTP Modal ── */
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 36,
  },
  otpIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 12, marginTop: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center', letterSpacing: -0.3 },
  modalSub:   { fontSize: 13, color: SUBTLE, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 18 },
  otpInput: {
    borderWidth: 2, borderColor: BORDER,
    borderRadius: 16, paddingVertical: 16,
    fontSize: 28, fontWeight: '700', color: TEXT,
    backgroundColor: BG, marginBottom: 8,
    letterSpacing: 12,
  },
  modalCancelBtn:  { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  modalCancelText: { color: SUBTLE, fontSize: 14, fontWeight: '600' },
});

export default InCityMapScreen;
