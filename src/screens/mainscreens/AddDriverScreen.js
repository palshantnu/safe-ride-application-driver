import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useDispatch } from 'react-redux';
import { BA_CREATE_DRIVER, All_Services, GET_SUB_SERVICES } from '../../redux/actions/action-creator';

const AddDriverScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [services, setServices] = useState([]);
  const [subServices, setSubServices] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedSubService, setSelectedSubService] = useState(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showSubServiceModal, setShowSubServiceModal] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const res = await dispatch(All_Services());
      if (Array.isArray(res)) {
        setServices(res);
      } else if (res?.data) {
        setServices(res.data);
      }
    } catch (e) {
      console.log('Error loading services:', e);
    }
  };

  const handleSelectService = async (service) => {
    setSelectedService(service);
    setSelectedSubService(null);
    setSubServices([]);
    setShowServiceModal(false);
    try {
      const res = await dispatch(GET_SUB_SERVICES(service.id));
      if (Array.isArray(res)) {
        setSubServices(res);
      } else if (res?.data) {
        setSubServices(res.data);
      }
    } catch (e) {
      console.log('Error loading sub services:', e);
    }
  };

  const validate = () => {
    if (!fullName.trim()) { Alert.alert('Error', 'Please enter driver full name'); return false; }
    if (!phone.trim() || phone.length < 10) { Alert.alert('Error', 'Please enter a valid 10-digit phone number'); return false; }
    if (!selectedService) { Alert.alert('Error', 'Please select a service'); return false; }
    if (!selectedSubService) { Alert.alert('Error', 'Please select a sub service'); return false; }
    if (!pincode.trim() || pincode.length < 6) { Alert.alert('Error', 'Please enter a valid 6-digit pincode'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await dispatch(BA_CREATE_DRIVER({
        full_name: fullName.trim(),
        phone: phone.trim(),
        service_id: selectedService.id,
        sub_service_id: selectedSubService.id,
        pincode: pincode.trim(),
      }));

      if (res?.status) {
        Alert.alert('Success', 'Driver created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res?.message || 'Failed to create driver');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPickerModal = (visible, onClose, data, onSelect, title, labelKey = 'name') => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => onSelect(item)}>
                {console.log('',item)
                }
                <Text style={styles.pickerItemText}>{item[labelKey] || item.service_name || item.sub_service_name || item.name || item.title}</Text>
                <Icon name="chevron-right" size={16} color="#000" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyPickerText}>No options available</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );

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
        <Text style={styles.headerTitle}>Add Driver</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter driver full name"
            placeholderTextColor="#000"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 10-digit phone number"
            placeholderTextColor="#000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Service</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowServiceModal(true)}
          >
            <Text style={[styles.selectorText, !selectedService && styles.selectorPlaceholder]}>
              {selectedService
                ? (selectedService.title || selectedService.service_name || selectedService.name)
                : 'Select Service'}
            </Text>
            <Icon name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>

          <Text style={styles.label}>Sub Service</Text>
          <TouchableOpacity
            style={[styles.selector, !selectedService && styles.selectorDisabled]}
            onPress={() => selectedService && setShowSubServiceModal(true)}
          >
            <Text style={[styles.selectorText, !selectedSubService && styles.selectorPlaceholder]}>
              {selectedSubService
                ? (selectedSubService.title || selectedSubService.sub_service_name || selectedSubService.name)
                : 'Select Sub Service'}
            </Text>
            <Icon name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>

          <Text style={styles.label}>Pincode</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit pincode"
            placeholderTextColor="#000"
            value={pincode}
            onChangeText={setPincode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="user-plus" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Create Driver</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderPickerModal(
        showServiceModal,
        () => setShowServiceModal(false),
        services,
        handleSelectService,
        'Select Service',
      )}

      {renderPickerModal(
        showSubServiceModal,
        () => setShowSubServiceModal(false),
        subServices,
        (item) => { setSelectedSubService(item); setShowSubServiceModal(false); },
        'Select Sub Service',
      )}
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
  content: {
    flex: 1,
    padding: 16,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  selector: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorText: {
    fontSize: 15,
    color: '#333',
  },
  selectorPlaceholder: {
    color: '#000',
  },
  submitBtn: {
    backgroundColor: '#FF1493',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f7f7',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#000',
  },
  emptyPickerText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontSize: 14,
  },
});

export default AddDriverScreen;
