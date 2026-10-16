import React, { useState } from 'react';
import { naira } from '../economy';
import * as E from '../engine';
import type { GameState, StyleChoice } from '../types';
import { Btn, Card, Modal } from './kit';
import { Styling } from './Styling';

type Up = (f: (g: GameState) => GameState) => void;

/** The evening card: tonight's party, or how the last one went. */
export const OwambeCard: React.FC<{ s: GameState; onGo: () => void }> = ({ s, onGo }) => {
  const tonight = E.owambeTonight(s);
  const o = s.owambe;
  if (tonight) {
    return (
      <Card title="🎉 Owambe tonight!" className="bg-gradient-to-br from-amber-500/20 to-fuchsia-700/20">
        <p className="text-sm text-slate-200">{tonight.title}. Asoebi colour: <span className="inline-block h-3 w-3 rounded-full border border-white/40 align-middle" style={{ background: tonight.color }} /> <b className="capitalize">{tonight.colorName}</b>. Dress Divine from the rails (you're only borrowing the clothes) and make an entrance.</p>
        <Btn tone="gold" className="mt-2 w-full" onClick={onGo}>Get dressed for the party →</Btn>
        <p className="mt-1 text-[11px] text-slate-400">If you sleep without going, the host will be disappointed.</p>
      </Card>
    );
  }
  if (o?.status === 'done' && o.day === s.day) {
    return (
      <Card title={o.result === 'great' ? '🔥 You owned the owambe' : o.result === 'okay' ? '🙂 Nice party' : '😬 The party talked'} className="bg-[#15171f]/95">
        <p className="text-sm text-slate-200">{o.outcome}</p>
        <p className="mt-1 text-[11px] text-slate-400">Impression {o.score}/100{o.spray ? ` · sprayed ${naira(o.spray)}` : ''}. You'll be tired tomorrow morning.</p>
      </Card>
    );
  }
  if (o?.status === 'accepted' && o.day > s.day) {
    return <Card title="🎉 Owambe coming up" className="bg-[#15171f]/95"><p className="text-sm text-slate-300">{o.title} on day {o.day}. Asoebi: <b className="capitalize">{o.colorName}</b>. Make sure the rails have something in that colour.</p></Card>;
  }
  return null;
};

/** Full-screen: dress Divine, then choose how much to spray. */
export const OwambeFlow: React.FC<{ s: GameState; up: Up; onClose: () => void }> = ({ s, up, onClose }) => {
  const [look, setLook] = useState<StyleChoice | null>(null);
  const tonight = E.owambeTonight(s);
  if (!tonight) return null;
  const guest = E.owambeGuest(s);
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#0d0e12]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-[#101219]/95 px-4 py-2">
        <span className="text-sm font-semibold text-white">🎉 {tonight.title}</span>
        <Btn size="sm" onClick={onClose}>Back</Btn>
      </div>
      <Styling state={s} customer={guest} onFinish={setLook} onTurnAway={onClose} onSendToStaff={null} self={{ cancel: 'Not now', finish: 'Go to the party →' }} />
      {look && (
        <Modal onClose={() => setLook(null)}>
          <h2 className="mb-1 font-serif text-2xl font-bold text-white">Spray money?</h2>
          <p className="mb-4 text-sm text-slate-400">At owambes, spraying the celebrants shows class. It costs real money, and it helps people remember you, but it can't save a bad outfit.</p>
          <div className="grid gap-2">
            {E.SPRAY.map((amt) => (
              <button key={amt} disabled={amt > s.cash} onClick={() => { up((g) => E.attendOwambe(g, look, amt)); onClose(); }} className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-left disabled:opacity-40">
                <div className="font-bold text-white">{amt ? `Spray ${naira(amt)}` : "Don't spray"}</div>
                <div className="text-xs text-slate-400">{amt === 0 ? 'Just dance and enjoy yourself.' : amt === 50_000 ? 'A respectable spray. People notice.' : 'Spray like a chief. The whole hall notices.'}</div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};
