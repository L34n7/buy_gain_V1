"use client";

import { useEffect, useState } from "react";
import "./perfil.css";
import { emitirXpUpdate } from "@/lib/xpEmitter";

type Profile = {
  name?: string;
  nickname?: string;
  email?: string;
  avatar_url?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  document_value?: string | null;
};

type ProfileStats = {
  pontos_disponiveis: number;
  pontos_em_analise: number;
  compras_aprovadas: number;
  compras_em_analise: number;
};

type LevelInfo = {
  level_atual: number;
  xp_atual: number;
  xp_proximo_level: number;
};

type Achievement = {
  id: string;
  titulo: string;
  descricao: string;
  unlocked: boolean;
  xp_recompensa: number;
};

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [loading, setLoading] = useState(true);
  const [xpPopup, setXpPopup] = useState<number | null>(null);

  
useEffect(() => {
  async function load() {
    try {
      // 1️⃣ Chama XP diário
      const xpRes = await fetch("/api/xp/daily-login", {
        credentials: "include",
        method: "POST",
      });

      let levelFromXp: LevelInfo | null = null;

      if (xpRes.ok) {
        const xpJson = await xpRes.json();

        // 🎮 Popup de XP
        if (xpJson.gained) {
          setXpPopup(xpJson.xp_gained ?? 50);
          setTimeout(() => setXpPopup(null), 2500);
        }

        // 🆙 LEVEL UP AO VIVO
        if (xpJson.leveled_up) {
          levelFromXp = {
            level_atual: xpJson.new_level,
            xp_atual: xpJson.xp_current,
            xp_proximo_level: xpJson.xp_next_level,
          };
        }
      }

      // 2️⃣ Buscar perfil
      const res = await fetch("/api/profile",{
      credentials: "include",
    });
      if (!res.ok) return;

      const json = await res.json();
      emitirXpUpdate(json);
      setProfile(json.profile ?? null);
      setAchievements(json.achievements ?? []);

      // 🔥 Buscar métricas dos cards
      const cardsRes = await fetch("/api/profile/cards", {
        method: "POST",
        credentials: "include",
      });

      if (cardsRes.ok) {
        const cardsJson = await cardsRes.json();

        setStats({
          pontos_disponiveis: cardsJson.pontosDisponiveis,
          pontos_em_analise: cardsJson.pontosEmAnalise,
          compras_aprovadas: cardsJson.comprasAprovadas,
          compras_em_analise: cardsJson.comprasEmAnalise,
        });
      }
      
      // 🧠 PRIORIDADE:
      // se subiu level agora → usa ele
      // senão → usa o que veio do perfil
      setLevel(levelFromXp ?? json.level ?? null);

    } catch (err) {
      console.error("Erro ao carregar perfil", err);
    } finally {
      setLoading(false);
    }
  }

  load();
}, []);



  const displayName =
    profile?.nickname || profile?.name || "Usuário";

  const xpPercent =
    level
      ? Math.min(
          100,
          Math.round(
            (level.xp_atual / level.xp_proximo_level) * 100
          )
        )
      : 0;

  function maskCPF(cpf?: string | null) {
    if (!cpf) return "—";
    const clean = cpf.replace(/\D/g, "");
    if (clean.length < 11) return "—";
    return `***.***.${clean.slice(6, 9)}-**`;
  }

  function formatDate(date?: string | null) {
    if (!date) return "—";

    // Esperado: YYYY-MM-DD
    const [year, month, day] = date.split("-");

    if (!year || !month || !day) return "—";

    return `${day}/${month}/${year}`;
  }

  // 🔥 Ordena: desbloqueadas primeiro
  const sortedAchievements = [...achievements].sort(
    (a, b) => Number(b.unlocked) - Number(a.unlocked)
  );

  // 🔥 Mostra apenas 8 se não estiver expandido
  const visibleAchievements = showAllAchievements
    ? sortedAchievements
    : sortedAchievements.slice(0, 9);
    
  return (
    <section className="profile-page">

      {xpPopup && (
        <div className="xp-popup">
          <span>+{xpPopup} XP</span>
        </div>
      )}

      <h1 className="profile-title">Meu Perfil</h1>

      {loading && (
        <div className="profile-loading">
          Carregando informações do perfil…
        </div>
      )}

      {!loading && profile && (
        <>
          {/* 🎮 PLAYER CARD */}
          <div className="profile-card">
            <div className="profile-card-left">
              <div className="avatar-wrapper">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="avatar-img"
                  />
                ) : (
                  <div className="avatar-fallback">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

            <div className="profile-meta">
            <div className="profile-name-row">
              <h2 className="profile-name">{displayName}</h2>

              <span className="name-level-badge">
                <b>★</b> {level?.level_atual}
              </span>
            </div>


              <p className="profile-email">{profile.email ?? "—"}</p>

              <div className="profile-extra">
                <span> <strong>Local: </strong>{profile.city ?? "—"} • {profile.state ?? "—"}</span>
                <span> <strong>Nascimento: </strong> {formatDate(profile.birth_date)}</span>
                <span> <strong>CPF: </strong> {maskCPF(profile.document_value)}</span>
                <span> <strong>Celular: </strong> {profile.phone ?? "—"}</span>
              </div>
            </div>

            </div>

            <div className="profile-card-actions">
              <a
                href="/dashboard/perfil-config"
                className="btn btn-primary"
              >
                Editar perfil
              </a>
            </div>
          </div>

          {/* ⭐ LEVEL & XP */}
          {level && (
            <div className="level-card">
              <div className="level-header">
                <span className="level-badge">
                 <b>★</b> Level {level.level_atual}
                </span>
                <span className="xp-text">
                  {level.xp_atual} / {level.xp_proximo_level} XP
                </span>
              </div>

              <div className="xp-bar">
                <div
                  className="xp-bar-fill"
                  style={{ width: `${xpPercent}%` }}
                >
                  <span className="xp-fill-label">{xpPercent}%</span>
                </div>
              </div>
            </div>
          )}


          {/* 🧠 STATS */}
          {stats && (
            <div className="profile-stats-grid">
              <div className="stat-card gold">
                <span className="stat-label">Pontos disponíveis</span>
                <strong className="stat-value">
                  {stats.pontos_disponiveis}
                </strong>
              </div>

              <div className="stat-card warning">
                <span className="stat-label">Pontos em análise</span>
                <strong className="stat-value">
                  {stats.pontos_em_analise}
                </strong>
              </div>

              <div className="stat-card success">
                <span className="stat-label">Compras aprovadas</span>
                <strong className="stat-value">
                  {stats.compras_aprovadas}
                </strong>
              </div>

              <div className="stat-card info">
                <span className="stat-label">Compras em análise</span>
                <strong className="stat-value">
                  {stats.compras_em_analise}
                </strong>
              </div>
            </div>
          )}

          {/* 🏆 CONQUISTAS */}
          {achievements.length > 0 && (
            <div className="achievements-section">
              <h3 className="section-title">Conquistas</h3>

              <div className="achievements-grid">
                {visibleAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`achievement-card ${
                      ach.unlocked ? "unlocked" : "locked"
                    }`}
                  >
                    <div className="achievement-icon">
                      {ach.unlocked ? "🏆" : "🔒"}
                    </div>

                  <div className="achievement-content">
                    <strong>{ach.titulo}</strong>
                    <p>{ach.descricao}</p>
                  </div>

                  <span className="achievement-xp">
                    +{ach.xp_recompensa} XP
                  </span>
                  </div>
                ))}
              </div>
              
              {achievements.length > 8 && (
                <div className="achievements-actions">
                  <button
                    className="btn-show-more"
                    onClick={() => setShowAllAchievements(prev => !prev)}
                  >
                    {showAllAchievements ? "Mostrar menos" : "Exibir mais"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
