"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useNotifications } from "./NotificationsContext";
import "./header.css";

interface HeaderProps {
  userName: string;
  points: number;
  avatarUrl?: string | null;
  isGuest?: boolean | null;
}

type LevelBonusData = {
  level_bonus_percent: number;
  level_bonus_started_at: string | null;
  level_bonus_expires_at: string | null;
  level_bonus_active: boolean;
};

export default function Header({
  userName,
  avatarUrl,
  isGuest = null,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [logoFaded, setLogoFaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const {
    pendentes,
    eventosPendentes,
    creditosNovos,
    notificacoesLevelUp,
    notificacoesConquista,
    notificacoesRecompensa,
    notificacoesChamado,
    notificacoesAvaliacao,
    marcarCreditoComoLido,
    marcarLevelUpComoLido,
    marcarConquistaComoLida,
    marcarRecompensaComoLida,
    marcarTodasComoLidas,
    marcarChamadoComoLida,
  } = useNotifications();

  const [points, setPoints] = useState<number>(0);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [pointsDirection, setPointsDirection] = useState<"up" | "down" | null>(
    null
  );

  const [isCounting, setIsCounting] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  const displayRef = useRef(displayPoints);
  useEffect(() => {
    displayRef.current = displayPoints;
  }, [displayPoints]);

  const initialPointsLoaded = useRef(false);

  const [level, setLevel] = useState<number>(1);

  const [levelBonus, setLevelBonus] = useState<LevelBonusData>({
    level_bonus_percent: 0,
    level_bonus_started_at: null,
    level_bonus_expires_at: null,
    level_bonus_active: false,
  });

  const [bonusNow, setBonusNow] = useState<number>(Date.now());

  const [avatarState, setAvatarState] = useState<string | null>(() => {
    if (!avatarUrl) return null;
    try {
      const u = new URL(avatarUrl);
      u.searchParams.set("v", Date.now().toString());
      return u.toString();
    } catch {
      const sep = avatarUrl.includes("?") ? "&" : "?";
      return `${avatarUrl}${sep}v=${Date.now()}`;
    }
  });

  function cacheBust(url?: string | null) {
    if (!url) return null;
    try {
      const u = new URL(url);
      u.searchParams.set("v", Date.now().toString());
      return u.toString();
    } catch {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}v=${Date.now()}`;
    }
  }

  function isLevelBonusActive(bonus: LevelBonusData) {
    if (!bonus) return false;
    if (!bonus.level_bonus_active) return false;
    if (!bonus.level_bonus_percent || bonus.level_bonus_percent <= 0)
      return false;
    if (!bonus.level_bonus_started_at) return false;
    if (!bonus.level_bonus_expires_at) return false;

    return new Date(bonus.level_bonus_expires_at).getTime() > bonusNow;
  }

  function formatBonusRemaining(expiresAt?: string | null) {
    if (!expiresAt) return "";

    const diff = new Date(expiresAt).getTime() - bonusNow;

    if (diff <= 0) return "expirado";

    const totalMinutes = Math.floor(diff / 1000 / 60);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h restantes`;
    if (hours > 0) return `${hours}h ${minutes}min restantes`;
    return `${minutes}min restantes`;
  }

  const bonusAtivo = isGuest === false && isLevelBonusActive(levelBonus);

  useEffect(() => {
    if (!avatarUrl) {
      setAvatarState(null);
      return;
    }
    setAvatarState(cacheBust(avatarUrl));
  }, [avatarUrl]);

  useEffect(() => {
    if (isGuest !== false) return;

    function onProfileUpdated(e: Event) {
      try {
        const ev = e as CustomEvent;
        const newUrl = ev?.detail?.avatar_url ?? null;
        if (!newUrl) return;
        setAvatarState(cacheBust(newUrl));
      } catch {
        // ignore
      }
    }

    window.addEventListener(
      "profile:updated",
      onProfileUpdated as EventListener
    );
    return () => {
      window.removeEventListener(
        "profile:updated",
        onProfileUpdated as EventListener
      );
    };
  }, [isGuest]);

  useEffect(() => {
    if (isGuest === null) return;

    if (isGuest === true) {
      setPoints(0);
      setDisplayPoints(0);
      setLevel(1);
      return;
    }

    let timer: any;
    let loadingSaldo = false;

    async function fetchSaldo() {
      if (loadingSaldo) return;
      loadingSaldo = true;

      try {
        const res = await fetch("/api/saldo", { credentials: "include" });

        if (res.status === 401) {
          clearInterval(timer);
          return;
        }

        if (!res.ok) return;

        const json = await res.json();

        const newPoints = json.saldo ?? 0;
        setLevel(json.level ?? 1);

        if (!initialPointsLoaded.current) {
          setPoints(newPoints);
          setDisplayPoints(newPoints);
          displayRef.current = newPoints;
          initialPointsLoaded.current = true;
        } else {
          setPoints(newPoints);
        }
      } catch (err) {
        console.error("Erro ao buscar saldo:", err);
      } finally {
        loadingSaldo = false;
      }
    }

    function start() {
      fetchSaldo();
      timer = setInterval(fetchSaldo, 30000);
    }

    function stop() {
      if (timer) clearInterval(timer);
    }

    start();

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchSaldo();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isGuest]);

  useEffect(() => {
    if (isGuest !== false) return;
    if (!initialPointsLoaded.current) return;
    if (points === displayRef.current) return;

    const startValue = displayRef.current;
    const endValue = points;
    const direction = endValue > startValue ? "up" : "down";
    setPointsDirection(direction);

    const durationCount = 700;
    const durationPulse = 2000;

    setIsCounting(true);
    setIsPulsing(true);

    let rafId = 0;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationCount, 1);
      const value = Math.floor(
        startValue + (endValue - startValue) * progress
      );
      setDisplayPoints(value);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayPoints(endValue);
        displayRef.current = endValue;
        setIsCounting(false);

        const remainingPulse = Math.max(durationPulse - durationCount, 0);
        const toId = window.setTimeout(() => {
          setIsPulsing(false);
          setPointsDirection(null);
          clearTimeout(toId);
        }, remainingPulse);
      }
    }

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      setIsCounting(false);
      setIsPulsing(false);
      setPointsDirection(null);
    };
  }, [points, isGuest]);

  useEffect(() => {
    const timer = setTimeout(() => setLogoFaded(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isGuest !== false) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".profile")) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("click", handleClick);
    }

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [menuOpen, isGuest]);

  useEffect(() => {
    if (isGuest !== false) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".bell-wrapper")) {
        setBellOpen(false);
      }
    }

    if (bellOpen) {
      document.addEventListener("click", handleClick);
    }

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [bellOpen, isGuest]);

  useEffect(() => {
    if (isGuest === null) return;

    if (isGuest === true) {
      setLevelBonus({
        level_bonus_percent: 0,
        level_bonus_started_at: null,
        level_bonus_expires_at: null,
        level_bonus_active: false,
      });
      return;
    }

    function loadBonusFromStorage() {
      try {
        const raw = localStorage.getItem("dashboard_level_bonus");
        if (!raw) return;

        const parsed = JSON.parse(raw);

        setLevelBonus({
          level_bonus_percent: parsed?.level_bonus_percent ?? 0,
          level_bonus_started_at: parsed?.level_bonus_started_at ?? null,
          level_bonus_expires_at: parsed?.level_bonus_expires_at ?? null,
          level_bonus_active: parsed?.level_bonus_active ?? false,
        });
      } catch (err) {
        console.error("Erro ao ler bônus do localStorage:", err);
      }
    }

    function onBonusUpdated(e: Event) {
      try {
        const ev = e as CustomEvent<LevelBonusData>;
        if (!ev.detail) return;

        setLevelBonus({
          level_bonus_percent: ev.detail.level_bonus_percent ?? 0,
          level_bonus_started_at: ev.detail.level_bonus_started_at ?? null,
          level_bonus_expires_at: ev.detail.level_bonus_expires_at ?? null,
          level_bonus_active: ev.detail.level_bonus_active ?? false,
        });
      } catch (err) {
        console.error("Erro ao atualizar bônus via evento:", err);
      }
    }

    loadBonusFromStorage();

    window.addEventListener(
      "dashboard:level-bonus-updated",
      onBonusUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        "dashboard:level-bonus-updated",
        onBonusUpdated as EventListener
      );
    };
  }, [isGuest]);

  useEffect(() => {
    if (isGuest !== false) return;

    const interval = window.setInterval(() => {
      setBonusNow(Date.now());
    }, 60000);

    return () => window.clearInterval(interval);
  }, [isGuest]);

  function getPageTitle() {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname === "/dashboard/compras") return "Compras";
    if (pathname === "/dashboard/historico") return "Histórico";
    if (pathname === "/dashboard/recompensas") return "Recompensas";
    return "Dashboard";
  }

  const [logoutModal, setLogoutModal] = useState(false);

  async function confirmLogout() {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    localStorage.removeItem("auth_user_id");
    localStorage.removeItem("dashboard_level_bonus");

    router.replace("/auth/login");
  }

  if (isGuest === null) {
  return (
    <header className="dashboard-topbar">
      <div className="topbar-left" />
      <div className="brand-logo-wrapper">
        <img
          src="/logo.png"
          alt="BuyGain"
          className={`brand-logo ${logoFaded ? "faded" : ""}`}
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      <div className="topbar-right" />
    </header>
  );
}

  return (
    <header className="dashboard-topbar">
      <div className={`topbar-left ${isGuest === true ? "topbar-left-hidden" : ""}`}>
        
        {/* 🔥 BOTÃO LANDING - SOMENTE VISITANTE */}
        {isGuest === true && (
          <Link href="/public" className="landing-btn">
            <span className="landing-icon">🚀</span>
            <span className="landing-text">Como ganhar pontos? venha conhecer</span>
          </Link>
        )}

        {isGuest === false && (
          <div className="topbar-path">{getPageTitle()}</div>
        )}
      </div>

      <div className="brand-logo-wrapper">
        <img
          src="/logo.png"
          alt="BuyGain"
          className={`brand-logo ${logoFaded ? "faded" : ""}`}
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="topbar-right">
        {!isGuest && bonusAtivo && (
          <div
            className="level-bonus-badge"
            title={`Bônus ativo: +${levelBonus.level_bonus_percent}% nas compras • ${formatBonusRemaining(
              levelBonus.level_bonus_expires_at
            )}`}
          >
            <span className="level-bonus-icon">🔥</span>
            <span className="level-bonus-text">
              Bonus Ativo +{levelBonus.level_bonus_percent}%
            </span>
          </div>
        )}

        {isGuest === true ? (
          <div className="guest-auth-actions">
            <Link href="/auth/login" className="guest-auth-btn guest-login-btn">
              Entrar
            </Link>

            <Link
              href="/auth/cadastro"
              className="guest-auth-btn guest-signup-btn"
            >
              Cadastrar
            </Link>
          </div>
        ) : (
          <>
            <div className="bell-wrapper">
              <button
                className={`bell ${
                  pendentes > 0 ? "has-notifications" : "no-notifications"
                }`}
                onClick={() => setBellOpen((v) => !v)}
              >
                <p>🔔</p>
                {pendentes > 0 && <span className="bell-badge">{pendentes}</span>}
              </button>

              {bellOpen && (
                <div className="bell-dropdown">
                  <div className="bell-dropdown-head">
                    <div className="bell-dropdown-title">Notificações</div>

                    <button
                      className="bell-mark-all"
                      disabled={pendentes === 0}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await marcarTodasComoLidas();
                      }}
                    >
                      Marcar todas Lidas
                    </button>
                  </div>

                  {pendentes === 0 && (
                    <div className="bell-empty">
                      Nenhuma notificação pendente
                    </div>
                  )}

                  {creditosNovos.map((c) => (
                    <div
                      key={c.id}
                      className="bell-item credito"
                      onClick={() => marcarCreditoComoLido(c.id)}
                    >
                      <div className="bell-item-title">✨ Pontos creditados</div>
                      <div className="bell-item-sub">
                        +{c.pontos.toLocaleString()} pontos
                      </div>
                    </div>
                  ))}

                  {notificacoesLevelUp.map((n) => (
                    <div
                      key={n.id}
                      className="bell-item levelup"
                      onClick={() => marcarLevelUpComoLido(n.id)}
                    >
                      <div className="bell-item-title">
                        🚀 Novo nível alcançado!
                      </div>
                      <div className="bell-item-sub">{n.descricao}</div>
                    </div>
                  ))}

                  {notificacoesConquista.map((n) => (
                    <div
                      key={n.id}
                      className={`bell-item conquista ${n.lida ? "lida" : ""}`}
                      onClick={async () => {
                        await marcarConquistaComoLida(n.id);
                        setBellOpen(false);
                        router.push("/dashboard/perfil");
                      }}
                    >
                      <div className="bell-item-title">
                        🏆 Nova conquista desbloqueada!
                      </div>
                      <div className="bell-item-sub">{n.descricao}</div>
                    </div>
                  ))}

                  {notificacoesRecompensa.map((n) => (
                    <div
                      key={n.id}
                      className="bell-item recompensa"
                      onClick={async () => {
                        await marcarRecompensaComoLida(n.id);
                        setBellOpen(false);
                        router.push("/dashboard/inventario");
                      }}
                    >
                      <div className="bell-item-title">
                        🎁 Recompensa processada
                      </div>
                      <div className="bell-item-sub">{n.descricao}</div>
                    </div>
                  ))}

                  {notificacoesChamado.map((n) => (
                    <div
                      key={n.id}
                      className="bell-item chamado"
                      onClick={async () => {
                        await marcarChamadoComoLida(n.id);
                        setBellOpen(false);
                        router.push("/dashboard/ajuda/meus-chamados");
                      }}
                    >
                      <div className="bell-item-title">{n.titulo}</div>
                      <div className="bell-item-sub">{n.descricao}</div>
                    </div>
                  ))}

                  {eventosPendentes.map((ev) => (
                    <div
                      key={ev.id}
                      className="bell-item"
                      onClick={() => {
                        setBellOpen(false);
                        router.push("/dashboard/compras");
                      }}
                    >
                      <div className="bell-item-title">
                        {ev.status === "AGUARDANDO_CONFIRMACAO" &&
                          "Confirmação de compra"}
                        {ev.status === "AGUARDANDO_RESPOSTA_CANCELADO" &&
                          "Cancelamento detectado"}
                        {ev.status === "SOLICITAR_PROVA" &&
                          "Enviar comprovante"}
                      </div>

                      <div className="bell-item-sub">
                        {ev.produto_nome ?? "Produto"}
                      </div>
                    </div>
                  ))}

                  {notificacoesAvaliacao.map((n) => (
                    <div
                      key={n.id}
                      className="bell-item avaliacao"
                      onClick={() => {
                        setBellOpen(false);
                        window.dispatchEvent(
                          new Event("abrir-modal-avaliacao-plataforma")
                        );
                      }}
                    >
                      <div className="bell-item-title">⭐ {n.titulo}</div>
                      <div className="bell-item-sub">{n.descricao}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="profile" onClick={() => setMenuOpen((v) => !v)}>
              {menuOpen && (
                <div className="profile-menu">
                  <button
                    className="profile-menu-item"
                    onClick={() => router.push("/dashboard/perfil")}
                  >
                    👤 Perfil
                  </button>

                  <button
                    className="profile-menu-item"
                    onClick={() => router.push("/dashboard/perfil-config")}
                  >
                    ⚙️ Configurações
                  </button>

                  <button
                    className="profile-menu-item"
                    onClick={() => router.push("/dashboard/ajuda")}
                  >
                    ❓ Ajuda
                  </button>

                  <div className="profile-menu-divider" />

                  <button
                    className="profile-menu-item logout"
                    onClick={() => setLogoutModal(true)}
                  >
                    🚪 Sair
                  </button>
                </div>
              )}

              <div className="profile-avatar-header">
                {avatarState ? (
                  <img
                    src={avatarState}
                    alt="Avatar"
                    className="profile-avatar-img-header"
                  />
                ) : (
                  <span className="profile-avatar-header-fallback">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {level !== null && (
                <div className="profile-level-under-avatar">{level}</div>
              )}

              <div className="profile-info">
                <div className="profile-name-header">{userName}</div>

                <div
                  className={`profile-points
                    ${isPulsing ? "points-pulse" : ""}
                    ${pointsDirection === "up" ? "points-up" : ""}
                    ${pointsDirection === "down" ? "points-down" : ""}
                  `}
                >
                  💎
                  {displayPoints}
                  {isPulsing && pointsDirection && (
                    <span className="points-sign">
                      {pointsDirection === "up" ? "+" : "-"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {isGuest === false && logoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="logout-title">Sair da conta</div>

            <div className="logout-text">
              Deseja realmente sair da sua conta?
            </div>

            <div className="logout-actions">
              <button
                className="logout-cancel"
                onClick={() => setLogoutModal(false)}
              >
                Cancelar
              </button>

              <button className="logout-confirm" onClick={confirmLogout}>
                Sim, sair
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}