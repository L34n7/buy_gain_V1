const { chromium } = require("playwright");
const path = require("path");

const KEEP_BROWSER_OPEN_ON_ERROR = process.env.ML_KEEP_BROWSER_OPEN_ON_ERROR === "1";
const HEADLESS = process.env.ML_HEADLESS === "1";
const SLOW_MO = Number(process.env.ML_SLOWMO || 100);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePercentFromText(text, { allowGeneric = false } = {}) {
  if (!text) return null;

  const normalized = String(text).replace(/\s+/g, " ").trim();

  const patterns = [
    /ganhos?\s*extras?.{0,80}?(\d+(?:[,.]\d+)?)\s*%/i,
    /(\d+(?:[,.]\d+)?)\s*%\s*.{0,80}?ganhos?\s*extras?/i,
    /ganhos?.{0,80}?(\d+(?:[,.]\d+)?)\s*%/i,
    /comiss[aã]o.{0,80}?(\d+(?:[,.]\d+)?)\s*%/i,
    /commission.{0,80}?(\d+(?:[,.]\d+)?)\s*%/i,
  ];

  if (allowGeneric) {
    patterns.push(/(\d+(?:[,.]\d+)?)\s*%/i);
  }

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const value = Number(match[1].replace(",", "."));
    if (Number.isFinite(value) && value > 0 && value <= 100) {
      return value;
    }
  }

  return null;
}

/**
 * Extrai breadcrumb do Mercado Livre
 */
async function extractBreadcrumb(page) {
  try {
    const scripts = await page.$$eval('script[type="application/ld+json"]', (els) =>
      els.map((e) => e.textContent).filter(Boolean)
    );

    for (const txt of scripts) {
      try {
        const data = JSON.parse(txt);
        const items = Array.isArray(data) ? data : [data];

        for (const obj of items) {
          if (!obj) continue;

          if (obj["@type"] === "BreadcrumbList" && Array.isArray(obj.itemListElement)) {
            const names = obj.itemListElement
              .map((it) => it?.name?.trim() || it?.item?.name?.trim())
              .filter(Boolean);

            if (names.length > 0) return names;
          }

          if (Array.isArray(obj["@graph"])) {
            for (const graphItem of obj["@graph"]) {
              if (graphItem?.["@type"] === "BreadcrumbList" && Array.isArray(graphItem.itemListElement)) {
                const names = graphItem.itemListElement
                  .map((it) => it?.name?.trim() || it?.item?.name?.trim())
                  .filter(Boolean);

                if (names.length > 0) return names;
              }
            }
          }
        }
      } catch {}
    }
  } catch {}

  try {
    const domBreadcrumb = await page.evaluate(() => {
      const selectors = [
        'nav[aria-label*="breadcrumb" i] a',
        'nav[aria-label*="migalha" i] a',
        ".andes-breadcrumb a",
        ".breadcrumb a",
        '[data-testid*="breadcrumb"] a',
      ];

      for (const selector of selectors) {
        const names = Array.from(document.querySelectorAll(selector))
          .map((el) => el.textContent?.trim())
          .filter(Boolean);

        if (names.length > 0) return names;
      }

      return [];
    });

    if (Array.isArray(domBreadcrumb) && domBreadcrumb.length > 0) return domBreadcrumb;
  } catch {}

  try {
    const domBreadcrumbText = await page.evaluate(() => {
      const containers = [
        document.querySelector('nav[aria-label*="breadcrumb" i]'),
        document.querySelector('nav[aria-label*="migalha" i]'),
        document.querySelector(".andes-breadcrumb"),
        document.querySelector(".breadcrumb"),
        document.querySelector('[data-testid*="breadcrumb"]'),
      ].filter(Boolean);

      for (const container of containers) {
        const text = container.textContent?.trim();
        if (!text) continue;

        const parts = text
          .split(/\n|>|\/|›|»/)
          .map((t) => t.trim())
          .filter(Boolean);

        if (parts.length > 0) return parts;
      }

      return [];
    });

    if (Array.isArray(domBreadcrumbText) && domBreadcrumbText.length > 0) return domBreadcrumbText;
  } catch {}

  return [];
}

