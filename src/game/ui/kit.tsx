import React from 'react';
import { Design } from '../types';

/** Small shared UI pieces for the game screens. Dark boutique look: ink background, gold accents. */

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'gold' | 'ghost' | 'danger' | 'green'; size?: 'sm' | 'md' | 'lg' }> = ({ tone = 'ghost', size = 'md', className = '', ...p }) => {
  const tones = {
    gold: 'bg-amber-500 text-black hover:bg-amber-400 disabled:bg-amber-900 disabled:text-amber-200/50',
    ghost: 'bg-white/5 border border-white/15 text-slate-100 hover:bg-white/10 disabled:opacity-40',
    danger: 'bg-rose-600/90 text-white hover:bg-rose-500 disabled:opacity-40',
    green: 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40',
  };
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-3 text-base' };
  return <button {...p} className={`rounded-lg font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed ${tones[tone]} ${sizes[size]} ${className}`} />;
};

export const Card: React.FC<{ title?: React.ReactNode; right?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ title, right, className = '', children }) => (
  <section className={`rounded-xl border border-white/10 bg-[#15171f] p-4 ${className}`}>
    {(title || right) && (
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300/90">{title}</h3>
        {right}
      </div>
    )}
    {children}
  </section>
);

export const Pill: React.FC<{ tone?: 'gold' | 'grey' | 'green' | 'red' | 'blue' | 'purple'; children: React.ReactNode }> = ({ tone = 'grey', children }) => {
  const t = {
    gold: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    grey: 'bg-white/5 text-slate-300 border-white/10',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    purple: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${t}`}>{children}</span>;
};

export const Swatch: React.FC<{ d: Pick<Design, 'color' | 'color2' | 'fabric'>; size?: number }> = ({ d, size = 28 }) => {
  const patterned = d.fabric !== 'plain' && d.fabric !== 'satin' && d.fabric !== 'velvet' && d.fabric !== 'leather' && d.fabric !== 'denim' && d.fabric !== 'chiffon';
  return (
    <span
      className="inline-block rounded-md border border-black/40 shrink-0"
      style={{
        width: size,
        height: size,
        background: patterned ? `repeating-linear-gradient(45deg, ${d.color} 0 5px, ${d.color2} 5px 8px)` : d.color,
      }}
    />
  );
};

export const Bar: React.FC<{ value: number; max: number; tone?: string; label?: string }> = ({ value, max, tone = 'bg-amber-400', label }) => (
  <div>
    {label && (
      <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
        <span>{label}</span>
        <span className="text-slate-200 font-semibold">
          {Math.round(value)} / {max}
        </span>
      </div>
    )}
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  </div>
);

export const Chip: React.FC<{ on?: boolean; onClick?: () => void; children: React.ReactNode; title?: string }> = ({ on, onClick, children, title }) => (
  <button
    title={title}
    onClick={onClick}
    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium text-left transition-all ${on ? 'border-amber-500 bg-amber-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'}`}
  >
    {children}
  </button>
);

export const ColourDots: React.FC<{ colors: { name: string; color: string }[]; value?: string; onPick: (c: string) => void; size?: number }> = ({ colors, value, onPick, size = 26 }) => (
  <div className="flex flex-wrap gap-1.5">
    {colors.map((c) => (
      <button
        key={c.name + c.color}
        title={c.name}
        onClick={() => onPick(c.color)}
        className={`rounded-full border-2 transition-transform ${value === c.color ? 'border-amber-400 scale-110' : 'border-white/15 hover:border-white/40'}`}
        style={{ width: size, height: size, background: c.color === 'none' ? 'repeating-linear-gradient(45deg,#2a2d36,#2a2d36 4px,#3a3d46 4px,#3a3d46 8px)' : c.color }}
      />
    ))}
  </div>
);

export const Modal: React.FC<{ onClose?: () => void; children: React.ReactNode; wide?: boolean }> = ({ onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <div className={`w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#14161d] p-5 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

export const CLASS_TONE = { poor: 'grey', middle: 'blue', rich: 'gold' } as const;
export const CLASS_LABEL = { poor: 'Low budget', middle: 'Middle class', rich: 'Rich client' } as const;
