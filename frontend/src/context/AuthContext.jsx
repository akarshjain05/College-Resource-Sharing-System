import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("crss_access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem("crss_access_token");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem("crss_access_token", data.access_token);
    await loadUser();
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await authApi.googleLogin(credential);
    if (data.status === "login") {
      localStorage.setItem("crss_access_token", data.access_token);
      await loadUser();
    }
    // If data.status === "needs_profile", the caller (Login/RegisterPage) is
    // responsible for showing the profile-completion form -- no tokens exist yet.
    return data;
  };

  const completeGoogleProfile = async (payload) => {
    const { data } = await authApi.completeGoogleProfile(payload);
    localStorage.setItem("crss_access_token", data.access_token);
    await loadUser();
  };

  const register = async (payload) => {
    const { data } = await authApi.register(payload);
    return data;
  };

  const verifySignupOtp = async (payload) => {
    const { data } = await authApi.verifySignupOtp(payload);
    localStorage.setItem("crss_access_token", data.access_token);
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
    localStorage.removeItem("crss_access_token");
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