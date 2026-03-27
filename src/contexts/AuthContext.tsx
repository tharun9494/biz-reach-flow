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
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role as UserRole);
            setUserName(data.name || firebaseUser.email || "");
          } else {
            // Fallback for known admin
            if (firebaseUser.email === "ontimittatharun2002@gmail.com") {
              setRole("admin");
            } else {
              setRole(null);
            }
            setUserName(firebaseUser.email || "");
          }
        } catch (err) {
          console.warn("Failed to fetch user doc:", err);
          // Fallback for known admin when Firestore rules block access
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
