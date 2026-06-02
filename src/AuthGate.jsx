// ============================================================
//  AuthGate.jsx  —  the "front door"
//  Put this file in your project's  src/  folder.
//
//  It shows a friendly login screen. Once the person signs in
//  (Google one-tap OR email+password), it shows whatever you
//  put inside it — your real app.
// ============================================================
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

const C = {
  paper: "#F4EDE0", card: "#FBF7EF", ink: "#2A2622",
  terra: "#C5683D", sage: "#6B7050", gold: "#C9A24B", muted: "#8A7F6F",
};

// The little warm-bowl logo, same as your header
function Logo({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-label="Count You In">
      <circle cx="48" cy="48" r="30" fill="none" stroke={C.terra} strokeWidth="6.5" />
      <g fill={C.sage}>
        <circle cx="48" cy="9" r="4.6" /><circle cx="81" cy="29" r="4.6" /><circle cx="81" cy="67" r="4.6" />
        <circle cx="15" cy="29" r="4.6" /><circle cx="15" cy="67" r="4.6" />
      </g>
      <circle cx="48" cy="87" r="5.4" fill={C.gold} />
      <path d="M35 50 a13 13 0 0 0 26 0 Z" fill={C.ink} />
      <g stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M43 44 q-3 -4 0 -8" /><path d="M53 44 q-3 -4 0 -8" />
      </g>
    </svg>
  );
}

// Remember which sign-in method was used last, so we can gently warn
// if someone switches (which would create a separate account).
function getLastMethod() {
  try { return localStorage.getItem("cyi_login_method"); } catch { return null; }
}
function setLastMethod(m) {
  try { localStorage.setItem("cyi_login_method", m); } catch { /* storage unavailable */ }
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [msg, setMsg] = useState("");
  const lastMethod = getLastMethod();

  // check if someone is already logged in, and listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInGoogle() {
    setMsg("");
    setLastMethod("google");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) setMsg(error.message);
  }

  async function handleEmail() {
    setMsg("");
    if (!email || !password) { setMsg("Please type an email and password."); return; }
    setLastMethod("email");
    const fn = mode === "signup" ? "signUp" : "signInWithPassword";
    const { error } = await supabase.auth[fn]({ email, password });
    if (error) setMsg(error.message);
    else if (mode === "signup") setMsg("Check — you can now sign in!");
  }

  async function signOut() { await supabase.auth.signOut(); }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: C.paper }} />;
  }

  // ---- logged in: show the real app ----
  if (session) {
    return <div>{children}</div>;
  }

  // ---- not logged in: show the login screen ----
  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'Hanken Grotesk',sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo /></div>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: 30, margin: "0 0 4px", letterSpacing: -0.5 }}>
          Count<span style={{ color: C.terra }}> You</span> In
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 16px" }}>Plan the potluck. Split it fairly.</p>

        {/* gentle guidance: pick one method and stick with it */}
        {lastMethod ? (
          <div style={{ background: `${C.gold}14`, border: `1px solid ${C.gold}44`, borderRadius: 10,
            padding: "9px 12px", fontSize: 12.5, color: C.ink, marginBottom: 18, lineHeight: 1.45 }}>
            👋 Welcome back! Last time you signed in with <b>{lastMethod === "google" ? "Google" : "email & password"}</b>.
            Use the same way to find your family and events.
          </div>
        ) : (
          <div style={{ background: `${C.sage}12`, border: `1px solid ${C.sage}33`, borderRadius: 10,
            padding: "9px 12px", fontSize: 12.5, color: C.ink, marginBottom: 18, lineHeight: 1.45 }}>
            Tip: pick one way to sign in — Google <i>or</i> email — and use it every time. They're treated as separate accounts, so sticking to one keeps your family and events together.
          </div>
        )}

        <button onClick={signInGoogle}
          style={{ width: "100%", padding: "11px", borderRadius: 12,
            border: lastMethod === "google" ? `2px solid ${C.terra}` : `1px solid ${C.ink}22`,
            background: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", marginBottom: 16 }}>
          Continue with Google{lastMethod === "google" ? "  ✓" : ""}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.muted, fontSize: 12, margin: "4px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: `${C.ink}1a` }} /> or <div style={{ flex: 1, height: 1, background: `${C.ink}1a` }} />
        </div>

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
          style={inp} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password"
          style={{ ...inp, marginTop: 10 }} onKeyDown={(e) => e.key === "Enter" && handleEmail()} />

        <button onClick={handleEmail}
          style={{ width: "100%", padding: "11px", borderRadius: 12,
            border: lastMethod === "email" ? `2px solid ${C.ink}` : "none",
            background: C.terra, color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", marginTop: 14 }}>
          {mode === "signup" ? "Create account" : "Sign in"}{lastMethod === "email" ? "  ✓" : ""}
        </button>

        <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(""); }}
          style={{ background: "transparent", border: "none", color: C.sage, fontWeight: 700, fontSize: 13,
            cursor: "pointer", marginTop: 14 }}>
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>

        {msg && <p style={{ color: C.terra, fontSize: 13, marginTop: 14 }}>{msg}</p>}
      </div>
    </div>
  );
}

const inp = {
  width: "100%", padding: "11px 13px", borderRadius: 12, border: "1px solid #2A262226",
  background: "#fff", fontSize: 14.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};
