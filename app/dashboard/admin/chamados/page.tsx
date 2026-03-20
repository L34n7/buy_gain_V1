"use client";

import { useEffect, useState } from "react";
import "./admin-chamados.css";

type MensagemChamado = {
  id: string;
  chamado_id: string;
  user_id: string | null;
  admin_id: string | null;
  autor_tipo: "USER" | "ADMIN";
  mensagem: string;
  imagem_path: string | null;
  imagem_url?: string | null;
  criado_em: string;
};

type ChamadoAdmin = {
  id: string;
  titulo: string | null;
  status: string;
  criado_em: string;
  avaliacao_nota?: number | null;
  avaliacao_mensagem?: string | null;
  avaliado_em?: string | null;
  ultima_interacao_em?: string | null;
  primeira_mensagem?: string;
  ultima_mensagem?: string;
  mensagens: MensagemChamado[];
  user?: {
    id?: string;
    name?: string | null;
    nickname?: string | null;
    email?: string | null;
  };
};

function formatarDataHora(data?: string | null) {
  if (!data) return "-";

  try {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return data;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ABERTO":
      return "Aberto";
    case "EM_ANALISE":
      return "Em análise";
    case "RESPONDIDO":
      return "Respondido";
    case "FINALIZADO":
      return "Finalizado";
    default:
      return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "ABERTO":
      return "status-aberto";
    case "EM_ANALISE":
      return "status-analise";
    case "RESPONDIDO":
      return "status-respondido";
    case "FINALIZADO":
      return "status-finalizado";
    default:
      return "";
  }
}

function formatarAvaliacao(nota?: number | null) {
  if (!nota) return "Não avaliado";
  return `${nota}/5`;
}


