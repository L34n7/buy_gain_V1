export default function HowItWorks() {
  const steps = [
    { title: "Cole o Link", desc: "Insira o link do produto que deseja comprar.", icon: "🔗" },
    { title: "Geramos o link exclusivo", desc: "Transformamos seu link no nosso link afiliado.", icon: "⚡" },
    { title: "Você ganha créditos", desc: "Após a compra, metade da comissão vira crédito seu!", icon: "💰" },
  ];

  return (
    <section className="py-24 px-6 md:px-20 text-center">
      <h2 className="text-3xl md:text-5xl font-bold mb-12">COMO FUNCIONA</h2>
      <div className="grid md:grid-cols-3 gap-10">
        {steps.map((s, i) => (
          <div
            key={i}
            className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(167,139,250,0.5)] transition"
          >
            <div className="text-5xl mb-4">{s.icon}</div>
            <h3 className="text-xl font-bold mb-2">{s.title}</h3>
            <p className="text-gray-300">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
