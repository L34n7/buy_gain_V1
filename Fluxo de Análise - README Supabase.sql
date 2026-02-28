📘 README — Fluxo Completo de Análise, Match e Validação (ML)

Este documento descreve todo o fluxo executado pelo cron, incluindo as funções internas chamadas, com foco em comportamento real do código, estados, regras e exceções.

O cron atua como orquestrador, enquanto a lógica pesada está concentrada em funções específicas.

🧠 Visão Geral do Sistema

O fluxo completo é composto por 3 camadas:

Orquestração (cron)

Criação de eventos (match)

Validação, limpeza e exceções

Todas operam sobre as tabelas centrais:

ml_produtos_variacoes

ml_eventos

ml_vendas_nao_efetivadas

ml_monitoramento_cancelamentos

ml_eventos_historico

🕒 ORQUESTRAÇÃO (CRON)

O cron agenda e executa todas as rotinas abaixo, em sequência:

ml_processar_variacoes_produtos()
ml_processar_validacao_por_unidades()
ml_timeout_confirmacao_compra()
ml_timeout_prova()
ml_detectar_vendas_canceladas()
ml_timeout_cancelamento()
ml_detectar_descumprimento()
ml_verificar_descumprimento()

CÓDIGO: 
"
  -- MATCH DE PRODUTOS
  SELECT ml_processar_variacoes_produtos();

  -- CONFIRMAÇÕES E VALIDAÇÕES
  SELECT ml_processar_validacao_por_unidades();
  SELECT ml_timeout_confirmacao_compra();
  SELECT ml_timeout_prova();

  -- CANCELAMENTOS DEFINITIVOS
  SELECT ml_detectar_vendas_canceladas();
  SELECT ml_timeout_cancelamento();

  -- DESCUMPRIMENTO (MONITORAMENTO)
  SELECT ml_detectar_descumprimento();
  SELECT ml_verificar_descumprimento();
"


📌 O cron não toma decisões de negócio, apenas dispara funções.

1️⃣ MATCH DE PRODUTOS (Criação de Eventos)
Função
ml_processar_variacoes_produtos()

Responsabilidade

Identificar variações novas (processada = false)

Iniciar o match apenas quando:

acao_sugerida = 'INICIAR_MATCH'

Ação

Para cada variação elegível:

PERFORM ml_match_variacao_v1(variacao_id)


Depois:

Marca a variação como processada

Nunca reprocessa a mesma variação

🔍 Função Interna — ml_match_variacao_v1(variacao_id)
Objetivo

Criar eventos (ml_eventos) distribuindo links rastreados entre usuários, respeitando:

quantidade de unidades (delta_unidades)

janela de tempo (0–24h / 24–36h)

volume de links por usuário

cenários de disputa

🔹 Etapas Internas do Match
1. Pré-condições

Variação existe

Não está processada

acao_sugerida = 'INICIAR_MATCH'

Se falhar → retorna sem efeito

2. Construção de Saldos (0–36h)

Cria tabela temporária tmp_saldos com:

user_id

saldo_links

ultimo_link

Fonte:

generate_link

3. Métricas Globais

v_total_usuarios

v_total_links

v_links_24h

4. Detecção de Disputa Especial (1 Unidade)

Ativa disputa se:

delta_unidades = 1

mais de 1 usuário

houve link nas últimas 24h

👉 Neste caso, a unidade não é consumida automaticamente

5. Definição do Status Inicial dos Eventos
Condição	Status criado
Excesso de links / disputa	AGUARDANDO_CONFIRMACAO
Caso simples	EM_ANALISE
🔹 Regras de Distribuição
🅱 Regra B — Usuário Único

Um único usuário com links:

cria eventos até esgotar unidades

Unidades restantes:

criam eventos SEM_MATCH

🅰 Regra A — Usuários = Unidades (1 link cada)

Criação direta de eventos

Status: EM_ANALISE

Sem disputa

🔄 Fase 1 — Links 0–24h

Cria 1 evento por usuário recente

Depois distribui links extras por prioridade

Respeita unidades restantes

🔄 Fase 2 — Links 24–36h

Só executa se ainda houver unidades

Status sempre EM_ANALISE

🚫 Eventos Sem Match

Se ainda sobrar unidade:

cria eventos SEM_MATCH

🧩 Resultado do Match

Sempre cria exatamente delta_unidades eventos

Pode gerar:

EM_ANALISE

AGUARDANDO_CONFIRMACAO

SEM_MATCH

2️⃣ VALIDAÇÃO DE CONFIRMAÇÕES DO USUÁRIO
Função
ml_processar_validacao_por_unidades()

O que faz

Busca eventos:

status = 'CONFIRMADO_PELO_USUARIO'


Agrupa por variacao_id

Para cada grupo chama:

ml_validar_confirmacoes_por_variacao(variacao_id)

🔍 Função Interna — ml_validar_confirmacoes_por_variacao(variacao_id)
Objetivo

Garantir que o número de confirmações não ultrapasse o lote

Etapas

Busca delta_unidades da variação

Conta eventos confirmados pelo usuário

Casos Tratados
✅ Caso 1 — Confirmações ≤ Unidades
status → EM_ANALISE


Observação: validação OK

Confirmações aceitas

⚠️ Caso 2 — Confirmações > Unidades
status → SOLICITAR_PROVA


Observação: excesso de confirmações

Usuário deve enviar prova

📌 Esta função não decide vencedor, apenas controla excesso.

3️⃣ TIMEOUTS AUTOMÁTICOS
Confirmação de Compra

Status: AGUARDANDO_CONFIRMACAO

Prazo: 14 dias

Resultado: DESCARTADO

Envio de Prova

Status: SOLICITAR_PROVA

Prazo: 14 dias

Resultado: DESCARTADO

4️⃣ CANCELAMENTOS DEFINITIVOS (Venda Cancelada)
Função
ml_detectar_vendas_canceladas()


Base:

ml_vendas_nao_efetivadas.vendas_canceladas > 0

Regras

0 eventos → ignora

1 evento → CANCELADO_DEFINITIVO

1 evento → AGUARDANDO_RESPOSTA_CANCELADO

5️⃣ TIMEOUT DE CANCELAMENTO (7 dias)
Função
ml_timeout_cancelamento()


Cancela o evento mais recente

Restaura os demais via histórico

6️⃣ DESCUMPRIMENTO (Monitoramento)
Detecção

Cria monitoramento

Não altera status do evento

Verificação (36h)

Se persistir:

Evento → ANALISE_MANUAL

Encerra monitoramento

🧠 RESUMO FINAL

O cron não decide, apenas executa

Match cria eventos e conflitos

Validação controla excesso

Timeouts limpam

Cancelamentos resolvem ambiguidade

Descumprimento monitora antes de escalar

✅ Intenção do Design

Automatizar o que é determinístico
Pedir prova quando há excesso
Dar tempo antes de punir
Escalar para humano apenas quando necessário