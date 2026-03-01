
"use client";

import { useState, useEffect } from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import "./cadastro.css";
import AuthFooter from "../AuthFooter";
import { Turnstile } from "@marsidev/react-turnstile";

export default function Cadastro() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
const [captchaToken, setCaptchaToken] = useState<string | null>(null);
const [captchaError, setCaptchaError] = useState(false);

  // =========================
  // Regras de senha
  // =========================

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  const passwordsMatch =
    password === confirmPassword && password.length > 0;

  const passwordValid =
    hasMinLength && hasUpper && hasNumber && hasSpecial && passwordsMatch;

  useEffect(() => {
    if (success) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function handleSubmit(e: React.FormEvent) {

    if (!captchaToken) {
  setCaptchaError(true);
  return;
}

    e.preventDefault();
    if (loading) return;
    if (!passwordValid) {
      setError("A senha não atende aos requisitos.");
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, captchaToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao cadastrar");
      } else {
        setSuccess(true);
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  }

  const Rule = ({ valid, text }: { valid: boolean; text: string }) => (
    <p className={`rule ${valid ? "valid" : ""}`}>
      <span className="rule-icon">{valid ? "✔" : "•"}</span> {text}
    </p>
  );

  return (
    <>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={300}
          gravity={0.3}
          recycle={false}
        />
      )}

      <div className="auth-page">

        <div className="cadastro-wrapper">
          <div className="cadastro-card">

            <h1 className="cadastro-title">Crie sua conta grátis</h1>

            <p className="cadastro-sub">
              Leva menos de <span>30 segundos</span> para começar.
            </p>

            <div className="cadastro-beneficios">
              <p>• Ganhe pontos automaticamente em cada compra</p>
              <p>• Resgate em Vale Presente e recompensas</p>
              <p>• 100% gratuito — sempre</p>
            </div>

            <form className="cadastro-form" onSubmit={handleSubmit}>

              {/* Nome */}
              <div>
                <label className="cadastro-label">Nome</label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  className="cadastro-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="cadastro-label">E-mail</label>
                <input
                  type="email"
                  placeholder="Ex: ana@gmail.com"
                  className="cadastro-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Senha */}
              <div>
                <label className="cadastro-label">Senha</label>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Crie uma senha forte"
                    className="cadastro-input"
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
              </div>

              {/* Confirmar senha */}
              <div>
                <label className="cadastro-label">Confirmar senha</label>
                <div className="password-field">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    className="cadastro-input"
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
              </div>

              {/* Regras */}
              <div className="password-rules">
                <Rule valid={hasMinLength} text="Mínimo de 8 caracteres" />
                <Rule valid={hasUpper} text="Pelo menos 1 letra maiúscula" />
                <Rule valid={hasNumber} text="Pelo menos 1 número" />
                <Rule valid={hasSpecial} text="1 caractere especial (!@#$%^&*)" />
                <Rule valid={passwordsMatch} text="As senhas conferem" />
              </div>

              <div className="cadastro-captcha">
  <Turnstile
    siteKey="0x4AAAAAACiJdMM95ZEJ0inL"
    options={{ theme: "dark", size: "normal" }}
    onSuccess={(token) => {
      setCaptchaToken(token);
      setCaptchaError(false);
    }}
  />
</div>

{captchaError && (
  <p className="captcha-error">
    Confirme que você não é um robô.
  </p>
)}

              <button
                className="cadastro-btn"
                disabled={!passwordValid || loading}
              >
                {loading ? "Criando conta..." : "Criar minha conta"}
              </button>

              {error && <p className="feedback-error">{error}</p>}

              {success && (
                <p className="feedback-success">
                  Conta criada com sucesso! 🎉
                </p>
              )}

              <p className="cadastro-link">
                Já tem conta? <a href="/auth/login">Entrar</a>
              </p>
            </form>

            <p className="cadastro-termos">
              Ao criar sua conta, você concorda com nossos termos de uso
              e política de privacidade.
            </p>

          </div>
        </div>

        <AuthFooter />
      </div>
    </>
  );
}