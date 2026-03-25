"use client";

import { useState, useEffect, useRef } from "react";
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
  const [codigoIndicacao, setCodigoIndicacao] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);

  const [registeredEmail, setRegisteredEmail] = useState("");
  const turnstileRef = useRef<any>(null);

  // =========================
  // Regras de senha
  // =========================
  const hasMinLength = password.length >= 6;
  const hasSpecial = /[!@#$%^&*]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const passwordsMatch =
    password === confirmPassword && password.length > 0;

  /* REQUISITOS MÍNIMOS PARA CADASTRO */
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
    if (success) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (!ref) return;

    const valor = ref
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 20);

    setCodigoIndicacao(valor);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!captchaToken) {
      setCaptchaError(true);
      return;
    }

    if (loading) return;

    if (!passwordValid) {
      setError("A senha não atende aos requisitos");
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          captchaToken,
          codigoIndicacao,
        }),
      });

      const data = await res.json();

      /* ERRO DA API */
      if (!res.ok) {
        if (data?.error?.includes("timeout-or-duplicate")) {
          setError("O captcha expirou. Confirme novamente que você não é um robô");
        } else {
          setError(data.error || "Erro ao cadastrar");
        }

        turnstileRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      /* SUCESSO */
      setError(null);
      setRegisteredEmail(email);
      setSuccess(true);

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setCodigoIndicacao("");

      turnstileRef.current?.reset();
      setCaptchaToken(null);
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
          style={{ zIndex: 2000 }}
        />
      )}

      <div className="auth-page">
        <div className="cadastro-wrapper">
          <div className="cadastro-card">
            <h1 className="cadastro-title">Crie sua conta grátis</h1>

            <p className="cadastro-sub">
              🔒 Seus dados são protegidos e nunca compartilhados.
            </p>

            <div className="cadastro-beneficios">
              <p>• Ganhe pontos automaticamente em cada compra</p>
              <p>• Resgate em Vale Presente e recompensas</p>
              <p>• 100% gratuito — sempre</p>
            </div>

            <form className="cadastro-form" onSubmit={handleSubmit} autoComplete="off">
              <input
                type="text"
                name="fakeusernameremembered"
                style={{ display: "none" }}
              />
              <input
                type="password"
                name="fakepasswordremembered"
                style={{ display: "none" }}
              />

              {/* Nome */}
              <div>
                <label className="cadastro-label">Nome</label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  className="cadastro-input"
                  autoComplete="name"
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
                  autoComplete="new-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  required
                />
              </div>

              {/* Código de indicação */}
              <div>
                <label className="cadastro-label">
                  Código de indicação <span style={{ opacity: 0.7 }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: BUYGAIN1997"
                  className="cadastro-input"
                  autoComplete="off"
                  value={codigoIndicacao}
                  onChange={(e) => {
                    const valor = e.target.value
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-zA-Z0-9]/g, "")
                      .toUpperCase();

                    setCodigoIndicacao(valor);
                    setError(null);
                  }}
                  maxLength={20}
                />
              </div>

              {/* Senha */}
              <div>
                <label className="cadastro-label">Senha</label>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Crie uma senha (mínimo 6 caracteres)"
                    className="cadastro-input"
                    autoComplete="new-password"
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
              </div>

              {/* Confirmar senha */}
              <div>
                <label className="cadastro-label">Confirmar senha</label>
                <div className="password-field">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    className="cadastro-input"
                    autoComplete="new-password"
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
              </div>

              {/* Regras */}
              <div className="password-rules">
                <Rule valid={hasMinLength} text="Mínimo de 6 caracteres" />
                <Rule valid={hasNumber} text="Número (senha mais forte)" />
                <Rule valid={hasSpecial} text="1 caractere especial (!@#$%^&*)" />
                <Rule valid={hasUpper} text="Letra maiúscula (senha mais forte)" />
                <Rule valid={passwordsMatch} text="As senhas conferem" />
              </div>

              {/* BARRA DE FORÇA */}
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

              <div className="cadastro-captcha">
                <Turnstile
                  ref={turnstileRef}
                  siteKey="0x4AAAAAACiJdMM95ZEJ0inL"
                  options={{ theme: "dark", size: "flexible" }}
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                    setCaptchaError(false);
                  }}
                  onExpire={() => {
                    setCaptchaToken(null);
                  }}
                />
              </div>

              {captchaError && (
                <p className="captcha-error">
                  Confirme que você não é um robô.
                </p>
              )}

              <button
                className={`cadastro-btn ${error ? "error" : ""}`}
                disabled={loading}
              >
                {loading
                  ? "Criando conta..."
                  : error
                  ? error
                  : "Criar minha conta"}
              </button>

              <p className="cadastro-link">
                Já tem conta? <a href="/auth/login">Entrar</a>
              </p>
            </form>

            <p className="cadastro-termos">
              Ao criar sua conta, você concorda com nossos
              <a href="/termos-de-uso"> Termos de Uso </a>
              e
              <a href="/politica-de-privacidade"> Política de Privacidade</a>.
            </p>
          </div>

          {success && (
            <div className="success-modal-overlay">
              <div className="success-modal">
                <h2>
                  Conta criada com sucesso!
                  <span className="success-emoji">🎉</span>
                </h2>

                <a>
                  Enviamos um link de confirmação para:
                  <p className="success-email">{registeredEmail}</p>
                </a>

                <a>
                  Abra sua caixa de entrada e clique no link para ativar sua conta.
                </a>

                <h3>
                  Se não encontrar o e-mail, verifique a pasta de spam.
                </h3>

                <button
                  className="success-btn"
                  onClick={() => {
                    window.location.href = "/auth/login";
                  }}
                >
                  Entendi, vou verificar meu e-mail
                </button>
              </div>
            </div>
          )}
        </div>

        <AuthFooter />
      </div>
    </>
  );
}