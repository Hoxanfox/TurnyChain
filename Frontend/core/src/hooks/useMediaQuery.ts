import { useState, useEffect } from 'react';

/**
 * Hook personalizado para detectar media queries
 * @param query - La media query a evaluar (ej: '(min-width: 768px)')
 * @returns boolean - true si la media query coincide
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Listener moderno
    mediaQuery.addEventListener('change', handleChange);

    // Actualizar el estado inicial
    setMatches(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

/**
 * Hook para detectar si es una pantalla grande (desktop/tablet)
 * @returns boolean - true si es >= 1024px (lg en Tailwind)
 */
export const useIsDesktop = (): boolean => {
  return useMediaQuery('(min-width: 1024px)');
};

/**
 * Hook para detectar si es una tablet
 * @returns boolean - true si es >= 768px y < 1024px
 */
export const useIsTablet = (): boolean => {
  const isTabletOrLarger = useMediaQuery('(min-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return isTabletOrLarger && !isDesktop;
};

/**
 * Hook para detectar si es móvil
 * @returns boolean - true si es < 768px
 */
export const useIsMobile = (): boolean => {
  return useMediaQuery('(max-width: 767px)');
};

