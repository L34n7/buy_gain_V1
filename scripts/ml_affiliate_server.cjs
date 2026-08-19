const express = require("express");
const { getTrackedLink } = require("./generate_link.cjs");

const app = express();
const port = Number(process.env.ML_AUTOMATION_PORT || 3333);

app.use(express.json({ limit: "1mb" }));

function toUserMessage(err) {
  const raw = err?.message || String(err || "");

  if (/sem comiss[aã]o|comiss[aã]o detect/i.test(raw)) {
    return "Não conseguimos identificar a comissão deste produto no Mercado Livre. Tente novamente ou use outro anúncio do mesmo produto.";
  }

  if (/compartilhar/i.test(raw)) {
    return "Não conseguimos abrir o compartilhamento deste produto no Mercado Livre. Tente novamente em alguns segundos.";
  }

  if (/link rastreado/i.test(raw)) {
    return "Não conseguimos capturar o link rastreado deste produto. Tente novamente em alguns segundos.";
  }

  if (/preço inválido|preco invalido/i.test(raw)) {
    return "Não conseguimos identificar o preço deste produto. Tente outro anúncio ou tente novamente.";
  }

  return "Não conseguimos gerar o link deste produto agora. Tente novamente em alguns segundos.";
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ml-affiliate-server" });
});

app.post("/executar", async (req, res) => {
  const startedAt = Date.now();

  try {
    const productUrl = req.body?.productUrl;
    const mlAccountId = String(req.body?.mlAccountId || process.env.ML_ACCOUNT_ID || "1");

    if (!productUrl || typeof productUrl !== "string") {
      return res.status(400).send("Link do produto obrigatório.");
    }

    console.log("[ML SERVER] Gerando link:", productUrl);
    console.log("[ML SERVER] Conta ML:", mlAccountId);

    const result = await getTrackedLink(productUrl, mlAccountId);

    console.log("[ML SERVER] Link gerado em", Date.now() - startedAt, "ms");

    return res.json(result);
  } catch (err) {
    const debugMessage = err?.stack || err?.message || String(err);
    const userMessage = toUserMessage(err);

    console.error("[ML SERVER] Erro ao gerar link:", debugMessage);

    return res.status(500).send(userMessage);
  }
});

app.listen(port, () => {
  console.log(`[ML SERVER] Rodando em http://localhost:${port}`);
  console.log("[ML SERVER] Endpoint: POST /executar");
});
