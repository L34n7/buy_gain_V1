
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "./inventario.css";
import { emitirXpUpdate } from "@/lib/xpEmitter";
import { useNotifications } from "../components/NotificationsContext";

type InventarioItem = {
  id: string;
  status: string;
  pontos_usados: number;
  criado_em: string;
  processado_em?: string;
  giftcard?: {
    nome?: string;
    imagem?: string;
  };
  opcao?: {
    descricao?: string;
  };
  codigo?: {
    codigo?: string;
  }[];
};

export default function InventarioPage() {
  const [itens, setItens] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemSelecionado, setItemSelecionado] = useState<InventarioItem | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const { notificacoesRecompensa, marcarRecompensaComoLida } = useNotifications();

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch("/api/recompensas/inventario", {
          credentials: "include",
        });

        const json = await res.json();
        emitirXpUpdate(json);
        setItens(json.data || []);
      } catch (err) {
        console.error("Erro ao carregar inventário:", err);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  useEffect(() => {
    if (modalAberto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [modalAberto]);

  useEffect(() => {
  if (modalAberto) {
    setCopiado(false);
  }
}, [modalAberto]);  

  function getStatusInfo(status: string) {
    switch (status) {
        case "PENDENTE":
        return { label: "⏳ Em processamento", className: "status-pendente" };
        case "CONCLUIDO":
        return { label: "✅ Concluído", className: "status-processado" };
        case "CANCELADO":
        return { label: "❌ Cancelado", className: "status-cancelado" };
        default:
        return { label: status, className: "" };
    }
  }

  useEffect(() => {
  async function limparBadgeInventario() {
    if (!notificacoesRecompensa.length) return;

    await Promise.all(
      notificacoesRecompensa.map((n) =>
        marcarRecompensaComoLida(n.id)
      )
    );
  }

  limparBadgeInventario();
}, []);

  return (
  <div className="inveboard-container">
    <div className="inveboard-card inventario-page">
      <h2 className="inveboard-title">🎒 Meu Inventário</h2>

      {loading && <p>Carregando recompensas...</p>}

      {!loading && itens.length === 0 && (
        <p>Você ainda não resgatou nenhuma recompensa.</p>
      )}

      <div className="inventario-lista">
        {itens.map((item) => {
          const codigo = item.codigo?.[0]?.codigo;
          const statusInfo = getStatusInfo(item.status);

          return (
            <div
              key={item.id}
              className="inventario-card"
              onClick={() => {
                setItemSelecionado(item);
                setModalAberto(true);
              }}
            >
              <div className="inventario-left">
                {item.giftcard?.imagem && (
                  <Image
                    src={item.giftcard.imagem}
                    alt={item.giftcard.nome ?? "Giftcard"}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                )}
              </div>

              <div className="inventario-info">
                <strong>{item.giftcard?.nome}</strong>

                <div className="muted">
                  {item.opcao?.descricao}
                </div>

                <div className="pontos">
                  💎 {item.pontos_usados.toLocaleString()} pontos
                </div>

                <div className="inventario-meta">
                  <span className={`status ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>

                  <span className="meta-item">
                    📅 {new Date(item.criado_em).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                {item.status === "PENDENTE" && (
                  <div className="prazo-info">
                    ⏳ Prazo: até 72h após a data de criação
                  </div>
                )}

                {item.status === "PROCESSADO" && codigo && (
                  <div className="codigo">
                    <span>Código:</span>
                    <code>{codigo}</code>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* ================= MODAL PREMIUM ================= */}

    {modalAberto && itemSelecionado && (
      <div
        className="inve-modal-overlay-i"
        onClick={() => setModalAberto(false)}
      >
        <div
          className="inve-modal-card"
          onClick={(e) => e.stopPropagation()}
        >

          {/* IMAGEM FULL TOPO */}
          {itemSelecionado.giftcard?.imagem && (
            <div className="inve-modal-image-wrapper">

              <button
                className="inve-modal-close"
                onClick={() => setModalAberto(false)}
              >
                ✕
              </button>

              <Image
                src={itemSelecionado.giftcard.imagem}
                alt={itemSelecionado.giftcard.nome ?? "Giftcard"}
                fill
                className="inve-modal-image"
              />
            </div>
          )}

          {/* CONTEÚDO */}
          <div className="inve-modal-content">

            <div className="inve-modal-header">
              <h2 className="inve-modal-title">
                {itemSelecionado.giftcard?.nome}
              </h2>
            </div>

            {itemSelecionado.opcao?.descricao && (
              <p className="inve-modal-desc">
                {itemSelecionado.opcao.descricao}
              </p>
            )}

            <div className="inve-modal-meta">
              <span>
                📅 {new Date(itemSelecionado.criado_em).toLocaleDateString("pt-BR")}
              </span>

              <span className={`status ${getStatusInfo(itemSelecionado.status).className}`}>
                {getStatusInfo(itemSelecionado.status).label}
              </span>
            </div>

            <div className="pontos">
              💎 {itemSelecionado.pontos_usados.toLocaleString()} pontos
            </div>

            {itemSelecionado.status === "PENDENTE" && (
              <div className="prazo-info">
                ⏳ Prazo: até 72h após o resgate.
              </div>
            )}

            {itemSelecionado.codigo?.[0]?.codigo && (
              <div className="codigo-card">
                <div className="codigo-code-label">
                  Código da recompensa
                </div>

                <div className="codigo-code-value">
                  {itemSelecionado.codigo[0].codigo}
                </div>

              <button
                className={`codigo-copy-btn ${copiado ? "copiado" : ""}`}
                onClick={() => {
                  if (!itemSelecionado?.codigo?.[0]?.codigo) return;

                  navigator.clipboard.writeText(
                    itemSelecionado.codigo[0].codigo
                  );

                  setCopiado(true);

                  setTimeout(() => {
                    setCopiado(false);
                  }, 2000);
                }}
              >
                {copiado ? "✅ Código copiado!" : "Copiar código"}
              </button>
              </div>
            )}

          </div>
        </div>
      </div>
    )}
  </div>
);
}
