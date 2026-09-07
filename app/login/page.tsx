"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKey, ShieldCheck } from "@phosphor-icons/react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login gagal.");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login gagal.");
      setLoading(false);
    }
  }

  return <main className="login-page">
    <div className="login-glow" />
    <section className="login-card">
      <div className="login-brand"><span className="logo">X</span><div><b>AURUM</b><small>SMART TRADING</small></div></div>
      <div className="login-icon"><LockKey size={24} weight="duotone" /></div>
      <p className="eyebrow"><span>OWNER ACCESS</span> / SECURE SESSION</p>
      <h1>Masuk ke trading desk</h1>
      <p className="login-copy">Dashboard privat untuk memantau XAUUSD dan menjalankan analisis AI.</p>
      <form onSubmit={login}>
        <label>Email</label>
        <input name="email" type="email" autoComplete="username" placeholder="owner@email.com" required autoFocus />
        <label>Password</label>
        <input name="password" type="password" autoComplete="current-password" placeholder="••••••••••••" required />
        {error && <div className="login-error">{error}</div>}
        <button className="login-submit" disabled={loading}>{loading ? "Memverifikasi..." : "Masuk ke dashboard"}<ArrowRight size={17} /></button>
      </form>
      <div className="login-security"><ShieldCheck size={16} /> Sesi terenkripsi • Cookie HttpOnly • Berlaku 7 hari</div>
    </section>
  </main>;
}
