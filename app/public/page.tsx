import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BuyGain - Ganhe pontos comprando",
  description: "Transforme suas compras online em pontos para trocar por vale presente e recompensas.",
  openGraph: {
    title: "BuyGain - Ganhe pontos comprando",
    description: "Transforme suas compras online em pontos para trocar por vale presente e recompensas.",
    url: "https://buygain.com.br/public",
    siteName: "BuyGain",
    images: [
      {
        url: "https://buygain.com.br/logo.png",
        width: 2720,
        height: 1568,
        alt: "Logo BuyGain",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BuyGain - Ganhe pontos comprando",
    description: "Transforme suas compras online em pontos para trocar por vale presente e recompensas.",
    images: ["https://buygain.com.br/logo.png"],
  },
};

export default function Home() {
  return (
    <div className="landing-container">

    <div className="header">
       <div className="header-logo">
          <Image src="/logo.png" width={160} height={160} alt="BuyGain" className="logo no-download"  />
        </div>
    </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-text">
          <h1>
            COMPRE COMO SEMPRE... <br /> E GANHE BENEFÍCIOS EXCLUSIVOS <br /> 
          </h1>

          <p>Transforme suas compras online em pontos para trocar por Vale presente e Recompensas.
            <br /> Zero esforço. Zero custos. Benefícios reais. 100% seguro.<br /> </p>

        <Link href="/auth/cadastro" className="hero-btn">
          CRIAR MINHA CONTA GRÁTIS
        </Link>        
        
        </div>

        <div className="giftcards-group1">
          <Image src="/giftcards/XBOX4.png" width={150} height={150} alt="valorant" className="giftcard-img gc1 no-download" />
          <Image src="/giftcards/playstation2.png" width={150} height={150} alt="PlayStation" className="giftcard-img gc2 no-download" />
          <Image src="/giftcards/googleplayCARD2.png" width={150} height={150} alt="freefire" className="giftcard-img gc3 no-download" />
          <Image src="/giftcards/steam1.png" width={150} height={150} alt="steam" className="giftcard-img gc4 no-download" />
        </div>

        {/*
        <div className="giftcards-group2">
          <Image src="/giftcards/valorant1.png" width={150} height={150} alt="valorant" className="giftcard-img gc1" />
          <Image src="/giftcards/freefire1.png" width={150} height={150} alt="PlayStation" className="giftcard-img gc2" />
          <Image src="/giftcards/robloxCARD2.png" width={150} height={150} alt="freefire" className="giftcard-img gc3" />
          <Image src="/giftcards/LOL1.png" width={150} height={150} alt="steam" className="giftcard-img gc4" />
        </div>
        */}
      </section>


      {/* COMO FUNCIONA */}
      <section className="how-it-works how-first">
        <h2 className="how-title">COMO FUNCIONA</h2>

        <div className="how-grid">

          <div className="how-item">
            <Image src="/icons/link.png" width={2048} height={2048} alt="Cole o link" className="link no-download" />
            <h3>COLE O LINK </h3>
            <p> Informe o link do produto ou loja que você quer comprar. </p>
          </div>

          <div className="how-item">
            <Image src="/icons/convert.png" width={2048} height={2048} alt="Transformamos seu link" className="convert no-download" />
            <h3>ATIVE SEU LINK DO CLUBE</h3>
            <p> Nós transformamos seu link comum em um Link de Benefícios, que ativa ofertas, cupons e pontos para sua compra. </p>
          </div>

          <div className="how-item">
            <Image src="/icons/money.png" width={2048} height={2048} alt="Cupons e Pontos" className="money no-download" />
            <h3>CUPOM E PONTOS </h3>
            <p>Receba o Cupom e ao finalizar a compra com o Link do Clube, você acumula pontos que podem ser trocados por Vale Presente e outras recompensas.</p>

          </div>

        </div>
      </section>

      {/* SIMULADOR */}
      <section className="how-it-works how-simulator">

        <h2 className="how-title">SIMULADOR</h2>

        <div className="simulator">
          <p>Cole aqui o link da sua compra e receba cupons de desconto e pontos:</p>
          <input className="sim-input" placeholder="Cole o link…" />

          <p className="sim-value1">Você pode ganhar</p>
          <p className="sim-value2">3.286 pontos</p>

        </div>
      </section> 

      {/* BENEFÍCIOS  */}
      <section className="how-it-works how-beneficios">

        <h2 className="how-title">BENEFÍCIOS</h2>

        <div className="benef-content">
          <div className="benef-left">
             <div className="card-fan1">
              <Image src="/icons/ponto33.png" width={2048} height={2048} alt="Pontos" className="ponto no-download" />
            </div>
            <h3>PONTOS</h3>
            <p>Ganhe pontos automaticamente comprando com link do clube e troque por Vale Presente e recompensas.</p>
          </div>

          <div className="divider"></div>

          <div className="benef-right">
              <div className="card-fan2">
                <Image src="/icons/cupom.png" width={2048} height={2048} alt="Cupom 1" className="card c1 no-download" />
                <Image src="/icons/cupom.png" width={2048} height={2048} alt="Cupom 2" className="card c2 no-download"  />
                <Image src="/icons/cupom.png" width={2048} height={2048} alt="Cupom 3" className="card c3 no-download" />
                <Image src="/icons/cupom.png" width={2048} height={2048} alt="Cupom 4" className="card c4 no-download" />
              </div>
            <h3>CUPONS</h3>
            <p>Receba cupons compativeis com a sua compra de forma instantânea sem dificuldades.</p>
          </div>
        </div>
      </section>

      {/* GIFT CARDS */}
      <section className="how-it-works how-giftcards">

        <h2 className="how-title">VALE PRESENTE</h2>

          <div className="giftcards-wheel">
              <div className="giftcards-grid">
                <Image src="/giftcards/steam1.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/steamORIGI1.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/steamORIGI.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/razerORIGI.png" width={150} height={150} alt="CARD 5" className="giftcard no-download" />
                <Image src="/giftcards/pcgamepassORIGI.png" width={150} height={150} alt="freefire" className="giftcard no-download" />
                <Image src="/giftcards/xboxORIGI.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/xboxORIGI2.png" width={150} height={150} alt="valorant" className="giftcard no-download" />
                <Image src="/giftcards/xboxORIGI1.png" width={150} height={150} alt="PlayStation" className="giftcard no-download" />
                <Image src="/giftcards/playstationORIGI.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/playstation2.png" width={150} height={150} alt="CARD 2" className="giftcard no-download" />
                <Image src="/giftcards/nitendoORIGI2.png" width={150} height={150} alt="CARD 4" className="giftcard no-download" />
                <Image src="/giftcards/freefireORIGI.png" width={150} height={150} alt="CARD 6" className="giftcard no-download" />
                <Image src="/giftcards/freefireORIGI1.png" width={150} height={150} alt="CARD 7" className="giftcard no-download" />
                <Image src="/giftcards/minicraftORIGI1.png" width={150} height={150} alt="CARD 8" className="giftcard no-download" />
                <Image src="/giftcards/minicraftORIGI.png" width={150} height={150} alt="CARD 9" className="giftcard no-download" />
                <Image src="/giftcards/imvuORIGI.png" width={150} height={150} alt="CARD 10" className="giftcard no-download" />
                <Image src="/giftcards/imvuORIGI1.png" width={150} height={150} alt="CARD 10" className="giftcard no-download" />
                <Image src="/giftcards/robloxORIGI.png" width={150} height={150} alt="CARD 10" className="giftcard no-download" />
                <Image src="/giftcards/lolORIGI.png" width={150} height={150} alt="CARD 12" className="giftcard no-download" />
                <Image src="/giftcards/lolORIGI1.png" width={150} height={150} alt="CARD 13" className="giftcard no-download" />
                <Image src="/giftcards/valorant1.png" width={150} height={150} alt="CARD 14" className="giftcard no-download" />
                <Image src="/giftcards/valorantORIGI3.png" width={150} height={150} alt="CARD 15" className="giftcard no-download" />
                <Image src="/giftcards/valorantORIGI.png" width={150} height={150} alt="CARD 16" className="giftcard no-download" />
                <Image src="/giftcards/valorantORIGI1.png" width={150} height={150} alt="CARD 17" className="giftcard no-download" />
                <Image src="/giftcards/fortnite.png" width={150} height={150} alt="CARD 18" className="giftcard no-download" />
                <Image src="/giftcards/PUBGORIGI1.png" width={150} height={150} alt="CARD 19" className="giftcard no-download" />
                <Image src="/giftcards/PUBGORIGI.png" width={150} height={150} alt="CARD 20" className="giftcard no-download" />
                <Image src="/giftcards/genshinORIGI.png" width={150} height={150} alt="CARD 21" className="giftcard no-download" />
                <Image src="/giftcards/globoplayORIGI.png" width={150} height={150} alt="CARD 22" className="giftcard no-download" />
                <Image src="/giftcards/outbackORIGI.png" width={150} height={150} alt="CARD 23" className="giftcard no-download" />
                <Image src="/giftcards/ifoodORIGI.png" width={150} height={150} alt="CARD 23" className="giftcard no-download" />
                <Image src="/giftcards/googleplay.png" width={150} height={150} alt="CARD 24" className="giftcard no-download" />
                <Image src="/giftcards/googleplayORIGI.png" width={150} height={150} alt="CARD 25" className="giftcard no-download" />
                <Image src="/giftcards/appstoreORIGI.png" width={150} height={150} alt="CARD 26" className="giftcard no-download" />
                <Image src="/giftcards/spotifyORIGI1.png" width={150} height={150} alt="CARD 27" className="giftcard no-download" />
                <Image src="/giftcards/uberORIGI.png" width={150} height={150} alt="CARD 28" className="giftcard no-download" />
                <Image src="/giftcards/netflixORIGI.png" width={150} height={150} alt="CARD 29" className="giftcard no-download" />
                <Image src="/giftcards/steam1.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/steamORIGI1.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/steamORIGI.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/razerORIGI.png" width={150} height={150} alt="CARD 5" className="giftcard no-download" />
                <Image src="/giftcards/pcgamepassORIGI.png" width={150} height={150} alt="freefire" className="giftcard no-download" />
                <Image src="/giftcards/xboxORIGI.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/xboxORIGI2.png" width={150} height={150} alt="valorant" className="giftcard no-download" />
                <Image src="/giftcards/xboxORIGI1.png" width={150} height={150} alt="PlayStation" className="giftcard no-download" />
                <Image src="/giftcards/playstationORIGI.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/playstation2.png" width={150} height={150} alt="CARD 2" className="giftcard no-download" />
                <Image src="/giftcards/nitendoORIGI2.png" width={150} height={150} alt="CARD 4" className="giftcard no-download" />
                <Image src="/giftcards/freefireORIGI.png" width={150} height={150} alt="CARD 6" className="giftcard no-download" />
                <Image src="/giftcards/freefireORIGI1.png" width={150} height={150} alt="CARD 7" className="giftcard no-download" />
                <Image src="/giftcards/minicraftORIGI1.png" width={150} height={150} alt="CARD 8" className="giftcard no-download" />
                <Image src="/giftcards/minicraftORIGI.png" width={150} height={150} alt="CARD 9" className="giftcard no-download" />
                <Image src="/giftcards/imvuORIGI.png" width={150} height={150} alt="CARD 10" className="giftcard no-download" />
                <Image src="/giftcards/imvuORIGI1.png" width={150} height={150} alt="CARD 10" className="giftcard no-download" />
                <Image src="/giftcards/robloxORIGI.png" width={150} height={150} alt="CARD 10" className="giftcard no-download" />
                <Image src="/giftcards/lolORIGI.png" width={150} height={150} alt="CARD 12" className="giftcard no-download" />
                <Image src="/giftcards/lolORIGI1.png" width={150} height={150} alt="CARD 13" className="giftcard no-download" />
                <Image src="/giftcards/valorant1.png" width={150} height={150} alt="CARD 14" className="giftcard no-download" />
                <Image src="/giftcards/valorantORIGI3.png" width={150} height={150} alt="CARD 15" className="giftcard no-download" />
                <Image src="/giftcards/valorantORIGI.png" width={150} height={150} alt="CARD 16" className="giftcard no-download" />
                <Image src="/giftcards/valorantORIGI1.png" width={150} height={150} alt="CARD 17" className="giftcard no-download" />
                <Image src="/giftcards/fortnite.png" width={150} height={150} alt="CARD 18" className="giftcard no-download" />
                <Image src="/giftcards/PUBGORIGI1.png" width={150} height={150} alt="CARD 19" className="giftcard no-download" />
                <Image src="/giftcards/PUBGORIGI.png" width={150} height={150} alt="CARD 20" className="giftcard no-download" />
                <Image src="/giftcards/genshinORIGI.png" width={150} height={150} alt="CARD 21" className="giftcard no-download" />
                <Image src="/giftcards/globoplayORIGI.png" width={150} height={150} alt="CARD 22" className="giftcard no-download" />
                <Image src="/giftcards/outbackORIGI.png" width={150} height={150} alt="CARD 23" className="giftcard no-download" />
                <Image src="/giftcards/ifoodORIGI.png" width={150} height={150} alt="CARD 23" className="giftcard no-download" />
                <Image src="/giftcards/googleplay.png" width={150} height={150} alt="CARD 24" className="giftcard no-download" />
                <Image src="/giftcards/googleplayORIGI.png" width={150} height={150} alt="CARD 25" className="giftcard no-download" />
                <Image src="/giftcards/appstoreORIGI.png" width={150} height={150} alt="CARD 26" className="giftcard no-download" />
                <Image src="/giftcards/spotifyORIGI1.png" width={150} height={150} alt="CARD 27" className="giftcard no-download" />
                <Image src="/giftcards/uberORIGI.png" width={150} height={150} alt="CARD 28" className="giftcard no-download" />
                <Image src="/giftcards/netflixORIGI.png" width={150} height={150} alt="CARD 29" className="giftcard no-download" />
                <Image src="/giftcards/steam1.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/steamORIGI1.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/steamORIGI.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/razerORIGI.png" width={150} height={150} alt="CARD 5" className="giftcard no-download" />
                <Image src="/giftcards/pcgamepassORIGI.png" width={150} height={150} alt="freefire" className="giftcard no-download" />
                <Image src="/giftcards/xboxORIGI.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/xboxORIGI2.png" width={150} height={150} alt="valorant" className="giftcard no-download" />
                <Image src="/giftcards/xboxORIGI1.png" width={150} height={150} alt="PlayStation" className="giftcard no-download" />
                <Image src="/giftcards/playstationORIGI.png" width={150} height={150} alt="steam" className="giftcard no-download" />
                <Image src="/giftcards/playstation2.png" width={150} height={150} alt="CARD 2" className="giftcard no-download" />
                <Image src="/giftcards/nitendoORIGI2.png" width={150} height={150} alt="CARD 4" className="giftcard no-download" />
                <Image src="/giftcards/freefireORIGI.png" width={150} height={150} alt="CARD 6" className="giftcard no-download" />
                <Image src="/giftcards/freefireORIGI1.png" width={150} height={150} alt="CARD 7" className="giftcard no-download" />
                <Image src="/giftcards/minicraftORIGI1.png" width={150} height={150} alt="CARD 8" className="giftcard no-download" />
                <Image src="/giftcards/minicraftORIGI.png" width={150} height={150} alt="CARD 9" className="giftcard no-download" />
                <Image src="/giftcards/imvuORIGI.png" width={150} height={150} alt="CARD 10" className="giftcard no-download" />
                <Image src="/giftcards/imvuORIGI1.png" width={150} height={150} alt="CARD 10" className="giftcard no-download" />
                <Image src="/giftcards/robloxORIGI.png" width={150} height={150} alt="CARD 10" className="giftcard no-download" />
                <Image src="/giftcards/lolORIGI.png" width={150} height={150} alt="CARD 12" className="giftcard no-download" />
                <Image src="/giftcards/lolORIGI1.png" width={150} height={150} alt="CARD 13" className="giftcard no-download" />
                <Image src="/giftcards/valorant1.png" width={150} height={150} alt="CARD 14" className="giftcard no-download" />
                <Image src="/giftcards/valorantORIGI3.png" width={150} height={150} alt="CARD 15" className="giftcard no-download" />
                <Image src="/giftcards/valorantORIGI.png" width={150} height={150} alt="CARD 16" className="giftcard no-download" />
                <Image src="/giftcards/valorantORIGI1.png" width={150} height={150} alt="CARD 17" className="giftcard no-download" />
                <Image src="/giftcards/fortnite.png" width={150} height={150} alt="CARD 18" className="giftcard no-download" />
                <Image src="/giftcards/PUBGORIGI1.png" width={150} height={150} alt="CARD 19" className="giftcard no-download" />
                <Image src="/giftcards/PUBGORIGI.png" width={150} height={150} alt="CARD 20" className="giftcard no-download" />
                <Image src="/giftcards/genshinORIGI.png" width={150} height={150} alt="CARD 21" className="giftcard no-download" />
                <Image src="/giftcards/globoplayORIGI.png" width={150} height={150} alt="CARD 22" className="giftcard no-download" />
                <Image src="/giftcards/outbackORIGI.png" width={150} height={150} alt="CARD 23" className="giftcard no-download" />
                <Image src="/giftcards/ifoodORIGI.png" width={150} height={150} alt="CARD 23" className="giftcard no-download" />
                <Image src="/giftcards/googleplay.png" width={150} height={150} alt="CARD 24" className="giftcard no-download" />
                <Image src="/giftcards/googleplayORIGI.png" width={150} height={150} alt="CARD 25" className="giftcard no-download" />
                <Image src="/giftcards/appstoreORIGI.png" width={150} height={150} alt="CARD 26" className="giftcard no-download" />
                <Image src="/giftcards/spotifyORIGI1.png" width={150} height={150} alt="CARD 27" className="giftcard no-download" />
                <Image src="/giftcards/uberORIGI.png" width={150} height={150} alt="CARD 28" className="giftcard no-download" />
                <Image src="/giftcards/netflixORIGI.png" width={150} height={150} alt="CARD 29" className="giftcard no-download" />



              </div>
          </div>

          <div className="plataformas">
            <h3>PLATAFORMAS</h3>
            <p>Com as quais trabalhamos</p>

              <div className="plataformas-logos">
                <Image src="/plataformas/plataformas_01.png" width={317} height={97} alt="plat_01 no-download" />
                <Image src="/plataformas/plataformas_02.png" width={317} height={97} alt="plat_02 no-download" />
                <Image src="/plataformas/plataformas_03.png" width={317} height={97} alt="plat_03 no-download" />
                <Image src="/plataformas/plataformas_04.png" width={317} height={97} alt="plat_04 no-download" />
                <Image src="/plataformas/plataformas_05.png" width={317} height={97} alt="plat_05 no-download" />
                <Image src="/plataformas/plataformas_06.png" width={317} height={97} alt="plat_06 no-download" />
                <Image src="/plataformas/plataformas_07.png" width={317} height={97} alt="plat_07 no-download" />
                <Image src="/plataformas/plataformas_08.png" width={317} height={97} alt="plat_08 no-download" />
                <Image src="/plataformas/plataformas_09.png" width={317} height={97} alt="plat_09 no-download" />
              </div>
              
            </div>
      </section> 

      
        {/* CTA FINAL */}
        <section className="cta-final">
          <div className="cta-content">
            <h2>PRONTO PARA COMEÇAR?</h2>
            <p>
              Cadastre-se gratuitamente e comece a ganhar pontos comprando como sempre.
            </p>

            <a href="/auth/cadastro" className="cta-btn">
              CRIAR MINHA CONTA GRÁTIS
            </a>

            <div className="cta-sub">
              <p> • Resgate Vale Presente e Recompensa</p>
              <p> • Sem mensalidade </p>
              <p> • Sem custo </p>
            </div>
          </div>
        </section>
    
        {/* Depoimento 
        <section className="how-it-works how-testimonial">

        <h2 className="how-title">DEPOIMENTOS</h2>

          <div className="testimonial">
            <Image src="/icons/user.png" width={1024} height={1029} alt="Avatar"   style={{ objectFit: "contain" }}
          className="testimonial-img"/>
          <div 
          className="testimonial-text">
            <h3>Jaquer, gamer</h3>
            <p>Usei o Clube para fazer minhas compras e acumulei pontos sem esforço. Troquei por Gift Cards e funcionou perfeitamente. Recomendo demais!</p>

          </div>
          </div>
        </section> 
      */}

        {/* Rodapé */}
      <footer className="footer">
      <div className="footer-content">

        <div className="footer-info">
          <Image src="/logo.png" width={150} height={150} alt="logo" className="footer-logo no-download"  />

          <h4>BuyGain</h4>
          <p>Transformamos suas compras online em pontos e resgatee recompensas</p>
        </div>

        <div className="footer-links">
          <a href="/politica-de-privacidade" target="_blank" >Política de Privacidade</a>
          <a href="/termos-de-uso" target="_blank" >Termos de Uso</a>
          <a href="https://wa.me/55SEU_NUMERO" target="_blank" >Suporte via WhatsApp</a>
        </div>

        <div className="footer-social">
          <p>Siga-nos</p>
          <div className="icons">
            <a href="https://www.instagram.com/buy_gain" target="blank" ><img src="/icons/MS/insta.png" alt="Instagram" /></a>
            <a href="https://www.youtube.com/" target="blank" ><img src="/icons/MS/youtube.png" alt="YouTube" /></a>
          </div>
        </div>

      </div>

      <div className="footer-copy">
        © 2025 BuyGain. Todos os direitos reservados.
      </div>
    </footer>

    </div>
  );
}