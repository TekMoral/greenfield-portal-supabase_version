// App.jsx
import React, { useRef, useEffect } from "react";
import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./routes/AppRouter";
import Header from "./components/Header";
import { AuthProvider } from "./contexts/SupabaseAuthContext";
import { Toaster } from "react-hot-toast"; // ✅ Toast system

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

  return (
    <AuthProvider>
      <BrowserRouter>
        <Header ref={headerRef} />
        <div style={{ paddingTop: "var(--header-height, 90px)" }}>
          <Suspense
            fallback={
              <div className="flex justify-center items-center h-screen">
                Loading...
              </div>
            }
          >
            <AppRouter />
          </Suspense>
        </div>
        <Toaster position="top-right" reverseOrder={false} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
