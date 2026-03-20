"use client";

import { useEffect, useState } from "react";
import "./admin-resgates.css";

type ResgateAdmin = {
  id: string;
  status: string;
  pontos_usados: number;
  criado_em: string;
  user?: {
    name?: string;
    nickname?: string;
    email?: string;
  };
  giftcard?: {
    nome?: string;
  };
  opcao?: {
    descricao?: string;
  };
};

type PreviewSaldo = {
  pontos_resgate: number;
  saldo_anterior: number;
  saldo_atual: number;
};

function formatarDataHora(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminResgatesPage() {
  const [resgates, setResgates] = useState<ResgateAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [codigo, setCodigo] = useState("");
  const [resgateSelecionado, setResgateSelecionado] =
    useState<ResgateAdmin | null>(null);

  const [preview, setPreview] = useState<PreviewSaldo | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/admin/resgates", {
      credentials: "include",
    });
    const json = await res.json();
    setResgates(json.data || []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (resgateSelecionado) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [resgateSelecionado]);

  // 🔎 ABRIR MODAL → PREVIEW (GET)
  async function abrirProcessar(resgate: ResgateAdmin) {
    setResgateSelecionado(resgate);
    setCodigo("");
    setPreview(null);
    setPreviewLoading(true);

    const res = await fetch(
      `/api/admin/resgates/processar?resgate_id=${resgate.id}`,
      { credentials: "include" }
    );

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Erro ao carregar preview");
      setResgateSelecionado(null);
      setPreviewLoading(false);
      return;
    }

    setPreview(json);
    setPreviewLoading(false);
  }

  // ✅ CONFIRMAR → POST
async function confirmar() {
  if (!resgateSelecionado || !codigo) return;

  try {
    setProcessing(true);

    const res = await fetch("/api/admin/resgates/processar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resgate_id: resgateSelecionado.id,
        codigo,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Erro ao processar resgate");
      setProcessing(false);
      return;
    }

    alert("Resgate processado com sucesso!");

    setCodigo("");
    setResgateSelecionado(null);
    setPreview(null);

    carregar();
  } catch (e) {
    alert("Erro de conexão");
  } finally {
    setProcessing(false);
  }
}

  return (
    <div className="dashboard-container">
      <div className="dashboard-card admin-resgates-page">
        <h2>ADMIN · Resgates Pendentes</h2>

        {loading && <p>Carregando...</p>}

        {!loading && resgates.length === 0 && (
          <p>Nenhum resgate pendente.</p>
        )}

        {!loading && resgates.length > 0 && (
          <>
            {/* DESKTOP */}
            <div className="admin-table-wrap admin-desktop-only">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Giftcard</th>
                    <th>Opção</th>
                    <th>Pontos</th>
                    <th>Data</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {resgates.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.user?.name || "Usuário sem nome"}</strong>

                        {r.user?.nickname && (
                          <div className="nickname">{r.user.nickname}</div>
                        )}

                        <div className="muted">{r.user?.email}</div>
                      </td>
                      <td>{r.giftcard?.nome}</td>
                      <td>{r.opcao?.descricao}</td>
                      <td>{r.pontos_usados.toLocaleString()}</td>
                      <td>{formatarDataHora(r.criado_em)}</td>
                      <td>
                        <button
                          className="btn-res-processar"
                          onClick={() => abrirProcessar(r)}
                        >
                          Processar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}
            <div className="admin-cards admin-mobile-only">
              {resgates.map((r) => (
                <div className="admin-card-resgate" key={r.id}>
                  <div className="admin-card-top">
                    <div className="admin-card-user">
                      <strong>{r.user?.name || "Usuário sem nome"}</strong>

                      {r.user?.nickname && (
                        <div className="nickname">{r.user.nickname}</div>
                      )}

                      <div className="muted">{r.user?.email || "Sem e-mail"}</div>
                    </div>
                  </div>

                  <div className="admin-card-body">
                    <div className="admin-info-row">
                      <span>Giftcard</span>
                      <strong>{r.giftcard?.nome || "-"}</strong>
                    </div>

                    <div className="admin-info-row">
                      <span>Opção</span>
                      <strong>{r.opcao?.descricao || "-"}</strong>
                    </div>

                    <div className="admin-info-row">
                      <span>Pontos</span>
                      <strong>{r.pontos_usados.toLocaleString()}</strong>
                    </div>

                    <div className="admin-info-row">
                      <span>Data</span>
                      <strong>{formatarDataHora(r.criado_em)}</strong>
                    </div>
                  </div>

                  <div className="admin-card-actions">
                    <button
                      className="btn-res-processar"
                      onClick={() => abrirProcessar(r)}
                    >
                      Processar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* MODAL */}
        {resgateSelecionado && (
          <div className="modal-res-overlay">
            <div className="modal-res">
              <h3>Processar Resgate</h3>

              <p>
              <span> Giftcard:</span> {resgateSelecionado.giftcard?.nome}
                <br />
               <span>Opção:</span>  {resgateSelecionado.opcao?.descricao}
              </p>

              {previewLoading && <p>Carregando saldo...</p>}

              {preview && (
                <div className="saldo-preview">
                  <div className="linha saldo-antes">
                    <span>Saldo antes</span>
                    <strong>{preview.saldo_anterior.toLocaleString()}</strong>
                  </div>

                  <div className="linha saldo-resgate">
                    <span>Resgate</span>
                    <strong>-{preview.pontos_resgate.toLocaleString()}</strong>
                  </div>

                  <div className="divider" />

                  <div className="linha saldo-depois">
                    <span>Saldo após</span>
                    <strong>{preview.saldo_atual.toLocaleString()}</strong>
                  </div>
                </div>
              )}


              <label>Código do Giftcard</label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Digite o código"
              />

              <div className="modal-res-actions">
                <button
                  className="btn-res-cancelar"
                  onClick={() => {
                    setResgateSelecionado(null);
                    setPreview(null);
                    setCodigo("");
                  }}
                >
                  Cancelar
                </button>

              <button
                className="btn-res-confirmar"
                onClick={confirmar}
                disabled={!codigo || !preview || processing}
              >
                {processing ? "Processando..." : "Confirmar"}
              </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
