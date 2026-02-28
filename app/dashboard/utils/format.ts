export function formatDate(dt?: string) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleDateString("pt-BR");
  } catch {
    return dt;
  }
}

export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function shortenLink(link?: string | null, max = 56) {
  if (!link) return "";
  return link.length > max
    ? link.slice(0, Math.round(max / 2)) + "…" + link.slice(-Math.round(max / 2))
    : link;
}
