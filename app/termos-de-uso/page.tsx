"use client";

import React from "react";
import Link from "next/link";
import "./termos.css";

export default function TermosUso() {
  return (
    <div className="termos-container">
      <div className="termos-content">
        <h1>Termos de Uso</h1>
        <p className="update-date">Última atualização: 10/12/2025</p>

        <p>
          Bem-vindo ao <strong>Compre & Ganhe</strong>. Ao utilizar nosso site,
          você concorda com os Termos descritos abaixo. Leia com atenção.
        </p>

        <h2>1. Aceitação dos Termos</h2>
        <p>
          Ao criar uma conta, acessar ou utilizar nossos serviços, você declara
          que leu, compreendeu e concorda com estes Termos de Uso e com nossa{" "}
          <Link className="link" href="/politica-de-privacidade">
            Política de Privacidade
          </Link>
          .
        </p>

        <h2>2. Funcionamento da Plataforma</h2>
        <p>
          O Compre & Ganhe é um clube de benefícios que concede créditos ao
          usuário que realiza compras por meio dos links compatíveis com nossa
          plataforma. Esses créditos podem ser trocados por gift cards ou
          dinheiro, conforme disponibilidade.
        </p>
        <p>Importante:</p>
        <ul>
          <li>Não vendemos produtos.</li>
          <li>Não garantimos aprovação de créditos quando a loja parceira não confirma a compra.</li>
          <li>Não somos responsáveis por atrasos ou recusas das lojas externas.</li>
        </ul>

        <h2>3. Cadastro do Usuário</h2>
        <p>Para usar nossa plataforma, o usuário deve fornecer:</p>
        <ul>
          <li>Nome completo</li>
          <li>E-mail válido</li>
          <li>Senha</li>
        </ul>

        <p>O usuário declara que todas as informações fornecidas são verdadeiras.</p>

        <h3>3.1 Responsabilidade da Conta</h3>
        <ul>
          <li>O usuário é responsável por manter sua senha segura.</li>
          <li>Não é permitido compartilhar contas.</li>
          <li>Qualquer atividade realizada na conta é de responsabilidade do usuário.</li>
        </ul>

        <h2>4. Créditos e Resgates</h2>
        <p>Os créditos são gerados com base em:</p>
        <ul>
          <li>Compras qualificadas feitas nos links enviados</li>
          <li>Regras das lojas parceiras</li>
        </ul>

        <h3>4.1 Condições dos créditos</h3>
        <ul>
          <li>O valor dos créditos pode variar conforme categoria e loja.</li>
          <li>Compras canceladas não geram créditos.</li>
          <li>Resgates estão sujeitos a verificação antifraude.</li>
        </ul>

        <h3>4.2 Saques e Pagamentos</h3>
        <ul>
          <li>Os saques são feitos através de chave PIX cadastrada pelo usuário.</li>
          <li>O prazo de pagamento pode variar entre 1 e 5 dias úteis.</li>
        </ul>

        <h2>5. Condutas Proibidas</h2>
        <p>Não é permitido:</p>
        <ul>
          <li>Uso de bots ou automações para gerar créditos</li>
          <li>Fraudes ou tentativas de manipular o sistema</li>
          <li>Criação de múltiplas contas para obter vantagens</li>
          <li>Qualquer uso ilegal da plataforma</li>
        </ul>

        <p>
          Caso seja detectada fraude, a conta pode ser suspensa ou excluída sem aviso prévio.
        </p>

        <h2>6. Responsabilidades e Limitações</h2>
        <ul>
          <li>Não somos responsáveis por decisões das lojas parceiras.</li>
          <li>Não garantimos disponibilidade contínua da plataforma.</li>
          <li>Não nos responsabilizamos por perdas financeiras decorrentes de uso indevido da conta pelo usuário.</li>
        </ul>

        <h2>7. Encerramento da Conta</h2>
        <p>
          O usuário pode solicitar o encerramento da conta a qualquer momento.
          Créditos pendentes expiram com o encerramento da conta.
        </p>

        <h2>8. Alterações nos Termos</h2>
        <p>
          Podemos alterar estes Termos a qualquer momento. A versão atualizada
          estará sempre nesta página.
        </p>

        <h2>9. Contato</h2>
        <p>Dúvidas sobre esses Termos podem ser enviadas para:</p>

        <p className="email">📧 suporte@buygain.com</p>

        <Link className="voltar" href="/">
          ⬅ Voltar para o início
        </Link>
      </div>
    </div>
  );
}
