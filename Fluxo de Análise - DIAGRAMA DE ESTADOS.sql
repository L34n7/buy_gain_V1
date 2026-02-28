🔄 DIAGRAMA DE ESTADOS — ml_eventos

Representa todos os estados possíveis,
quem cria, quem move e em quais condições.

🟢 ESTADOS INICIAIS (criados no MATCH)
                 ┌─────────────┐
                 │  SEM_MATCH  │
                 └─────────────┘
                        ▲
                        │
                        │ (sobrou unidade / sem candidato)
                        │
┌──────────────┐   ┌─────────────┐
│ EM_ANALISE   │◄──│ MATCH V1    │
└──────────────┘   │             │
        ▲          │             │
        │          └─────────────┘
        │
        │
┌──────────────────────────┐
│ AGUARDANDO_CONFIRMACAO   │
└──────────────────────────┘

Criados por

ml_match_variacao_v1

Regras

EM_ANALISE → caso simples

AGUARDANDO_CONFIRMACAO → disputa / excesso

SEM_MATCH → unidade sem link

🟡 CONFIRMAÇÃO PELO USUÁRIO
┌──────────────┐
│ EM_ANALISE   │
└──────┬───────┘
       │
       │ (ação do usuário)
       ▼
┌──────────────────────────┐
│ CONFIRMADO_PELO_USUARIO  │
└──────────────────────────┘


📌 Esse estado não é final
Ele sempre passa por validação automática.

🟠 VALIDAÇÃO AUTOMÁTICA (por lote)
┌──────────────────────────┐
│ CONFIRMADO_PELO_USUARIO  │
└───────────┬──────────────┘
            │
            │ ml_validar_confirmacoes_por_variacao
            │
     ┌──────┴────────┐
     │               │
     ▼               ▼
┌──────────────┐  ┌────────────────┐
│ EM_ANALISE   │  │ SOLICITAR_PROVA │
└──────────────┘  └────────────────┘

Critério

Confirmados ≤ unidades → EM_ANALISE

Confirmados > unidades → SOLICITAR_PROVA

🔴 TIMEOUTS AUTOMÁTICOS (14 dias)
┌────────────────┐
│ SOLICITAR_PROVA│
└──────┬─────────┘
       │ 14 dias
       ▼
┌──────────────┐
│ DESCARTADO   │
└──────────────┘


┌──────────────────────────┐
│ AGUARDANDO_CONFIRMACAO   │
└──────────┬───────────────┘
           │ 14 dias
           ▼
┌──────────────┐
│ DESCARTADO   │
└──────────────┘


📌 DESCARTADO é estado terminal

⚫ CANCELAMENTO POR VENDA CANCELADA
Detecção inicial
┌──────────────┐
│ EM_ANALISE   │
└──────┬───────┘
       │
       │ venda cancelada
       ▼
┌──────────────────────────────┐
│ AGUARDANDO_RESPOSTA_CANCELADO│
└──────────────────────────────┘


Se apenas 1 evento → pula direto para cancelamento definitivo

Timeout de cancelamento (7 dias)
┌──────────────────────────────┐
│ AGUARDANDO_RESPOSTA_CANCELADO│
└──────────┬───────────────────┘
           │ 7 dias
           ▼
┌──────────────────────┐
│ CANCELADO_DEFINITIVO │◄────┐
└──────────────────────┘     │
                              │
               ┌──────────────┘
               │
┌──────────────┐
│ EM_ANALISE   │  (eventos restaurados)
└──────────────┘


📌 Apenas o evento mais recente é cancelado
📌 Os demais retornam ao status_anterior

🟣 DESCUMPRIMENTO (monitoramento em duas fases)
Fase 1 — Monitoramento
┌──────────────┐
│ EM_ANALISE   │
└──────┬───────┘
       │
       │ descumprimento detectado
       ▼
┌────────────────────────────┐
│ EM_MONITORAMENTO (tabela)  │
└────────────────────────────┘


📌 Estado do evento não muda ainda

Fase 2 — Verificação (36h)
┌──────────────┐
│ EM_ANALISE   │
└──────┬───────┘
       │ descumprimento persiste
       ▼
┌────────────────┐
│ ANALISE_MANUAL │
└────────────────┘


📌 ANALISE_MANUAL é estado final humano

🧱 ESTADOS TERMINAIS
┌──────────────┐
│ DESCARTADO   │
└──────────────┘

┌──────────────────────┐
│ CANCELADO_DEFINITIVO │
└──────────────────────┘

┌────────────────┐
│ ANALISE_MANUAL │
└────────────────┘


Esses estados não retornam automaticamente ao fluxo.