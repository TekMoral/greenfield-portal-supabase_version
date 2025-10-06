// App.jsx
import React, { useRef, useEffect } from "react";
import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./routes/AppRouter";
import { SettingsProvider } from "./contexts/SettingsContext";
import { Toaster } from "react-hot-toast"; // ✅ Toast system
import ErrorBoundary from "./components/ErrorBoundary";
import { isProd } from './utils/errorUtils';

import "./App.css";

function App() {
  const headerRef = useRef(null);

  useEffect(() => {
    if (!headerRef.current) return;

    const setHeaderHeight = (height) => {
      document.documentElement.style.setProperty(
        "--header-height",
        `${height}px`
      );
    };

    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setHeaderHeight(entry.contentRect.height);
      }
    });

    observer.observe(headerRef.current);
    updateHeight();

    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  // Global production safety: quiet noisy console in production
  if (isProd) {
    try {
      const silent = () => {};
      // Preserve info logs lightly
      console.debug = silent;
      console.trace = silent;
    } catch (_) {}
  }

  return (
    <SettingsProvider>
      <BrowserRouter>
        <div className="app-shell">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-screen">
                  Loading...
                </div>
              }
            >
              <AppRouter />
            </Suspense>
          </ErrorBoundary>
        </div>
        <Toaster position="top-right" reverseOrder={false} />
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
