import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/endpoints";
import { appCallbacks } from "../utils/appCallbacks";
import { setAccessToken, clearAccessToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      // The interceptor in client.js will automatically attempt a silent refresh
      // if this request fails with 401 and we have a valid refresh cookie.
      const { data } = await authApi.me();
      setUser(data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        clearAccessToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    const handleUnauthorized = () => {
      setUser(null);
      clearAccessToken();
    };
    return appCallbacks.register("auth-unauthorized", handleUnauthorized);
  }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await authApi.login(email, password);
    setAccessToken(data.access_token);
    await loadUser();
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await authApi.googleLogin(credential);
    if (data.status === "login") {
      setAccessToken(data.access_token);
      await loadUser();
    }
    return data;
  };

  const completeGoogleProfile = async (payload) => {
    const { data } = await authApi.completeGoogleProfile(payload);
    setAccessToken(data.access_token);
    await loadUser();
  };

  const register = async (payload) => {
    const { data } = await authApi.register(payload);
    return data;
  };

  const verifySignupOtp = async (payload) => {
    const { data } = await authApi.verifySignupOtp(payload);
    setAccessToken(data.access_token);
    await loadUser();
    return data;
  };

  const resendSignupOtp = async (payload) => {
    const { data } = await authApi.resendSignupOtp(payload);
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Logout failed on server:", err);
    }
    clearAccessToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGoogle,
        completeGoogleProfile,
        register,
        verifySignupOtp,
        resendSignupOtp,
        logout,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );

}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}