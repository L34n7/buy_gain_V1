"use client";

import { createContext, useContext, useEffect, useState } from "react";

type NotificacaoCredito = {
  id: string;
  pontos: number;
  criado_em: string;
};

type NotificacaoLevelUp = {
  id: string;
  titulo: string;
  descricao: string;
  created_at: string;
};

type NotificacaoConquista = {
  id: string;
  titulo: string;
  descricao: string;
  created_at: string;
  lida?: boolean;
};

export type EventoPendente = {
  id: string;
  status?: string;
  produto_nome?: string;
};

type NotificationContextType = {
  pendentes: number;
  eventosPendentes: EventoPendente[];
  creditosNovos: NotificacaoCredito[];
  notificacoesLevelUp: NotificacaoLevelUp[];
  notificacoesConquista: NotificacaoConquista[]; 
  marcarCreditoComoLido: (id: string) => void;
  marcarLevelUpComoLido: (id: string) => Promise<void>;
  marcarConquistaComoLida: (id: string) => Promise<void>;
  abrirEvento: (id: string) => void;
  recarregar: () => void;
  marcarTodasComoLidas: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationContextType>({
  pendentes: 0,
  eventosPendentes: [],
  creditosNovos: [],
  notificacoesLevelUp: [],
  notificacoesConquista: [],
  marcarCreditoComoLido: () => {},
  marcarLevelUpComoLido: async () => {},
  marcarConquistaComoLida: async () => {},
  abrirEvento: () => {},
  recarregar: () => {},
  marcarTodasComoLidas: async () => {},
});

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [eventosPendentes, setEventosPendentes] = useState<EventoPendente[]>([]);
  const [eventoAberto, setEventoAberto] = useState<string | null>(null);
  const [creditosNovos, setCreditosNovos] = useState<NotificacaoCredito[]>([]);
  const [notificacoesLevelUp, setNotificacoesLevelUp] = useState<NotificacaoLevelUp[]>([]);
  const [notificacoesConquista, setNotificacoesConquista] = useState<NotificacaoConquista[]>([]);

  // =========================
  // MARCAR CRÉDITO COMO LIDO
  // =========================
  function marcarCreditoComoLido(id: string) {
    const lidos = JSON.parse(
      localStorage.getItem("creditos_lidos") || "[]"
    );

    if (!lidos.includes(id)) {
      lidos.push(id);
      localStorage.setItem("creditos_lidos", JSON.stringify(lidos));
    }

    setCreditosNovos((prev) => prev.filter((c) => c.id !== id));
  }

  // =========================
  // MARCAR LEVEL UP COMO LIDO (BANCO)
  // =========================
  async function marcarLevelUpComoLido(id: string) {
    try {
      await fetch("/api/notificacoes/marcar-lida", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      setNotificacoesLevelUp((prev) =>
        prev.filter((n) => n.id !== id)
      );
    } catch (err) {
      console.error("Erro ao marcar level up como lido:", err);
    }
  }

  // =========================
  // MARCAR CONQUISTA LIDO 
  // =========================

  async function marcarConquistaComoLida(id: string) {
  try {
    await fetch("/api/notificacoes/marcar-lida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });

    // 🔥 apenas marca como lida no state
    setNotificacoesConquista((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, lida: true } : n
      )
    );

  } catch (err) {
    console.error("Erro ao marcar conquista como lida:", err);
  }
}

  // =========================
  // MARCAR TODAS LIDO 
  // =========================

async function marcarTodasComoLidas() {
  try {
    // marca todos os créditos como lidos
    creditosNovos.forEach((c) => {
      const lidos = JSON.parse(localStorage.getItem("creditos_lidos") || "[]");

      if (!lidos.includes(c.id)) {
        lidos.push(c.id);
        localStorage.setItem("creditos_lidos", JSON.stringify(lidos));
      }
    });

    // remove todos os créditos do estado
    setCreditosNovos([]);

    // marca todos os level ups no banco
    await Promise.all(
      notificacoesLevelUp.map((n) =>
        fetch("/api/notificacoes/marcar-lida", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ id: n.id }),
        })
      )
    );

    // remove todos os level ups do estado
    setNotificacoesLevelUp([]);

    // marca todas as conquistas no banco
    await Promise.all(
      notificacoesConquista
        .filter((n) => !n.lida)
        .map((n) =>
          fetch("/api/notificacoes/marcar-lida", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ id: n.id }),
          })
        )
    );

    // marca todas as conquistas como lidas no state
    setNotificacoesConquista((prev) =>
      prev.map((n) => ({ ...n, lida: true }))
    );

  } catch (err) {
    console.error("Erro ao marcar todas como lidas:", err);
  }
}

  // =========================
  // EVENTOS DE COMPRA
  // =========================
  async function carregar() {
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) return;

      const json = await res.json();
      const eventos = json.data || [];

      const filtrados = eventos.filter(
        (e: any) =>
          e.status === "AGUARDANDO_CONFIRMACAO" ||
          e.status === "AGUARDANDO_RESPOSTA_CANCELADO" ||
          e.status === "SOLICITAR_PROVA"
      );

      setEventosPendentes(filtrados);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    }
  }

  // =========================
  // CRÉDITOS
  // =========================
  async function carregarCreditos() {
    try {
      const res = await fetch("/api/pontosnotificacao", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) return;

      const json = await res.json();
      const lista = json.data || [];

      const lidos = JSON.parse(
        localStorage.getItem("creditos_lidos") || "[]"
      );

      const novos = lista.filter(
        (c: any) => !lidos.includes(c.id)
      );

      setCreditosNovos(novos);
    } catch {}
  }

  // =========================
  // LEVEL UP (BANCO)
  // =========================
  async function carregarLevelUps() {
    try {
      const res = await fetch("/api/notificacoes", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) return;

      const json = await res.json();
      const lista = json.data || [];

      const apenasLevelUp = lista.filter(
        (n: any) => n.tipo === "LEVEL_UP"
      );

      const apenasConquistas = lista.filter(
        (n: any) => n.tipo === "CONQUISTA"
      );

      setNotificacoesLevelUp(apenasLevelUp);
      setNotificacoesConquista(apenasConquistas);
    } catch (err) {
      console.error("Erro ao carregar level ups:", err);
    }
  }

  // =========================
  // LOAD INICIAL
  // =========================
  useEffect(() => {
    carregar();
    carregarCreditos();
    carregarLevelUps();
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        pendentes:
          eventosPendentes.length +
          creditosNovos.length +
          notificacoesLevelUp.length +
          notificacoesConquista.length,
        eventosPendentes,
        creditosNovos,
        notificacoesLevelUp,
        notificacoesConquista,
        marcarCreditoComoLido,
        marcarLevelUpComoLido,
        marcarConquistaComoLida,
        marcarTodasComoLidas,
        abrirEvento: (id: string) => setEventoAberto(id),
        recarregar: () => {
          carregar();
          carregarCreditos();
          carregarLevelUps();
        },
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
