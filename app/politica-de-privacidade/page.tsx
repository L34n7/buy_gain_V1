"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./politica.css";

export default function PoliticaPrivacidade() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="politica-container">
      <div className="politica-content">
        <h1>Política de Privacidade</h1>
        <p className="update-date">Última atualização: 10/12/2025</p>

        <p>
          Bem-vindo ao <strong>Compre & Ganhe</strong>. A sua privacidade é
          importante para nós. Esta Política explica como coletamos, usamos e
          protegemos seus dados.
        </p>

        <h2>1. Informações que Coletamos</h2>

        <h3>1.1 Dados informados pelo usuário</h3>
        <ul>
          <li>Nome completo</li>
          <li>E-mail</li>
          <li>Senha (criptografada)</li>
          <li>CPF (para pagamentos)</li>
          <li>Chave PIX (para saques)</li>
          <li>Dados informados no suporte</li>
        </ul>

        <h3>1.2 Dados coletados automaticamente</h3>
        <ul>
          <li>Endereço IP</li>
          <li>Tipo de dispositivo</li>
          <li>Navegador utilizado</li>
          <li>Páginas acessadas</li>
          <li>Horário de acesso</li>
          <li>Cookies essenciais</li>
        </ul>

        <h3>1.3 Dados relacionados aos créditos</h3>
        <ul>
          <li>Links enviados para compras</li>
          <li>Créditos e histórico de resgates</li>
        </ul>

        <h2>2. Como Utilizamos Seus Dados</h2>
        <p>Usamos seus dados para:</p>
        <ul>
          <li>Gerenciar sua conta</li>
          <li>Processar créditos e resgates</li>
          <li>Entrar em contato quando necessário</li>
          <li>Melhorar sua experiência</li>
          <li>Garantir segurança e evitar fraudes</li>
        </ul>

        <p className="important">Nunca vendemos seus dados.</p>

        <h2>3. Compartilhamento de Dados</h2>
        <p>Compartilhamos somente quando necessário com:</p>
        <ul>
          <li>Parceiros de pagamento (processar saques)</li>
          <li>Serviços de autenticação</li>
          <li>Ferramentas de análise de tráfego</li>
        </ul>

        <h2>4. Segurança dos Dados</h2>
        <p>
          Mantemos medidas de segurança como criptografia de senhas, SSL,
          proteção contra invasões e auditorias regulares.
        </p>

        <h2>5. Direitos do Usuário (LGPD)</h2>
        <p>Você pode solicitar a qualquer momento:</p>
        <ul>
          <li>Cópia de seus dados</li>
          <li>Correção de informações</li>
          <li>Exclusão da conta</li>
          <li>Revogação de consentimento</li>
        </ul>

        <h2>6. Uso de Cookies</h2>
        <p>
          Usamos cookies para login, preferências, estatísticas e segurança. Você
          pode desativá-los, mas algumas funções podem parar de funcionar.
        </p>

        <h2>7. Alterações nesta Política</h2>
        <p>
          Podemos atualizar esta política periodicamente. A versão mais recente
          estará sempre nesta página.
        </p>

        <h2>8. Contato</h2>
        <p>
          Para solicitar informações ou exercer seus direitos, entre em contato:
        </p>

        <p className="email">📧 suporte@buygain.com</p>

        <button className="voltar" onClick={handleBack} type="button">
          ⬅ Voltar para o início
        </button>
      </div>
    </div>
  );
}
