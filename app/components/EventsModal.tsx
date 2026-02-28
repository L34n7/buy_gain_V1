"use client";

import React from "react";
import { calcularPrazoRestante, statusExigeResposta } from "../dashboard/utils/prazo";
import { formatDate } from "../dashboard/utils/format";

export type EventoPendente = {
  id: string;
  status?: string;
  data_evento?: string;
  data_update?: string;
  link_rastreado?: string;
  produto_nome?: string;
  produto_imagem?: string;
  ganho_pontos?: number;
  produto_vendas?: number;
};

type Props = {
  eventoModalId: string | null;
  eventosPendentes: EventoPendente[];
  onClose: () => void;

  onConfirmar: (id: string) => void;
  onDescartar: (id: string) => void;
  onConfirmarCancelamento: (id: string) => void;
  onNegarCancelamento: (id: string) => void;

  relato: string;
  setRelato: (v: string) => void;
  arquivo: File | null;
  setArquivo: (f: File | null) => void;

  onUploadProva: () => void;
};

export default function EventsModal({
  eventoModalId,
  eventosPendentes,
  onClose,
  onConfirmar,
  onDescartar,
  onConfirmarCancelamento,
  onNegarCancelamento,
  relato,
  setRelato,
  arquivo,
  setArquivo,
  onUploadProva,
}: Props) {
  if (!eventoModalId) return null;

  const eventoAtual = eventosPendentes.find(
    (e) => e.id === eventoModalId
  );

  if (!eventoAtual) return null;

  const prazo =
    eventoAtual.status === "AGUARDANDO_CONFIRMACAO"
      ? calcularPrazoRestante(
          eventoAtual.data_update || eventoAtual.data_evento,
          "CONFIRMACAO"
        )
      : eventoAtual.status === "AGUARDANDO_RESPOSTA_CANCELADO"
      ? calcularPrazoRestante(
          eventoAtual.data_update || eventoAtual.data_evento,
          "CANCELAMENTO"
        )
      : eventoAtual.status === "SOLICITAR_PROVA"
      ? calcularPrazoRestante(
          eventoAtual.data_update || eventoAtual.data_evento,
          "PROVA"
        )
      : null;

  return (
    <div className="dash-modal-overlay" role="dialog" aria-modal="true">
      <div className="dash-modal-card">
        {/* HEADER */}
        <div className="dash-modal-header">
          <h3 className="dash-modal-title">
            {eventoAtual.status === "AGUARDANDO_CONFIRMACAO" &&
              "Confirmação de Compra"}
            {eventoAtual.status ===
              "AGUARDANDO_RESPOSTA_CANCELADO" &&
              "Confirmação de cancelamento"}
            {eventoAtual.status === "SOLICITAR_PROVA" &&
              "Solicitação Prova de Compra"}
          </h3>

          <button
            className="dash-modal-close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        {/* DESCRIÇÃO */}
        <p className="dash-modal-desc">
          {eventoAtual.status === "AGUARDANDO_CONFIRMACAO" &&
            "Você fez a compra desse produto abaixo?"}

          {eventoAtual.status ===
            "AGUARDANDO_RESPOSTA_CANCELADO" &&
            "Detectamos o cancelamento deste evento. Confirme se foi você."}

          {eventoAtual.status === "SOLICITAR_PROVA" &&
            "Identificamos uma divergência nesta compra. Para continuarmos com a análise, descreva o ocorrido e envie um comprovante."}
        </p>

        {/* EVENTO */}
        <div className="dash-event-card">
          <img
            src={
              eventoAtual.produto_imagem ||
              "/images/product-placeholder.png"
            }
            className="dash-event-img"
            alt="Produto"
          />

          <div className="dash-event-info">
            <div className="dash-event-name">
              {eventoAtual.produto_nome ??
                "Produto não identificado"}
            </div>

            <div className="dash-event-link">
              {eventoAtual.link_rastreado}
            </div>

            <div className="dash-event-meta">
              <div>
                Valor:{" "}
                <strong>
                  {typeof eventoAtual.produto_vendas ===
                  "number"
                    ? `R$ ${eventoAtual.produto_vendas.toFixed(
                        2
                      )}`
                    : "-"}
                </strong>
              </div>

              <div>
                Pontos:{" "}
                <strong>
                  {eventoAtual.ganho_pontos ?? "-"}
                </strong>
              </div>
            </div>

            <div className="dash-event-date">
              Data: {formatDate(eventoAtual.data_evento)}
            </div>
          </div>
        </div>

        {/* AÇÕES */}
        <div className="dash-modal-actions">
          {eventoAtual.status ===
            "AGUARDANDO_CONFIRMACAO" && (
            <div className="dash-actions-row">
              <button
                className="btn-dash dash-btn-primary"
                onClick={() =>
                  onConfirmar(eventoAtual.id)
                }
              >
                Sim, comprei
              </button>

              <button
                className="btn-dash dash-btn-secondary"
                onClick={() =>
                  onDescartar(eventoAtual.id)
                }
              >
                Não comprei
              </button>
            </div>
          )}

          {eventoAtual.status ===
            "AGUARDANDO_RESPOSTA_CANCELADO" && (
            <div className="dash-actions-row">
              <button
                className="btn-dash dash-btn-primary"
                onClick={() =>
                  onConfirmarCancelamento(
                    eventoAtual.id
                  )
                }
              >
                Sim, cancelei
              </button>

              <button
                className="btn-dash dash-btn-secondary"
                onClick={() =>
                  onNegarCancelamento(
                    eventoAtual.id
                  )
                }
              >
                Não cancelei
              </button>
            </div>
          )}

          {eventoAtual.status === "SOLICITAR_PROVA" && (
            <div style={{ width: "100%" }}>
              <textarea
                className="dash-modal-textarea"
                value={relato}
                onChange={(e) =>
                  setRelato(e.target.value)
                }
                placeholder="Explique brevemente o ocorrido..."
              />

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) =>
                  setArquivo(
                    e.target.files?.[0] || null
                  )
                }
              />

              <button
                className="btn-dash dash-btn-enviar"
                onClick={onUploadProva}
              >
                Enviar
              </button>
            </div>
          )}

          {prazo && (
            <div
              className="dash-modal-prazo"
              style={{
                color: prazo.expirado
                  ? "#f87171"
                  : prazo.dias <= 5
                  ? "#ff624a"
                  : "#fdab38",
              }}
            >
              ⏰ {prazo.texto}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
