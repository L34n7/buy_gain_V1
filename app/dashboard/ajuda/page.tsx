"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./ajuda.css";

const faqItems = [
  {
    pergunta: "Como funciona o BuyGain?",
    resposta:
      "O BuyGain permite acompanhar compras elegíveis, consultar seu histórico, visualizar recompensas e gerenciar seus benefícios dentro da plataforma.",
  },
  {
    pergunta: "Quanto tempo uma compra leva para aparecer?",
    resposta:
      "Algumas compras podem levar um tempo para serem processadas e exibidas. Isso depende da loja parceira, do status do pedido e da sincronização dos eventos.",
  },
  {
    pergunta: "Por que minha compra ainda está em análise?",
    resposta:
      "Compras em análise ainda estão passando por validação da loja parceira. Esse processo é normal antes da confirmação final.",
  },
  {
    pergunta: "Como falar com o suporte?",
    resposta:
      "Você pode entrar em contato pelo WhatsApp ou abrir um chamado diretamente nesta página para enviar uma descrição do problema e, se quiser, uma imagem.",
  },
  {
    pergunta: "Onde acompanho meus chamados?",
    resposta:
      "Na área 'Meus chamados' você pode consultar protocolos, visualizar o status do atendimento e revisar os anexos enviados.",
  },
];

