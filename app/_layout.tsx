import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import SplashScreen from '@/components/initial-screen/splash-screen';
import { setGlobalFont, useAppFonts } from '@/config/font-config';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { setupNetworking } from '../services/networking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PlusCodeStorage from '@/services/PlusCodeStorage';

import '../global.css';
setupNetworking();

export default function RootLayout() {
  const [isShowingSplash, setIsShowingSplash] = useState(true);
  const { fontsLoaded, fontError } = useAppFonts();

  useEffect(() => {
    PlusCodeStorage.initialize();
  }, []);

  useEffect(() => {
    // Set global font when fonts are loaded
    if (fontsLoaded) {
      setGlobalFont('Poppins-Regular');
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Hide splash screen after 2.5 seconds and fonts are loaded
    if (fontsLoaded || fontError) {
      const timer = setTimeout(() => {
        setIsShowingSplash(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

  // Show splash screen while fonts are loading
  if ((!fontsLoaded && !fontError) || isShowingSplash) {
    return <SplashScreen />;
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { loading, user } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        // comece pelo seu group de tabs; ele renderiza /(tabs)/map por padrão
        <Stack.Screen name="(tabs)" />
      ) : (
        <>
          <Stack.Screen name="index" />
          <Stack.Screen name="create-account" />
          <Stack.Screen name="create-profile" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="verify-code" />
          <Stack.Screen name="template-page" />
        </>
      )}
    </Stack>
  );
}