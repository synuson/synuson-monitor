import { useStore } from '@/store/useStore';
import { translations, TranslationKeys } from './translations';

export function useTranslation() {
  const { language } = useStore();

  const t = translations[language] as TranslationKeys;

  // Helper function for string path access
  const tr = (path: string, fallback?: string): string => {
    return getNestedValue(t as unknown as Record<string, unknown>, path) || fallback || path;
  };

  return { t, tr, language };
}

// Helper function to get nested translation value
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // Return the path if not found
    }
  }

  return typeof result === 'string' ? result : path;
}