function limparCategoriasBreadcrumb(categorias) {
  if (!Array.isArray(categorias)) return [];

  return categorias
    .map((cat) => String(cat || "").trim())
    .filter(Boolean)
    .filter((cat) => {
      const c = cat.toLowerCase();
      return (
        c !== "início" &&
        c !== "inicio" &&
        c !== "mercado livre" &&
        c !== "lojas oficiais" &&
        c !== "ofertas" &&
        c !== "categorias"
      );
    });
}

async function extractBrand(page) {
  try {
    const scripts = await page.$$eval('script[type="application/ld+json"]', (els) =>
      els.map((e) => e.textContent).filter(Boolean)
    );

    for (const txt of scripts) {
      try {
        const data = JSON.parse(txt);
        const items = Array.isArray(data) ? data : [data];

        for (const obj of items) {
          if (!obj) continue;
          if (obj["@type"] !== "Product") continue;

          if (typeof obj.brand === "string" && obj.brand.trim()) return obj.brand.trim();
          if (typeof obj.brand?.name === "string" && obj.brand.name.trim()) return obj.brand.name.trim();
        }
      } catch {}
    }
  } catch {}

  try {
    const marcaTexto = await page.evaluate(() => {
      const candidatos = Array.from(document.querySelectorAll("*"))
        .map((el) => el.textContent?.trim())
        .filter(Boolean);

      const linhaMarca = candidatos.find((texto) => /^marca:\s*/i.test(texto));
      if (!linhaMarca) return null;

      return linhaMarca.replace(/^marca:\s*/i, "").trim();
    });

    if (marcaTexto) return marcaTexto;
  } catch {}

  return null;
}

async function waitForPageReady(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => null);
  await page.waitForSelector("body", { timeout: 30000 });
  await page.waitForTimeout(2500);
}

async function isProductPage(page) {
  const currentUrl = page.url();

  if (currentUrl.includes("MLB-") || currentUrl.includes("/p/MLB")) return true;

  const selectors = ["h1.ui-pdp-title", "meta[itemprop='price']", ".ui-pdp-price", ".ui-pdp-container"];
  for (const selector of selectors) {
    try {
      if ((await page.locator(selector).count()) > 0) return true;
    } catch {}
  }

  return false;
}

async function resolveIntermediatePage(page) {
  if (await isProductPage(page)) return null;

  console.log("[ML] Página intermediária detectada, procurando produto...");

  const productLink = await page.evaluate(() => {
    const selectors = [
      ".poly-card__content a.poly-component__title",
      ".poly-component__link--action-link",
      'a[href*="/p/MLB"]',
      'a[href*="MLB-"]',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.href) return el.href;
    }

    const anchors = Array.from(document.querySelectorAll("a[href]"));
    const productAnchor = anchors.find((a) => /\/p\/MLB|MLB-/i.test(a.href));
    return productAnchor?.href || null;
  });

  if (!productLink) return null;

  console.log("[ML] Produto encontrado:", productLink);
  await page.goto(productLink, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForPageReady(page);
  return productLink;
}

async function extractProductPrice(page) {
  const metaSelectors = [
    'meta[itemprop="price"]',
    'meta[property="product:price:amount"]',
    'meta[name="twitter:data1"]',
  ];

  for (const selector of metaSelectors) {
    try {
      const meta = page.locator(selector).first();
      if ((await meta.count()) === 0) continue;

      const content = await meta.getAttribute("content");
      const normalized = String(content || "").replace(/[^\d,.-]/g, "").replace(",", ".");
      const price = Number(normalized);

      if (Number.isFinite(price) && price > 0) return price;
    } catch {}
  }

  try {
    const scripts = await page.$$eval('script[type="application/ld+json"]', (els) =>
      els.map((e) => e.textContent).filter(Boolean)
    );

    for (const txt of scripts) {
      try {
        const data = JSON.parse(txt);
        const items = Array.isArray(data) ? data : [data];

        for (const obj of items) {
          const price = Number(obj?.offers?.price || obj?.offers?.lowPrice || obj?.price);
          if (Number.isFinite(price) && price > 0) return price;
        }
      } catch {}
    }
  } catch {}

  throw new Error("Preço inválido");
}

