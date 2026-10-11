import React, { useEffect, useState } from 'react';
import { TIERS, naira } from '../game/economy';
import { Btn, Modal } from '../game/ui/kit';
import { CloudStore, CloudUser, PlayerRow } from './types';

/** Admins only (the rules check this on the server too): send or take game money. */
export const AdminPanel: React.FC<{ store: CloudStore; me: CloudUser; onClose: () => void }> = ({ store, me, onClose }) => {
  const [rows, setRows] = useState<PlayerRow[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [done, setDone] = useState('');
  const refresh = () => {
    setErr('');
    store.listPlayers().then(setRows).catch(() => setErr("Couldn't load players. Are you signed in as an admin?"));
  };
  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (uid: string, name: string, kind: 'add' | 'set', sign: 1 | -1) => {
    const n = Math.round(Number(amount.replace(/[^\d.]/g, '')));
    if (!n && kind === 'add') return setErr('Type an amount first.');
    try {
      await store.sendGrant(uid, { kind, amount: kind === 'set' ? n : n * sign, reason: reason.trim().slice(0, 80), by: me.email });
      setDone(kind === 'set' ? `${name}'s money will be set to ${naira(n)}.` : `${sign > 0 ? 'Sent' : 'Taking'} ${naira(n)} ${sign > 0 ? 'to' : 'from'} ${name}.`);
      setAmount('');
      setReason('');
      setTimeout(refresh, 1500);
    } catch {
      setErr("That didn't go through. Only admins can do this.");
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-xl font-bold text-white">Admin: game money</h2>
        <Btn size="sm" onClick={refresh}>Refresh</Btn>
      </div>
      <p className="text-xs text-slate-400 mb-3">Money lands in the player's game within seconds if it's open, otherwise the next time they play. It shows in their bank and as a message from "Asanwa HQ". Every change is logged.</p>
      {err && <p className="text-sm text-rose-300 mb-2">{err}</p>}
      {done && <p className="text-sm text-emerald-300 mb-2">{done}</p>}
      {!rows ? (
        <p className="text-sm text-slate-400">Loading players…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No players have saved yet.</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {rows.sort((a, b) => b.savedAt - a.savedAt).map((r) => (
            <div key={r.uid} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <button className="w-full text-left" onClick={() => { setOpen(open === r.uid ? null : r.uid); setDone(''); setErr(''); }}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-white font-semibold">{r.name}{r.uid === me.uid ? ' (you)' : ''}</span>
                  <span className="text-emerald-300 font-semibold">{naira(r.cash)}</span>
                </div>
                <div className="text-[11px] text-slate-400">{r.email} · day {r.day} · {TIERS[r.tier]?.name} · last saved {new Date(r.savedAt).toLocaleString()}</div>
              </button>
              {open === r.uid && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1.5">
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Amount (₦)" className="flex-1 min-w-0 rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-sm text-white" />
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Note (optional)" className="flex-1 min-w-0 rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-sm text-white" />
                  </div>
                  <div className="flex gap-1.5">
                    <Btn size="sm" tone="green" onClick={() => send(r.uid, r.name, 'add', 1)}>Give</Btn>
                    <Btn size="sm" tone="danger" onClick={() => send(r.uid, r.name, 'add', -1)}>Take</Btn>
                    <Btn size="sm" onClick={() => send(r.uid, r.name, 'set', 1)}>Set money to</Btn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
