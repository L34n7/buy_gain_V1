"use client";

import { useState, useEffect } from "react";import "./login.css";
import { supabase } from "@/lib/supabaseClient";
import { Turnstile } from "@marsidev/react-turnstile";
import AuthFooter from "../AuthFooter";

export default function Login() {
  /* ===============================
     ESTADOS
  =============================== */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoFaded, setLogoFaded] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setLogoFaded(true), 2200);
  return () => clearTimeout(timer);
}, []);

  /* ===============================
     LOGIN
  =============================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let response;

      // Se captcha já estiver visível
      if (showCaptcha) {
        if (!captchaToken) {
          setCaptchaError(true);
          setLoading(false);
          return;
        }

        response = await supabase.auth.signInWithPassword({
          email,
          password,
          options: {
            captchaToken: captchaToken,
          },
        });
      } else {
        // Primeira tentativa sem captcha
        response = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }

      const { data, error } = response;

      if (error) {
        // Se Supabase exigir captcha
        if (error.message.toLowerCase().includes("captcha")) {
          setShowCaptcha(true);
        } else {
          setError(error.message);
        }

        setLoading(false);
        return;
      }

      const accessToken = data?.session?.access_token;
      const refreshToken = data?.session?.refresh_token;

      if (accessToken) {
        await fetch("/api/auth/set-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
          }),
        });
      }

      if (data?.user?.id) {
        try {
          localStorage.setItem("auth_user_id", data.user.id);
        } catch {}
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  }

  /* ===============================
     RECUPERAR SENHA
  =============================== */
  async function handleRecover() {
    if (!email) {
      setError("Digite seu email primeiro.");
      return;
    }

    // Força mostrar captcha se ainda não estiver visível
    if (!showCaptcha) {
      setShowCaptcha(true);
      return;
    }

    if (!captchaToken) {
      setCaptchaError(true);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/auth/reset-password`,
        captchaToken: captchaToken,
      });

      if (error) {
        setError(error.message);
      } else {
        setError(null);
        setSuccess("Email enviado com sucesso! Verifique sua caixa de entrada.");
      }
    } catch {
      setError("Erro ao enviar email.");
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="auth-page">

        <div className="login-logo-wrapper">
          <img
            src="/logo.png"
            alt="BuyGain"
            className={`login-logo ${logoFaded ? "faded" : ""}`}
          />
        </div>

        <div className="login-wrapper">

        <div className="login-card">
        <h1 className="login-title">Acessar Conta</h1>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">E-mail</label>
          <input
            type="email"
            className="login-input"
            placeholder="exemplo@seuemail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="login-label">Senha</label>
          <input
            type="password"
            className="login-input"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {showCaptcha && (
            <div className="login-captcha">
              <Turnstile
                siteKey="0x4AAAAAACiJdMM95ZEJ0inL"
                options={{ theme: "dark", size: "normal" }}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setCaptchaError(false);
                }}
              />
            </div>
          )}

          {captchaError && (
            <p className="captcha-error">
              Confirme que você não é um robô.
            </p>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="login-forgot">
            <button type="button" onClick={handleRecover}>
              Esqueci minha senha
            </button>
          </div>

          {success && (
            <p className="login-success">
              {success}
            </p>
          )}

          <div className="login-divider"></div>

          {error && <p className="login-error">{error}</p>}
        </form>

        <p className="login-link">
          <span> Ainda não tem conta? </span>
          <a href="/auth/cadastro"> Criar conta</a>
        </p>
      </div>
    </div>
    <AuthFooter />
  </div>
  );
}