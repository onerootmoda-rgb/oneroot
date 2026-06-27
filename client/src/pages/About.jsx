import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'

export default function About() {
  return (
    <PublicLayout>
      <main className="pt-20">
        {/* Hero */}
        <section className="min-h-[80vh] flex flex-col items-center justify-center px-md py-xl bg-white relative overflow-hidden">
          <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
            <div className="md:col-span-6 flex flex-col gap-xs">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em]">Established 2025</span>
              <h1 className="font-display-lg text-display-lg md:text-[100px] leading-none mb-md uppercase tracking-tighter">ONE ROOT</h1>
              <div className="flex items-center gap-md">
                <div className="h-[1px] w-12 bg-primary" />
                <p className="font-body-lg text-body-lg text-secondary">BOGOTÁ — COLOMBIA</p>
              </div>
            </div>
            <div className="md:col-span-6 flex justify-end">
              <img alt="One Root Co. Logo" className="w-full max-w-[400px] opacity-10 grayscale hover:grayscale-0 transition-all duration-700" src="/logo/screen.png" onError={e => e.target.style.display = 'none'} />
            </div>
          </div>
        </section>

        {/* Philosophy */}
        <section className="py-xl bg-surface">
          <div className="max-w-[1440px] mx-auto px-lg">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
              <div className="md:col-span-7">
                <div className="aspect-[4/5] md:aspect-[16/10] bg-zinc-200 border border-primary relative overflow-hidden group">
                  <div className="w-full h-full bg-surface-container-high" />
                </div>
              </div>
              <div className="md:col-span-5 md:pt-xl">
                <div className="sticky top-32">
                  <h2 className="font-headline-xl text-headline-xl mb-xs uppercase">OUR PHILOSOPHY</h2>
                  <h3 className="font-label-caps text-label-caps text-secondary mb-md tracking-widest">LESS NOISE, MORE ESSENCE</h3>
                  <div className="h-[2px] w-16 bg-primary mb-md" />
                  <p className="font-body-lg text-body-lg leading-relaxed text-on-surface-variant max-w-md">
                    One Root Co. nace en Bogotá, Colombia en 2025 con una visión clara: crear streetwear minimalista que combine diseño, identidad y presencia sin depender del exceso. Diseñamos piezas pensadas para el día a día, donde los detalles, las siluetas y la calidad hablan más fuerte que los gráficos.
                  </p>
                  <p className="font-body-lg text-body-lg leading-relaxed text-on-surface-variant mt-md max-w-md">
                    Creemos que el estilo no se trata de llamar la atención; se trata de transmitir quién eres sin decir una palabra.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-xl border-y border-primary">
          <div className="max-w-[1440px] mx-auto px-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
              {[['01','DISEÑO'],['02','IDENTIDAD'],['03','CALIDAD'],['04','PRESENCIA']].map(([n,l]) => (
                <div key={n}>
                  <span className="font-label-caps text-label-caps block mb-xs text-secondary">{n}</span>
                  <h4 className="font-headline-lg text-headline-lg uppercase">{l}</h4>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-xl bg-primary text-white">
          <div className="max-w-4xl mx-auto px-gutter text-center">
            <h2 className="font-headline-xl text-headline-xl mb-md">BEYOND TRENDS</h2>
            <p className="font-body-lg text-body-lg text-white/70 mb-lg max-w-2xl mx-auto">
              Nuestro enfoque mezcla una estética contemporánea con una filosofía simple: menos ruido, más esencia. One Root Co. no sigue tendencias. Construye una identidad.
            </p>
            <Link to="/catalog" className="inline-block px-lg py-md bg-white text-primary font-label-caps text-label-caps hover:bg-surface-container-highest transition-colors">
              EXPLORAR ARCHIVO
            </Link>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
