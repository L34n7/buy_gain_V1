export function statusExigeResposta(status?: string) {
  return (
    status === "AGUARDANDO_CONFIRMACAO" ||
    status === "AGUARDANDO_RESPOSTA_CANCELADO" ||
    status === "SOLICITAR_PROVA"
  );
}

export function calcularPrazoRestante(
  dataBase?: string,
  tipo?: "PROVA" | "CONFIRMACAO" | "CANCELAMENTO"
) {
  if (!dataBase) return null;

  let diasLimite = 14;
  let prefixo = "Prazo";

  if (tipo === "PROVA") {
    diasLimite = 13;
    prefixo = "Prazo para envio";
  }

  if (tipo === "CONFIRMACAO") {
    diasLimite = 13;
    prefixo = "Prazo para confirmar";
  }

  if (tipo === "CANCELAMENTO") {
    diasLimite = 6;
    prefixo = "Prazo para responder";
  }

  const inicio = new Date(dataBase).getTime();
  const agora = Date.now();
  const limite = inicio + diasLimite * 24 * 60 * 60 * 1000;
  const diff = limite - agora;

  if (diff <= 0) {
    return {
      expirado: true,
      dias: 0,
      texto: "Prazo encerrado",
    };
  }

  const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return {
    expirado: false,
    dias,
    texto: `${prefixo}: ${dias} dia${dias > 1 ? "s" : ""}`,
  };
}
