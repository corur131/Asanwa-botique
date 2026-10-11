/**
 * WhatsApp conversations that go back and forth.
 *
 * A rival (or Deborah with gist) opens a conversation. Divine gets five
 * different replies to pick from, each in a different spirit (classy, clap
 * back, laugh it off, receipts...). What she picks decides how the other
 * person answers: they escalate, back down, laugh, change the subject, make
 * peace or walk out. Hot topics run longer (up to six replies each); small
 * talk ends after two or three. Other people in the group chat sometimes jump
 * in. When it ends, the group decides who "won": followers, reputation and
 * how that rival feels about Divine all move with it.
 *
 * No reply is offered twice in one conversation, and lines used recently are
 * avoided so chats don't repeat.
 */
import { GameState, Message, Rival } from './types';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------
export type Topic =
  | 'shade' // public shade in the group
  | 'bait' // a DM trying to start something
  | 'brag' // showing off in the group
  | 'jealous' // sour reaction to Divine moving up
  | 'mock' // laughing at Divine's bad luck
  | 'lostShow' // rival lost a style-off to Divine and is salty
  | 'wonShow' // rival beat Divine and is gloating
  | 'stole' // rival walked off with Divine's customer
  | 'snatch' // Divine outbid the rival for a shop
  | 'exposed' // Divine spilled gist about the rival
  | 'gist'; // Deborah has gist

export type Move =
  | 'classy' | 'clap' | 'joke' | 'receipts' | 'sweet' | 'hype' | 'ask' | 'tag' | 'truce'
  | 'more' | 'spill' | 'pray' | 'useIt' | 'laugh' | 'scold' | 'proof';

type Reaction = 'escalate' | 'back' | 'laugh' | 'deflect' | 'soft' | 'exit';

export interface Convo {
  id: string;
  /** Who Divine is talking to (name shown in the chat). */
  with: string;
  rivalId?: string;
  chat: string;
  topic: Topic;
  heat: number;
  peak: number;
  turn: number;
  max: number;
  /** How the crowd sees it so far: up is good for Divine. */
  score: number;
  /** Lines already used in this conversation. */
  used: string[];
  /** Deborah's gist: which story and how far she has told it. */
  gist?: { story: number; step: number; about: string };
  last?: Reaction;
  done?: boolean;
}

