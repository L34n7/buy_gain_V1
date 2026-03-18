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
  const [error, setError] = useState<string | null>(null);

  // 👇 LOGO FADE (igual login)
  const [logoFaded, setLogoFaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLogoFaded(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  // 🔎 Regras
  const hasMinLength = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  /* REQUISITOS MÍNIMOS PARA RESET */
  const passwordValid =
    hasMinLength && hasSpecial && passwordsMatch;

  /* =========================
    FORÇA DA SENHA
  ========================= */

  let strength = 0;

  if (password.length >= 6) strength += 1;
  if (hasUpper) strength += 1;
  if (hasNumber) strength += 1;
  if (hasSpecial) strength += 1;

  const strengthPercent = (strength / 4) * 100;

  let strengthLabel = "";

  if (strength <= 1) strengthLabel = "Fraca";
  else if (strength === 2 || strength === 3) strengthLabel = "Média";
  else strengthLabel = "Forte";

  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    if (!passwordValid) {
      setError("A senha não atende aos requisitos");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      if (updateError.message.includes("different from the old password")) {
        setError("A nova senha deve ser diferente da senha antiga");
      } else {
        setError("Erro ao atualizar senha. Tente novamente.");
      }
    } else {
      setError(null);
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
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
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
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
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
            <Rule valid={hasMinLength} text="Mínimo de 6 caracteres" />
            <Rule valid={hasSpecial} text="1 caractere especial (!@#$%^&*)" />
            <Rule valid={passwordsMatch} text="As senhas conferem" />
            <Rule valid={hasNumber} text="Número (senha mais forte)" />
            <Rule valid={hasUpper} text="Letra maiúscula (senha mais forte)" />
          </div>

          {password.length > 0 && (
            <>
              <div className="password-strength-bar">
                <div
                  className="password-strength-fill"
                  style={{ width: `${strengthPercent}%` }}
                ></div>
              </div>

              <p className={`password-strength-text level-${strength}`}>
                Segurança da senha: {strengthLabel}
              </p>
            </>
          )}

          <button
            type="submit"
            className={`reset-btn ${error ? "error" : ""}`}
            disabled={loading}
          >
            {loading
              ? "Atualizando..."
              : error
              ? error
              : "Atualizar senha"}
          </button>
        </form>
      </div>
    </div>
    <AuthFooter />
  </div>
  );
}