async function extractCommissionPercent(page) {
  console.log("[ML] Tentando extrair comissão...");

  const prioritySelectors = [
    "span.stripe-commission__percentage",
    ".stripe-commission__info span",
    ".stripe-commission__info",
    "[class*='stripe-commission']",
    "[class*='commission']",
    "[class*='ganho']",
    "[class*='earn']",
  ];

  for (const selector of prioritySelectors) {
    try {
      const texts = await page.locator(selector).evaluateAll((els) =>
        els.map((el) => el.textContent?.trim()).filter(Boolean)
      );

      for (const text of texts) {
        const percent = parsePercentFromText(text, { allowGeneric: true });
        if (percent !== null) {
          console.log("[ML] Comissão encontrada:", text, "=>", percent);
          return percent;
        }
      }
    } catch {}
  }

  // Produtos com selo novo podem exibir "GANHOS EXTRAS 16%" fora dos seletores antigos.
  try {
    const bodyText = await page.locator("body").innerText({ timeout: 10000 });
    const percent = parsePercentFromText(bodyText, { allowGeneric: false });

    if (percent !== null) {
      console.log("[ML] Comissão encontrada no texto da página:", percent);
      return percent;
    }
  } catch {}

  await page.screenshot({
    path: path.resolve(__dirname, `erro-comissao-${Date.now()}.png`),
    fullPage: true,
  });

  throw new Error("Produto afiliado sem comissão detectável");
}

async function clickShareButton(page) {
  console.log("[ML] Procurando botão Compartilhar...");

  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => null);
  await page.waitForTimeout(1000);

  const candidates = [
    page.getByRole("button", { name: /compartilhar/i }).first(),
    page.locator("button", { hasText: /compartilhar/i }).first(),
    page.locator("a", { hasText: /compartilhar/i }).first(),
    page.locator("[aria-label*='Compartilhar' i]").first(),
    page.locator("[title*='Compartilhar' i]").first(),
    page.locator("button, a, [role='button']").filter({ hasText: /Compartilhar/i }).first(),
  ];

  for (const candidate of candidates) {
    try {
      if ((await candidate.count()) === 0) continue;

      await candidate.waitFor({ state: "visible", timeout: 5000 });
      await candidate.scrollIntoViewIfNeeded();
      await candidate.click({ timeout: 10000 });

      console.log("[ML] Clique em Compartilhar realizado");
      await page.waitForTimeout(1500);
      return;
    } catch {}
  }

  await page.screenshot({
    path: path.resolve(__dirname, `erro-botao-compartilhar-${Date.now()}.png`),
    fullPage: true,
  });

  throw new Error("Botão Compartilhar não encontrado ou não clicável");
}

