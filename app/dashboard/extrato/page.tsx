"use client";

import { useEffect, useState } from "react";
import "./extrato.css";

type ExtratoItem = {
  id: string;
  tipo: "CREDITO" | "DEBITO";
  origem: string;
  referencia_id: string;
  pontos: number;
  saldo_apos: number;
  criado_em: string;
  resgate?: {
    giftcards?: {
      nome?: string;
    };
    giftcard_opcoes?: {
      descricao?: string;
      pontos?: number;
    };
  } | null;
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

function formatarPontos(valor: number) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export default function ExtratoPage() {
  const [itens, setItens] = useState<ExtratoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState<string | null>(null);
  const [dataFim, setDataFim] = useState<string | null>(null);

  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);


  function formatarDataLocal(date: Date) {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const dia = String(date.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function hojeISO() {
    return formatarDataLocal(new Date());
  }

  function diasAtras(dias: number) {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return formatarDataLocal(d);
  }


  function filtrar7Dias() {
    const inicio = diasAtras(7);
    const fim = hojeISO();

    setDataInicio(inicio);
    setDataFim(fim);
    setPage(1);
    carregar(1, inicio, fim);
  }

  function filtrar30Dias() {
    const inicio = diasAtras(30);
    const fim = hojeISO();

    setDataInicio(inicio);
    setDataFim(fim);
    setPage(1);
    carregar(1, inicio, fim);
  }


  function filtrarMesAtual() {
    const agora = new Date();
    const inicio = formatarDataLocal(
      new Date(agora.getFullYear(), agora.getMonth(), 1)
    );
    const fim = hojeISO();

    setDataInicio(inicio);
    setDataFim(fim);
    setPage(1);
    carregar(1, inicio, fim);
  }

  async function carregar(
    currentPage = page,
    inicioParam = dataInicio,
    fimParam = dataFim
  ) {
    setLoading(true);

    const res = await fetch("/api/extrato", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inicio: inicioParam || null,
        fim: fimParam || null,
        page: currentPage,
        limit,
      }),
    });

    if (!res.ok) {
      setItens([]);
      setTotalCount(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    const json = await res.json();
    setItens(json.data || []);
    setTotalCount(typeof json.count === "number" ? json.count : 0);
    setTotalPages(json.totalPages || 1);
    setLoading(false);
  }

  useEffect(() => {
    carregar(page);
  }, [page]);

  function formatarOrigem(e: ExtratoItem) {
    if (
      e.tipo === "CREDITO" &&
      (e.origem === "ML_EVENTO" || e.origem === "SHOPEE_EVENTO")
    ) {
      return "Compra confirmada";
    }

    if (e.origem === "RESGATE_RECOMPENSA") {
      if (e.resgate) {
        return `Resgate · ${e.resgate.giftcards?.nome} · ${e.resgate.giftcard_opcoes?.descricao}`;
      }
      return "Resgate de recompensa";
    }

    return e.origem;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card extrato-page">
        <h2>Extrato de Pontos</h2>

        <div className="extrato-filtros">
          <div className="filtros-atalhos">
            <button onClick={filtrar7Dias}>Últimos 7 dias</button>
            <button onClick={filtrar30Dias}>Últimos 30 dias</button>
            <button onClick={filtrarMesAtual}>Este mês</button>
          </div>

          <div className="filtros-data">
            <div>
              <label>De</label>
              <input
                type="date"
                value={dataInicio ?? ""}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div>
              <label>Até</label>
              <input
                type="date"
                value={dataFim ?? ""}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <button
              className="btn-filtrar"
              onClick={() => {
                setPage(1);
                carregar(1, dataInicio, dataFim);
              }}
            >
              Filtrar
            </button>
          </div>
        </div>

        {loading && <p>Carregando extrato...</p>}

        {!loading && itens.length === 0 && (
          <p>Nenhuma movimentação encontrada.</p>
        )}

        {!loading && itens.length > 0 && (
          <>
            <div className="extrato-meta">
              <span className="extrato-total">
                Mostrando {itens.length} de {totalCount ?? 0}
              </span>
            </div>

            <table className="extrato-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th>Pontos</th>
                  <th>Saldo após</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((e) => (
                  <tr key={e.id}>
                    <td className={e.tipo === "CREDITO" ? "mov-credito" : "mov-debito"}>
                      {e.tipo}
                    </td>

                    <td>{formatarOrigem(e)}</td>

                    <td className={e.tipo === "CREDITO" ? "pts-credito" : "pts-debito"}>
                      {formatarPontos(e.pontos)}
                    </td>

                    <td className="saldo">{formatarPontos(e.saldo_apos)}</td>

                    <td>{formatarDataHora(e.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ⬅ Anterior
              </button>

            <span className="pagination-info">
              <strong>Página</strong>
              <span>{page} de {totalPages}</span>
            </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima ➡
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}