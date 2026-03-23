import { gerarCodigoBase } from "./gerarCodigoIndicacao";

export async function criarCodigoIndicacaoUnico(
  supabase: any,
  nome?: string | null
) {
  const maxTentativas = 15;

  for (let i = 0; i < maxTentativas; i++) {
    const codigo = gerarCodigoBase(nome);

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("codigo_indicacao", codigo)
      .maybeSingle();

    if (error) {
      throw new Error("Erro ao verificar código de indicação.");
    }

    if (!data) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar um código de indicação único.");
}