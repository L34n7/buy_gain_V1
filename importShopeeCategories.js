import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const BASE_URL =
  "https://seller.shopee.com.br/help/api/v3/global_category/list/";

async function fetchPage(page) {
  const res = await fetch(
    `${BASE_URL}?page=${page}&size=100`
  );

  const json = await res.json();
  return json.data;
}

async function main() {
  let page = 1;
  let totalPages = 1;

  const categoriasMap = new Map();

  while (page <= totalPages) {
    console.log(`Buscando página ${page}...`);

    const data = await fetchPage(page);

    const total = data.total;
    totalPages = Math.ceil(total / 100);

    for (const item of data.global_cats) {
      for (let i = 0; i < item.path.length; i++) {
        const cat = item.path[i];

        if (!categoriasMap.has(cat.category_id)) {
          categoriasMap.set(cat.category_id, {
            id: cat.category_id,
            nome: cat.category_name,
            parent_id:
              i > 0 ? item.path[i - 1].category_id : null,
            nivel: i + 1,
          });
        }
      }
    }

    page++;
  }

  console.log("Total categorias únicas:", categoriasMap.size);

  const categorias = Array.from(categoriasMap.values());

  const { error } = await supabase
    .from("categoria_shopee_base")
    .upsert(categorias, { onConflict: "id" });

  if (error) {
    console.error("Erro ao inserir:", error);
  } else {
    console.log("Importação finalizada com sucesso 🚀");
  }
}

main();
