/**
 * What a WhatsApp message is actually about, and replies written for that.
 *
 * Every opener (shade, brag, gist...) is matched to a subject from its text, so
 * Divine's reply buttons answer what was said: "your shop is a container" gets
 * answers about the shop, "the judges were paid" gets answers about the style-off.
 * After the other person answers, the next buttons follow their reaction.
 */
import type { Move } from './convos';

export type Subject =
  | 'downgrade' | 'smallShop' | 'skill' | 'fakeLace' | 'prices' | 'stoleCustomer' | 'copying'
  | 'elders' | 'sponsor' | 'rent' | 'jealous' | 'judges' | 'trophy' | 'shopTaken'
  | 'upgrade' | 'booked' | 'soldOut' | 'newStock' | 'grateful' | 'cheaper' | 'emptyShop'
  | 'backhanded' | 'generic';

export type Ctx = { me: string; them: string; area: string; shop: string; rank: number; theirRank: number; followers: number; theirFollowers: number; other: string; tierName: string };
export type Line = string | ((c: Ctx) => string | null);

const RULES: [Subject, RegExp][] = [
  ['downgrade', /smaller shop|matchbox|Landlord no dey play/i],
  ['shopTaken', /Who took|outbid|already paid deposit|landlord is a thief/i],
  ['judges', /judges were paid|Next time|Enjoy it while|wrong size|only reason|Beginner's luck/i],
  ['trophy', /Thank you judges|Experience matters|I told una|Trophy|more practice/i],
  ['stoleCustomer', /customer came to my shop|Thanks for the customer|paid me in full|send more|said my shop is nicer|came to me first|rescue her|waiting so long/i],
  ['backhanded', /so cute|that you're trying/i],
  ['smallShop', /container|kiosk/i],
  ['skill', /tie gele|apprentice does better|TikTok|that look you posted/i],
  ['fakeLace', /real lace|Balogun|imported/i],
  ['prices', /dey charge|₦\d+k for|pricing very aggressively/i],
  ['copying', /Imitation|copying|copy/i],
  ['sponsor', /sugar daddy|sponsoring/i],
  ['rent', /Rent there|how long she will last|move shop every month|Big shop, small talent/i],
  ['jealous', /Congratulations I guess|We move|Na God dey bless/i],
  ['upgrade', /signed for|New shop, new level|have moved to/i],
  ['soldOut', /Sold out/i],
  ['booked', /Booked|DMs are flooded|brides|owambes|Busy busy|before 10am/i],
  ['cheaper', /Why pay/i],
  ['newStock', /just landed|New collection|New wigs|dropped today/i],
  ['grateful', /Grateful|Good week at the shop/i],
  ['elders', /young girls|Respect your elders|before some of you were born|Real aso-oke/i],
  ['emptyShop', /shops are empty/i],
];

const TOPIC_SUBJECT: Record<string, Subject> = { stole: 'stoleCustomer', snatch: 'shopTaken', lostShow: 'judges', wonShow: 'trophy', jealous: 'jealous', mock: 'downgrade', brag: 'booked', exposed: 'generic' };

export function subjectOf(text: string, topic?: string): Subject {
  for (const [subject, re] of RULES) if (re.test(text)) return subject;
  return (topic && TOPIC_SUBJECT[topic]) || 'generic';
}

const rankLine = (good: (c: Ctx) => string, bad?: (c: Ctx) => string): Line => (c) =>
  c.rank && c.theirRank ? (c.rank < c.theirRank ? good(c) : bad ? bad(c) : null) : null;
const followerLine = (f: (c: Ctx, n: string) => string): Line => (c) =>
  c.followers > c.theirFollowers ? f(c, Math.max(0, Math.round(c.followers))?.toLocaleString('en-NG') || String(c.followers)) : null;

/** Divine's opening replies, per subject. Only these moves are offered for that subject. */
export const SUBJECT_REPLIES: Record<Subject, Partial<Record<Move, Line[]>>> = {
  smallShop: {
    classy: ['Every big boutique started small. I\'m proud of mine ❤️', 'Small shop, big dreams. Watch this space 🙏🏾'],
    clap: ['Container or not, the girls are booking. Cry about it 😂', 'My "container" made more this week than your whole plaza 😌'],
    joke: ['😂 It\'s a container with air-condition and customers. Come and see', 'Na container, but na luxury container 😂✨'],
    receipts: [rankLine((c) => `This "container" is #${c.rank} on the Top 20. Where are you again? #${c.theirRank} 📊`), followerLine((c, n) => `${n} people follow this "container" on Gidigram 😌`)],
    hype: ['Customers are queuing outside the "container" right now 📸', 'Small space, full bookings. Na quality matter 💅🏾'],
  },
  downgrade: {
    classy: ['Setbacks happen. I\'ll be back bigger, watch 🙏🏾', 'A smaller shop for now. Not forever.'],
    clap: ['At least I can pay my rent where I am 😌', 'I moved. You\'re still where you\'ve been for five years 😂'],
    joke: ['Matchbox shop, big fire inside 🔥😂', 'Downsizing is a strategy, ask big companies 😂'],
    ask: ['Is laughing at someone\'s down time the best you can do?', 'Would you say this to my face, {them}?'],
    truce: ['It\'s been a hard week. Let\'s not do this today 🤝'],
  },
  skill: {
    classy: ['My customers are happy, that\'s what matters to me ❤️', 'Everybody has their style. Mine is selling.'],
    clap: ['Send your apprentice then. I\'ll wait 😌', 'If my gele was bad, why are your customers asking for my number? 😂'],
    joke: ['Abeg I learnt gele from YouTube and my mama, and I passed 😂', 'You studied my post that well? Number one fan 😂'],
    receipts: [followerLine((c, n) => `${n} people liked how I tie gele. Count yours 😘`), 'Three happy brides this month. The reviews are on my page 📸'],
    ask: ['Which look exactly? Show me and let\'s talk.', 'What would you have done differently? Honest question.'],
  },
  fakeLace: {
    classy: ['I buy from verified suppliers. Customers can check anytime ❤️', 'My clients know what they\'re paying for.'],
    clap: ['Real lace knows real lace, {them}. That\'s why you didn\'t recognise it 😌', 'Your "Dubai lace" has a Balogun receipt 🤭'],
    receipts: ['I have my supplier\'s invoice. Want me to post it? 🧾', 'Every lace I sell comes with the supplier tag. Come and check.'],
    ask: ['Which customer said that? Send her to me directly.', 'Who told you it wasn\'t real?'],
    truce: ['If a customer has a problem, I\'ll handle it. No need for the group 🤝'],
  },
  prices: {
    classy: ['I charge for quality and time. Customers decide ❤️', 'There are customers for every budget. No wahala.'],
    clap: ['Na why your customers dey come my side now 😂', 'Cheap is expensive, ask your customers 😌'],
    joke: ['₦30k because I add prayer and good vibes 😂🙏🏾', 'My price comes with air-condition, that\'s the difference 😂'],
    hype: ['Fully booked at my price. The market has spoken 💸', 'People pay ₦30k and still come back. Think about it 😌'],
    ask: ['Are you worried about your customers or mine?'],
  },
  stoleCustomer: {
    classy: ['Customers go where they feel at home. Take care of her ❤️', 'Good for you. I wish her a beautiful look.'],
    clap: ['She\'ll be back. They always come back 😌', 'Enjoy her. She owes me from last week 😂'],
    joke: ['Abeg tell her to bring back my hanger 😂', 'Okay, but don\'t spoil her hair o 😂'],
    ask: ['Did she say why she left? I want to improve.', 'What did she like about your shop? Asking honestly.'],
    hype: ['No wahala, I had three more waiting right after 💅🏾'],
  },
  copying: {
    classy: ['If my work inspires anybody, I\'m grateful ❤️', 'Originality speaks for itself.'],
    clap: ['Ehen? Then why does your "new collection" look like my last post? 📸', 'Copy and paste is not a talent, darling 😌'],
    receipts: ['I post with dates. Check who posted first 📅', 'My page has the timestamps. Scroll and see 👀'],
    joke: ['Copy me well o. At least use the right colour 😂'],
  },
  elders: {
    classy: ['I respect everyone who has been in this market long. Teach me, ma 🙏🏾', 'Respect, ma. We\'re all learning.'],
    clap: ['Experience is good. Results are better 😌', 'Respect is earned, ma. Same as customers 😂'],
    joke: ['Yes ma 😂 I\'ve knelt down, my knees are touching the ground'],
    ask: ['What advice would you give a young stylist, ma? Honestly.'],
    truce: ['Ma, let\'s not quarrel. I\'d love to learn from you 🤝'],
  },
  sponsor: {
    classy: ['Hard work and good customers. That\'s my only sponsor 🙏🏾', 'God and my customers. Nobody else.'],
    clap: ['My sponsor is called "customers come back". Get one 😂', 'Is that how you got your own shop? Asking questions too 🤔'],
    receipts: ['Every naira is on my KoboBank statement. Should I post it? 🧾'],
    ask: ['Why can\'t a woman just work hard and grow, {them}?'],
    joke: ['My sugar daddy is my POS machine 😂💳'],
  },
  rent: {
    classy: ['Thank you for the concern. The rent is taken care of 🙏🏾', 'We\'ll be fine. God dey.'],
    clap: ['Worry about your own rent, sis 😌', 'I\'ll last longer than your excuses 😂'],
    hype: ['Rent Vault is full and the shop is busy. We\'re good 💅🏾'],
    receipts: [rankLine((c) => `Big shop, #${c.rank} on the Top 20. Small talent? 🤔`)],
    joke: ['If I can\'t pay, I\'ll come and rent your back room 😂'],
  },
  jealous: {
    classy: ['Thank you ❤️ Your turn is coming.', 'Appreciate it. More wins for everybody.'],
    clap: ['"Congratulations I guess" 😂 say it with your chest', 'I can hear the jealousy from Yaba 🔊'],
    joke: ['Thank you for the lukewarm congratulations 😂'],
    sweet: ['Aww, you\'re watching my progress closely. Number one fan 🥰'],
    truce: ['Congratulations go both ways, {them}. Let\'s both win 🤝'],
  },
  judges: {
    classy: ['It was a good contest. Your model looked great too ❤️', 'Well played, {them}. Next round 🤝'],
    clap: ['The judges were paid in talent, sis 😌', 'Blame the judges, blame the shoes... blame everything except the look 😂'],
    joke: ['Wrong shoe size 😂 Next time I\'ll lend you a measuring tape'],
    receipts: ['Scores are on Gidigram. Check them, sis 📊'],
    truce: ['Good contest. Rematch soon? 🤝'],
  },
  trophy: {
    classy: ['Congrats, {them}. You earned it 👏🏾', 'Well done. I\'ll come back stronger.'],
    clap: ['Enjoy it. It won\'t happen twice 😌', 'One trophy and you\'re already writing a book 😂'],
    joke: ['Congrats! Can I borrow the trophy for my Gidigram? 😂'],
    ask: ['What did the judges like about your look? Asking honestly.'],
  },
  shopTaken: {
    classy: ['Business is business, {them}. The landlord chose 🤷🏾‍♀️', 'There are other shops. I hope you find a better one ❤️'],
    clap: ['The best offer won. Next time come with the full money 😌', 'Can\'t fill it? Watch me fill it 😂'],
    joke: ['I\'ll invite you to the opening party 😂🎉'],
    truce: ['It wasn\'t personal. Let\'s not fight over a landlord 🤝'],
  },
  upgrade: {
    classy: ['Congrats {them}! Well deserved 🎉', 'Big move! God bless the new shop 🙏🏾'],
    joke: ['Congrats! When is the housewarming? I\'m coming with jollof 😂'],
    ask: ['Congrats! Where is it? I want to come and see 👀'],
    sweet: ['Congrats! Now you have more space for my old styles 😘'],
  },
  booked: {
    classy: ['Love to see it! Congrats sis 🙏🏾', 'That\'s beautiful. God bless the work ❤️'],
    joke: ['Okay okay we hear you 😂 Calm down small', 'Abeg share some of the customers 😂'],
    ask: ['How do you handle that many bookings? Teach us 👀', 'What\'s the secret? Asking for a friend 👀'],
    hype: ['Same here, booked solid all weekend 💅🏾', 'Asanwa is fully booked too. Good season for all of us 😌'],
    sweet: ['Wow, almost at my level now 🥰'],
  },
  soldOut: {
    classy: ['Congrats! Sold out is a blessing 🙏🏾'],
    joke: ['Sold out because you only had two pieces 😂😂', 'Omo, restock fast before the customers come to my side 😂'],
    ask: ['What sold the fastest? Asking for research 👀'],
    hype: ['Just restocked here. The new pieces are FIRE 🔥'],
  },
  newStock: {
    classy: ['Nice! Congrats on the new stock ❤️', 'Looks beautiful. Good luck with sales 🙏🏾'],
    ask: ['Where are you sourcing from these days? 👀', 'Is it human hair or blend? Asking honestly.'],
    joke: ['I\'ll send my customers when they want something cheap 😂'],
    hype: ['Kunle just brought my own new stock too. It\'s a good week 😌'],
  },
  grateful: {
    classy: ['Amen! More customers for all of us 🙏🏾', 'Love this energy ❤️'],
    joke: ['Thank you customers for coming to my shop after hers 😂'],
    sweet: ['So sweet. Keep going sis 🥹'],
    ask: ['How was the week overall? Hope sales were good.'],
  },
  cheaper: {
    classy: ['Every shop has its customers. No wahala ❤️'],
    clap: ['Because ₦40k comes with quality and air-condition 😌', 'Cheap is expensive, ask your returns 😂'],
    joke: ['₦15k for gele that will fall by 2pm 😂'],
    hype: ['My ₦40k customers are booked till next week 💸'],
  },
  emptyShop: {
    classy: ['Every shop has slow days. God help us all 🙏🏾'],
    clap: ['If you\'re talking about mine, it\'s full right now. Come and count 😌', 'Empty? I just served my fifth customer 😂'],
    joke: ['Who is "some shops"? Mention names na 😂'],
    ask: ['Are you talking about me, {them}?'],
  },
  backhanded: {
    classy: ['Thank you {them}! Small but mighty 🥰', 'Thank you sis ❤️ It\'s growing every week.'],
    sweet: ['Aww thank you! Yours is so big and... quiet 🥰', 'Thank you! I\'ll send you the customers I can\'t fit 😘'],
    joke: ['Small but cute like me 😂 Thank you!', 'Cute is the brand 😂 Thank you sis'],
    ask: ['Was that a compliment or shade? I can\'t tell 😂'],
    hype: ['Small but fully booked. Thank you ❤️'],
  },
  generic: {},
};

/** What they say back on this subject, when it fits their reaction. */
export const SUBJECT_THEIRS: Partial<Record<Subject, Partial<Record<'escalate' | 'back' | 'soft', string[]>>>> = {
  smallShop: { escalate: ['Air-condition in a container is still a container 😂', 'Booking or begging? We know the difference 😏'], back: ['Okay, the shop is not bad sha 😅'], soft: ['Fair. Small shops grow. I started small too.'] },
  prices: { escalate: ['Charge what you like. My customers know value too 🙄', 'Market will humble you, just wait.'], back: ['Okay o. Your customers, your money 🤷🏾‍♀️'] },
  stoleCustomer: { escalate: ['She\'s not coming back. She loved my shop 😌', 'Keep dreaming, sis 😂'], back: ['Okay, she might come back sha 😅'], soft: ['Honestly she said your service was good, she just wanted a change.'] },
  skill: { escalate: ['My apprentice is better and she\'s 19 😂', 'Reviews can be bought, darling.'], back: ['Okay the last gele was not bad 😅'] },
  fakeLace: { escalate: ['Post the invoice then 😏', 'Suppliers print anything these days.'], back: ['Okay, if you have the invoice then fine 🤷🏾‍♀️'] },
  judges: { escalate: ['Talent? The scores were close, don\'t celebrate 😒', 'Rematch anytime, I\'ll show you.'], soft: ['Okay. You did well. Rematch next month 🤝'] },
  trophy: { escalate: ['Jealousy is a disease o 😂'], back: ['Thank you. Your look was good too, honestly.'] },
  sponsor: { escalate: ['Then post the statement 😂', 'Questions are free, sis.'], back: ['Okay o, hard work then. I hear you.'] },
  rent: { escalate: ['We go see by month end 🙃'], back: ['Okay. Good for you then.'] },
  backhanded: { escalate: ['Quiet? My shop is never quiet 😤'], back: ['You\'re welcome! I really meant it 😊', 'Hehe, of course sis 🥰'], soft: ['Hehe okay you got me. It IS cute 🥰'] },
  booked: { back: ['Thank you sis ❤️', 'Aww thank you! God did 🙏🏾'], soft: ['Let\'s link up for lunch sometime ❤️'] },
  upgrade: { back: ['Thank you!! Come for the opening 🎉', 'Thank you sis, it was a long road 🙏🏾'] },
};

type Reaction = 'escalate' | 'back' | 'laugh' | 'deflect' | 'soft' | 'exit';

/** Divine's next replies, following how they just answered. */
export const FOLLOWUP: Record<Reaction, Partial<Record<Move, Line[]>>> = {
  escalate: {
    classy: ['I\'ve said my piece. I\'ll let my work talk from here.', 'You can keep going, {them}. I have customers to serve.'],
    clap: ['You\'re typing a lot for someone so "busy" 😂', 'Say it louder, {them}. The group is listening 🍿'],
    receipts: [rankLine((c) => `Check the Top 20 on Sunday: #${c.rank} vs #${c.theirRank}. That\'s all I\'ll say 📊`), followerLine((c, n) => `${n} followers will read this. Choose your next words well 😌`)],
    truce: ['Okay, this is getting too much. Let\'s stop here 🤝', 'Let\'s take this offline. Call me if you want to settle it.'],
    joke: ['😂 I can\'t even be angry, this is entertainment', 'Abeg somebody give {them} water 😂'],
    ask: ['Why are you this angry, {them}? Honest question.', 'Is something else going on? Talk to me.'],
  },
  back: {
    classy: ['Thank you for saying that. No hard feelings ❤️', 'Fair enough. All the best, {them}.'],
    hype: ['Ehen. Now we understand each other 😌'],
    joke: ['See how sweet peace is 😂', 'Okay, we move 😂'],
    truce: ['Let\'s leave it there then. Good luck this week 🤝', 'Good. Let\'s both go and make money 💸'],
  },
  laugh: {
    joke: ['😂😂 You sef. Okay I\'m going back to work', 'Lmao okay we\'re even 😂'],
    classy: ['Haha. Good one. Have a good day, {them} ❤️'],
    truce: ['See? We can laugh together. Truce 🤝'],
  },
  deflect: {
    ask: ['You changed the topic fast 😂 Answer the question na', 'Ehen, but what about what you said first?'],
    classy: ['No wahala. Enjoy your day ❤️', 'Okay. Back to work for me too.'],
    joke: ['Abeg who pressed "change topic"? 😂'],
    clap: ['Running away from the topic, I see 😌'],
  },
  soft: {
    classy: ['Thank you, {them}. Respect ❤️', 'Peace. Let\'s both make money this week 🙏🏾'],
    truce: ['Deal. Maybe a joint pop-up one day? 🤝'],
    joke: ['Finally 😂 Group, you can put the popcorn away'],
  },
  exit: {},
};
