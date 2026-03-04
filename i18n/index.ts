import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import en from './en.json';
import fr from './fr.json';
import ar from './ar.json';

const LANGUAGE_KEY = '@bizpos_language';

export const isRTL = (lang: string) => lang === 'ar';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = async (lang: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
  
  const rtl = isRTL(lang);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
  }
};

export const loadSavedLanguage = async () => {
  try {
    const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLang) {
      await i18n.changeLanguage(savedLang);
      I18nManager.forceRTL(isRTL(savedLang));
    } else {
      I18nManager.forceRTL(true);
    }
  } catch (error) {
    console.error('Failed to load saved language:', error);
    I18nManager.forceRTL(true);
  }
};

export default i18n;
