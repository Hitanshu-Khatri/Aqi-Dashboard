import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    // Only subscribe if auth is a valid Firebase Auth instance
    if (auth && typeof auth.onAuthStateChanged === "function") {
      const unsubscribe = onAuthStateChanged(auth, currentUser => {
        setUser(currentUser);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // SKIP_LOGIN mode or no Firebase config: treat as loaded, no user
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
