import React, { useEffect, useState } from 'react';
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
import Icon from 'react-native-vector-icons/Feather';
import Feather from 'react-native-vector-icons/Feather';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import { GET_BA_PROFILE, UPDATE_BA_PROFILE } from '../../redux/actions/action-creator';

const BA_PROFILE_PIC_BASE_URL = 'https://sigiride.com/uploads/baprofile/';

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
      <View style={{ width: 30 }} />
    </LinearGradient>
  );
};

const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;

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
    return false;
  }
};

const requestStoragePermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    return false;
  }
};

const BAProfileInformationScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  const { userData } = useSelector((state) => state.auth);
  const { baProfile } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [newProfileImageFile, setNewProfileImageFile] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  const [baName, setBaName] = useState('');
  const [baMobile, setBaMobile] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    dispatch(GET_BA_PROFILE());
  }, [dispatch]);

  useEffect(() => {
    const data = baProfile?.data;
    if (!data) return;

    setBaName(data.ba_name || '');
    setBaMobile(data.ba_mobile || '');
    setCompanyName(data.company_name || '');

    if (data.profile_pic) {
      setProfileImage(`${BA_PROFILE_PIC_BASE_URL}${data.profile_pic}`);
    } else {
      setProfileImage(null);
    }
  }, [baProfile]);

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
      Alert.alert('Permission Denied', 'Camera permission is required');
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
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', 'Failed to capture image');
        return;
      }

      if (response.assets && response.assets[0]) {
        setNewProfileImageFile(response.assets[0]);
        setProfileImage(response.assets[0].uri);
        Alert.alert(
          'Success',
          'Profile photo selected. It will be saved with profile.'
        );
      }
    });
  };

  const openGallery = async () => {
    // const hasPermission = await requestStoragePermission();
    // if (!hasPermission) {
    //   Alert.alert('Permission Denied', 'Storage permission is required');
    //   return;
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
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', 'Failed to select image');
        return;
      }

      if (response.assets && response.assets[0]) {
        setNewProfileImageFile(response.assets[0]);
        setProfileImage(response.assets[0].uri);
        Alert.alert(
          'Success',
          'Profile photo selected. It will be saved with profile.'
        );
      }
    });
  };

  const handleSubmit = async () => {
    if (!baName.trim()) {
      Alert.alert('Error', 'Please enter BA name');
      return;
    }
    if (!baMobile.trim()) {
      Alert.alert('Error', 'Please enter BA mobile');
      return;
    }
    if (!companyName.trim()) {
      Alert.alert('Error', 'Please enter company name');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      if (userData?.id) {
        formData.append('id', String(userData.id));
      }

      formData.append('ba_name', baName);
      formData.append('ba_mobile', baMobile);
      formData.append('company_name', companyName);

      // If backend expects file under key `profile_pic`
      if (newProfileImageFile) {
        formData.append('profile_pic', {
          uri: newProfileImageFile.uri,
          type: newProfileImageFile.type || 'image/jpeg',
          name:
            newProfileImageFile.fileName || `baprofile_${Date.now()}.jpg`,
        });
      }

      const result = await dispatch(UPDATE_BA_PROFILE(formData));
console.log('Update BA Profile Result:', result);
      if (result?.status) {
        await dispatch(GET_BA_PROFILE());
        Alert.alert('Success', 'BA profile updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', result?.message || 'Failed to update BA profile');
      }
    } catch (error) {
        console.log('Update BA Profile Result:', error);
      Alert.alert('Error', error?.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <BackHeader title="BA Profile" navigation={navigation} />

      <View style={styles.profileImageSection}>
        <TouchableOpacity onPress={showImagePickerOptions} disabled={loading}>
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
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
        {newProfileImageFile ? (
          <Text style={styles.pendingText}>New photo will be saved</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Associate Information</Text>
        <View style={styles.sectionContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>BA Name *</Text>
            <TextInput
              style={styles.input}
              value={baName}
              onChangeText={setBaName}
              placeholder="Enter BA name"
              placeholderTextColor="#000"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>BA Mobile *</Text>
            <TextInput
              style={styles.input}
              value={baMobile}
              onChangeText={setBaMobile}
              placeholder="Enter BA mobile"
              placeholderTextColor="#000"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company Name *</Text>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Enter company name"
              placeholderTextColor="#000"
            />
          </View>
        </View>
      </View>

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
    marginVertical: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
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

export default BAProfileInformationScreen;