export default function AdminChamadosPage() {
  const [chamados, setChamados] = useState<ChamadoAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [busca, setBusca] = useState("");

  const [chamadoSelecionado, setChamadoSelecionado] =
    useState<ChamadoAdmin | null>(null);

  const [resposta, setResposta] = useState("");
  const [novoStatus, setNovoStatus] = useState("RESPONDIDO");
  const [processing, setProcessing] = useState(false);

  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string>("");

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function carregar() {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (statusFiltro !== "TODOS") {
        params.set("status", statusFiltro);
      }

      if (busca.trim()) {
        params.set("busca", busca.trim());
      }

      const res = await fetch(`/api/admin/chamados?${params.toString()}`, {
        credentials: "include",
      });

      const json = await res.json();
      setChamados(json.data || []);
    } catch (e) {
      console.error("Erro ao carregar chamados", e);
      setChamados([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [statusFiltro]);

  useEffect(() => {
    if (chamadoSelecionado) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [chamadoSelecionado]);

  function abrirChamado(chamado: ChamadoAdmin) {
    setChamadoSelecionado(chamado);
    setResposta("");
    setNovoStatus(
      chamado.status === "FINALIZADO" ? "FINALIZADO" : "RESPONDIDO"
    );
    setImagemFile(null);
    setImagemPreview("");
  }

  function fecharModal() {
    setChamadoSelecionado(null);
    setResposta("");
    setNovoStatus("RESPONDIDO");
    setImagemFile(null);
    setImagemPreview("");
  }

  async function confirmarResposta() {
    if (!chamadoSelecionado) return;
    if (!resposta.trim()) return;

    try {
      setProcessing(true);

      let imagemBase64: string | null = null;
      let imagemNome: string | null = null;
      let imagemTipo: string | null = null;

      if (imagemFile) {
        imagemBase64 = await fileToBase64(imagemFile);
        imagemNome = imagemFile.name;
        imagemTipo = imagemFile.type;
      }

      const res = await fetch("/api/admin/chamados/responder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chamado_id: chamadoSelecionado.id,
          resposta: resposta.trim(),
          status: novoStatus,
          imagemBase64,
          imagemNome,
          imagemTipo,
        }),
      });

      let json: any = {};

      try {
        json = await res.json();
      } catch {
        json = {};
      }

      if (!res.ok) {
        alert(json.error || "Erro ao responder chamado");
        return;
      }

      alert("Chamado atualizado com sucesso!");

      fecharModal();
      carregar();
    } catch (error) {
      console.error(error);
      alert("Erro de conexão");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card admin-av-chamados-page">
        <div className="admin-av-chamados-header">
          <div>
            <p className="admin-av-kicker">Painel administrativo</p>
            <h2>Chamados de suporte</h2>
            <span>
              Gerencie solicitações, altere status e responda usuários.
            </span>
          </div>
        </div>

        <div className="admin-av-chamados-filtros">
          <div className="filtro-group">
            <label>Status</label>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="ABERTO">Aberto</option>
              <option value="EM_ANALISE">Em análise</option>
              <option value="RESPONDIDO">Respondido</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>

          <div className="filtro-group busca-group">
            <label>Buscar</label>
            <input
              type="text"
              placeholder="Protocolo, título, nome, nickname, email ou mensagem"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") carregar();
              }}
            />
          </div>

          <button className="btn-filtrar" onClick={carregar}>
            Buscar
          </button>
        </div>

        {loading && <p className="admin-av-empty">Carregando chamados...</p>}

        {!loading && chamados.length === 0 && (
          <p className="admin-av-empty">Nenhum chamado encontrado.</p>
        )}

        {!loading && chamados.length > 0 && (
          <>
            <div className="admin-av-table-wrap admin-av-desktop-only">
              <table className="admin-av-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Usuário</th>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Avaliação</th>
                  <th>Criação</th>
                  <th>Última interação</th>
                  <th>Ação</th>
                </tr>
              </thead>
                <tbody>
                  {chamados.map((c) => (
                    <tr key={c.id}>
                      <td className="mono">{c.id}</td>

                      <td>
                        <strong>
                          {c.user?.nickname || c.user?.name || "Usuário"}
                        </strong>
                        {c.user?.name && c.user?.nickname && (
                          <div className="muted-av">{c.user.name}</div>
                        )}
                        <div className="muted-av">
                          {c.user?.email || "Sem e-mail"}
                        </div>
                      </td>

                      <td>
                        <strong>{c.titulo || "Sem título"}</strong>
                        <div className="muted-av clamp-1">
                          {c.primeira_mensagem || c.ultima_mensagem || "-"}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(c.status)}`}
                        >
                          {getStatusLabel(c.status)}
                        </span>
                      </td>

                      <td>
                        {c.avaliacao_nota ? (
                          <div className="admin-av-avaliacao-cell">
                            <strong>{formatarAvaliacao(c.avaliacao_nota)}</strong>
                            <div className="muted-av">
                              {c.avaliado_em ? formatarDataHora(c.avaliado_em) : "Avaliado"}
                            </div>
                          </div>
                        ) : (
                          <span className="muted-av">Não avaliado</span>
                        )}
                      </td>

                      <td>{formatarDataHora(c.criado_em)}</td>
                      <td>{formatarDataHora(c.ultima_interacao_em)}</td>

                      <td>
                        <button
                          className="btn-gerenciar"
                          onClick={() => abrirChamado(c)}
                        >
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-av-cards admin-av-mobile-only">
              {chamados.map((c) => (
                <div className="admin-av-card-chamado" key={c.id}>
                  <div className="admin-av-card-top">
                    <div>
                      <div className="admin-av-protocolo">{c.id}</div>
                      <strong>{c.titulo || "Sem título"}</strong>
                    </div>

                    <span className={`status-badge ${getStatusClass(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </div>

                  <div className="admin-av-card-user">
                    <strong>
                      {c.user?.nickname || c.user?.name || "Usuário"}
                    </strong>
                    <div className="muted-av">{c.user?.email || "Sem e-mail"}</div>
                  </div>

                  <div className="admin-av-card-body">
                    <div className="admin-av-info-row">
                      <span>Mensagem inicial</span>
                      <strong className="clamp-2">
                        {c.primeira_mensagem || c.ultima_mensagem || "-"}
                      </strong>
                    </div>

                    <div className="admin-av-info-row">
                      <span>Avaliação</span>
                      <strong>
                        {c.avaliacao_nota ? formatarAvaliacao(c.avaliacao_nota) : "Não avaliado"}
                      </strong>
                    </div>

                    <div className="admin-av-info-row">
                      <span>Criação</span>
                      <strong>{formatarDataHora(c.criado_em)}</strong>
                    </div>

                    <div className="admin-av-info-row">
                      <span>Última interação</span>
                      <strong>{formatarDataHora(c.ultima_interacao_em)}</strong>
                    </div>
                  </div>

                  <div className="admin-av-card-actions">
                    <button
                      className="btn-gerenciar"
                      onClick={() => abrirChamado(c)}
                    >
                      Gerenciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {chamadoSelecionado && (
          <div className="modal-chamado-overlay">
            <div className="modal-chamado">
              <div className="modal-chamado-header">
                <div className="modal-chamado-header-main">
                  <div>
                    <p className="modal-chamado-kicker">Chamado</p>
                    <h3>{chamadoSelecionado.titulo || "Sem título"}</h3>
                    <span className="modal-chamado-protocolo">
                      Protocolo: {chamadoSelecionado.id}
                    </span>
                  </div>

                  <span
                    className={`status-badge ${getStatusClass(
                      chamadoSelecionado.status
                    )}`}
                  >
                    {getStatusLabel(chamadoSelecionado.status)}
                  </span>
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={fecharModal}
                  aria-label="Fechar modal"
                  title="Fechar"
                >
                  ×
                </button>
              </div>

              <div className="modal-chamado-section">
                <div className="admin-av-info-grid">
                  <div className="admin-av-info-box">
                    <span>Usuário</span>
                    <strong>
                      {chamadoSelecionado.user?.nickname ||
                        chamadoSelecionado.user?.name ||
                        "Usuário"}
                    </strong>
                    <small>
                      {chamadoSelecionado.user?.email || "Sem e-mail"}
                    </small>
                  </div>

                  <div className="admin-av-info-box">
                    <span>Criado em</span>
                    <strong>
                      {formatarDataHora(chamadoSelecionado.criado_em)}
                    </strong>
                  </div>

                  <div className="admin-av-info-box">
                    <span>Última interação</span>
                    <strong>
                      {formatarDataHora(chamadoSelecionado.ultima_interacao_em)}
                    </strong>
                  </div>

                  <div className="admin-av-info-box">
                    <span>Novo status</span>
                    <select
                      value={novoStatus}
                      onChange={(e) => setNovoStatus(e.target.value)}
                    >
                      <option value="EM_ANALISE">Em análise</option>
                      <option value="RESPONDIDO">Respondido</option>
                      <option value="FINALIZADO">Finalizado</option>
                    </select>
                  </div>
                </div>
              </div>

              {chamadoSelecionado.avaliacao_nota && (
                <div className="modal-chamado-section">

                  <div className="admin-av-avaliacao-box">

                    <h3 className="admin-av-avaliacao-titulo">
                      Feedback do usuário
                    </h3>

                    <div className="admin-av-avaliacao-topo">
                      <strong>
                        Nota: {formatarAvaliacao(chamadoSelecionado.avaliacao_nota)}
                      </strong>

                      {chamadoSelecionado.avaliado_em && (
                        <span>{formatarDataHora(chamadoSelecionado.avaliado_em)}</span>
                      )}
                    </div>

                    <div className="mensagem-box">
                      {chamadoSelecionado.avaliacao_mensagem?.trim()
                        ? chamadoSelecionado.avaliacao_mensagem
                        : "Usuário não deixou comentário na avaliação."}
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-chamado-section">
                <label>Conversa do chamado</label>

                <div className="admin-av-conversa-lista">
                  {chamadoSelecionado.mensagens.length === 0 && (
                    <div className="mensagem-box">Nenhuma mensagem encontrada.</div>
                  )}

                  {chamadoSelecionado.mensagens.map((msg) => (
                    <div
                      key={msg.id}
                      className={`admin-av-msg-item ${
                        msg.autor_tipo === "ADMIN"
                          ? "admin-av-msg-suporte"
                          : "admin-av-msg-usuario"
                      }`}
                    >
                      <div className="admin-av-msg-topo">
                        <strong>
                          {msg.autor_tipo === "ADMIN" ? "Suporte" : <p>Usuário</p>}
                        </strong>
                        <span>{formatarDataHora(msg.criado_em)}</span>
                      </div>

                      <div className="mensagem-box">{msg.mensagem}</div>

                      {msg.imagem_url && (
                        <div className="admin-av-msg-anexo">
                          <a
                            href={msg.imagem_url}
                            target="_blank"
                            rel="noreferrer"
                            className="anexo-link"
                          >
                            Abrir imagem em nova aba
                          </a>

                          <div className="anexo-preview">
                            <img
                              src={msg.imagem_url}
                              alt="Anexo da mensagem do chamado"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {chamadoSelecionado.status !== "FINALIZADO" && (
                <>
                  <div className="modal-chamado-section">
                    <label>Resposta do suporte</label>
                    <textarea
                      value={resposta}
                      onChange={(e) => setResposta(e.target.value)}
                      placeholder="Digite a resposta para o usuário"
                      rows={6}
                    />
                  </div>

                  <div className="modal-chamado-section">
                    <label>Anexar imagem na resposta</label>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setImagemFile(file);

                        if (imagemPreview) {
                          URL.revokeObjectURL(imagemPreview);
                        }

                        if (file) {
                          setImagemPreview(URL.createObjectURL(file));
                        } else {
                          setImagemPreview("");
                        }
                      }}
                    />

                    {imagemPreview && (
                      <div className="anexo-preview">
                        <img
                          src={imagemPreview}
                          alt="Prévia da imagem da resposta"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="modal-chamado-actions">
                <button className="btn-cancelar" onClick={fecharModal}>
                  Cancelar
                </button>

                {chamadoSelecionado.status !== "FINALIZADO" && (
                  <button
                    className="btn-confirmar"
                    onClick={confirmarResposta}
                    disabled={!resposta.trim() || processing}
                  >
                    {processing ? "Enviando..." : "Enviar resposta"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}