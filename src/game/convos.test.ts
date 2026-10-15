import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVINE_CONFIG } from '../constants/presets';
import { newGame } from './engine';
import { answerConvo, startConvo } from './convos';
import { SUBJECT_REPLIES, subjectOf } from './chatSubjects';
import type { Topic } from './convos';

const OPENERS: [string, Topic, string][] = [
  ['Divine, is that your shop or a container? 😂', 'shade', 'smallShop'],
  ['Divine your shop is so cute! Small, but cute 🥰', 'shade', 'backhanded'],
  ['Who taught Divine how to tie gele? Abeg refund them 💀', 'shade', 'skill'],
  ['Divine dey charge ₦30k for wetin I do for ₦12k 😂', 'shade', 'prices'],
  ['Divine, that lace was not real lace. Customers are not stupid.', 'shade', 'fakeLace'],
  ['Your customer was waiting so long, I had to rescue her 🚑😂', 'stole', 'stoleCustomer'],
  ['The judges were paid. Everybody knows 🙄', 'lostShow', 'judges'],
  ['Trophy number 4 🏆 Divine, you tried sha', 'wonShow', 'trophy'],
  ['Who is her sugar daddy? Just asking questions 🤔', 'jealous', 'sponsor'],
  ['Divine don pack go smaller shop o 😂', 'mock', 'downgrade'],
  ['Omo! Sold out AGAIN 😂😂 Una no ready for Amaka', 'brag', 'soldOut'],
  ['Booked till December. Thank God for growth 🙏🏾', 'brag', 'booked'],
  ['Some people will outbid you for a shop they can\'t even fill 🙄', 'snatch', 'shopTaken'],
];

test('every rival opener is matched to what it is about', () => {
  for (const [text, topic, subject] of OPENERS) assert.equal(subjectOf(text, topic), subject, text);
});

test('reply buttons answer the opener, and follow-ups answer their reply', () => {
  const base = { ...newGame(DIVINE_CONFIG), messages: [], convos: [] } as ReturnType<typeof newGame>;
  const rival = base.rivals[0];
  for (const [text, topic, subject] of OPENERS) {
    const s = startConvo(base, { with: rival.owner, rivalId: rival.id, topic, opener: text });
    const msg = s.messages.find((m) => m.choices?.length)!;
    assert.ok(msg, text);
    const table = SUBJECT_REPLIES[subject as keyof typeof SUBJECT_REPLIES];
    const allowed = new Set(Object.values(table).flat().map((l) => (typeof l === 'string' ? l.replace('{them}', rival.owner.split(' ')[0]) : l)));
    for (const choice of msg.choices!) {
      const plain = [...allowed].some((l) => typeof l === 'string' ? l === choice.label : true);
      assert.ok(plain, `"${choice.label}" should be a reply written for: ${text}`);
    }
    assert.ok(!msg.choices!.some((c) => /voice note where you begged/.test(c.label)), 'no made-up accusations');
    // answering produces their reply, and any new buttons follow that reply
    const after = answerConvo(s, msg.id, msg.choices![0].id);
    assert.ok(after.messages.length > s.messages.length);
  }
});

test('Gidigram: wins become brag posts that grow followers, and the blog posts daily news', async () => {
  const { addBrag, openBrags, postBrag, closeGramDay } = await import('./gram');
  let s = { ...newGame(DIVINE_CONFIG), gist: [], posts: [], followers: 2_000 } as ReturnType<typeof newGame>;
  s = addBrag(s, 'celebrity', 'Tems shopped with us', 'Tems bought a look.', 5);
  assert.equal(openBrags(s).length, 1);
  const before = s.followers;
  s = postBrag(s, openBrags(s)[0].id, 1);
  assert.ok(s.followers > before, 'brag posts grow followers');
  assert.equal(s.posts[0].kind, 'brag');
  assert.equal(openBrags(s).length, 0, 'a win is posted once');
  assert.ok((s.gist || []).some((g) => /Tems shopped/.test(g.title)), 'big wins reach the blog');
  const next = closeGramDay({ ...s, day: s.day + 1 });
  assert.ok(next.trend, 'a weekly trend is set');
  assert.ok((next.gist || []).some((g) => g.day === next.day), 'the blog has news every day');
});
