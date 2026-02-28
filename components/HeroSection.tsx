import NeonButton from "./NeonButton";
import GiftCardFloating from "./GiftCardFloating";

export default function HeroSection() {
  return (
    <section className="w-full py-24 px-6 md:px-20 flex flex-col md:flex-row gap-16 items-center justify-between">
      <div className="md:w-1/2 space-y-6">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
          COMPRE COMO SEMPRE... <br /> E GANHE CRÉDITOS
        </h1>
        <p className="text-lg text-gray-300">
          Transforme qualquer compra em créditos para trocar por Gift Cards e dinheiro. Zero esforço. Zero custo.
        </p>
        <a href="/cadastro">
          <NeonButton>CRIAR MINHA CONTA GRÁTIS</NeonButton>
        </a>
      </div>

      <div className="relative flex flex-col gap-6 md:w-1/2 items-center">
        <GiftCardFloating src="/steam.png" alt="Steam" />
        <GiftCardFloating src="/playstation.png" alt="PlayStation" />
        <GiftCardFloating src="/xbox.png" alt="Xbox" />
      </div>
    </section>
  );
}
