import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
    Animated,
    StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SEND_OTP, VERIFY_OTP, SEND_BA_OTP, VERIFY_BA_LOGIN } from '../../redux/actions/action-creator';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');
const responsiveFontSize = (size) => Math.round((size * width) / 375);

const LoginScreen = ({ navigation }) => {
    const [step, setStep] = useState(1);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [otp2, setOtp2] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [userType, setUserType] = useState('driver'); // 'driver' or 'business'

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const dispatch = useDispatch();
    const [isLoading, setLoading] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);

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

    const validatePhoneNumber = () => {
        // if (!phoneNumber.trim()) {
        //     Alert.alert('Required', 'Please enter your mobile number');
        //     return false;
        // }

        // const phoneRegex = /^[0-9]{10}$/;
        // if (!phoneRegex.test(phoneNumber.replace(/[^0-9]/g, ''))) {
        //     Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number');
        //     return false;
        // }
        return true;
    };

    const handleSendOTP = async () => {
        if (!validatePhoneNumber()) return;

        try {
            let response;
            if (userType === 'driver') {
                response = await dispatch(SEND_OTP(phoneNumber));
            } else {
                response = await dispatch(SEND_BA_OTP(phoneNumber));
            }

            console.log('OTP Response:', response);
            setOtp2(response.otpnumber)

            if (response.message === 'OTP sent') {
                setStep(2);
                Alert.alert('Success', `OTP sent successfully to your mobile number ${response.otpnumber}`);
            } else {
                Alert.alert('Error', response?.message || 'Failed to send OTP');
            }
        } catch (err) {
            console.log('Send OTP error:', err);
            Alert.alert('Error', err.message || 'Failed to send OTP');
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp || otp.length < 4) {
            Alert.alert('Invalid OTP', 'Please enter the 6-digit verification code');
            return;
        }

        try {
            let response;
            if (userType === 'driver') {
                response = await dispatch(VERIFY_OTP(phoneNumber, otp));
            } else {
                response = await dispatch(VERIFY_BA_LOGIN({
                    ba_mobile: phoneNumber,
                    otp: otp
                }));
            }

            console.log('Verify Response:', response);

            if (response.message === 'Login successful' || response.message === 'Driver login successful') {
                Alert.alert('Success', 'Login successful!');
                // navigation.replace('Main');
            } else {
                console.log(response);
                
                Alert.alert('Error', response?.message || 'Invalid OTP');
            }
        } catch (err) {
            console.log('Verify OTP error:', err);
            Alert.alert('Error', err.message || 'OTP verification failed');
        }
    };

    const formatPhoneNumber = (text) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length <= 12) return cleaned;
        return cleaned.slice(0, 12);
    };

    const renderUserTypeSelector = () => (
        <View style={styles.userTypeContainer}>
            <TouchableOpacity
                style={[
                    styles.userTypeButton,
                    userType === 'driver' && styles.userTypeButtonActive
                ]}
                onPress={() => setUserType('driver')}
            >
                <Icon
                    name="user"
                    size={20}
                    color={userType === 'driver' ? '#fff' : '#FF1493'}
                />
                <Text
                    style={[
                        styles.userTypeText,
                        userType === 'driver' && styles.userTypeTextActive
                    ]}
                >
                    Captain
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.userTypeButton,
                    userType === 'business' && styles.userTypeButtonActive
                ]}
                onPress={() => setUserType('business')}
            >
                <Icon
                    name="briefcase"
                    size={20}
                    color={userType === 'business' ? '#fff' : '#FF1493'}
                />
                <Text
                    style={[
                        styles.userTypeText,
                        userType === 'business' && styles.userTypeTextActive
                    ]}
                >
                    Business Associate
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <LinearGradient
            colors={['#FF1493', '#FFFFFF', '#FFFFFF']}
            start={{ x: 1.9, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            }
                        ]}
                    >
                        {/* Header Section */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                            >
                                <Icon name="arrow-left" size={24} color="#FF1493" />
                            </TouchableOpacity>
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
                            <Text style={styles.title}>Sign In</Text>
                            <Text style={styles.subtitle}>
                                {step === 1
                                    ? 'Enter your mobile number to continue'
                                    : 'Enter the verification code'}
                            </Text>
                        </View>

                        {/* User Type Selector - Only show on step 1 */}
                        {step === 1 && renderUserTypeSelector()}

                        {/* Form Card */}
                        <View style={styles.card}>
                            {step === 1 ? (
                                <>
                                    <View style={styles.inputWrapper}>
                                        <View style={styles.countryCode}>
                                            <Text style={styles.countryCodeText}>+91</Text>
                                            <Icon name="chevron-down" size={16} color="#FF1493" />
                                        </View>
                                        <View style={styles.dividerVertical} />
                                        <Icon
                                            name="smartphone"
                                            size={20}
                                            color="#FF1493"
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Mobile Number"
                                            placeholderTextColor="#000"
                                            value={phoneNumber}
                                            onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.button, (isLoading || isSendingOtp) && styles.buttonDisabled]}
                                        onPress={handleSendOTP}
                                        disabled={isLoading || isSendingOtp}
                                        activeOpacity={0.8}
                                    >
                                        {(isLoading || isSendingOtp) ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.buttonText}>Send OTP</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.rememberMeContainer}
                                        onPress={() => setRememberMe(!rememberMe)}
                                    >
                                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                            {rememberMe && <Icon name="check" size={12} color="#fff" />}
                                        </View>
                                        <Text style={styles.rememberMeText}>Remember Me</Text>
                                    </TouchableOpacity>

                                    <View style={styles.signupContainer}>
                                        <Text style={styles.accountText}>Don't Have An Account? </Text>
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('Signup')}
                                        >
                                            <Text style={styles.signupLink}>Sign Up</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.otpLabel}>Verification Code</Text>
                                    <Text style={styles.codeHint}>
                                        We've sent a 6-digit code to
                                    </Text>
                                    <Text style={styles.codeHint}>
                                            OTP is {otp2}
                                    </Text>
                                    <Text style={styles.phoneDisplay}>+91 {phoneNumber}</Text>

                                    <View style={styles.otpContainer}>
                                        <TextInput
                                            style={styles.otpInput}
                                            placeholder="000000"
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

                                    <TouchableOpacity
                                        style={[styles.button, (isLoading || isVerifyingOtp) && styles.buttonDisabled]}
                                        onPress={handleVerifyOTP}
                                        disabled={isLoading || isVerifyingOtp}
                                        activeOpacity={0.8}
                                    >
                                        {(isLoading || isVerifyingOtp) ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.buttonText}>Verify & Login</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setStep(1);
                                            setOtp('');
                                        }}
                                        style={styles.changeButton}
                                    >
                                        <Icon name="arrow-left" size={16} color="#FF1493" />
                                        <Text style={[styles.changeText, { color: '#FF1493' }]}>Change Mobile Number</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleSendOTP}
                                        style={styles.resendButton}
                                        disabled={isLoading || isSendingOtp}
                                    >
                                        <Text style={styles.resendText}>Didn't receive code? Resend</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* Footer */}
                        {step === 1 && (
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    By continuing, you agree to our
                                    <Text style={[styles.linkText, { color: '#FF1493' }]}> Terms of Service</Text> and
                                    <Text style={[styles.linkText, { color: '#FF1493' }]}> Privacy Policy</Text>
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: 8,
        zIndex: 1,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FF1493',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    userTypeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    userTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#FF1493',
        backgroundColor: '#FFF9FB',
    },
    userTypeButtonActive: {
        backgroundColor: '#FF1493',
        borderColor: '#FF1493',
    },
    userTypeText: {
        fontSize: responsiveFontSize(10),
        fontWeight: '600',
        color: '#FF1493',
    },
    userTypeTextActive: {
        color: '#fff',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFE0E7',
        borderRadius: 16,
        backgroundColor: '#FFF9FB',
        marginBottom: 20,
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
        paddingVertical: 16,
        fontSize: 16,
        color: '#1A2B4E',
    },
    button: {
        backgroundColor: '#FF1493',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#FF1493',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#FF1493',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#FF1493',
    },
    rememberMeText: {
        fontSize: 14,
        color: '#666',
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    accountText: {
        fontSize: 14,
        color: '#666',
    },
    signupLink: {
        fontSize: responsiveFontSize(20),
        fontWeight: '600',
        color: '#FF1493',
    },
    otpLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A2B4E',
        marginBottom: 16,
        textAlign: 'center',
    },
    codeHint: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        marginBottom: 4,
    },
    phoneDisplay: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF1493',
        textAlign: 'center',
        marginBottom: 24,
    },
    otpContainer: {
        alignItems: 'center',
        marginBottom: 28,
    },
    otpInput: {
        fontSize: 28,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 4,
        borderWidth: 1.5,
        borderColor: '#FFE0E7',
        borderRadius: 16,
        paddingVertical: 16,
        backgroundColor: '#FFF9FB',
        width: '100%',
    },
    changeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    changeText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
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
    footer: {
        marginTop: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
    },
    linkText: {
        fontWeight: '500',
    },
});

export default LoginScreen;