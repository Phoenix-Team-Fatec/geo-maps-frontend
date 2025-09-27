import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import SplashScreen from '@/components/initial-screen/splash-screen';
import { setGlobalFont, useAppFonts } from '@/config/font-config';
import { AuthProvider } from '@/auth/AuthContext';
import { setupNetworking } from '../services/networking';

import '../global.css';
setupNetworking();

export default function RootLayout() {
  const [isShowingSplash, setIsShowingSplash] = useState(true);
  const { fontsLoaded, fontError } = useAppFonts();

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create-account" />
        <Stack.Screen name="create-profile" />
        <Stack.Screen name="login" />
        <Stack.Screen name="template-page" />
      </Stack>
    </AuthProvider>
  );
}
