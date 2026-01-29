import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth } from "./firebase";



export default function AuthModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");

  // Clear state when modal closes
  const handleClose = () => {
    setEmail("");
    setPassword("");
    setIsSignup(false);
    setError("");
    onClose();
  };

  if (!open) return null;

  const submit = async () => {
    setError("");
    // Guard: only call Firebase Auth if auth is a valid instance (has .app property)
    if (!auth || typeof auth !== "object" || !('app' in auth)) {
      setError("Authentication is not available. Please check your Firebase configuration.");
      return;
    }
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      handleClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <button style={closeBtn} onClick={handleClose} aria-label="Close">×</button>
        <h2 style={title}>{isSignup ? "Sign up" : "Login"}</h2>
        <div style={{ marginBottom: 24 }}>
          <input
            style={input}
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            type="email"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            style={input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        {error && <div style={errorBox}>{error}</div>}
        <button onClick={submit} style={button}>
          {isSignup ? "Create account" : "Login"}
        </button>
        <div style={toggleBox}>
          <span style={{ color: "#888" }}>
            {isSignup ? "Already have an account?" : "No account?"}
          </span>
          <button
            style={toggleBtn}
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Login" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}


const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const modal = {
  background: "#18181b",
  color: "#fff",
  padding: 32,
  borderRadius: 16,
  minWidth: 340,
  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

const closeBtn = {
  position: "absolute",
  top: 16,
  right: 16,
  background: "none",
  border: "none",
  color: "#fff",
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1
};

const title = {
  marginBottom: 24,
  fontWeight: 700,
  fontSize: 24,
  letterSpacing: 0.5,
  textAlign: "center"
};

const input = {
  width: 260,
  padding: "12px 16px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#232326",
  color: "#fff",
  fontSize: 16,
  outline: "none",
  marginBottom: 0,
  marginTop: 0
};

const button = {
  width: 260,
  padding: "12px 0",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(90deg, #6366f1 0%, #a21caf 100%)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 16,
  cursor: "pointer",
  marginTop: 8,
  marginBottom: 16,
  boxShadow: "0 2px 8px rgba(99,102,241,0.15)"
};

const errorBox = {
  background: "#fee2e2",
  color: "#b91c1c",
  borderRadius: 6,
  padding: "8px 12px",
  marginBottom: 12,
  width: 260,
  textAlign: "center",
  fontSize: 14,
  fontWeight: 500
};

const toggleBox = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 8
};

const toggleBtn = {
  background: "none",
  border: "none",
  color: "#818cf8",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
  textDecoration: "underline"
};
