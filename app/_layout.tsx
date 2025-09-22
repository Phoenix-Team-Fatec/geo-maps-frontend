import { setupNetworking } from '../services/networking';
setupNetworking();

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import SplashScreen from '@/components/initial-screen/splash-screen';
import { setGlobalFont, useAppFonts } from '@/config/font-config';
import '../global.css';
import { StackScreen } from 'react-native-screens';

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
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create-account" options={{ headerShown: false }} />
      <Stack.Screen name="create-profile" options={{ headerShown: false }} />
      <Stack.Screen name="template-page" options={{ headerShown: false }} />
      <Stack.Screen name="main" options={{ headerShown: false }} />
    </Stack>
  );
}
