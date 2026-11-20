import { Link } from 'react-router-dom';
import { ArrowRight, Ticket } from 'lucide-react';

export interface HeroProps { onOpenTourModal?: () => void; }

export default function Hero({ onOpenTourModal }: HeroProps = {}) {
  return (
    <section id="inicio" className="relative min-h-[78svh] lg:min-h-[84svh] flex items-center overflow-hidden pt-32 pb-16 lg:pt-36 lg:pb-24">
      <div className="absolute inset-0" aria-hidden="true">
        <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1920&q=85" alt="" width={1920} height={1280} className="w-full h-full object-cover object-center brightness-[0.55]" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <h1 className="max-w-5xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase leading-[1.02] text-white">
          Entrena duro.<br /><span className="text-amber-400">Supérate cada día.</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-zinc-300 max-w-xl leading-relaxed">Musculación, peso libre y escuela de boxeo. Una familia que te impulsa a romper tus límites.</p>
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Link to="/planes" className="button-primary">Ver planes y precios<ArrowRight size={18} /></Link>
          {onOpenTourModal && <button type="button" onClick={onOpenTourModal} className="button-secondary"><Ticket size={18} className="text-amber-400" />Solicitar pase de cortesía</button>}
        </div>
        <p className="mt-8 text-sm text-zinc-400">Huamanga, Ayacucho · Sede Emadi</p>
      </div>
    </section>
  );
}