async function extractTrackedLink(page) {
  console.log("[ML] Procurando campo do link rastreado...");

  const possibleFields = [
    'textarea[rows="1"]',
    'textarea[data-testid*="link"]',
    "textarea",
    'input[type="text"]',
    "input[readonly]",
    '[data-testid*="link"] textarea',
    '[data-testid*="link"] input',
  ];

  for (const selector of possibleFields) {
    try {
      const field = page.locator(selector).first();
      if ((await field.count()) === 0) continue;

      await field.waitFor({ state: "visible", timeout: 5000 });

      const value = await field.inputValue().catch(async () => field.textContent());
      if (value && value.trim().length > 0) {
        const trackedLink = value.trim();
        console.log("[ML] Link rastreado encontrado via campo:", trackedLink);
        return trackedLink;
      }
    } catch {}
  }

  console.log("[ML] Campo não encontrado. Buscando link no texto do modal/página...");

  try {
    const bodyText = await page.locator("body").innerText({ timeout: 10000 });
    const matches = bodyText.match(/https?:\/\/[^\s"'<>]+/gi) || [];

    const trackedLink = matches.find((url) => /mercadolivre|mercadolibre|meli\.la/i.test(url));
    if (trackedLink) {
      console.log("[ML] Link rastreado encontrado via texto:", trackedLink);
      return trackedLink.trim();
    }
  } catch {}

  await page.screenshot({
    path: path.resolve(__dirname, `erro-link-rastreado-${Date.now()}.png`),
    fullPage: true,
  });

  throw new Error("Link rastreado não encontrado");
}

async function getTrackedLink(productUrl, mlAccountId = process.env.ML_ACCOUNT_ID || "1") {
  if (!productUrl) {
    throw new Error("URL do produto não informada");
  }

  if (productUrl.includes("meli.la")) {
    console.log("[ML] Expandindo link encurtado...");

    try {
      const res = await fetch(productUrl, { method: "GET", redirect: "follow" });
      productUrl = res.url;
      console.log("[ML] URL expandida:", productUrl);
    } catch (err) {
      console.log("[ML] Falha ao expandir link:", err);
    }
  }

  const context = await chromium.launchPersistentContext(
    path.resolve(__dirname, "..", "profiles", `ml_${mlAccountId}`),
    {
      headless: HEADLESS,
      viewport: { width: 1366, height: 768 },
      slowMo: SLOW_MO,
    }
  );

  const page = await context.newPage();
  let sucesso = false;

  try {
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitForPageReady(page);

    console.log("[ML] URL após redirects:", page.url());

    const resolvedProductUrl = await resolveIntermediatePage(page);
    if (resolvedProductUrl) productUrl = resolvedProductUrl;

    let productName = null;
    try {
      const titleLocator = page.locator("h1").first();
      await titleLocator.waitFor({ state: "visible", timeout: 10000 });
      productName = (await titleLocator.textContent())?.trim() || null;
    } catch {}

    let categoria_niveis = [];
    try {
      const breadcrumbBruto = await extractBreadcrumb(page);
      console.log("[ML] Breadcrumb bruto:", breadcrumbBruto);
      categoria_niveis = limparCategoriasBreadcrumb(breadcrumbBruto);
      console.log("[ML] Breadcrumb limpo:", categoria_niveis);
    } catch (err) {
      console.log("[ML] Erro ao extrair breadcrumb:", err);
    }

    let marca = null;
    try {
      marca = await extractBrand(page);
      console.log("[ML] Marca extraída:", marca);
    } catch (err) {
      console.log("[ML] Erro ao extrair marca:", err);
    }

    let produto_imagem = null;
    try {
      console.log("[ML] Tentando extrair imagem...");

      const ogImage = page.locator('meta[property="og:image"]').first();
      if ((await ogImage.count()) > 0) produto_imagem = await ogImage.getAttribute("content");

      if (!produto_imagem) {
        const mainImg = page.locator("img.ui-pdp-image").first();
        if ((await mainImg.count()) > 0) produto_imagem = await mainImg.getAttribute("src");
      }

      console.log("[ML] Imagem encontrada:", produto_imagem);
    } catch (err) {
      console.log("[ML] Erro ao extrair imagem:", err);
    }

    const commissionPercent = await extractCommissionPercent(page);
    const productPrice = await extractProductPrice(page);

    const ganho_estimado = productPrice * (commissionPercent / 100);
    const ganho_min = ganho_estimado * 0.10;
    const ganho_max = ganho_estimado * 0.30;

    await clickShareButton(page);
    const trackedLink = await extractTrackedLink(page);

    sucesso = true;

    return {
      produto_nome: productName,
      produto_imagem,
      produto_url: productUrl,
      link_rastreado: trackedLink,
      valor: productPrice,
      ganhos: commissionPercent,
      ganho_estimado,
      ganho_min,
      ganho_max,
      pontos: Math.round(ganho_estimado * 0.3 * 100),
      perfil_aut: Number(mlAccountId),
      categoria_niveis,
      marca,
    };
  } catch (err) {
    console.error("[ML] Erro durante automação:", err);

    if (KEEP_BROWSER_OPEN_ON_ERROR) {
      console.error("[ML] Navegador mantido aberto para debug.");
      await sleep(10 * 60 * 1000);
    }

    throw err;
  } finally {
    if (sucesso || !KEEP_BROWSER_OPEN_ON_ERROR) {
      await context.close();
    }
  }
}

if (require.main === module) {
  const productUrl = process.argv[2];
  const mlAccountId = process.argv[3] || process.env.ML_ACCOUNT_ID || "1";

  getTrackedLink(productUrl, mlAccountId)
    .then((result) => {
      process.stdout.write(JSON.stringify(result));
    })
    .catch((err) => {
      process.stderr.write(err?.stack || err?.message || String(err));
      process.exitCode = 1;
    });
}

module.exports = { getTrackedLink };
