"use client";

import { useEffect, useState } from "react";
import "./admin-resgates.css";

type ResgateAdmin = {
  id: string;
  status: string;
  pontos_usados: number;
  criado_em: string;
  user?: {
    nome?: string;
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
      return;
    }

    alert("Resgate processado com sucesso!");
    setCodigo("");
    setResgateSelecionado(null);
    setPreview(null);
    carregar();
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
                    <strong>{r.user?.nome}</strong>
                    <div className="muted">{r.user?.email}</div>
                  </td>
                  <td>{r.giftcard?.nome}</td>
                  <td>{r.opcao?.descricao}</td>
                  <td>{r.pontos_usados.toLocaleString()}</td>
                  <td>
                    {formatarDataHora(r.criado_em)}
                  </td>
                  <td>
                    <button
                      className="btn-processar"
                      onClick={() => abrirProcessar(r)}
                    >
                      Processar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* MODAL */}
        {resgateSelecionado && (
          <div className="modal-overlay">
            <div className="modal">
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

              <div className="modal-actions">
                <button
                  className="btn-cancelar"
                  onClick={() => {
                    setResgateSelecionado(null);
                    setPreview(null);
                    setCodigo("");
                  }}
                >
                  Cancelar
                </button>

                <button
                  className="btn-confirmar"
                  onClick={confirmar}
                  disabled={!codigo || !preview}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
