// screens/mainscreens/SettingsScreen.js

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { LOGOUT_SUCCESS } from '../../redux/actions/action-types';
import LinearGradient from 'react-native-linear-gradient';
import { fetchPagesByRole } from '../../services/Services';

const SimpleHeader = ({ title }) => {
    return (
        <LinearGradient
            colors={['#ff7f50', '#ff7f50', '#e20f7a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
        >
            <Text style={styles.headerTitle}>{title}</Text>
        </LinearGradient>
    );
};

const SettingsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { userData } = useSelector((state) => state.auth);
    const [pages, setPages] = useState([]);
    const [loadingPages, setLoadingPages] = useState(false);
    const [pagesError, setPagesError] = useState(null);

    useEffect(() => {
        const loadPages = async () => {
            setLoadingPages(true);
            setPagesError(null);

            try {
                const response = await fetchPagesByRole({ role: 'driver' });
                setPages(response.data || []);
            } catch (error) {
                setPagesError('Unable to load pages at the moment');
            } finally {
                setLoadingPages(false);
            }
        };

        loadPages();
    }, []);

    const getPageTitle = (page) => {
        if (page?.page_type === 'privacy') return 'Privacy Policy';
        return page?.title?.replace(/_/g, ' ')?.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Page';
    };

    const handlePagePress = (page) => {
        navigation.navigate('InfoPage', { page });
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    onPress: () => {
                        dispatch({ type: LOGOUT_SUCCESS });
                        // navigation.replace('Auth');
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        );
    };
    console.log('userData',userData);
    

    const renderMenuItem = (icon, title, onPress, showArrow = true, rightElement = null) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
                <Icon name={icon} size={22} color="#FF1493" />
                <Text style={styles.menuItemText}>{title}</Text>
            </View>
            {rightElement ? rightElement : (showArrow && <Icon name="chevron-right" size={20} color="#999" />)}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Profile Section */}
            <SimpleHeader title="Settings" />
            <View style={styles.profileSection}>
                <View style={styles.profileImageContainer}>
                    <Image
                        source={require('../../assets/logo.jpg')}
                        style={styles.profileImage}
                        resizeMode="cover"
                    />
                    {/* <TouchableOpacity style={styles.editIcon}>
                        <Icon name="edit-2" size={16} color="#fff" />
                    </TouchableOpacity> */}
                </View>
                <Text style={styles.profileName}>{userData?.full_name || userData?.ba_name || 'User'}</Text>
                <Text style={styles.profilePhone}>+91 {userData?.phone || userData?.ba_mobile || '+91XXXXXXXXXX'}</Text>
            </View>

            {/* Account Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Settings</Text>
                <View style={styles.sectionContent}>
                    {renderMenuItem('user', 'Profile Information', () => navigation.navigate('Profile'))}
                    {renderMenuItem('credit-card', 'KYC Verification', () => navigation.navigate('KYC'))}

                    {/* {renderMenuItem('lock', 'Change Password', () => Alert.alert('Coming Soon', 'Change password feature will be available soon'))} */}
                </View>
            </View>

            {/* Preferences */}
            {/* <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={styles.sectionContent}>
                    {renderMenuItem('bell', 'Notifications', null, false, 
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: '#ccc', true: '#FF1493' }}
                            thumbColor="#fff"
                        />
                    )}
                    {renderMenuItem('moon', 'Dark Mode', null, false,
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            trackColor={{ false: '#ccc', true: '#FF1493' }}
                            thumbColor="#fff"
                        />
                    )}
                </View>
            </View> */}

            {/* Support */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Support</Text>
                <View style={styles.sectionContent}>
                    {renderMenuItem('help-circle', 'Help Center', () => Alert.alert('Coming Soon', 'Help center will be available soon'))}
                    {renderMenuItem('message-circle', 'Contact Us', () => Alert.alert('Coming Soon', 'Contact support feature will be available soon'))}
                    {loadingPages ? (
                        <Text style={styles.pageStatus}>Loading pages...</Text>
                    ) : pagesError ? (
                        <Text style={styles.pageStatus}>{pagesError}</Text>
                    ) : pages.length === 0 ? (
                        <Text style={styles.pageStatus}>No pages available</Text>
                    ) : (
                        pages.map((page) => (
                            renderMenuItem(
                                page.page_type === 'privacy' ? 'shield' : 'file-text',
                                getPageTitle(page),
                                () => handlePagePress(page)
                            )
                        ))
                    )}
                </View>
            </View>

            {/* About */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.sectionContent}>
                    {renderMenuItem('info', 'App Version', () => Alert.alert('App Version', 'Version 1.0.0'))}
                    {renderMenuItem('award', 'Made with ❤️', () => null, false)}
                </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Icon name="log-out" size={20} color="#fff" />
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

          
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    profileSection: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#FF1493',
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FF1493',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    profilePhone: {
        fontSize: 14,
        color: '#666',
    },
    pageStatus: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        color: '#777',
        fontSize: 14,
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
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 12,
    },
    logoutButton: {
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
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingBottom: 30,
    },
    footerText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
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

headerTitle: {
  fontSize: 20,
  fontWeight: '600',
  color: '#FFFFFF',
},

backBtn: {
  position: 'absolute',
  left: 16,
},
});

export default SettingsScreen;
