import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';

// Screens
import LoginScreen from '../screens/authscreens/LoginScreen';
import SignupScreen from '../screens/authscreens/SignupScreen';
import SplashScreen from '../screens/authscreens/SplashScreen';
import HomeScreen from '../screens/mainscreens/HomeScreen';
import HistoryScreen from '../screens/mainscreens/HistoryScreen';
import SettingsScreen from '../screens/mainscreens/SettingsScreen';
import KYCScreen from '../screens/mainscreens/KYCScreen';
import ProfileInformationScreen from '../screens/mainscreens/ProfileInformationScreen';
import AddDriverScreen from '../screens/mainscreens/AddDriverScreen';
import BADriverListScreen from '../screens/mainscreens/BADriverListScreen';
import InfoPageScreen from '../screens/mainscreens/InfoPageScreen';
import InCityMapScreen from '../screens/mainscreens/InCityMapScreen';
import InCityInvoiceScreen from '../screens/mainscreens/InCityInvoiceScreen';
import WalletScreen from '../screens/mainscreens/WalletScreen';
import BookingHistoryDetailScreen from '../screens/mainscreens/BookingHistoryDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ✅ Bottom Tabs (Driver simple version)
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF1493',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
        },
        headerStyle: {
          backgroundColor: '#810a45',
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
        },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />

      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          headerTitle: 'Ride History',
           headerShown: false ,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#810a45',
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
          },
          headerTintColor: '#fff',
        }}
      />

      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ headerShown: false }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: 'Settings',
          headerShown: false,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#810a45',
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
          },
          headerTintColor: '#fff',
        }}
      />
    </Tab.Navigator>
  );
};

// ✅ Auth Stack
const AuthStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

// ✅ Main Navigator
const AppNavigator = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="KYC"
              component={KYCScreen}
              options={{
                headerShown: false,
                headerTitle: 'KYC Verification',
                headerTitleAlign: 'center',
                headerStyle: {
                  backgroundColor: '#810a45',
                  borderBottomLeftRadius: 40,
                  borderBottomRightRadius: 40,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                headerBackTitle: 'Back',
                headerBackTitleStyle: {
                  color: '#fff',
                  fontSize: 14,
                },

                headerBackImage: ({ tintColor }) => (
                  <Icon name="chevron-back" size={24} color={tintColor} />
                ),

              }}

            />
            <Stack.Screen
              name="AddDriver"
              component={AddDriverScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BADriverList"
              component={BADriverListScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileInformationScreen}
              options={{
                headerShown: false,
                headerTitle: 'Profile Information',
                headerTitleAlign: 'center',
                headerStyle: {
                  backgroundColor: '#810a45',
                  borderBottomLeftRadius: 40,
                  borderBottomRightRadius: 40,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                headerBackTitle: 'Back',
                headerBackTitleStyle: {
                  color: '#fff',
                  fontSize: 14,
                },

                headerBackImage: ({ tintColor }) => (
                  <Icon name="chevron-back" size={24} color={tintColor} />
                ),

              }}

            />
            <Stack.Screen
              name="InfoPage"
              component={InfoPageScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InCityMap"
              component={InCityMapScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InCityInvoice"
              component={InCityInvoiceScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BookingHistoryDetail"
              component={BookingHistoryDetailScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
