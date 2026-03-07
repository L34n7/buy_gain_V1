"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useNotifications } from "./NotificationsContext";
import "./header.css";

interface HeaderProps {
  userName: string;
  points: number;
  avatarUrl?: string | null;
}

export default function Header({ userName, avatarUrl }: HeaderProps) {
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
    marcarCreditoComoLido,
    marcarLevelUpComoLido,
    marcarConquistaComoLida,
  } = useNotifications();

  const [points, setPoints] = useState<number>(0);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [pointsDirection, setPointsDirection] = useState<"up" | "down" | null>(null);

  // controle separado: counting (true enquanto conta) e pulse (efeito maior)
  const [isCounting, setIsCounting] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  // evita animar no primeiro render
  const displayRef = useRef(displayPoints);
  useEffect(() => { displayRef.current = displayPoints; }, [displayPoints]);
  const initialPointsLoaded = useRef(false); // <<-- flag para o primeiro fetch

  const [level, setLevel] = useState<number>(1);

  /* NOVO: estado interno para avatar (inicializado a partir da prop) */
  const [avatarState, setAvatarState] = useState<string | null>(() => {
    // inicializa com cache-busted prop (se existir)
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

  // Função utilitária para forçar cache-bust em qualquer URL
  function cacheBust(url?: string | null) {
    if (!url) return null;
    try {
      const u = new URL(url);
      u.searchParams.set("v", Date.now().toString());
      return u.toString();
    } catch (e) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}v=${Date.now()}`;
    }
  }

  /* Sempre que a prop avatarUrl mudar (pai atualizou), atualiza avatarState também */
  useEffect(() => {
    if (!avatarUrl) {
      setAvatarState(null);
      return;
    }
    setAvatarState(cacheBust(avatarUrl));
  }, [avatarUrl]);

  /* Escuta eventos globais "profile:updated" para atualizar avatar quando outra tela (perfil-config) fizer upload */
  useEffect(() => {
    function onProfileUpdated(e: Event) {
      try {
        const ev = e as CustomEvent;
        const newUrl = ev?.detail?.avatar_url ?? null;
        if (!newUrl) return;
        setAvatarState(cacheBust(newUrl));
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener("profile:updated", onProfileUpdated as EventListener);
    return () => {
      window.removeEventListener("profile:updated", onProfileUpdated as EventListener);
    };
  }, []);

  /* BUSCAR SALDO DO EXTRATO */
  useEffect(() => {
    let timer: any;

    async function fetchSaldo() {
      const res = await fetch("/api/saldo", { credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();

      const newPoints = json.saldo ?? 0;
      setLevel(json.level ?? 1);

      if (!initialPointsLoaded.current) {
        // primeiro carregamento → SEM animação
        setPoints(newPoints);
        setDisplayPoints(newPoints);
        displayRef.current = newPoints;
        initialPointsLoaded.current = true;
      } else {
        // atualizações reais → COM animação
        setPoints(newPoints);
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

    document.addEventListener("visibilitychange", () => {
    });

    return () => {
      stop();
      document.removeEventListener("visibilitychange", () => {});
    };
  }, []);

  /* Efeito PONTOS */
  useEffect(() => {
    if (!initialPointsLoaded.current) return;
    if (points === displayRef.current) return;

    const startValue = displayRef.current;
    const endValue = points;
    const direction = endValue > startValue ? "up" : "down";
    setPointsDirection(direction);

    // DURATIONS (ajuste se quiser)
    const durationCount = 700;   // tempo da contagem (ms) — curta
    const durationPulse = 2000;  // tempo total do pulso (ms) — maior

    // garantimos que o pulso comece junto com a contagem
    setIsCounting(true);
    setIsPulsing(true);

    let rafId = 0;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationCount, 1);
      const value = Math.floor(startValue + (endValue - startValue) * progress);
      setDisplayPoints(value);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        // FIM da contagem: corrige o valor final
        setDisplayPoints(endValue);
        displayRef.current = endValue;
        setIsCounting(false);

        // mantém o pulso rodando até durationPulse completo; 
        // se durationPulse > durationCount, o pico do pulso acontece depois
        const remainingPulse = Math.max(durationPulse - durationCount, 0);
        // after remainingPulse, turn off pulsing
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
      // garante que qualquer pulso pendente seja desligado
      setIsCounting(false);
      setIsPulsing(false);
      setPointsDirection(null);
    };
  }, [points]);

  /* animação do logo */
  useEffect(() => {
    const timer = setTimeout(() => setLogoFaded(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  /* fechar menu profile ao clicar fora */
  useEffect(() => {
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
  }, [menuOpen]);

  /* fechar sino ao clicar fora */
  useEffect(() => {
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
  }, [bellOpen]);

  function getPageTitle() {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname === "/dashboard/compras") return "Compras";
    if (pathname === "/dashboard/historico") return "Histórico";
    if (pathname === "/dashboard/recompensas") return "Recompensas";
    return "Dashboard";
  }

  async function handleLogout() {
    if (!confirm("Deseja realmente sair da sua conta?")) return;

    // 🔥 encerra sessão no servidor (Supabase Auth)
    await fetch("/api/logout", { method: "POST" });

    // 🔥 NÃO usamos mais localStorage para auth
    router.replace("/auth/login");
  }

  return (
    <header className="dashboard-topbar">
      <div className="topbar-left">
        <div className="topbar-path">{getPageTitle()}</div>
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
        {/* 🔔 NOTIFICAÇÕES */}
        <div className="bell-wrapper">
          <button
            className="bell"
            onClick={() => setBellOpen((v) => !v)}
          >
            <p>🔔</p>
            {pendentes > 0 && (
              <span className="bell-badge">{pendentes}</span>
            )}
          </button>

          {bellOpen && (
            <div className="bell-dropdown">
              <div className="bell-dropdown-title">Notificações</div>

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
                  <div className="bell-item-title">
                    ✨ Pontos creditados
                  </div>
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
                  <div className="bell-item-sub">
                    {n.descricao}
                  </div>
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
                  <div className="bell-item-sub">
                    {n.descricao}
                  </div>
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
                    {ev.status === "AGUARDANDO_CONFIRMACAO" && "Confirmação de compra"}
                    {ev.status === "AGUARDANDO_RESPOSTA_CANCELADO" && "Cancelamento detectado"}
                    {ev.status === "SOLICITAR_PROVA" && "Enviar comprovante"}
                  </div>

                  <div className="bell-item-sub">
                    {ev.produto_nome ?? "Produto"}
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>

        {/* 👤 PROFILE */}
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
                onClick={() => {
                  setMenuOpen(false);
                  window.location.href = "/dashboard/perfil-config";
                }}
              >
                ⚙️ Configurações
              </button>

              <button
                className="profile-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/dashboard/ajuda");
                }}
              >
                ❓ Ajuda
              </button>

              <div className="profile-menu-divider" />

              <button
                className="profile-menu-item logout"
                onClick={handleLogout}
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
                key={avatarState}
              />
            ) : (
              <span className="profile-avatar-header-fallback">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {level !== null && (
            <div className="profile-level-under-avatar">
              {level}
            </div>
          )}

          <div className="profile-info">
            <div className="profile-name-header">
              {userName}
            </div>
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
      </div>
    </header>
  );
}
