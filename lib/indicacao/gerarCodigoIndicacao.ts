export function gerarCodigoBase(nome?: string | null) {
  const baseLimpa = String(nome || "USER")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();

  const prefixo = baseLimpa.slice(0, 6) || "USER";
  const numero = Math.floor(1000 + Math.random() * 9000);

  return `${prefixo}${numero}`;
}

export function normalizarCodigoIndicacao(codigo?: string | null) {
  return String(codigo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();
}