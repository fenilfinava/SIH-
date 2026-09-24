"use client";

import { useState, useEffect } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import SplashScreen from '@/components/SplashScreen';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // User requested to show splash screen on every refresh
    setShowSplash(true);
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (!hasMounted) return null;

  return (
    <LanguageProvider>
      <AuthProvider>
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        {children}
      </AuthProvider>
    </LanguageProvider>
  );
}
