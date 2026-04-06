import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar";
import SignUpPage from "./pages/SignUpPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import LogInPage from "./pages/LogInPage.jsx";
import { useAuthStore } from "./store/useAuthStore.js";
import { useThemeStore } from "./store/useThemeStore.js";
import { useChatStore } from "./store/useChatStore.js";

const App = () => {
  const { theme } = useThemeStore();
  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore();
  const { resetChatState, subscribeToMessages, unsubscribeFromMessages } = useChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authUser) {
      resetChatState();
      unsubscribeFromMessages();
      return;
    }

    if (!socket) {
      unsubscribeFromMessages();
      return;
    }

    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [authUser, socket, resetChatState, subscribeToMessages, unsubscribeFromMessages]);

  if (isCheckingAuth && !authUser) {
    return (
      <div data-theme={theme} className="flex h-screen items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-base-300 bg-base-100 px-8 py-10 shadow-xl">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Loader className="size-7 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">Loading your workspace</p>
            <p className="text-sm text-base-content/60">Syncing conversations and account state...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LogInPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "16px",
          },
        }}
      />
    </div>
  );
};

export default App;
