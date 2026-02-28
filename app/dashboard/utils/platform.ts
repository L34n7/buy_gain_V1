export function identificarPlataforma(link: string) {
  if (link.includes("shopee")) return "shopee";
  if (link.includes("mercadolivre") || link.includes("mercadolibre")) {
    return "mercadolivre";
  }
  return "desconhecido";
}
