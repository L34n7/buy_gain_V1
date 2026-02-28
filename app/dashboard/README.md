# 📊 Dashboard — BuyGain

Este diretório contém toda a estrutura do **Dashboard da plataforma BuyGain**.  
Aqui ficam as páginas, componentes, hooks e utilidades usadas após o usuário estar logado.

A organização segue boas práticas do **Next.js App Router**, separando:
- UI (componentes)
- Lógica (hooks)
- Funções auxiliares (utils)

---

## 📁 Estrutura geral

dashboard/
├── page.tsx
├── dashboard.css
├── components/
├── hooks/
├── utils/
└── README.md


---

## 🧠 page.tsx

Arquivo principal da página `/dashboard`.

Responsabilidades:
- Controlar **estados globais** da página
- Orquestrar chamadas de API
- Conectar lógica com os componentes
- Não contém mais UI pesada

👉 É o “cérebro” do dashboard.

---

## 🎨 dashboard.css

Arquivo de estilos **exclusivo do dashboard**.

Contém:
- Layout geral
- Cards
- Modal
- Botões
- Animações

---

## 🧩 components/

Componentes visuais reutilizáveis do dashboard.

### 🔹 HeroLinkForm.tsx
Formulário principal onde o usuário:
- Cola o link do produto
- Gera o link rastreado
- Vê erros de validação
- Aciona a busca de cupons

📌 Não contém lógica de API, apenas UI.

---

### 🔹 ResultCard.tsx
Exibe o resultado após gerar o link:
- Produto
- Imagem
- Preço
- Pontos estimados
- Link rastreado
- Botões **Abrir** e **Copiar**

Também mostra o **toast de feedback** ao copiar o link.

---

### 🔹 EventsModal.tsx
Modal que aparece automaticamente quando há:
- Confirmação de compra
- Confirmação de cancelamento
- Solicitação de prova

Responsável por:
- Exibir dados do evento
- Mostrar prazo restante
- Coletar relato e comprovante
- Disparar ações de confirmação

---

## 🪝 hooks/

Hooks personalizados do dashboard  
(usados para separar lógica do `page.tsx`).

> 📌 Alguns hooks podem ser adicionados ou expandidos no futuro.

Exemplos planejados:
- `useGenerateLink`
- `useEventosPendentes`
- `useDashboardSummary`

---

## 🛠 utils/

Funções utilitárias reutilizáveis, sem dependência de React.

### 🔹 format.ts
Funções de formatação:
- Datas
- Valores monetários
- Encurtamento de links

---

### 🔹 platform.ts
Identifica a plataforma do link:
- Shopee
- Mercado Livre
- Outras no futuro

---

### 🔹 prazo.ts
Regras de negócio relacionadas a prazos:
- Identifica eventos que exigem resposta
- Calcula dias restantes
- Retorna status visual (normal / alerta / expirado)

---

## ✅ Benefícios dessa organização

✔ Código mais legível  
✔ Arquivos menores  
✔ Manutenção facilitada  
✔ Escalável para novas features  
✔ Padrão profissional de SaaS  

---

## 🚀 Observação final

Sempre que possível:
- UI → `components`
- Lógica → `hooks`
- Regra de negócio → `utils`

Evite adicionar lógica pesada direto no `page.tsx`.

---