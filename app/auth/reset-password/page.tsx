"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import "./reset-password.css";
import AuthFooter from "../AuthFooter";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 👇 LOGO FADE (igual login)
  const [logoFaded, setLogoFaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLogoFaded(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  // 🔎 Regras
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const passwordValid =
    hasMinLength && hasUpper && hasNumber && hasSpecial && passwordsMatch;

  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Senha atualizada com sucesso! Redirecionando...");
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    }

    setLoading(false);
  }

  const Rule = ({ valid, text }: { valid: boolean; text: string }) => (
    <p className={`rule ${valid ? "valid" : ""}`}>
      <span className="rule-icon">{valid ? "✔" : "•"}</span> {text}
    </p>
  );

  return (
  <div className="login-wrapper">
    <div className="reset-wrapper">

      {/* 👇 LOGO CENTRAL */}
      <div className="reset-logo-wrapper">
        <img
          src="/logo.png"
          alt="BuyGain"
          className={`reset-logo ${logoFaded ? "faded" : ""}`}
        />
      </div>

      <div className="reset-card">
        <h1 className="reset-title">Criar nova senha</h1>

        <form className="reset-form" onSubmit={handleReset}>
          <label className="reset-label">Nova senha</label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              className="reset-input"
              placeholder="Digite sua nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          <label className="reset-label">Confirmar senha</label>
          <div className="password-field">
            <input
              type={showConfirm ? "text" : "password"}
              className="reset-input"
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? "🙈" : "👁"}
            </button>
          </div>

          <div className="password-rules">
            <Rule valid={hasMinLength} text="Mínimo de 8 caracteres" />
            <Rule valid={hasUpper} text="Pelo menos 1 letra maiúscula" />
            <Rule valid={hasNumber} text="Pelo menos 1 número" />
            <Rule valid={hasSpecial} text="1 caractere especial (!@#$%^&*)" />
            <Rule valid={passwordsMatch} text="As senhas conferem" />
          </div>

          <button
            type="submit"
            className="reset-btn"
            disabled={!passwordValid || loading}
          >
            {loading ? "Atualizando..." : "Atualizar senha"}
          </button>

          {message && (
            <p className="reset-message">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
    <AuthFooter />
  </div>
  );
}