"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, LanguageCode } from '@/utils/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>('gu');

  useEffect(() => {
    const savedLang = localStorage.getItem('krushi_lang') as LanguageCode;
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const changeLanguage = (lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem('krushi_lang', lang);
  };

  const t = (key: keyof typeof translations['en']) => {
    const langObj = (translations as any)[language];
    if (langObj && langObj[key]) {
      return langObj[key];
    }
    return translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
