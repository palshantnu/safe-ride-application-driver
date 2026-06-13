import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import SelfSharingService from '../../services/SelfSharingService';
import axios from 'axios';

const API_BASE_URL = 'http://91.108.104.79:3000';

const DEFAULT_PAYLOAD = {
  service_id: 72,
  from_city: '',
  from_city_id: null,
  to_city: '',
  to_city_id: null,
  pickup_address: '',
  departure_time: '2026-06-08 08:00:00',
  total_seats: 4,
  token_fare: 100,
  full_fare: 500,
};

const SelfSharingCreateTripScreen = ({ navigation, route }) => {
  const service_id = route?.params?.service_id || 72;

  const [form, setForm] = useState({
    ...DEFAULT_PAYLOAD,
    service_id,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [cityType, setCityType] = useState(''); // 'from' or 'to'
  const [citySearch, setCitySearch] = useState('');

  // Cities data from API
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Fetch cities on component mount
  useEffect(() => {
    fetchCities();
  }, []);

  // Filter cities based on search text
  useEffect(() => {
    if (citySearch.trim() === '') {
      setFilteredCities(cities);
    } else {
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(citySearch.toLowerCase())
      );
      setFilteredCities(filtered);
    }
  }, [citySearch, cities]);

  // Fetch cities from API
  const fetchCities = async () => {
    setCitiesLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/cities`);
      if (response.data?.status && response.data?.data) {
        setCities(response.data.data);
        setFilteredCities(response.data.data);
      } else {
        console.error('Failed to fetch cities:', response.data?.message);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      Alert.alert('Error', 'Failed to load cities. Please check your internet connection.');
    } finally {
      setCitiesLoading(false);
    }
  };

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCitySelect = (city) => {
    if (cityType === 'from') {
      update('from_city', city.name);
      update('from_city_id', city.id);
    } else {
      update('to_city', city.name);
      update('to_city_id', city.id);
    }
    setShowCityModal(false);
    setCitySearch('');
  };

  const handleSwapCities = () => {
    const tempCity = form.from_city;
    const tempId = form.from_city_id;
    update('from_city', form.to_city);
    update('from_city_id', form.to_city_id);
    update('to_city', tempCity);
    update('to_city_id', tempId);
  };

  const handleCreate = async () => {
    // Validation
    if (!form.from_city.trim()) {
      Alert.alert('Error', 'Please select from city');
      return;
    }
    if (!form.to_city.trim()) {
      Alert.alert('Error', 'Please select to city');
      return;
    }
    if (form.from_city === form.to_city) {
      Alert.alert('Error', 'From city and to city cannot be same');
      return;
    }
    if (!form.pickup_address.trim()) {
      Alert.alert('Error', 'Please enter pickup address');
      return;
    }
    if (form.total_seats <= 0) {
      Alert.alert('Error', 'Please enter valid number of seats');
      return;
    }
    if (form.token_fare <= 0) {
      Alert.alert('Error', 'Please enter valid token fare');
      return;
    }
    if (form.full_fare <= 0) {
      Alert.alert('Error', 'Please enter valid full fare');
      return;
    }

    setLoading(true);
    try {
      const res = await SelfSharingService.createTrip({
        ...form,
        total_seats: Number(form.total_seats),
        token_fare: Number(form.token_fare),
        full_fare: Number(form.full_fare),
      });

      const ok = res?.status ?? res?.success ?? true;
      if (ok) {
        Alert.alert('Success', 'Trip created successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', res?.message || 'Failed to create trip');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create trip');
      console.log('createTrip error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDisplayDate = (dateTimeStr) => {
    if (!dateTimeStr) return 'Select Date';
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return 'Select Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatDisplayTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'Select Time';
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return 'Select Time';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Helper function to safely parse date
  const getSafeDate = () => {
    try {
      const date = new Date(form.departure_time);
      if (isNaN(date.getTime())) {
        return new Date();
      }
      return date;
    } catch (error) {
      return new Date();
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    
    if (event.type === 'set' && selectedDate) {
      const currentDateTime = getSafeDate();
      const newDateTime = new Date(selectedDate);
      
      // Preserve the time from the current datetime
      newDateTime.setHours(currentDateTime.getHours());
      newDateTime.setMinutes(currentDateTime.getMinutes());
      
      const year = newDateTime.getFullYear();
      const month = String(newDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(newDateTime.getDate()).padStart(2, '0');
      const hours = String(newDateTime.getHours()).padStart(2, '0');
      const minutes = String(newDateTime.getMinutes()).padStart(2, '0');

      update('departure_time', `${year}-${month}-${day} ${hours}:${minutes}:00`);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    
    if (event.type === 'set' && selectedTime) {
      const currentDateTime = getSafeDate();
      const newDateTime = new Date(currentDateTime);
      
      // Update only the time
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      
      const year = newDateTime.getFullYear();
      const month = String(newDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(newDateTime.getDate()).padStart(2, '0');
      const hours = String(newDateTime.getHours()).padStart(2, '0');
      const minutes = String(newDateTime.getMinutes()).padStart(2, '0');

      update('departure_time', `${year}-${month}-${day} ${hours}:${minutes}:00`);
    }
  };

  const renderCityItem = ({ item }) => (
    <TouchableOpacity
      style={styles.cityItem}
      onPress={() => handleCitySelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cityItemContent}>
        <Icon name="map-pin" size={18} color="#FF1493" />
        <View style={styles.cityTextContainer}>
          <Text style={styles.cityName}>{item.name}</Text>
          <Text style={styles.stateName}>{item.state_name}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={18} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff7f50" />
      
      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Trip</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          {/* From City */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>From City</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setCityType('from');
                setShowCityModal(true);
              }}
            >
              <Icon name="map-pin" size={18} color="#FF1493" />
              <Text style={[styles.inputText, !form.from_city && styles.placeholderText]}>
                {form.from_city || 'Select from city'}
              </Text>
              {form.from_city ? (
                <TouchableOpacity onPress={() => {
                  update('from_city', '');
                  update('from_city_id', null);
                }}>
                  <Icon name="x" size={18} color="#666" />
                </TouchableOpacity>
              ) : (
                <Icon name="chevron-down" size={18} color="#999" />
              )}
            </TouchableOpacity>
          </View>

          {/* Swap Button */}
          <TouchableOpacity style={styles.swapButton} onPress={handleSwapCities}>
            <FontAwesome5 name="exchange-alt" size={18} color="#FF1493" />
          </TouchableOpacity>

          {/* To City */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>To City</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setCityType('to');
                setShowCityModal(true);
              }}
            >
              <Icon name="map-pin" size={18} color="#FF1493" />
              <Text style={[styles.inputText, !form.to_city && styles.placeholderText]}>
                {form.to_city || 'Select to city'}
              </Text>
              {form.to_city ? (
                <TouchableOpacity onPress={() => {
                  update('to_city', '');
                  update('to_city_id', null);
                }}>
                  <Icon name="x" size={18} color="#666" />
                </TouchableOpacity>
              ) : (
                <Icon name="chevron-down" size={18} color="#999" />
              )}
            </TouchableOpacity>
          </View>

          {/* Pickup Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pickup Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter pickup address"
              placeholderTextColor="#999"
              value={form.pickup_address}
              onChangeText={(t) => update('pickup_address', t)}
            />
          </View>

          {/* Departure Date & Time */}
          <Text style={styles.label}>Departure Date & Time</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={[styles.input, styles.halfInput]}
              activeOpacity={0.8}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar" size={18} color="#FF1493" />
              <Text style={styles.dateTimeText}>{formatDisplayDate(form.departure_time)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.input, styles.halfInput]}
              activeOpacity={0.8}
              onPress={() => setShowTimePicker(true)}
            >
              <Icon name="clock" size={18} color="#FF1493" />
              <Text style={styles.dateTimeText}>{formatDisplayTime(form.departure_time)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={getSafeDate()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={getSafeDate()}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          {/* Seats and Fare */}
          <View style={styles.rowContainer}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Total Seats</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="No. of seats"
                value={String(form.total_seats)}
                onChangeText={(t) => update('total_seats', t)}
              />
            </View>
          </View>

          <View style={styles.rowContainer}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Token Fare (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Token amount"
                value={String(form.token_fare)}
                onChangeText={(t) => update('token_fare', t)}
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Full Fare (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Full amount"
                value={String(form.full_fare)}
                onChangeText={(t) => update('full_fare', t)}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, { opacity: loading ? 0.7 : 1 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome5 name="plus" size={16} color="#fff" />
                <Text style={styles.btnText}>Create Trip</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* City Selection Modal */}
      <Modal
        visible={showCityModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowCityModal(false);
          setCitySearch('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowCityModal(false);
                setCitySearch('');
              }}
            >
              <Icon name="chevron-left" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Select {cityType === 'from' ? 'From' : 'To'} City
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cities..."
              placeholderTextColor="#999"
              value={citySearch}
              onChangeText={setCitySearch}
              autoFocus={true}
            />
            {citySearch !== '' && (
              <TouchableOpacity onPress={() => setCitySearch('')}>
                <Icon name="x" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {citiesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF1493" />
              <Text style={styles.loadingText}>Loading cities...</Text>
            </View>
          ) : filteredCities.length > 0 ? (
            <ScrollView style={styles.citiesList} showsVerticalScrollIndicator={false}>
              {filteredCities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={styles.cityItem}
                  onPress={() => handleCitySelect(city)}
                >
                  <View style={styles.cityItemContent}>
                    <Icon name="map-pin" size={18} color="#FF1493" />
                    <View style={styles.cityTextContainer}>
                      <Text style={styles.cityName}>{city.name}</Text>
                      <Text style={styles.stateName}>{city.state_name}</Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={18} color="#ccc" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noResultsContainer}>
              <Icon name="search" size={48} color="#ccc" />
              <Text style={styles.noResultsText}>No cities found</Text>
              <Text style={styles.noResultsSubtext}>Try searching with a different name</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#6B7280', 
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },
  halfInput: {
    flex: 1,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 5,
    borderWidth: 2,
    borderColor: '#FF1493',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  halfWidth: {
    flex: 1,
  },
  btn: {
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FF1493',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  citiesList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cityItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cityTextContainer: {
    flex: 1,
  },
  cityName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  stateName: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default SelfSharingCreateTripScreen;