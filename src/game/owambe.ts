// Owambe invitations. Every week or two (more in December) someone invites Divine to a party
// on WhatsApp, with the asoebi colour of the day. If she goes, she dresses herself from the
// shop's rails after closing, decides how much money to spray, and Lagos judges the result:
// a great entrance brings rich clients and followers, a poor one becomes gossip.
import { colourName } from './colours';
import { festive } from './climate';
import { gramNote } from './gram';
import { giveawayChatter } from './rivals';
import { scoreLook } from './scoring';
import type { Customer, GameState, Message, Owambe, ReplyChoice, StyleChoice } from './types';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Asoebi colours that turn up at Lagos parties. */
const ASOEBI = ['#E3B23C', '#8E1F3A', '#2846A8', '#1F7A5A', '#7A3A8C', '#E46A9A', '#E86A2E', '#C2262E', '#C9A163'];
const PARTIES: [string, string][] = [
  ['Mrs Adebayo', "Mrs Adebayo's 60th birthday"],
  ['Tunde & Kemi', "Tunde and Kemi's wedding reception"],
  ['Chief Okonkwo', "Chief Okonkwo's chieftaincy title"],
  ['Alhaja Bello', "Alhaja Bello's daughter's wedding"],
  ['Mama Tobi', "Mama Tobi's house-warming"],
  ['Dr. Okafor', "Dr. Okafor's 50th anniversary"],
  ['Bisola', "Bisola's engagement party"],
  ['Pastor Femi', "Pastor Femi's daughter's naming ceremony"],
];
export const SPRAY = [0, 50_000, 200_000] as const;
export const OWAMBE_CHOICES: ReplyChoice[] = [
  { id: 'accept', label: "I'll be there 💃🏾" },
  { id: 'decline', label: 'Sorry, I can\'t make it' },
];

type Say = (s: GameState, from: string, text: string, opts?: Partial<Message>) => GameState;
type Money = (s: GameState, amount: number, label: string) => GameState;

function say(s: GameState, from: string, text: string, opts: Partial<Message> = {}): GameState {
  const id = (s.msgSeq || 0) + 1;
  const m: Message = { id, day: s.day, from, text, tone: 'info', ...opts };
  return { ...s, msgSeq: id, messages: [m, ...s.messages].slice(0, 160) };
}

/** Each evening there's a chance of a new invitation (about one every 1-2 weeks; more in December). */
export function planOwambe(s: GameState, force = false): GameState {
  const open = s.owambe && (s.owambe.status === 'invited' || s.owambe.status === 'accepted');
  if (open || s.day < 4) return s;
  const odds = festive(s.day + 3) ? 0.28 : 0.1;
  if (!force && !chance(odds)) return s;
  const [host, title] = pick(PARTIES);
  const color = pick(ASOEBI);
  const o: Owambe = { id: `ow${s.day}`, host, title, day: s.day + 2 + Math.floor(Math.random() * 3), color, colorName: colourName(color), status: 'invited' };
  return say({ ...s, owambe: o }, host, `Divine darling! You're invited to ${title} on day ${o.day} 🎉 Asoebi colour is ${o.colorName.toUpperCase()}. Big people will be there, come and shine! Will you come?`, { choices: OWAMBE_CHOICES, ctx: { kind: 'owambe' } });
}

export function answerOwambe(s0: GameState, m: Message, choice: string): GameState {
  let s: GameState = { ...s0, messages: s0.messages.map((x) => (x.id === m.id ? { ...x, answered: choice } : x)) };
  const o = s.owambe;
  if (!o || o.status !== 'invited') return s;
  const yes = choice === 'accept';
  s = { ...s, owambe: { ...o, status: yes ? 'accepted' : 'declined' } };
  s = say(s, 'You', yes ? "I'll be there! Can't wait 💃🏾" : "Thank you so much, but I can't make it. Enjoy!", { chat: m.chat || m.from });
  if (yes) s = say(s, o.host, `Yay! Day ${o.day}, after you close the shop. Don't forget: ${o.colorName}! 💛`, { chat: m.chat || m.from });
  return s;
}

/** Tonight is the party (Divine accepted and the shop is closed). */
export const owambeTonight = (s: GameState) => (s.owambe?.status === 'accepted' && s.owambe.day === s.day && s.phase === 'evening' ? s.owambe : undefined);

