// screens/mainscreens/ProfileInformationScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    PermissionsAndroid,
    Image,
    Modal,
    FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { GET_PROFILE, UPDATE_PROFILE } from '../../redux/actions/action-creator';
import LinearGradient from 'react-native-linear-gradient';

const ProfileInformationScreen = ({ navigation }) => {
    const { userData, driverProfileData } = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    useEffect(() => {
        fetchProfile();
    }, []);

    // Populate form when driverProfileData is available
    useEffect(() => {
        if (driverProfileData && driverProfileData.length > 0) {
            const profile = driverProfileData[0];
            setVehicleType(profile.vehicle_type || '');
            setVehicleMake(profile.vehicle_make || '');
            setVehicleModel(profile.vehicle_model || '');
            setVehicleYear(profile.vehicle_year ? String(profile.vehicle_year) : '');
            setVehicleColor(profile.vehicle_color || '');
            setVehicleNumber(profile.vehicle_number || '');
            setSeatCapacity(profile.seat_capacity ? String(profile.seat_capacity) : '');
            setFuelType(profile.fuel_type || '');
            setProfileImage(
                profile.driver_profile_url
                    ? profile.driver_profile_url.replace(
                        'http://localhost:3000',
                        'https://sigiride.com'
                    )
                    : null
            );
        }
    }, [driverProfileData]);

    console.log('driverProfileData', driverProfileData);

    const fetchProfile = async () => {
        await dispatch(GET_PROFILE());
    };

    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Vehicle Information (only these fields)
    const [vehicleType, setVehicleType] = useState('');
    const [vehicleMake, setVehicleMake] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleYear, setVehicleYear] = useState('');
    const [vehicleColor, setVehicleColor] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [seatCapacity, setSeatCapacity] = useState('');
    const [fuelType, setFuelType] = useState('');

    // Profile Image
    const [profileImage, setProfileImage] = useState(null);
    const [newProfileImageFile, setNewProfileImageFile] = useState(null);

    // Bottom Sheet State
    const [showVehicleTypeSheet, setShowVehicleTypeSheet] = useState(false);
    const [showFuelTypeSheet, setShowFuelTypeSheet] = useState(false);

    // Vehicle type options
    const vehicleTypes = [
        { id: '1', label: 'Car', value: 'Car', icon: 'car' },
        { id: '2', label: 'Bike', value: 'Bike', icon: 'motorcycle' },
        { id: '3', label: 'Auto', value: 'Auto', icon: 'taxi' },
        { id: '4', label: 'Traveller', value: 'Traveller', icon: 'bus' },
        { id: '5', label: 'E-rickshaw', value: 'E-rickshaw', icon: 'bolt' },
    ];

    // Fuel type options
    const fuelTypes = [
        { id: '1', label: 'Petrol', value: 'Petrol', icon: 'tint' },
        { id: '2', label: 'Diesel', value: 'Diesel', icon: 'tint' },
        { id: '3', label: 'Electric', value: 'Electric', icon: 'flash' },
        { id: '4', label: 'CNG', value: 'CNG', icon: 'leaf' },
        { id: '5', label: 'Hybrid', value: 'Hybrid', icon: 'battery' },
    ];

    const requestCameraPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    {
                        title: 'Camera Permission',
                        message: 'App needs access to your camera to take profile photo',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.log('Camera permission error:', err);
                return false;
            }
        }
        return true;
    };

const requestStoragePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  }
  return true;
};

    const showImagePickerOptions = () => {
        Alert.alert(
            'Profile Photo',
            'Choose option to update profile photo',
            [
                {
                    text: 'Take Photo',
                    onPress: () => openCamera(),
                },
                {
                    text: 'Choose from Gallery',
                    onPress: () => openGallery(),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ],
            { cancelable: true }
        );
    };

    const openCamera = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Camera permission is required to take photos');
            return;
        }

        const options = {
            mediaType: 'photo',
            includeBase64: false,
            quality: 0.8,
            saveToPhotos: true,
            maxWidth: 1024,
            maxHeight: 1024,
        };

        launchCamera(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled camera');
            } else if (response.error) {
                console.log('Camera Error: ', response.error);
                Alert.alert('Error', 'Failed to capture image');
            } else if (response.assets && response.assets[0]) {
                setNewProfileImageFile(response.assets[0]);
                setProfileImage(response.assets[0].uri);
                Alert.alert('Success', 'Profile photo selected. It will be saved when you click Save Changes.');
            }
        });
    };

    const openGallery = async () => {
        // const hasPermission = await requestStoragePermission();
        // if (!hasPermission) {
        //     Alert.alert('Permission Denied', 'Storage permission is required to access gallery');
        //     return;
        // }

        const options = {
            mediaType: 'photo',
            includeBase64: false,
            quality: 0.8,
            selectionLimit: 1,
            maxWidth: 1024,
            maxHeight: 1024,
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled gallery');
            } else if (response.error) {
                console.log('Gallery Error: ', response.error);
                Alert.alert('Error', 'Failed to select image');
            } else if (response.assets && response.assets[0]) {
                setNewProfileImageFile(response.assets[0]);
                setProfileImage(response.assets[0].uri);
                Alert.alert('Success', 'Profile photo selected. It will be saved when you click Save Changes.');
            }
        });
    };

    const handleSubmit = async () => {
        // Validation for all mandatory profile details
        if (!vehicleType.trim()) {
            Alert.alert('Error', 'Please select vehicle type');
            return;
        }
        if (!vehicleMake.trim()) {
            Alert.alert('Error', 'Please enter vehicle make');
            return;
        }
        if (!vehicleModel.trim()) {
            Alert.alert('Error', 'Please enter vehicle model');
            return;
        }
        if (!vehicleYear.trim()) {
            Alert.alert('Error', 'Please enter vehicle year');
            return;
        }
        if (!vehicleColor.trim()) {
            Alert.alert('Error', 'Please enter vehicle color');
            return;
        }
        if (!vehicleNumber.trim()) {
            Alert.alert('Error', 'Please enter vehicle number');
            return;
        }
        if (!seatCapacity.trim()) {
            Alert.alert('Error', 'Please enter seat capacity');
            return;
        }
        if (!fuelType.trim()) {
            Alert.alert('Error', 'Please select fuel type');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();

            // Add driver_id
            formData.append('driver_id', userData?.id);

            // Add vehicle information fields
            formData.append('vehicle_type', vehicleType);
            formData.append('vehicle_make', vehicleMake);
            formData.append('vehicle_model', vehicleModel);
            formData.append('vehicle_year', vehicleYear);
            formData.append('vehicle_color', vehicleColor);
            formData.append('vehicle_number', vehicleNumber);
            formData.append('seat_capacity', seatCapacity);
            formData.append('fuel_type', fuelType);

            // Add profile image if a new one was selected
            if (newProfileImageFile) {
                formData.append('driver_profile', {
                    uri: newProfileImageFile.uri,
                    type: newProfileImageFile.type || 'image/jpeg',
                    name: newProfileImageFile.fileName || `profile_${Date.now()}.jpg`,
                });
            }

            const result = await dispatch(UPDATE_PROFILE(formData));

            console.log('Profile update response:', result);

            if (result.status) {
                // Refresh profile data after successful update
                await dispatch(GET_PROFILE());

                Alert.alert(
                    'Success',
                    'Profile updated successfully!',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Error', result.message || 'Failed to update profile');
            }
        } catch (error) {
            console.log('Submit error:', error);
            Alert.alert('Error', error?.response?.data?.message || 'An error occurred while updating profile');
        } finally {
            setLoading(false);
        }
    };

    const renderInputField = (label, value, onChangeText, placeholder, keyboardType = 'default', required = false) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
                {label} {required && <Text style={styles.requiredStar}>*</Text>}
            </Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                keyboardType={keyboardType}
                placeholderTextColor="#000"
            />
        </View>
    );

    const renderPickerField = (label, value, onPress, required = false) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
                {label} {required && <Text style={styles.requiredStar}>*</Text>}
            </Text>
            <TouchableOpacity style={styles.pickerButton} onPress={onPress}>
                <Text style={[styles.pickerText, !value && styles.placeholderText]}>
                    {value || `Select ${label}`}
                </Text>
                <Icon name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
        </View>
    );

    // Bottom Sheet Component
    const renderBottomSheet = (visible, onClose, title, options, selectedValue, onSelect) => (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalBackground} onPress={onClose} />
                <View style={styles.bottomSheet}>
                    <View style={styles.bottomSheetHeader}>
                        <Text style={styles.bottomSheetTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Feather name="x" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bottomSheetIndicator} />

                    <FlatList
                        data={options}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.bottomSheetItem,
                                    selectedValue === item.value && styles.bottomSheetItemSelected
                                ]}
                                onPress={() => {
                                    onSelect(item.value);
                                    onClose();
                                }}
                            >
                                <View style={styles.bottomSheetItemLeft}>
                                    <Icon
                                        name={item.icon}
                                        size={22}
                                        color={selectedValue === item.value ? '#FF1493' : '#666'}
                                    />
                                    <Text
                                        style={[
                                            styles.bottomSheetItemText,
                                            selectedValue === item.value && styles.bottomSheetItemTextSelected
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </View>
                                {selectedValue === item.value && (
                                    <Icon name="check" size={20} color="#FF1493" />
                                )}
                            </TouchableOpacity>
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </View>
        </Modal>
    );
const BackHeader = ({ title, navigation }) => {
  return (
   <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topHeader}
      >
      <TouchableOpacity 
        style={styles.backBtn} 
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={22} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.topHeaderTitle}>{title}</Text>

      {/* Right side empty space for perfect center alignment */}
      <View style={{ width: 30 }} />
    </LinearGradient>
  );
};

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Profile Image Section */}
            <BackHeader title="Profile" navigation={navigation} />
            <View style={styles.profileImageSection}>
                <TouchableOpacity onPress={showImagePickerOptions} disabled={loading}>
                    <View style={styles.profileImageContainer}>
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={styles.profileImagePlaceholder}>
                                <Icon name="user" size={50} color="#FF1493" />
                            </View>
                        )}
                        <View style={styles.editImageIcon}>
                            <Icon name="camera" size={18} color="#fff" />
                        </View>
                    </View>
                </TouchableOpacity>
                <Text style={styles.changePhotoText}>Tap to change profile photo</Text>
                {newProfileImageFile && (
                    <Text style={styles.pendingText}>New photo will be saved with profile</Text>
                )}
            </View>

            {/* Vehicle Information Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vehicle Information</Text>
                <View style={styles.sectionContent}>
                    {renderPickerField('Vehicle Type', vehicleType, () => setShowVehicleTypeSheet(true), true)}
                    {renderInputField('Vehicle Make', vehicleMake, setVehicleMake, 'e.g., Maruti, Hyundai, Honda', 'default', true)}
                    {renderInputField('Vehicle Model', vehicleModel, setVehicleModel, 'e.g., Swift, i10, City', 'default', true)}
                    {renderInputField('Vehicle Year', vehicleYear, setVehicleYear, 'e.g., 2022', 'numeric', true)}
                    {renderInputField('Vehicle Color', vehicleColor, setVehicleColor, 'e.g., White, Black, Red', 'default', true)}
                    {renderInputField('Vehicle Number', vehicleNumber, setVehicleNumber, 'e.g., MP07AB1234', 'default', true)}
                    {renderInputField('Seat Capacity', seatCapacity, setSeatCapacity, 'Number of seats', 'numeric', true)}
                    {renderPickerField('Fuel Type', fuelType, () => setShowFuelTypeSheet(true), true)}
                </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <>
                        <Icon name="save" size={20} color="#fff" />
                        <Text style={styles.submitButtonText}>Save Changes</Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={styles.footer} />

            {/* Bottom Sheets */}
            {renderBottomSheet(
                showVehicleTypeSheet,
                () => setShowVehicleTypeSheet(false),
                'Select Vehicle Type',
                vehicleTypes,
                vehicleType,
                setVehicleType
            )}

            {renderBottomSheet(
                showFuelTypeSheet,
                () => setShowFuelTypeSheet(false),
                'Select Fuel Type',
                fuelTypes,
                fuelType,
                setFuelType
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    profileImageSection: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    profileImageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#FF1493',
    },
    profileImagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF0F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FF1493',
    },
    imageUploadOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 60,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editImageIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FF1493',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    changePhotoText: {
        fontSize: 12,
        color: '#FF1493',
        marginTop: 12,
    },
    pendingText: {
        fontSize: 11,
        color: '#FF9800',
        marginTop: 8,
    },
    section: {
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#999',
        marginLeft: 16,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    sectionContent: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    inputGroup: {
        marginVertical: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    requiredStar: {
        color: '#FF1493',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#333',
        backgroundColor: '#fff',
    },
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    pickerText: {
        fontSize: 14,
        color: '#333',
    },
    placeholderText: {
        color: '#000',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF1493',
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 16,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#FF1493',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    footer: {
        height: 30,
    },
    // Bottom Sheet Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    bottomSheetIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 10,
    },
    bottomSheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    bottomSheetItemSelected: {
        backgroundColor: '#FFF0F6',
    },
    bottomSheetItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    bottomSheetItemText: {
        fontSize: 16,
        color: '#333',
    },
    bottomSheetItemTextSelected: {
        color: '#FF1493',
        fontWeight: '600',
    },
    topHeader: {
  height: 60,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 4,
  borderBottomLeftRadius: 40,
  borderBottomRightRadius: 40,
},

topHeaderTitle: {
  fontSize: 20,
  fontWeight: '600',
  color: '#ffffff',
},

backBtn: {
  position: 'absolute',
  left: 16,
},
});

export default ProfileInformationScreen;
