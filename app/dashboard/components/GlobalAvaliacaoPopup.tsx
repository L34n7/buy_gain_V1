"use client";

import { useEffect, useState } from "react";
import { useNotifications } from "./NotificationsContext";
import "./global-avaliacao-popup.css";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export default function GlobalAvaliacaoPopup() {
  const { notificacoesAvaliacao, recarregar } = useNotifications();

  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    if (notificacoesAvaliacao.length > 0) {
      setMostrarPopup(true);
    }
  }, [notificacoesAvaliacao]);

  useEffect(() => {
    function handleAbrirModalAvaliacao() {
      setErro(null);
      setMostrarModal(true);
      setMostrarPopup(false);
    }

    window.addEventListener(
      "abrir-modal-avaliacao-plataforma",
      handleAbrirModalAvaliacao
    );

    return () => {
      window.removeEventListener(
        "abrir-modal-avaliacao-plataforma",
        handleAbrirModalAvaliacao
      );
    };
  }, []);


  useEffect(() => {
    const avaliar = searchParams.get("avaliar");

    if (avaliar === "1") {
      setTimeout(() => {
        window.dispatchEvent(
          new Event("abrir-modal-avaliacao-plataforma")
        );

        // limpa a URL
        router.replace("/dashboard/compras");
      }, 300);
    }
  }, [searchParams, router]);


  function abrirModal() {
    setErro(null);
    setMostrarModal(true);
    setMostrarPopup(false);
  }

  async function enviarAvaliacao() {
    if (!nota) {
      setErro("Selecione uma nota para continuar.");
      return;
    }

    try {
      setEnviando(true);
      setErro(null);

      const res = await fetch("/api/avaliacoes/plataforma", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          nota,
          comentario,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao enviar avaliação.");
      }

      setMostrarModal(false);
      setMostrarPopup(false);
      setNota(null);
      setComentario("");
      setErro(null);

      recarregar();
    } catch (err: any) {
      setErro(err?.message || "Erro ao enviar avaliação.");
    } finally {
      setEnviando(false);
    }
  }

  if (notificacoesAvaliacao.length === 0) {
    return null;
  }

  return (
    <>
      {mostrarPopup && (
        <div className="avaliacao-popup">
          <button
            className="avaliacao-popup-close"
            onClick={() => setMostrarPopup(false)}
            aria-label="Fechar aviso de avaliação"
          >
            ×
          </button>

          <div className="avaliacao-popup-icon">⭐</div>

          <div className="avaliacao-popup-title">
            Avalie sua experiência
          </div>

          <div className="avaliacao-popup-text">
            Sua primeira compra foi concluída. Conte pra gente como foi sua experiência na plataforma.
          </div>

          <div className="avaliacao-popup-actions">
            <button
              className="avaliacao-popup-secondary"
              onClick={() => setMostrarPopup(false)}
            >
              Depois
            </button>

            <button
              className="avaliacao-popup-primary"
              onClick={abrirModal}
            >
              Avaliar agora
            </button>
          </div>
        </div>
      )}

      {mostrarModal && (
        <div className="avaliacao-modal-overlay">
          <div className="avaliacao-modal">
            <button
              className="avaliacao-modal-close"
              onClick={() => setMostrarModal(false)}
              aria-label="Fechar modal de avaliação"
            >
              ×
            </button>

            <div className="avaliacao-modal-title">
              Como foi sua experiência?
            </div>

            <div className="avaliacao-modal-text">
              Sua opinião ajuda a melhorar a plataforma para todos.
            </div>

            <div className="avaliacao-stars-text">
              Dê a sua nota:
            </div>
            
            <div className="avaliacao-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`avaliacao-star ${nota && nota >= star ? "active" : ""}`}
                  onClick={() => setNota(star)}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              className="avaliacao-textarea"
              placeholder="Escreva um comentário opcional"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={500}
            />

            {erro && (
              <div className="avaliacao-error">
                {erro}
              </div>
            )}

            <div className="avaliacao-modal-actions">
              <button
                className="avaliacao-cancel"
                onClick={() => setMostrarModal(false)}
                disabled={enviando}
              >
                Cancelar
              </button>

              <button
                className="avaliacao-submit"
                onClick={enviarAvaliacao}
                disabled={enviando}
              >
                {enviando ? "Enviando..." : "Enviar avaliação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}