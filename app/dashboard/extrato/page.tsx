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

  // 🔥 ESTE CAMPO NÃO EXISTIA
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

  
  function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function diasAtras(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function filtrar7Dias() {
  setDataInicio(diasAtras(7));
  setDataFim(hojeISO());
}

function filtrar30Dias() {
  setDataInicio(diasAtras(30));
  setDataFim(hojeISO());
}

function filtrarMesAtual() {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  setDataInicio(inicio);
  setDataFim(hojeISO());
}


  async function carregar() {
  setLoading(true);

  const res = await fetch("/api/extrato", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inicio: dataInicio || null,
      fim: dataFim || null,
    }),
  });

  if (!res.ok) {
    setItens([]);
    setLoading(false);
    return;
  }

  const json = await res.json();
  setItens(json.data || []);
  setLoading(false);
}


  useEffect(() => {
    carregar();
  }, []);

  function formatarOrigem(e: ExtratoItem) {
  if (e.tipo === "CREDITO" && e.origem === "ML_EVENTO") {
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

            <button className="btn-filtrar" onClick={carregar}>
            Filtrar
            </button>
        </div>
        </div>


        
        {loading && <p>Carregando extrato...</p>}

        {!loading && itens.length === 0 && (
          <p>Nenhuma movimentação encontrada.</p>
        )}



        {!loading && itens.length > 0 && (
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

                    <td>
                    {e.origem === "RESGATE_RECOMPENSA" && e.resgate ? (
                        <>
                        Resgate ·{" "}
                        <strong>{e.resgate.giftcards?.nome}</strong>
                        {" · "}
                        {e.resgate.giftcard_opcoes?.descricao}
                        </>
                    ) : e.tipo === "CREDITO" && e.origem === "ML_EVENTO" ? (
                        "Compra confirmada"
                    ) : (
                        e.origem
                    )}
                    </td>

                  <td className={e.tipo === "CREDITO" ? "pts-credito" : "pts-debito"}>
                    {formatarPontos(e.pontos)}
                  </td>

                  <td className="saldo">
                    {formatarPontos(e.saldo_apos)}
                  </td>

                  <td>{formatarDataHora(e.criado_em)}</td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
