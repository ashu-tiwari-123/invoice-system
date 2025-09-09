// src/context/userContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import api from "../axiosInstance";
import toast from "react-hot-toast";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/users/me");
        setUser(data);
      } catch (e) {
        console.error(e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    const { data } = await api.get("/users/me");
    setUser(data);
    toast.success("Logged in successfully! Welcome back.");
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    toast.success("Logged out");
  };

  const updateProfile = async (patch) => {
    const { data } = await api.patch("/users/me", patch);
    toast.success("Profile updated");
    setUser(data);
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, updateProfile, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
