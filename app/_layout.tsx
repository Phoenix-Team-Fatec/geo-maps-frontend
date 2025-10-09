// app/_layout.tsx

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import SplashScreen from '@/components/initial-screen/splash-screen';
import { setGlobalFont, useAppFonts } from '@/config/font-config';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { setupNetworking } from '../services/networking';

import '../global.css';
setupNetworking();

export default function RootLayout() {
  const [isShowingSplash, setIsShowingSplash] = useState(true);
  const { fontsLoaded, fontError } = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) setGlobalFont('Poppins-Regular');
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      const timer = setTimeout(() => setIsShowingSplash(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

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

  // 1) Enquanto faz o bootstrap do auth, mostra splash
  if (loading) {
    return <SplashScreen />;
  }

  // 2) Se o user for null, rotas públicas (login, cadastro…)
  //    Senão, direciona pro grupo de tabs (que contém o mapa)
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
          <Stack.Screen name="forget-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="verify-code" />
          <Stack.Screen name="template-page" />
        </>
      )}
    </Stack>
  );
}