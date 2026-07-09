import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
    Animated,
    StatusBar,
    Modal,
    FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { driverSignUp, All_Services, GET_SUB_SERVICES, SEND_BA_OTP, VERIFY_BA_OTP, SEND_OTP, VERIFY_DRIVER_OTP } from '../../redux/actions/action-creator';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const SignupScreen = ({ navigation }) => {
    const [userRole, setUserRole] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [otpStep, setOtpStep] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpNumber, setOtpNumber] = useState('');

    // Common fields for both roles
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [agreed, setAgreed] = useState(false);

    // Driver specific fields
    const [pinCode, setPinCode] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [subService, setSubService] = useState('');
    const [serviceId, setServiceId] = useState(null);
    const [subServiceId, setSubServiceId] = useState(null);

    // Business Associate specific fields
    const [selectedServices, setSelectedServices] = useState([]);

    // Local loading states
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showSubServiceModal, setShowSubServiceModal] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const dispatch = useDispatch();
    const { allServices, subServices } = useSelector((state) => state.common);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            await dispatch(All_Services());
        } catch (error) {
            console.log('Error fetching services:', error);
        }
    };

    const serviceTypes = allServices;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const validatePhone = (phone) => {
        const phoneRegex = /^[0-9]{10}$/;
        return phoneRegex.test(phone.replace(/[^0-9]/g, ''));
    };

    const validatePinCode = (pincode) => {
        const pincodeRegex = /^[0-9]{6}$/;
        return pincodeRegex.test(pincode);
    };

    const formatPhoneNumber = (text) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length <= 10) return cleaned;
        return cleaned.slice(0, 10);
    };

    const formatPinCode = (text) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length <= 6) return cleaned;
        return cleaned.slice(0, 6);
    };

    const toggleServiceSelection = (service) => {
        const isSelected = selectedServices.some(s => s.service_id === service.id);
        if (isSelected) {
            setSelectedServices(selectedServices.filter(s => s.service_id !== service.id));
        } else {
            setSelectedServices([...selectedServices, { service_id: service.id }]);
        }
    };

    const validateCommonFields = () => {
        if (!fullName || !phone) {
            Alert.alert('Error', 'Please fill all required fields');
            return false;
        }

        if (fullName.length < 2) {
            Alert.alert('Error', 'Please enter a valid full name');
            return false;
        }

        if (!validatePhone(phone)) {
            Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
            return false;
        }

        if (!agreed) {
            Alert.alert('Error', 'Please agree to the terms and conditions');
            return false;
        }

        return true;
    };

    const validateDriverFields = () => {
        if (!pinCode) {
            Alert.alert('Error', 'Please enter PIN code');
            return false;
        }

        if (!validatePinCode(pinCode)) {
            Alert.alert('Error', 'Please enter a valid 6-digit PIN code');
            return false;
        }

        if (!serviceType) {
            Alert.alert('Error', 'Please select a service type');
            return false;
        }

        if (!subService) {
            Alert.alert('Error', 'Please select a sub-service');
            return false;
        }

        return true;
    };

    const validateBusinessFields = () => {
        if (selectedServices.length === 0) {
            Alert.alert('Error', 'Please select at least one service');
            return false;
        }
        return true;
    };

    const handleRoleSelect = (role) => {
        setUserRole(role);
        setCurrentStep(2);
    };

    // Driver OTP Send
    const handleDriverSendOTP = async () => {
        if (!validateCommonFields()) return;
        if (!validateDriverFields()) return;

        setIsSendingOtp(true);
        try {
            const response = await dispatch(SEND_OTP(phone));
            console.log('Driver Send OTP Response:', response);

            if (response.message === 'OTP sent') {
                setOtpNumber(response.otpnumber || '');
                setOtpStep(true);
                Alert.alert('Success', 'OTP sent successfully to your mobile number');
            } else {
                Alert.alert('Error', response?.message || 'Failed to send OTP');
            }
        } catch (error) {
            console.log('Send OTP error:', error);
            Alert.alert('Error', error.message || 'Failed to send OTP');
        } finally {
            setIsSendingOtp(false);
        }
    };

    // Driver Verify OTP & Register
    const handleDriverVerifyOTP = async () => {
        if (!otp || otp.length < 4) {
            Alert.alert('Error', 'Please enter valid OTP');
            return;
        }

        setIsVerifyingOtp(true);
        try {
            const driverData = {
                mobile: parseInt(phone),
                full_name: fullName,
                service_id: serviceId,
                otp: parseInt(otp),
                sub_service_id: subServiceId,
                pincode: pinCode,
            };

            console.log('Driver Register Data:', driverData);
            const response = await dispatch(VERIFY_DRIVER_OTP(driverData));
            console.log('Driver Register Response:', response);

            if (response.message === 'Driver login/register successful') {
                Alert.alert(
                    'Success',
                    'Registration successful'
                );
            } else {
                Alert.alert('Error', response?.message || 'Registration failed');
            }
        } catch (error) {
            console.log('Verify OTP error:', error);
            Alert.alert('Error', error.message || 'OTP verification failed');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // Business Associate OTP Send
    const handleBusinessSendOTP = async () => {
        if (!validateCommonFields()) return;
        if (!validateBusinessFields()) return;

        setIsSendingOtp(true);
        try {
            const response = await dispatch(SEND_BA_OTP(parseInt(phone)));
            console.log('Business Send OTP Response:', response);

            if (response.message === 'OTP sent') {
                setOtpNumber(response.otpnumber || '');
                setOtpStep(true);
                Alert.alert('Success', 'OTP sent successfully to your mobile number');
            } else {
                Alert.alert('Error', response?.message || 'Failed to send OTP');
            }
        } catch (error) {
            console.log('Send OTP error:', error);
            Alert.alert('Error', error.message || 'Failed to send OTP');
        } finally {
            setIsSendingOtp(false);
        }
    };

    // Business Associate Verify OTP & Register
    const handleBusinessVerifyOTP = async () => {
        if (!otp || otp.length < 4) {
            Alert.alert('Error', 'Please enter valid OTP');
            return;
        }

        setIsVerifyingOtp(true);
        try {
            const businessData = {
                ba_mobile: parseInt(phone),
                otp: parseInt(otp),
                ba_name: fullName,
                services: selectedServices,
            };

            console.log('Business Register Data:', businessData);
            const response = await dispatch(VERIFY_BA_OTP(businessData));
            console.log('Business Register Response:', response);

            if (response.message === 'Login/Register successful') {
                Alert.alert(
                    'Success',
                    'Registration successful! Please login to continue.'
                );
            } else {
                Alert.alert('Error', response?.message || 'Invalid OTP');
            }
        } catch (error) {
            console.log('Verify OTP error:', error);
            Alert.alert('Error', error.message || 'OTP verification failed');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleNext = () => {
        if (userRole === 'driver') {
            if (!validateCommonFields()) return;
            if (!validateDriverFields()) return;
            handleDriverSendOTP();
        } else if (userRole === 'business') {
            if (!validateCommonFields()) return;
            if (!validateBusinessFields()) return;
            handleBusinessSendOTP();
        }
    };

    const handleBack = () => {
        if (otpStep) {
            setOtpStep(false);
            setOtp('');
        } else if (currentStep === 2) {
            setUserRole(null);
            setCurrentStep(1);
            // Reset driver fields
            setPinCode('');
            setServiceType('');
            setSubService('');
            setServiceId(null);
            setSubServiceId(null);
            // Reset business fields
            setSelectedServices([]);
        } else if (currentStep === 3) {
            setCurrentStep(2);
        }
    };

    const handleVerifyOTP = () => {
        if (userRole === 'driver') {
            handleDriverVerifyOTP();
        } else {
            handleBusinessVerifyOTP();
        }
    };

    const renderRoleSelection = () => (
        <>
            <Text style={styles.sectionTitle}>Select Account Type</Text>
            <View style={styles.roleContainer}>
                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => handleRoleSelect('driver')}
                    activeOpacity={0.8}
                >
                    <View style={styles.roleIconContainer}>
                        <Icon name="user" size={40} color="#FF1493" />
                    </View>
                    <Text style={styles.roleTitle}>Captain Partner</Text>
                    <Text style={styles.roleDescription}>
                        Join as a driver and start earning by providing transportation services
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => handleRoleSelect('business')}
                    activeOpacity={0.8}
                >
                    <View style={styles.roleIconContainer}>
                        <Icon name="briefcase" size={40} color="#FF1493" />
                    </View>
                    <Text style={styles.roleTitle}>Business Associate</Text>
                    <Text style={styles.roleDescription}>
                        Partner with us as a business and offer multiple services
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );

    const renderCommonFields = () => (
        <>
            <Text style={styles.sectionTitle}>Account Information</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                    <Icon name="user" size={20} color="#FF1493" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        placeholderTextColor="#000"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                    <View style={styles.countryCode}>
                        <Text style={styles.countryCodeText}>+91</Text>
                        <Icon name="chevron-down" size={16} color="#FF1493" />
                    </View>
                    <View style={styles.dividerVertical} />
                    <Icon name="smartphone" size={20} color="#FF1493" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter mobile number"
                        placeholderTextColor="#000"
                        value={phone}
                        onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                        keyboardType="phone-pad"
                        maxLength={10}
                    />
                </View>
            </View>
        </>
    );

    const renderDriverFields = () => (
        <>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Vehicle & Location Details</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>PIN Code <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                    <Icon name="map-pin" size={20} color="#FF1493" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit PIN code"
                        placeholderTextColor="#000"
                        value={pinCode}
                        onChangeText={(text) => setPinCode(formatPinCode(text))}
                        keyboardType="numeric"
                        maxLength={6}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Type <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity
                    style={styles.inputWrapper}
                    onPress={() => setShowServiceModal(true)}
                >
                    <Icon name="grid" size={20} color="#FF1493" style={styles.inputIcon} />
                    <Text style={[styles.input, serviceType ? styles.inputText : styles.placeholderText]}>
                        {serviceType || 'Select service type'}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Sub Service <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity
                    style={styles.inputWrapper}
                    onPress={() => {
                        if (serviceType) {
                            setShowSubServiceModal(true);
                        } else {
                            Alert.alert('Error', 'Please select service type first');
                        }
                    }}
                >
                    <Icon name="layers" size={20} color="#FF1493" style={styles.inputIcon} />
                    <Text style={[styles.input, subService ? styles.inputText : styles.placeholderText]}>
                        {subService || 'Select sub service'}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
            </View>
        </>
    );

    const renderBusinessFields = () => (
        <>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Select Services</Text>
            <Text style={styles.hintText}>You can select multiple services</Text>
            <View style={styles.servicesContainer}>
                {serviceTypes?.map((service) => (
                    <TouchableOpacity
                        key={service.id}
                        style={[
                            styles.serviceChip,
                            selectedServices.some(s => s.service_id === service.id) && styles.serviceChipSelected
                        ]}
                        onPress={() => toggleServiceSelection(service)}
                    >
                        <Text
                            style={[
                                styles.serviceChipText,
                                selectedServices.some(s => s.service_id === service.id) && styles.serviceChipTextSelected
                            ]}
                        >
                            {service.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </>
    );

    const renderOTPScreen = () => (
        <>
            <Text style={styles.sectionTitle}>Verify Mobile Number</Text>
            <Text style={styles.otpDescription}>
                We've sent a 6-digit verification code to
            </Text>
            <Text style={styles.phoneDisplay}>+91 {phone}</Text>
            {otpNumber ? (
                <Text style={{...styles.otpDescription,fontSize:22}}>OTP is {otpNumber}</Text>
            ) : null}

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Enter OTP <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                    <Icon name="key" size={20} color="#FF1493" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#000"
                        value={otp}
                        onChangeText={(text) => {
                            const cleaned = text.replace(/[^0-9]/g, '');
                            setOtp(cleaned.slice(0, 6));
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                    />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.button, styles.submitButton, (isSendingOtp || isVerifyingOtp) && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isSendingOtp || isVerifyingOtp}
                activeOpacity={0.8}
            >
                {(isSendingOtp || isVerifyingOtp) ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.buttonText}>Verify & Register</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={userRole === 'driver' ? handleDriverSendOTP : handleBusinessSendOTP}
                style={styles.resendButton}
                disabled={isSendingOtp}
            >
                <Text style={styles.resendText}>Didn't receive code? Resend OTP</Text>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.button, styles.backButton]}
                    onPress={handleBack}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    const renderTermsAndButtons = () => (
        <>
            <TouchableOpacity
                style={styles.termsContainer}
                onPress={() => setAgreed(!agreed)}
            >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                    {agreed && <Icon name="check" size={12} color="#fff" />}
                </View>
                <Text style={styles.termsText}>
                    I agree to the
                    <Text style={styles.linkText}> Terms of Service</Text> and
                    <Text style={styles.linkText}> Privacy Policy</Text>
                </Text>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.button, styles.backButton]}
                    onPress={handleBack}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.nextButton]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>Continue →</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <LinearGradient
            colors={['#FF1493', '#FFFFFF', '#FFFFFF']}
            start={{ x: 1.9, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.container}>
                <View style={styles.fixedHeader}>
                    {/* <TouchableOpacity
                        style={styles.backButtonHeader}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Icon name="arrow-left" size={24} color="#FF1493" />
                    </TouchableOpacity> */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/logo.jpg')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join our platform</Text>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        bounces={false}
                    >
                        <Animated.View
                            style={[
                                styles.formContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                }
                            ]}
                        >
                            <View style={styles.card}>
                                {currentStep === 1 && renderRoleSelection()}
                                {!otpStep && currentStep === 2 && userRole === 'driver' && (
                                    <>
                                        {renderCommonFields()}
                                        {renderDriverFields()}
                                        {renderTermsAndButtons()}
                                    </>
                                )}
                                {!otpStep && currentStep === 2 && userRole === 'business' && (
                                    <>
                                        {renderCommonFields()}
                                        {renderBusinessFields()}
                                        {renderTermsAndButtons()}
                                    </>
                                )}
                                {otpStep && renderOTPScreen()}
                            </View>

                            {currentStep === 1 && (
                                <View style={styles.loginContainer}>
                                    <Text style={styles.accountText}>Already have an account? </Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                        <Text style={styles.loginLink}>Login</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            {/* Modals */}
            <Modal
                visible={showServiceModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowServiceModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Service Type</Text>
                            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                                <Icon name="x" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={serviceTypes}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const imageUrl = item.image || item.banner || 'https://via.placeholder.com/60';
                                console.log('Service Item:', item); 
                                return (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={async () => {
                                            setServiceType(item.title);
                                            setServiceId(item.id);
                                            setSubService('');
                                            setSubServiceId(null);
                                            setShowServiceModal(false);
                                            await dispatch(GET_SUB_SERVICES(item.id));
                                        }}
                                    >
                                        <Image
                                            source={{ uri: `https://sigiride.com/uploads/services/${imageUrl}` }}
                                            style={styles.serviceImage}
                                            resizeMode="contain"
                                        />
                                        <View style={styles.modalItemContent}>
                                            <Text style={styles.modalItemText}>{item.title}</Text>
                                            {/* <Text style={styles.modalItemDesc}>
                                                {item.description !== 'NA' ? item.description : ''}
                                            </Text> */}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showSubServiceModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSubServiceModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Sub Service</Text>
                            <TouchableOpacity onPress={() => setShowSubServiceModal(false)}>
                                <Icon name="x" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={subServices}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const imageUrl = item.image || item.logo || 'https://via.placeholder.com/60';
                                return (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={() => {
                                            setSubService(item.title);
                                            setSubServiceId(item.id);
                                            setShowSubServiceModal(false);
                                        }}
                                    >
                                        <Image
                                            source={{ uri: `https://sigiride.com/uploads/subservice/${imageUrl}` }}
                                            style={styles.serviceImage}
                                            resizeMode="contain"
                                        />
                                        <View>
                                            <Text style={styles.modalItemText}>{item.title}</Text>
                                            {/* <Text style={styles.modalItemDesc}>
                                                {item.description ?? ''}
                                            </Text> */}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    fixedHeader: {
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 16,
        backgroundColor: 'transparent',
        position: 'relative',
    },
    backButtonHeader: {
        position: 'absolute',
        left: 20,
        top: Platform.OS === 'ios' ? 50 : 40,
        zIndex: 1,
        padding: 8,
    },
    logoContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    logo: {
        width: 55,
        height: 55,
        borderRadius: 27,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FF1493',
        marginBottom: 2,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    formContainer: {
        flex: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
    },
    roleContainer: {
        gap: 16,
    },
    roleCard: {
        borderWidth: 1,
        borderColor: '#FFE0E7',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#FFF9FB',
    },
    roleIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFE0E7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    roleTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    roleDescription: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    required: {
        color: '#FF1493',
    },
    hintText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 8,
    },
    otpDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
    },
    phoneDisplay: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FF1493',
        textAlign: 'center',
        marginBottom: 24,
    },
    resendButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    resendText: {
        color: '#FF1493',
        fontSize: 14,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFE0E7',
        borderRadius: 12,
        backgroundColor: '#FFF9FB',
        paddingHorizontal: 16,
    },
    countryCode: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
        gap: 4,
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A2B4E',
    },
    dividerVertical: {
        width: 1,
        height: 24,
        backgroundColor: '#FFE0E7',
        marginRight: 12,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1A2B4E',
    },
    inputText: {
        color: '#1A2B4E',
    },
    placeholderText: {
        color: '#000',
    },
    servicesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
    },
    serviceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#FF1493',
        backgroundColor: '#FFF9FB',
    },
    serviceChipSelected: {
        backgroundColor: '#FF1493',
        borderColor: '#FF1493',
    },
    serviceChipText: {
        fontSize: 14,
        color: '#FF1493',
        fontWeight: '500',
    },
    serviceChipTextSelected: {
        color: '#fff',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#FF1493',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#FF1493',
    },
    termsText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    linkText: {
        color: '#FF1493',
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        flex: 1,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    backButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#FF1493',
    },
    backButtonText: {
        color: '#FF1493',
        fontSize: 16,
        fontWeight: '700',
    },
    nextButton: {
        backgroundColor: '#FF1493',
    },
    submitButton: {
        backgroundColor: '#FF1493',
        flex: 2,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    accountText: {
        fontSize: 20,
        color: '#666',
    },
    loginLink: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FF1493',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.7,
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        gap: 12,
    },
    modalItemContent: {
        flex: 1,
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    modalItemDesc: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    serviceImage: {
        width: 50,
        height: 50,
        borderRadius: 10,
        marginRight: 12,
        backgroundColor: '#fff',
    },
});

export default SignupScreen;