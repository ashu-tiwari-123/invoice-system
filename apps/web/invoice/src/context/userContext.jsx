import { createContext, use, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";
import axiosInstance from "../axiosInstance";

// 1️⃣ Create Context
const UserContext = createContext();

// 2️⃣ Provider Component
export function UserProvider({ children }) {
  const [user, setUser] = useState(null); // backend user
  const [loading, setLoading] = useState(true);

  // Listen for Firebase login/logout
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const res = await axiosInstance.get("users/me");
          setUser(res.data);
        } catch (err) {
          console.error("Failed to fetch user:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login method (email/password example)
  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    // Firebase handles token → useEffect will auto fetch backend user
  };

  // Logout method
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // Update profile method
  const updateProfile = async (data) => {
    const res = await axiosInstance.patch("/users/me", data);
    setUser(res.data);
  };

  return (
    <UserContext value={{ user, loading, login, logout, updateProfile }}>
      {children}
    </UserContext>
  );
}

// 3️⃣ Custom Hook
export function useUser() {
  return use(UserContext);
}
