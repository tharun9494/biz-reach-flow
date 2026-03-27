import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type UserRole = "lead_hunter" | "caller" | "admin" | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  userName: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setRole(data.role as UserRole);
            setUserName(data.name || firebaseUser.email || "");
          } else {
            // Auto-create Firestore user doc for existing Auth users
            const isAdmin = firebaseUser.email === "ontimittatharun2002@gmail.com";
            const autoRole = isAdmin ? "admin" : "caller";
            const userName = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "";
            try {
              await setDoc(userDocRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: userName,
                role: autoRole,
              });
            } catch (writeErr) {
              console.warn("Failed to auto-create user doc:", writeErr);
            }
            setRole(autoRole as UserRole);
            setUserName(userName || firebaseUser.email || "");
          }
        } catch (err) {
          console.warn("Failed to fetch user doc:", err);
          if (firebaseUser.email === "ontimittatharun2002@gmail.com") {
            setRole("admin");
          } else {
            setRole(null);
          }
          setUserName(firebaseUser.email || "");
        }
      } else {
        setUser(null);
        setRole(null);
        setUserName("");
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, userName, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