/** Divine, as a "customer" for the styling screen. */
export function owambeGuest(s: GameState): Customer {
  const o = s.owambe!;
  return {
    id: `divine-${o.id}`,
    name: 'Divine',
    cls: s.tier >= 2 ? 'rich' : 'middle',
    occasion: 'owambe',
    budget: 0,
    wants: [{ kind: 'color', color: o.color, name: o.colorName }, { kind: 'native' }],
    taste: { favColor: o.color, favName: o.colorName },
    request: `${o.title} tonight. Asoebi colour: ${o.colorName}. Dress yourself from the rails; all of Lagos is watching!`,
    look: { ...s.divine, state: 'plain' },
    male: false,
    influencer: false,
  };
}

/** Divine goes to the party in this look and sprays this much money. */
export function attendOwambe(s0: GameState, choice: StyleChoice, spray: number, money: Money): GameState {
  const o = owambeTonight(s0);
  if (!o) return s0;
  const amount = SPRAY.includes(spray as typeof SPRAY[number]) ? Math.min(spray, Math.max(0, s0.cash)) : 0;
  const score = scoreLook(owambeGuest(s0), choice, s0.stock).total;
  const sprayBonus = amount >= 200_000 ? 14 : amount >= 50_000 ? 6 : 0;
  const impression = Math.min(100, score + sprayBonus);
  let s = amount ? money(s0, -amount, `Sprayed money at ${o.title}`) : s0;
  const fans = s.followers || 0;
  let result: Owambe['result'];
  let outcome: string;
  if (impression >= 85) {
    result = 'great';
    const gained = Math.round(100 + fans * rand(0.02, 0.04));
    const celeb = chance(0.25) && s.tier >= 2 && !(s.celebDay && s.celebDay >= s.day);
    s = { ...s, followers: fans + gained, rep: Math.min(100, s.rep + 2), buzz: { until: s.day + 7, mult: 1.08, why: 'owambe' }, richUntil: s.day + 7, ...(celeb ? { celebDay: s.day + 2 + Math.floor(Math.random() * 3) } : {}) };
    s = gramNote(s, `Your owambe photos are everywhere 📸 "Who styled Divine?!" +${gained} followers`, 'mention');
    s = giveawayChatter(s, ['Divine came to slay o 😩🔥', 'Okay she won the party, I\'ll admit 🙄', 'Everybody was asking about her outfit 👀'], 0.4, { title: `Divine of Asanwa Boutique steals the show at ${o.title} 🔥`, body: `In ${o.colorName}${amount ? `, spraying ${amount >= 200_000 ? 'like a chief' : 'generously'}` : ''}, she had the aunties asking for her number. Expect rich clients at her shop this week.` });
    outcome = `You were the talk of the party! Rich aunties took your number: more wealthy clients this week, +${gained} followers${celeb ? ', and a celebrity said she\'ll visit soon' : ''}.`;
  } else if (impression >= 65) {
    result = 'okay';
    const gained = Math.round(30 + fans * rand(0.003, 0.008));
    s = { ...s, followers: fans + gained, rep: Math.min(100, s.rep + 0.5) };
    outcome = `A nice evening. People complimented the ${o.colorName}, and a few followed you (+${gained}).`;
  } else {
    result = 'poor';
    s = { ...s, rep: Math.max(0, s.rep - 2) };
    const offColour = score < 60;
    s = giveawayChatter(s, offColour ? ['Did Divine not see the asoebi colour? 😂', 'A whole stylist came looking like that 💀', 'The tailor that sewed this one needs prayer 😂'] : ['Money no fit buy class o 😂', 'She sprayed well sha, but the outfit… 👀'], 0.6, { title: `Stylist, style yourself? Divine's owambe look gets people talking 😬`, body: `Guests at ${o.title} were not impressed with the Asanwa Boutique owner's outfit.`, hot: true });
    outcome = offColour ? `People noticed you weren't in ${o.colorName}, and the look didn't land. The gossip is not kind (reputation down).` : 'The look didn\'t land, and people talked. Reputation down.';
  }
  return { ...s, owambe: { ...o, status: 'done', score: impression, spray: amount, result, outcome }, owambeTired: true };
}

/** Next morning: a missed party disappoints the host. */
export function owambeMorning(s: GameState, msgFn: Say = say): GameState {
  const o = s.owambe;
  if (o?.status === 'accepted' && o.day < s.day) {
    return msgFn({ ...s, owambe: { ...o, status: 'missed' }, rep: Math.max(0, s.rep - 1) }, o.host, `Divine, we waited for you yesterday 😔 Everybody was asking. Hmm.`, { tone: 'warn' });
  }
  return s;
}