export default function AjudaPage() {
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  async function fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  }

  function closeModal() {
    if (loading) return;
    setModalOpen(false);
    setErro(null);
    setFeedback(null);
    setProtocolo(null);
    setCopiado(false);
  }

  async function handleCopiarProtocolo() {
    if (!protocolo) return;

    try {
      await navigator.clipboard.writeText(protocolo);
      setCopiado(true);

      setTimeout(() => {
        setCopiado(false);
      }, 1800);
    } catch {
      setErro("Não foi possível copiar o protocolo.");
    }
  }

  async function handleSubmitChamado(e: React.FormEvent) {
    e.preventDefault();

    setErro(null);
    setFeedback(null);

    if (titulo.trim().length > 100) {
      setErro("O título deve ter no máximo 100 caracteres.");
      return;
    }

    if (mensagem.trim().length < 10) {
      setErro("Descreva o problema com pelo menos 10 caracteres.");
      return;
    }

    if (mensagem.trim().length > 500) {
      setErro("A mensagem deve ter no máximo 500 caracteres.");
      return;
    }

    if (imagem) {
      const tiposPermitidos = ["image/png", "image/jpeg", "image/webp"];

      if (!tiposPermitidos.includes(imagem.type)) {
        setErro("Formato inválido. Envie PNG, JPG ou WEBP.");
        return;
      }

      if (imagem.size > 5 * 1024 * 1024) {
        setErro("A imagem deve ter no máximo 5MB.");
        return;
      }
    }

    try {
      setLoading(true);

      let imagemBase64: string | null = null;
      let imagemNome: string | null = null;
      let imagemTipo: string | null = null;

      if (imagem) {
        imagemBase64 = await fileToBase64(imagem);
        imagemNome = imagem.name;
        imagemTipo = imagem.type;
      }

      const res = await fetch("/api/chamados/criar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo,
          mensagem,
          imagemBase64,
          imagemNome,
          imagemTipo,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Não foi possível abrir o chamado.");
      }

      setProtocolo(json.chamado_id || null);
      setFeedback("Chamado enviado com sucesso.");
      setTitulo("");
      setMensagem("");
      setImagem(null);
      setCopiado(false);
    } catch (err: any) {
      setErro(err.message || "Erro ao enviar chamado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ajuda-root">
      <div className="dashboard-container">
        <div className="ajuda-shell">
          <section className="ajuda-hero">
            <div className="ajuda-badge">Suporte premium</div>
            <h1>Central de Ajuda</h1>
            <p>
              Encontre respostas rápidas, acompanhe seus chamados e fale com o
              suporte da BuyGain com uma experiência integrada ao seu painel.
            </p>
          </section>

          <section className="ajuda-actions-grid">
            <button
              type="button"
              className="ajuda-action-card destaque"
              onClick={() => setModalOpen(true)}
            >
              <div className="ajuda-action-icon">📝</div>
              <div>
                <h2>Abrir chamado</h2>
                <p>Envie uma mensagem curta e anexe uma imagem, se necessário.</p>
              </div>
            </button>

            <Link href="/dashboard/ajuda/meus-chamados" className="ajuda-action-card">
              <div className="ajuda-action-icon">📂</div>
              <div>
                <h2>Meus chamados</h2>
                <p>Acompanhe protocolos, status e anexos enviados.</p>
              </div>
            </Link>

            <a
              href="https://wa.me/5531999999999?text=Olá,%20preciso%20de%20ajuda%20no%20BuyGain"
              target="_blank"
              rel="noopener noreferrer"
              className="ajuda-action-card whatsapp"
            >
              <div className="ajuda-action-icon">💬</div>
              <div>
                <h2>WhatsApp</h2>
                <p>Fale diretamente com o suporte em um canal rápido.</p>
              </div>
            </a>
          </section>

          <section className="ajuda-content-grid">
            <div className="ajuda-panel faq-panel">
              <div className="ajuda-panel-head">
                <div>
                  <span className="ajuda-panel-kicker">FAQ</span>
                  <h2>Perguntas frequentes</h2>
                </div>
              </div>

              <div className="faq-list">
                {faqItems.map((item, index) => {
                  const open = faqOpenIndex === index;

                  return (
                    <div
                      key={index}
                      className={`faq-item ${open ? "open" : ""}`}
                    >
                      <button
                        type="button"
                        className="faq-question"
                        onClick={() => setFaqOpenIndex(open ? null : index)}
                      >
                        <span>{item.pergunta}</span>
                        <span className="faq-icon">{open ? "−" : "+"}</span>
                      </button>

                      {open && (
                        <div className="faq-answer">
                          <p>{item.resposta}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ajuda-panel info-panel">
              <div className="ajuda-panel-head">
                <div>
                  <span className="ajuda-panel-kicker">Atendimento</span>
                  <h2>Como funciona o suporte</h2>
                </div>
              </div>

              <div className="info-card">
                <h3>Chamados registrados</h3>
                <p>
                  Ao abrir um chamado, você recebe um protocolo e um email de
                  confirmação para acompanhar tudo com segurança.
                </p>
              </div>

              <div className="info-card">
                <h3>Acompanhamento fácil</h3>
                <p>
                  Você pode consultar seus chamados a qualquer momento pela área
                  “Meus chamados”, com status e imagem anexada.
                </p>
              </div>

              <div className="info-card">
                <h3>Canal direto</h3>
                <p>
                  Para situações rápidas, o WhatsApp continua disponível como
                  apoio imediato.
                </p>
              </div>

              <Link href="/dashboard" className="btn-voltar-dashboard">
                Voltar para o início
              </Link>
            </div>
          </section>
        </div>
      </div>

      {modalOpen && (
        <div className="chamado-overlay" onClick={closeModal}>
          <div
            className="chamado-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chamado-modal-header">
              <div>
                <span className="modal-kicker">Novo chamado</span>
                <h3>Abrir atendimento</h3>
                <p>
                  Descreva o problema com clareza. Você pode anexar uma imagem
                  para facilitar a análise.
                </p>
              </div>

              <button
                type="button"
                className="chamado-close"
                onClick={closeModal}
                disabled={loading}
              >
                ×
              </button>
            </div>

            <form className="chamado-form" onSubmit={handleSubmitChamado}>
              <div className="form-group">
                <label htmlFor="titulo">Título</label>
                <input
                  id="titulo"
                  type="text"
                  placeholder="Ex: Compra não apareceu no histórico"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={100}
                />
                <small>{titulo.length}/100</small>
              </div>

              <div className="form-group">
                <label htmlFor="mensagem">Mensagem</label>
                <textarea
                  id="mensagem"
                  placeholder="Explique rapidamente o que aconteceu..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={5}
                  maxLength={500}
                />
                <small>{mensagem.length}/500</small>
              </div>

              <div className="form-group">
                <label htmlFor="imagem">Imagem (opcional)</label>
                <input
                  id="imagem"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setImagem(e.target.files?.[0] || null)}
                />
                <small>Formatos aceitos: PNG, JPG e WEBP. Máximo de 5MB.</small>

                {imagem && (
                  <div className="arquivo-selecionado">
                    Arquivo selecionado: {imagem.name}
                  </div>
                )}
              </div>

              {erro && <div className="form-error">{erro}</div>}

              {feedback && (
                <div className="form-success">
                  <strong>{feedback}</strong>

                  {protocolo && (
                    <div className="protocolo-box">
                      <span className="protocolo-label">Protocolo do chamado</span>
                      <div className="protocolo-row">
                        <code className="protocolo-code">{protocolo}</code>

                        <button
                          type="button"
                          className={`btn-copiar-protocolo ${copiado ? "copiado" : ""}`}
                          onClick={handleCopiarProtocolo}
                        >
                          {copiado ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="sucesso-acoes">
                    <Link href="/dashboard/ajuda/meus-chamados" className="btn-sucesso-link">
                      Ver meus chamados
                    </Link>

                    <button
                      type="button"
                      className="btn-sucesso-fechar"
                      onClick={closeModal}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}

              {!feedback && (
                <button
                  type="submit"
                  className={`btn-enviar-chamado ${loading ? "loading" : ""}`}
                  disabled={loading}
                >
                  {loading ? "Enviando chamado..." : "Enviar chamado"}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}