export const TAGS: Record<Move, string> = {
  classy: '😌 Classy', clap: '🔥 Clap back', joke: '😂 Laugh it off', receipts: '🧾 Receipts', sweet: '🍯 Sweet shade', hype: '💅🏾 Flex', ask: '🤔 Ask why', tag: '📣 Call the group', truce: '🤝 Make peace',
  more: '👀 Tell me more', spill: '📢 Spill it', pray: '🙏🏾 Wish her well', useIt: '💼 Use it', laugh: '😂 Laugh', scold: '🙅🏾‍♀️ Face your work', proof: '📸 Send proof',
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pickW = <T,>(items: [T, number][]): T => {
  const tot = items.reduce((a, [, w]) => a + Math.max(0, w), 0);
  let r = Math.random() * tot;
  for (const [x, w] of items) if ((r -= Math.max(0, w)) <= 0) return x;
  return items[items.length - 1][0];
};
/** What people call them: "Amaka", but "Iya Bisi" and "Mummy Blessing" stay whole. */
const first = (n: string) => (/^(Iya|Mrs|Mummy|Mama|Baba)\b/.test(n) ? n.split(' ').slice(0, 2).join(' ') : n.split(' ')[0]);
const GROUP = 'Lagos Fashion Babes';

const HEAT: Record<Topic, number> = { brag: 1, wonShow: 2, jealous: 2, shade: 3, bait: 3, lostShow: 3, mock: 4, stole: 4, snatch: 4, exposed: 5, gist: 2 };

// ---------------------------------------------------------------------------
// What Divine can say
// ---------------------------------------------------------------------------
type Ctx = { me: string; them: string; area: string; shop: string; rank: number; theirRank: number; followers: number; theirFollowers: number; other: string };
type Line = string | ((c: Ctx) => string | null);

const FIGHT: Partial<Record<Move, Line[]>> = {
  classy: [
    'There is enough money in Lagos for all of us. I wish you well ❤️',
    'No wahala sis. Let the work speak.',
    "I'm not here for fighting. I'm here for my customers.",
    'God bless your hustle. Mine is coming too 🙏🏾',
    'I respect your work, even if you don\'t respect mine.',
    'We are all women trying to make it. Let\'s be better than this.',
    'I hear you. I\'ll keep doing my best.',
    'Peace and love, {them}. I have brides to dress 💐',
  ],
  clap: [
    'At least my customers come back 😌',
    'Container or not, the girls are booking. Cry about it 😂',
    'You talk too much for someone with an empty shop.',
    'Stay in your lane. I am busy making money 💅🏾',
    'Your mouth is bigger than your sales, {them}.',
    'Shebi na you dey copy my styles last week? Sit down.',
    'I don\'t argue with people I\'ve passed on the Top 20.',
    'Abeg rest. Your customers are in my shop right now 😂',
    'Is it the bad gele or the cheap lace you want to talk about first?',
    'The jealousy is loud this morning 🔊',
  ],
  joke: [
    '😂😂😂 {them} you sef. Have you eaten today?',
    'Omo, who woke up and chose violence? 😂',
    'This is why I love this group. Free comedy every day 😂',
    'I\'m laughing in Asanwa Boutique right now. Thank you for the energy 😂',
    'Abeg who get popcorn? I want to enjoy this one well 🍿',
    'If gossip was a business, {them} would be on the Forbes list 😂',
    'Hahaha. I see you, {them}. I see you 👀😂',
    'Na wa o. Na today you start? 😂',
  ],
  receipts: [
    (c) => (c.rank && c.theirRank && c.rank < c.theirRank ? `Top 20 says I'm #${c.rank}. You're #${c.theirRank}. Numbers don't lie 📊` : null),
    (c) => (c.followers > c.theirFollowers ? `${c.followers.toLocaleString('en-NG')} followers on Gidigram. Count yours and come back 😌` : null),
    (c) => (c.rank && c.theirRank && c.rank > c.theirRank ? `You're ahead on the Top 20 this week, I see it. Check again next Sunday 😉` : null),
    'Should I post the screenshot of you asking my supplier for a discount? 👀',
    'My customers leave reviews. Go and read yours before you talk.',
    'I have the voice note where you begged my stylist to come and work for you 🎙️',
    'Your "new collection" is my old collection with a different filter 📸',
  ],
  sweet: [
    'Thank you for the free promo, darling 😘 My DMs just got busy.',
    'Aww, you think about me a lot. That\'s sweet 🥰',
    'I\'ll pray for your shop, sis. You need it more ❤️',
    'Thank you for watching my page so closely, {them}. Number one fan 💕',
    'Bless your heart. You\'re trying so hard 🥹',
    'You\'re always welcome to come and learn, {them}. My door is open 🚪',
    'Sending you love and good fabric this week 💝',
  ],
  hype: [
    'Booked solid today. I only came online to rest my hands 💅🏾',
    'Three brides this week. Who is counting? Me. I\'m counting 😌',
    'My shop is full right now, I can barely type 📱',
    'While you\'re typing, I\'m selling. Goodnight 💸',
    'The girls are queuing outside {shop}. Come and see with your eyes.',
    'Just restocked. The new pieces are FIRE 🔥',
  ],
  ask: [
    'What exactly did I do to you, {them}?',
    'Is this about the customer last week? Let\'s talk like adults.',
    'Why are you always on my matter? Honest question.',
    'Sis, are you okay? This energy is too much.',
    'Did someone tell you something about me? Ask me directly.',
    'Is it business or personal? Because I don\'t know you like that.',
  ],
  tag: [
    'Ladies, are you seeing this? {them} has started again 👀',
    '@{other} come and see your friend o 😂',
    'Group admin, abeg do something about {them} 🙄',
    'Everybody screenshot this before she deletes it 📸',
    'I want everyone here to remember this day when I win Fashion Week.',
  ],
  truce: [
    'Okay let\'s stop. We\'re both better than this. Truce? 🤝',
    'Let\'s not do this in public. Call me and let\'s settle it.',
    'Fine. I\'ll stay out of your way, you stay out of mine. Deal?',
    'Honestly, let\'s collaborate instead. A joint pop-up? Think about it.',
    'I take back what I said. Let\'s move on.',
  ],
};

const BRAG: Partial<Record<Move, Line[]>> = {
  classy: [
    'Congrats {them}! Well deserved 🎉',
    'Big win! God bless your hustle 🙏🏾',
    'Love to see it. More wins sis ❤️',
    'This is beautiful work. Congrats!',
    'You did that! 👏🏾👏🏾',
  ],
  joke: [
    'Okay okay we hear you 😂 Calm down small',
    'Abeg share the money with us 😂',
    'Is it every week you will be bragging? 😂😂',
    'Na so una dey do when una get small money 😂',
    'We know {them}, you are the best. Next topic 😂',
  ],
  ask: [
    'What\'s the secret? Asking for a friend 👀',
    'How do you do it? Teach us abeg 😩',
    'Okay but HOW? Tell us everything 👀',
    'Drop the secret na, don\'t be stingy 😂',
  ],
  hype: [
    'Nice! I also did four brides today, so it\'s a good day for all of us 💅🏾',
    'Congrats! Asanwa Boutique is also fully booked this weekend 😌',
    'Same energy here. We are all eating this season 🍽️',
  ],
  sweet: [
    'Wow, I\'m so proud of you. You\'re almost at my level now 🥰',
    'So cute! Reminds me of my work from last year 💕',
    'Aww, the effort. Keep going sis 🥹',
  ],
  clap: [
    'Is this the same look you posted in 2023? 😂',
    'Bragging online won\'t pay your rent, {them}.',
    'The filter is doing the heavy lifting there 📸',
    'Nice. Now do it without your apprentice 😂',
  ],
  receipts: [
    (c) => (c.rank && c.theirRank && c.rank < c.theirRank ? `Congrats! Still behind me on the Top 20 though 😌 #${c.rank} here.` : null),
    (c) => (c.followers > c.theirFollowers ? `Lovely. ${c.followers.toLocaleString('en-NG')} people will see my reply 😘` : null),
  ],
};

const GIST: Partial<Record<Move, Line[]>> = {
  more: ['Tell me everything 👀', 'Wait wait wait. Start from the beginning.', 'Ehen? Then what happened?', 'No way. Talk more!', 'Deborah don\'t stop there o 😩', 'Who told you this one?'],
  spill: ['Let me drop a hint in the group 😏', 'I\'m posting this in Lagos Fashion Babes. Let them hear.', 'Somebody needs to tell the group. That somebody is me 📢'],
  pray: ['God help her. Lagos is hard.', 'Ah, that\'s sad. I won\'t laugh at anybody\'s down time.', 'I hope she\'s okay sha. Business is tough.', 'Let\'s not rejoice over another woman\'s trouble.'],
  useIt: ['Then her customers will need a new shop. Let\'s post a promo 💼', 'Okay. Send me her customers\' area, let\'s run a discount there.', 'Business is business. Let\'s be ready for the customers.'],
  laugh: ['😂😂😂😂 Deborah you no well', 'I\'m crying 😭😂', 'This is the best thing I\'ve heard all week 😂', 'Omo 😂😂 Lagos no dey carry last'],
  scold: ['Deborah, face your work abeg 😒', 'Is this why the books are not balanced? 😂 Go and count stock.', 'Leave people\'s matter. Our own is enough.'],
  proof: ['Screenshot or it didn\'t happen 📸', 'Send proof. I don\'t trust Iya Basira\'s gist.', 'Where did you see it? Send the link.'],
};

// ---------------------------------------------------------------------------
// How they answer
// ---------------------------------------------------------------------------
type Pers = Rival['personality'];
const R: Record<Reaction, Partial<Record<Pers | 'any', string[]>>> = {
  escalate: {
    queen: ['Darling, I was dressing governors\' wives when you were still learning to thread a needle.', 'Cute. Now go and pay your rent 💅🏾', 'I don\'t compete with kiosks, sweetheart. I only educate them.', 'Keep my name in your mouth. It\'s the only premium thing there 👑'],
    loud: ['WETIN?? Divine you don craze? 😂😂', 'Abeg abeg! Who send you message? You wan fight? I dey Yaba!', 'You dey vex because I talk true. Chop that one 😂', 'Omo see as she dey shake 😂 Una see am?', 'Say another one. I dey wait 🔥'],
    oldschool: ['You young people have no respect. In my time you would kneel to greet.', 'I have been in this market for 20 years. You are a small girl.', 'Keep talking. The market will teach you sense.'],
    shady: ['Not you acting brand new 😂 We know where you started.', 'Babe, the customer you\'re bragging about came to me first 🤭', 'I said what I said. Screenshot it if you like 😏', 'Your "sold out" is two pieces 😂'],
    sweet: ['Divine I was just playing 😢 why are you being mean?', 'Wow. Okay. I didn\'t expect this from you.'],
    pro: ['That\'s not professional, but okay.', 'Let\'s keep this about business, Divine.'],
    any: ['You sef no small o 😂', 'Is that all you have? 🙄', 'Okay now I\'m angry.'],
  },
  back: {
    queen: ['Hmm. Fair enough. Congratulations on the progress, I suppose.', 'Okay, I see you. I see you.'],
    loud: ['Okay okay calm down 😂 I no talk anything', 'Ah, you don vex? I dey joke na 😅'],
    oldschool: ['Hmm. Maybe you have some sense after all.', 'Alright. Let us see how you do.'],
    shady: ['I never said anything bad sha 🤷🏾‍♀️', 'Relax babe, it was a joke 😅'],
    sweet: ['You\'re right, I\'m sorry 🥺', 'Okay I\'m sorry. That came out wrong.'],
    pro: ['Fair point.', 'Noted. Let\'s move on.'],
    any: ['Okay fine. You win this one.', 'Hmm. Point taken.'],
  },
  laugh: {
    any: ['😂😂😂 You no well', 'Okay this one sweet me 😂', 'Divine abeg 😂😂 I\'m crying', 'See this babe 😂 I can\'t even be angry', 'Lmaooo 😂 okay you got me'],
    queen: ['Ha. Funny girl 😏', 'I\'ll allow it. That was funny.'],
    oldschool: ['Hehe. Mischief 😄', 'You children and your jokes 😂'],
  },
  deflect: {
    queen: ['Anyway. Has anyone seen the new George collection? Divine.', 'I have a fitting in five minutes. Some of us are busy.', 'Moving on. Ladies, who is going to the Eko Hotel wedding?'],
    loud: ['Anyway! Who wan buy wig? Fresh stock land 😂', 'Abeg change topic, I don hungry 😂', 'Una see the BBNaija gist? Forget Divine 😂'],
    oldschool: ['The market price of lace has gone up again. Nobody is talking about that.', 'Anyway. Our generation knew value.'],
    shady: ['Who asked you though? 🤭', 'Typing so much for someone who\'s "busy" 😂', 'Not me reading this while my shop is full 😌'],
    sweet: ['Anyway! New wigs dropped today ❤️ come and see!', 'Let\'s talk about something happy abeg 🥰'],
    pro: ['Anyway, good week everyone.', 'Back to work.'],
    any: ['Hmm.', 'Okay o.', 'Anyway.'],
  },
  soft: {
    any: ['Okay. Truce 🤝 I was having a bad day.', 'You know what, you\'re right. Let\'s stop this.', 'Fine. No hard feelings, Divine ❤️', 'Okay sis. Respect.', 'Alright. Peace. Good luck with the shop.'],
    queen: ['Very well. Peace, then. Do try to keep up 😌', 'Alright. A truce. I respect hard work.'],
    oldschool: ['That is how a well-trained girl talks. Peace, my daughter.', 'Okay. God bless your work.'],
    sweet: ['Yes please, I hate fighting 🥺❤️', 'Awww okay! Let\'s be friends abeg 🥰'],
  },
  exit: {
    queen: ['I don\'t have time for this. Some of us have actual clients. Bye.', 'I\'m leaving this conversation. My time is expensive.', '*left the chat to attend a governor\'s daughter\'s fitting*'],
    loud: ['Mtchew. Na you sabi 😒', 'I no get your time abeg 🙄', 'Ehen, no worry. We go see 👋🏾'],
    oldschool: ['I will not be dragged into this nonsense.', 'I am going to pray for you.'],
    shady: ['Okay. Blocked 😌', 'Bye babe 👋🏾 enjoy your container', 'I won\'t even reply this one.'],
    sweet: ['I\'m going offline 😢', 'Okay bye 💔'],
    pro: ['I\'ll leave it there.', 'Let\'s not continue this.'],
    any: ['🙄', 'Okay bye.', 'Mtchew.'],
  },
};

/** Answers when the chat is about their own good news. */
const R_BRAG: Partial<Record<Reaction, string[]>> = {
  back: ['Thank you sis ❤️', 'Aww thank you! God did 🙏🏾', 'Thanks babe. Your turn is coming 😘', 'Appreciate you Divine 🥰', 'Thank you o! Come and buy one 😂', 'Thank youuu 🥹 it was a long week'],
  soft: ['Thank you, really. Means a lot coming from you ❤️', 'Love you for this 🥰', 'God bless you too sis 🙏🏾', 'Thanks! Let\'s link up for lunch sometime'],
  escalate: ['Jealousy is a disease o 😂', 'Did I ask for your opinion? 🙄', 'At least I have something to brag about 😌', 'Wahala be like person wey no get trophy 😂', 'Keep watching, you might learn something 😘'],
  exit: ['Okay o. I\'m going back to my customers 💅🏾', 'No time for negativity. Bye 👋🏾'],
};
const ANSWERS = ['Hard work and prayer 😌 and a very good supplier', 'Secret is secret 🤫😂', 'Balogun, Thursday mornings. Don\'t tell anybody 😂', 'My makeup girl is a magician, I can\'t lie 😅', 'Two staff now, one more coming. It\'s not easy o', 'Sleep less, pray more 😂'];

/** Their reply after Divine leaves them on read. */
const ON_READ = ['Seen it, no reply? 😂 Coward', 'Blue tick and silence. I knew it 😂', 'Fine, ignore me. We go see.', 'You saw it. I can see the blue ticks 👀'];

/** Others jumping into the group chat. */
const CHIME: Record<'hot' | 'divine' | 'them' | 'calm', string[]> = {
  hot: ['🍿🍿🍿 I\'m just here', 'Una should take this to DM abeg 😂', 'Screenshot don already go GistLagos o', 'Ah. This group is hot today 🔥', 'Somebody should call the admin 😂'],
  divine: ['Divine no dey carry last o 😂😂', 'Ehen! Divine finish am 😂', 'This one na knockout 🥊😂', 'Divine wins this round, no cap 😂'],
  them: ['Divine you sef 😂 you didn\'t think this one through', 'Ah, she got you there o 😬', 'This one pain me for you Divine 😂'],
  calm: ['Thank God una don settle 🙏🏾', 'Peace at last 😂', 'See, this is how it should be ❤️'],
};

// ---------------------------------------------------------------------------
// Deborah's gist
// ---------------------------------------------------------------------------
interface Story {
  open: (them: string, shop: string) => string;
  more: string[];
  /** The hint Divine drops in the group if she spills it. */
  hint: string;
}
const STORIES: Story[] = [
  {
    open: (t) => `Sis!!! Have you heard? ${t}'s landlord has given her quit notice 😱`,
    more: ['They said she owes three months. THREE 👀', 'And she\'s telling people she\'s "relocating to a bigger shop" 😂', 'Mama Put said the landlord\'s son came with a padlock this morning 🔒', 'Apparently she has been sleeping in the shop to save transport money.'],
    hint: 'Some people are "relocating" with a padlock on their door 👀🔒',
  },
  {
    open: (t) => `Gist!! ${t}'s "imported" lace is from Balogun market. Same one we buy 😂`,
    more: ['She cuts the label and sews a Dubai one inside 😭', 'One bride found the Balogun price tag inside her gown 😂', 'The supplier is my friend\'s cousin. He told me everything.'],
    hint: 'Imported from Dubai or imported from Balogun? 🤔 Ask your stylist 😂',
  },
  {
    open: (t) => `Divine!! ${t}'s two stylists just walked out on her. In the middle of a wedding booking 😩`,
    more: ['They said she hasn\'t paid salary in two months.', 'One of them is asking if we have space. Should I give her your number? 👀', 'The bride had to do her own gele in the car 😭'],
    hint: 'Pay your staff, ladies. Na so stylists dey waka out mid-wedding 😬',
  },
  {
    open: (t) => `Sis, ${t} has been copying your designs. Line by line. I saw it on her page 😤`,
    more: ['Same colour, same cut, she even used your caption 😑', 'She posted it two days after you. Two days!', 'Her followers are saying it\'s "her signature look" 🙄'],
    hint: 'Original designers know themselves. Copy and paste is not a talent 😌',
  },
  {
    open: (t) => `GIST!! A celebrity unfollowed ${t} on Gidigram this morning 😱`,
    more: ['Everybody is saying it was because of the bad wig she did for her sister.', 'Her followers dropped by 2,000 in one day 📉', 'She\'s been posting motivational quotes since morning 😂'],
    hint: 'Some unfollows are louder than others 👀📉',
  },
  {
    open: (t) => `Divine, ${t}'s generator caught fire yesterday 😳 The whole plaza smelt smoke.`,
    more: ['Nobody was hurt thank God. But the clothes on her front rail are finished.', 'She bought fake fuel from one boy on the road, that\'s what they\'re saying.', 'She\'s doing customers by the window now because of the smoke 😩'],
    hint: 'Buy your fuel from proper filling stations o. Just saying 🔥⛽',
  },
  {
    open: (t) => `Sister mine! ${t} owes the aso-oke supplier ₦800k and he is threatening to come to her shop 😬`,
    more: ['He sent her a long voice note. Somebody leaked it 🎙️', 'She told him the "money is in the system" 😂', 'He said if she doesn\'t pay by Friday he\'ll carry his fabric back from her rail.'],
    hint: 'Pay your suppliers before you post your "soft life" 😌',
  },
];

const DEBORAH: Record<'more' | 'spill' | 'pray' | 'useIt' | 'laugh' | 'scold' | 'proof' | 'end', string[]> = {
  more: [],
  spill: ['Ahhh Divine you\'re wicked 😂 Okay, let\'s see who replies first', 'Omo the group is about to burst 😂 I\'m watching', 'You didn\'t even blur it 😂😂 Okay o'],
  pray: ['You\'re too nice sef. Okay sha 🙏🏾', 'This is why customers love you. Okay I\'ve stopped 😅', 'Hmm. You\'re right. God help us all.'],
  useIt: ['That\'s my sister! Business mind 💼 I\'ll draft the promo tonight', 'Already on it 😌 I\'ll post a "welcome new clients" discount', 'Ehen! Na so. Let\'s catch the customers before anybody else.'],
  laugh: ['I\'m dead 😭😂 I knew you\'d laugh', 'Lmaooo I told you 😂😂', 'Me too I\'ve been laughing since morning 😂'],
  scold: ['Okay ma 😒 I\'m going to count stock', 'Hmm. No fun at all 😒 Fine.', 'Ehn ehn. Next time I won\'t tell you anything 😤'],
  proof: ['📸 [screenshot] There! Open your eyes 😂', 'Look at the screenshot 👇🏾 Is that not her shop?', 'I sent it to you on the other app. Check now 👀'],
  end: ['Okay let me go and count the stock 😂 Talk later', 'Anyway that\'s the gist. Back to work!', 'I\'ll update you if I hear more 👀'],
};

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------
function post(s: GameState, from: string, text: string, opts: Partial<Message> = {}): GameState {
  const id = (s.msgSeq || 0) + 1;
  const m: Message = { id, day: s.day, from, text, tone: 'info', t: s.phase === 'shop' ? Math.floor(s.clock) : undefined, ...opts };
  return { ...s, msgSeq: id, messages: [m, ...s.messages].slice(0, 200) };
}

const rivalOf = (s: GameState, id?: string) => (s.rivals || []).find((r) => r.id === id);
function rankOf(s: GameState, id: string): number {
  const last = (s.ranking || []).slice(-1)[0];
  return last ? last.order.indexOf(id) + 1 : 0;
}
function ctxFor(s: GameState, c: Convo): Ctx {
  const r = rivalOf(s, c.rivalId);
  const others = (s.rivals || []).filter((x) => x.main && x.id !== c.rivalId);
  return {
    me: 'Divine',
    them: first(c.with),
    area: s.listing.area,
    shop: 'Asanwa Boutique',
    rank: rankOf(s, 'you'),
    theirRank: r ? rankOf(s, r.id) : 0,
    followers: s.followers || 0,
    theirFollowers: r?.followers || 0,
    other: others.length ? first(others[Math.floor(Math.random() * others.length)].owner) : 'Amaka',
  };
}
const fill = (t: string, c: Ctx) => t.replace(/\{(\w+)\}/g, (_, k) => String((c as unknown as Record<string, unknown>)[k] ?? ''));
const resolve = (l: Line, c: Ctx) => (typeof l === 'function' ? l(c) : fill(l, c));

/** Pick a line nobody has heard lately; failing that, one not used in this chat. */
function fresh(pool: string[], used: string[], said: string[]): string | null {
  const a = pool.filter((x) => !used.includes(x) && !said.includes(x));
  if (a.length) return a[Math.floor(Math.random() * a.length)];
  const b = pool.filter((x) => !used.includes(x));
  return b.length ? b[Math.floor(Math.random() * b.length)] : null;
}
const remember = (s: GameState, lines: string[]): GameState => ({ ...s, said: [...lines, ...(s.said || [])].slice(0, 400) });

const poolFor = (topic: Topic) => (topic === 'gist' ? GIST : topic === 'brag' || topic === 'wonShow' ? BRAG : FIGHT);

/** Five different replies for this turn. */
function options(s: GameState, c: Convo) {
  const cx = ctxFor(s, c);
  const pool = poolFor(c.topic);
  let moves: Move[];
  if (c.topic === 'gist') {
    const st = STORIES[c.gist!.story];
    const canMore = c.gist!.step < st.more.length;
    moves = [...(canMore ? (['more'] as Move[]) : []), 'spill', 'laugh', 'pray', 'useIt', 'proof', 'scold'];
    if (c.turn > 0) moves = moves.filter((m) => m !== 'proof' || canMore);
  } else {
    const all = Object.keys(pool) as Move[];
    const fight = c.topic !== 'brag' && c.topic !== 'wonShow';
    // hot chats offer more fire; cool chats more charm
    const weight = (m: Move) => {
      if (!fight) return 1;
      const hot = c.heat >= 3;
      return ({ clap: hot ? 3 : 1.5, receipts: hot ? 2.5 : 1, tag: c.chat === GROUP && hot ? 2 : c.chat === GROUP ? 0.8 : 0, truce: c.turn >= 1 ? 2.2 : 0.6, classy: 2, joke: 1.6, sweet: 1.5, hype: 1.2, ask: c.turn === 0 ? 2 : 1 } as Partial<Record<Move, number>>)[m] ?? 1;
    };
    moves = [];
    const bag = all.filter((m) => weight(m) > 0);
    while (bag.length) {
      const m = pickW(bag.map((x) => [x, weight(x)] as [Move, number]));
      moves.push(m);
      bag.splice(bag.indexOf(m), 1);
    }
    // always one calm and one fiery option
    // always one calm and one fiery option among the first five
    const top = moves.slice(0, 5);
    if (fight && !top.some((m) => ['classy', 'truce', 'joke'].includes(m))) moves = ['classy', ...moves.filter((m) => m !== 'classy')];
    if (fight && !moves.slice(0, 5).some((m) => ['clap', 'receipts', 'tag'].includes(m))) moves = [moves[0], 'clap', ...moves.slice(1).filter((m) => m !== 'clap')];
  }
  const out: { id: string; label: string; tag: string }[] = [];
  for (const m of moves) {
    if (out.length >= 5) break;
    if (m === 'more') {
      out.push({ id: 'more', label: fresh(GIST.more as string[], c.used, s.said || []) || 'Ehen? Then?', tag: TAGS.more });
      continue;
    }
    const lines = (pool[m] || []).map((l) => resolve(l, cx)).filter((x): x is string => !!x && (c.chat === GROUP || !/group|Group|popcorn/.test(x)));
    const text = fresh(lines, c.used, s.said || []);
    if (text) out.push({ id: m, label: text, tag: TAGS[m] });
  }
  return out;
}

function reactionTo(s: GameState, c: Convo, m: Move): Reaction {
  const r = rivalOf(s, c.rivalId);
  const p = r?.personality || 'pro';
  const feel = r?.feeling ?? 0;
  const cx = ctxFor(s, c);
  const strong = (cx.rank && cx.theirRank && cx.rank < cx.theirRank) || cx.followers > cx.theirFollowers;
  const k = { queen: { exit: 1.6, deflect: 1.4, escalate: 0.9 }, loud: { escalate: 1.7, laugh: 1.3 }, oldschool: { deflect: 1.5, escalate: 1.1 }, shady: { escalate: 1.4, deflect: 1.3 }, sweet: { soft: 2, back: 1.5, escalate: 0.4 }, pro: { exit: 1.5, back: 1.3, escalate: 0.5 } }[p] as Partial<Record<Reaction, number>>;
  const base: Record<Move, Partial<Record<Reaction, number>>> = {
    classy: { back: 3, soft: 2.5 + feel / 40, deflect: 2.5, escalate: 1.2 },
    clap: { escalate: 5, deflect: 2, exit: c.score >= 2 ? 3 : 1.5, back: 1 },
    joke: { laugh: 4.5, deflect: 3, escalate: 2 },
    receipts: strong ? { back: 3.5, exit: 3.5, escalate: 2 } : { escalate: 5, deflect: 2, back: 1 },
    sweet: { escalate: 4, deflect: 3.5, laugh: 2 },
    hype: { escalate: 4, deflect: 3.5, back: 2 },
    ask: { soft: 3 + feel / 40, deflect: 4, escalate: 2.5 },
    tag: { escalate: 4, deflect: 2, exit: 2 },
    truce: { soft: 5.5 + feel / 30, deflect: 2, escalate: 1.5 },
    more: {}, spill: {}, pray: {}, useIt: {}, laugh: {}, scold: {}, proof: {},
  };
  const table = base[m];
  const items = (Object.keys(table) as Reaction[]).map((x) => [x, (table[x] || 0) * (k[x] ?? 1)] as [Reaction, number]);
  return items.length ? pickW(items) : 'deflect';
}

/** How each move looks to the group, given how they answered. */
function crowd(m: Move, re: Reaction, strong: boolean): number {
  const t: Partial<Record<Move, Partial<Record<Reaction, number>>>> = {
    classy: { back: 2, soft: 2, deflect: 1, escalate: 2 },
    clap: { escalate: 0, deflect: 1, exit: 2, back: 3 },
    joke: { laugh: 2, deflect: 1, escalate: 1 },
    receipts: strong ? { back: 3, exit: 3, escalate: 1 } : { escalate: -2, deflect: -1, back: 1 },
    sweet: { escalate: 2, deflect: 1, laugh: 1 },
    hype: { escalate: 0, deflect: 1, back: 2 },
    ask: { soft: 2, deflect: 0, escalate: 1 },
    tag: { escalate: 1, deflect: 0, exit: 2 },
    truce: { soft: 2, deflect: 0, escalate: 1 },
  };
  return t[m]?.[re] ?? 0;
}

const heatShift: Record<Reaction, number> = { escalate: 1, back: -1, laugh: -1, deflect: 0, soft: -3, exit: 0 };

/** A rival or Deborah starts a conversation. `opener` is their first message. */
export function startConvo(s0: GameState, o: { with: string; rivalId?: string; chat?: string; topic: Topic; opener: string; tone?: Message['tone']; story?: number }): GameState {
  let s = s0;
  const chat = o.chat || o.with;
  // only one live conversation per chat at a time
  const live = (s.convos || []).find((c) => c.chat === chat && !c.done);
  // a hotter conversation is already going here: this one is just a message
  if (live && live.heat >= HEAT[o.topic] && live.turn > 0) return remember(post(s, o.with, o.opener, { chat: o.chat, tone: o.tone || 'info' }), [o.opener]);
  if (live) s = { ...s, convos: s.convos!.map((c) => (c.id === live.id ? { ...c, done: true } : c)), messages: s.messages.map((m) => (m.convo === live.id && !m.answered && m.choices ? { ...m, choices: undefined } : m)) };
  const heat = HEAT[o.topic] + (o.rivalId && (rivalOf(s, o.rivalId)?.feeling ?? 0) < -30 ? 1 : 0);
  const c: Convo = { id: `cv${s.day}-${Math.random().toString(36).slice(2, 7)}`, with: o.with, rivalId: o.rivalId, chat, topic: o.topic, heat, peak: heat, turn: 0, max: clamp(1 + heat, 2, 6), score: 0, used: [o.opener] };
  if (o.topic === 'gist') {
    const story = o.story ?? Math.floor(Math.random() * STORIES.length);
    c.gist = { story, step: 0, about: o.rivalId || '' };
    c.max = STORIES[story].more.length + 1;
  }
  const choices = options(s, c);
  s = post(s, o.with, o.opener, { chat: o.chat, convo: c.id, choices, tone: o.tone || 'info' });
  // replies offered once are not offered again in this chat
  return remember({ ...s, convos: [...(s.convos || []).slice(-30), { ...c, used: [...c.used, ...choices.map((x) => x.label)] }] }, [o.opener]);
}

/** Deborah opens with gist about one of the rivals. */
export function startGist(s: GameState): GameState {
  const pool = (s.rivals || []).filter((r) => r.main || chance(0.15));
  if (!pool.length) return s;
  const r = pool[Math.floor(Math.random() * pool.length)];
  const story = Math.floor(Math.random() * STORIES.length);
  const opener = STORIES[story].open(first(r.owner), r.shop);
  return startConvo(s, { with: 'Deborah', rivalId: r.id, topic: 'gist', opener, story });
}

const feel = (s: GameState, id: string | undefined, d: number): GameState => (id ? { ...s, rivals: s.rivals.map((x) => (x.id === id ? { ...x, feeling: clamp(x.feeling + d, -100, 100) } : x)) } : s);
function gistNews(s: GameState, title: string, body: string, hot = true): GameState {
  const g = { id: `g${s.day}-${Math.random().toString(36).slice(2, 7)}`, day: s.day, title, body, about: 'you', hot };
  return { ...s, gist: [g, ...(s.gist || [])].slice(0, 40) };
}

/** Divine picks a reply. */
export function answerConvo(s0: GameState, msgId: number, choiceId: string): GameState {
  const msg = s0.messages.find((x) => x.id === msgId);
  const c0 = (s0.convos || []).find((c) => c.id === msg?.convo);
  if (!msg || !c0 || c0.done || msg.answered) return s0;
  const choice = choiceId === 'read' ? { id: 'read', label: '' } : msg.choices?.find((x) => x.id === choiceId);
  if (!choice) return s0;
  let s: GameState = { ...s0, messages: s0.messages.map((x) => (x.id === msgId ? { ...x, answered: choice.id } : x)) };
  let c: Convo = { ...c0, turn: c0.turn + 1 };
  const where = c.chat === c.with ? undefined : c.chat;
  const save = () => ({ ...s, convos: (s.convos || []).map((x) => (x.id === c.id ? c : x)) });

  // left on read
  if (choice.id === 'read') {
    c = { ...c, done: true };
    s = feel(save(), c.rivalId, -3);
    if (c.topic !== 'gist' && c.heat >= 3 && chance(0.5)) s = post(s, c.with, ON_READ[Math.floor(Math.random() * ON_READ.length)], { chat: where });
    if (c.topic === 'gist' && chance(0.6)) s = post(s, 'Deborah', 'Ehn, you\'ve seen it and you\'re not saying anything? 😒');
    return s;
  }

  const move = choice.id as Move;
  s = post(s, 'You', choice.label, { chat: c.chat });
  c = { ...c, used: [...c.used, choice.label] };
  s = remember(s, [choice.label]);

  // ---- Deborah's gist ----
  if (c.topic === 'gist') {
    const st = STORIES[c.gist!.story];
    const r = rivalOf(s, c.gist!.about);
    let line: string;
    let end = false;
    if (move === 'more') {
      line = st.more[c.gist!.step];
      c = { ...c, gist: { ...c.gist!, step: c.gist!.step + 1 } };
    } else if (move === 'proof') {
      line = DEBORAH.proof[Math.floor(Math.random() * DEBORAH.proof.length)];
    } else {
      line = fresh(DEBORAH[move as keyof typeof DEBORAH], c.used, s.said || []) || DEBORAH.end[0];
      end = move === 'scold' || move === 'spill';
    }
    s = post(s, 'Deborah', line);
    c = { ...c, used: [...c.used, line] };
    s = remember(s, [line]);
    // Deborah can't hold herself: there's usually more
    if (!end && move !== 'more' && c.gist!.step < st.more.length && chance(0.75)) {
      const extra = `${["And wait o, there's more: ", 'Ehen, I forgot! ', "Hold on, that's not even the main gist. ", 'Listen to this one: '][Math.floor(Math.random() * 4)]}${st.more[c.gist!.step]}`;
      s = post(s, 'Deborah', extra);
      c = { ...c, used: [...c.used, extra], gist: { ...c.gist!, step: c.gist!.step + 1 } };
    } else if (!end && move !== 'more') end = true;
    if (move === 'spill' && r) {
      // the hint lands in the group, and the rival answers
      s = post(s, 'You', st.hint, { chat: GROUP });
      s = feel(s, r.id, -25);
      s = { ...s, followers: (s.followers || 0) + Math.round(rand(40, 160)) };
      c = { ...c, done: true };
      s = save();
      const opener = fresh(['WHO IS SUBBING ME?? 😡 Divine I know it\'s you', 'Divine, if you have something to say, say it with your full chest 😤', 'Bitter people will always talk. I\'m not moved 🙄', 'Na wa for some people. Mind your business, Divine!'], [], s.said || [])!;
      return startConvo(s, { with: r.owner, rivalId: r.id, chat: GROUP, topic: 'exposed', opener });
    }
    if (move === 'useIt') s = { ...s, followers: (s.followers || 0) + Math.round(rand(20, 70)), rep: clamp(s.rep + 0.3, 0, 100) };
    if (move === 'pray') s = { ...s, rep: clamp(s.rep + 0.5, 0, 100) };
    if (end || c.turn >= c.max) {
      c = { ...c, done: true };
      if (move === 'more' || move === 'laugh' || move === 'proof') s = post(s, 'Deborah', fresh(DEBORAH.end, c.used, s.said || []) || DEBORAH.end[0]);
      if (move === 'useIt' || move === 'pray') s = post(s, 'Deborah', fresh(DEBORAH.end, c.used, s.said || []) || DEBORAH.end[0]);
      return save();
    }
    const choices = options(s, c);
    c = { ...c, used: [...c.used, ...choices.map((x) => x.label)] };
    s = { ...save(), messages: s.messages.map((m, i) => (i === 0 ? { ...m, convo: c.id, choices } : m)) };
    return s;
  }

  // ---- a rival ----
  const r = rivalOf(s, c.rivalId);
  const cx = ctxFor(s, c);
  const strong = !!((cx.rank && cx.theirRank && cx.rank < cx.theirRank) || cx.followers > cx.theirFollowers);
  let re = reactionTo(s, c, move);
  // hot chats don't cool off after one line: they go at least a few rounds
  const minTurns = c.peak >= 4 ? 3 : c.peak >= 2 ? 2 : 1;
  if (re === 'soft' && c.turn < minTurns) re = 'back';
  // small talk winds down by itself
  if (c.turn >= c.max && re !== 'exit') re = re === 'escalate' ? 'exit' : 'soft';
  const pts = crowd(move, re, strong);
  c = { ...c, score: c.score + pts, heat: clamp(c.heat + heatShift[re] + (move === 'clap' || move === 'tag' ? 1 : 0), 0, 9), last: re };
  c = { ...c, peak: Math.max(c.peak, c.heat) };
  // what that reply does by itself
  const d: Partial<Record<Move, number>> = { classy: 4, truce: 8, ask: 2, joke: 1, sweet: -3, hype: -2, clap: -8, receipts: -6, tag: -6 };
  s = feel(s, c.rivalId, d[move] ?? 0);
  if (move === 'classy' || move === 'truce') s = { ...s, rep: clamp(s.rep + 0.3, 0, 100) };

  // somebody else jumps in
  if (c.chat === GROUP && c.heat >= 3 && chance(0.4)) {
    const others = (s.rivals || []).filter((x) => x.main && x.id !== c.rivalId);
    if (others.length) {
      const o = others[Math.floor(Math.random() * others.length)];
      const mood = pts >= 2 ? 'divine' : pts < 0 ? 'them' : 'hot';
      const line = fresh(CHIME[mood], c.used, s.said || []);
      if (line) {
        s = post(s, o.owner, line, { chat: GROUP });
        c = { ...c, used: [...c.used, line] };
        s = remember(s, [line]);
      }
    }
  }
  const pers = r?.personality || 'pro';
  const groupy = /Ladies|Una |una |anyone|Anybody|Has anyone|Who wan|Una see/;
  const braggy = c.topic === 'brag' || c.topic === 'wonShow';
  const base = braggy && move === 'ask' && re !== 'escalate' && re !== 'exit' ? ANSWERS : braggy && R_BRAG[re] ? R_BRAG[re]! : [...(R[re][pers] || []), ...(R[re].any || [])];
  const pool = base.filter((x) => c.chat === GROUP || !groupy.test(x));
  const reply = fresh(pool, c.used, s.said || []) || pool[0];
  if (c.heat <= 0 && c.turn < minTurns) c = { ...c, heat: 1 };
  const ended = re === 'exit' || c.turn >= c.max || (c.turn >= minTurns && (c.heat <= 0 || re === 'soft'));
  c = { ...c, used: [...c.used, reply], done: ended };
  if (ended) {
    s = post(save(), c.with, reply, { chat: where });
    s = remember(s, [reply]);
    return wrapUp(s, c);
  }
  const choices = options({ ...s, said: [reply, ...(s.said || [])] }, c);
  c = { ...c, used: [...c.used, ...choices.map((x) => x.label)] };
  s = post(save(), c.with, reply, { chat: where, convo: c.id, choices: choices.length ? choices : undefined });
  return remember(s, [reply]);
}

/** The conversation is over: the group decides who came out on top. */
function wrapUp(s0: GameState, c: Convo): GameState {
  let s = s0;
  const r = rivalOf(s, c.rivalId);
  const name = r ? r.owner : c.with;
  if (c.last === 'soft') {
    s = feel(s, c.rivalId, 12);
    if (c.chat === GROUP && chance(0.5)) s = post(s, 'GistLagos', CHIME.calm[Math.floor(Math.random() * CHIME.calm.length)], { chat: GROUP });
    return s;
  }
  const big = c.chat === GROUP && c.peak >= 4;
  if (c.score >= 4) {
    const gain = Math.round(rand(40, 120) * (big ? 2.5 : 1));
    s = { ...s, followers: (s.followers || 0) + gain, rep: clamp(s.rep + (big ? 1 : 0.4), 0, 100) };
    if (big) s = gistNews(s, `Divine shuts ${first(name)} down in the fashion group chat 🍿`, `Screenshots are everywhere and the comments are on Divine's side. Her page gained ${gain} followers.`);
  } else if (c.score <= -1) {
    s = { ...s, rep: clamp(s.rep - (big ? 2 : 0.8), 0, 100) };
    if (big) s = gistNews(s, `${first(name)} drags Divine in group chat and wins 😬`, `"Divine should have kept quiet," says one stylist. Her reputation took a knock.`);
  } else if (big) {
    s = gistNews(s, `Divine and ${first(name)} at it again in the group chat 👀`, 'Nobody won, but everybody screenshotted.', false);
  }
  return s;
}

/** The live conversation in this chat, if any (for the "typing" hint). */
export const liveConvo = (s: GameState, chat: string) => (s.convos || []).find((c) => c.chat === chat && !c.done);
