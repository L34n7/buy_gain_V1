const express = require("express");
const { getTrackedLink } = require("./generate_affiliate.cjs");

const app = express();
const port = Number(process.env.ML_AUTOMATION_PORT || 3333);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ml-affiliate-server" });
});

app.post("/executar", async (req, res) => {
  const startedAt = Date.now();

  try {
    const productUrl = req.body?.productUrl;
    const mlAccountId = String(req.body?.mlAccountId || process.env.ML_ACCOUNT_ID || "1");

    if (!productUrl || typeof productUrl !== "string") {
      return res.status(400).json({ error: "productUrl obrigatório" });
    }

    console.log("[ML SERVER] Gerando link:", productUrl);
    console.log("[ML SERVER] Conta ML:", mlAccountId);

    const result = await getTrackedLink(productUrl, mlAccountId);

    console.log("[ML SERVER] Link gerado em", Date.now() - startedAt, "ms");

    return res.json(result);
  } catch (err) {
    const message = err?.stack || err?.message || String(err);

    console.error("[ML SERVER] Erro ao gerar link:", message);

    return res.status(500).send(message);
  }
});

app.listen(port, () => {
  console.log(`[ML SERVER] Rodando em http://localhost:${port}`);
  console.log("[ML SERVER] Endpoint: POST /executar");
});
