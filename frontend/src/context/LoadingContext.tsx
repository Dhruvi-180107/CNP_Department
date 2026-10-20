import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface LoadingContextValue {
  /** Whether the current page is busy loading data */
  isPageLoading: boolean;
  /** Set page busy state */
  setPageLoading: (loading: boolean) => void;
  /** Whether the page has signaled it is fully ready to be shown */
  isPageReady: boolean;
  /** Mark page ready directly */
  setPageReady: (ready: boolean) => void;
  /** Route transition status */
  isRouteTransitioning: boolean;
  setIsRouteTransitioning: (transitioning: boolean) => void;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPageLoading, setIsPageLoadingState] = useState<boolean>(false);
  const [isPageReady, setIsPageReadyState] = useState<boolean>(true);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState<boolean>(false);
  const safetyTimerRef = useRef<number | null>(null);

  const setPageLoading = useCallback((loading: boolean) => {
    setIsPageLoadingState(loading);
    if (loading) {
      setIsPageReadyState(false);
      // Failsafe timer so page never hangs indefinitely
      if (safetyTimerRef.current) window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = window.setTimeout(() => {
        setIsPageReadyState(true);
        setIsPageLoadingState(false);
      }, 7000);
    } else {
      if (safetyTimerRef.current) window.clearTimeout(safetyTimerRef.current);
      setIsPageReadyState(true);
    }
  }, []);

  const setPageReady = useCallback((ready: boolean) => {
    setIsPageReadyState(ready);
    if (ready) {
      setIsPageLoadingState(false);
      if (safetyTimerRef.current) window.clearTimeout(safetyTimerRef.current);
    }
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        isPageLoading,
        setPageLoading,
        isPageReady,
        setPageReady,
        isRouteTransitioning,
        setIsRouteTransitioning,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export function usePageLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    // Graceful fallback if outside provider
    return {
      isPageLoading: false,
      setPageLoading: () => {},
      isPageReady: true,
      setPageReady: () => {},
      isRouteTransitioning: false,
      setIsRouteTransitioning: () => {},
    };
  }
  return context;
}
