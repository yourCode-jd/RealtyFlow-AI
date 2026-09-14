"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { business_name: businessName || "My Real Estate Business" } },
        });
        if (error) throw error;
        setMessage("Account created. If email confirmation is enabled, confirm your email and then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !session) return <div className="center-screen">Loading…</div>;
  if (session) return children;

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Real Estate AI Business Assistant</p>
        <h1>{mode === "signin" ? "Sign in" : "Create your agency workspace"}</h1>
        <p className="muted auth-copy">Persistent leads and property data are protected per business workspace.</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <label>
              Business name
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="primary" type="submit" disabled={loading}>{loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <button className="text-button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
