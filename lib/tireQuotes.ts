// Tire-Themed Quote of the Day - 365 quotes for every day of the year
// Mix of funny, inspirational, and holiday-themed quotes

export interface TireQuote {
  quote: string;
  type: "funny" | "inspirational" | "holiday" | "motivational";
}

// Get quote for a specific day of year (1-366)
export function getQuoteOfTheDay(date: Date = new Date()): TireQuote {
  const dayOfYear = getDayOfYear(date);

  // Check for specific holiday quotes first
  const holidayQuote = getHolidayQuote(date);
  if (holidayQuote) return holidayQuote;

  // Otherwise return the quote for this day
  return DAILY_QUOTES[dayOfYear - 1] || DAILY_QUOTES[0];
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getHolidayQuote(date: Date): TireQuote | null {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // New Year's Day
  if (month === 1 && day === 1) {
    return { quote: "New year, new tread! Time to roll into fresh opportunities.", type: "holiday" };
  }

  // MLK Day (3rd Monday of January) - approximate with Jan 15-21
  if (month === 1 && day >= 15 && day <= 21 && date.getDay() === 1) {
    return { quote: "The road to equality is paved with perseverance. Keep rolling forward.", type: "holiday" };
  }

  // Valentine's Day
  if (month === 2 && day === 14) {
    return { quote: "Love is like a good tire - it supports you through every bump in the road.", type: "holiday" };
  }

  // Presidents Day (3rd Monday of February)
  if (month === 2 && day >= 15 && day <= 21 && date.getDay() === 1) {
    return { quote: "Leadership is like steering - steady hands guide the whole team.", type: "holiday" };
  }

  // St. Patrick's Day
  if (month === 3 && day === 17) {
    return { quote: "May the road rise to meet you, and may your tires never go flat!", type: "holiday" };
  }

  // Easter (approximate - check March/April Sundays)
  // We'll use a simple check for late March/early April Sundays
  if ((month === 3 && day >= 22) || (month === 4 && day <= 25)) {
    if (date.getDay() === 0) { // Sunday
      const easter = getEasterDate(date.getFullYear());
      if (easter.getMonth() + 1 === month && easter.getDate() === day) {
        return { quote: "Spring forward with renewed traction - it's a season of new beginnings!", type: "holiday" };
      }
    }
  }

  // Memorial Day (Last Monday of May)
  if (month === 5 && day >= 25 && day <= 31 && date.getDay() === 1) {
    return { quote: "We honor those who paved the road to freedom. Their sacrifice keeps us rolling.", type: "holiday" };
  }

  // Independence Day
  if (month === 7 && day === 4) {
    return { quote: "Freedom is the open road - celebrate the drive that built this nation!", type: "holiday" };
  }

  // Labor Day (1st Monday of September)
  if (month === 9 && day >= 1 && day <= 7 && date.getDay() === 1) {
    return { quote: "Today we celebrate every hand that's ever mounted a tire. Your work keeps America rolling!", type: "holiday" };
  }

  // Halloween
  if (month === 10 && day === 31) {
    return { quote: "Don't let flat tires be the only thing that scares you today!", type: "holiday" };
  }

  // Veterans Day
  if (month === 11 && day === 11) {
    return { quote: "Saluting those who served - you kept the wheels of freedom turning.", type: "holiday" };
  }

  // Thanksgiving (4th Thursday of November)
  if (month === 11 && day >= 22 && day <= 28 && date.getDay() === 4) {
    return { quote: "Grateful for the road that brought us here and the team that keeps us rolling.", type: "holiday" };
  }

  // Christmas Eve
  if (month === 12 && day === 24) {
    return { quote: "Even Santa needs good tires for that midnight ride. Rest up - big day tomorrow!", type: "holiday" };
  }

  // Christmas Day
  if (month === 12 && day === 25) {
    return { quote: "The best gift? A team that rolls together. Merry Christmas!", type: "holiday" };
  }

  // New Year's Eve
  if (month === 12 && day === 31) {
    return { quote: "Ready to roll into a brand new year? Check your treads and floor it!", type: "holiday" };
  }

  return null;
}

// Easter calculation (Computus algorithm)
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// 365 daily quotes - a mix of funny, inspirational, and motivational
const DAILY_QUOTES: TireQuote[] = [
  // January (1-31)
  { quote: "Every journey begins with a single rotation. Make today count!", type: "motivational" },
  { quote: "Life is like tire pressure - too much stress and you'll blow, too little and you'll drag.", type: "funny" },
  { quote: "Stay balanced, stay aligned, stay focused.", type: "inspirational" },
  { quote: "A smooth road never made a skilled tire technician.", type: "motivational" },
  { quote: "Roll with the punches, but never roll on a flat.", type: "funny" },
  { quote: "Your attitude determines your direction. Steer wisely.", type: "inspirational" },
  { quote: "The only bad mount is the one you didn't learn from.", type: "motivational" },
  { quote: "Be the grip someone needs to get through their day.", type: "inspirational" },
  { quote: "I'm not saying I'm a tire expert, but I do work well under pressure.", type: "funny" },
  { quote: "Success isn't about the destination - it's about the rotation.", type: "motivational" },
  { quote: "When life gets bumpy, remember: good tires handle rough roads.", type: "inspirational" },
  { quote: "Why did the tire go to therapy? It had too many issues with letting go.", type: "funny" },
  { quote: "Champions are made in the shop, not just on the road.", type: "motivational" },
  { quote: "Keep your treads deep and your spirits high.", type: "inspirational" },
  { quote: "A tire's purpose is simple: keep moving forward. What's yours?", type: "motivational" },
  { quote: "I'm outstanding in my field. Well, technically I'm outstanding in the shop.", type: "funny" },
  { quote: "Pressure makes diamonds - and properly inflated tires.", type: "motivational" },
  { quote: "The road to success is always under construction. Good thing we've got the right tires.", type: "inspirational" },
  { quote: "What do you call a tire that tells jokes? Goodyear for laughs!", type: "funny" },
  { quote: "Excellence isn't a skill, it's an attitude. Mount it daily.", type: "motivational" },
  { quote: "Every customer who leaves safely is a victory worth celebrating.", type: "inspirational" },
  { quote: "My tire puns are wheely good, and I'm not just spinning you around.", type: "funny" },
  { quote: "Hard work beats talent when talent doesn't rotate stock.", type: "motivational" },
  { quote: "Be like a good tire compound - adaptable to any condition.", type: "inspirational" },
  { quote: "Why don't tires ever get lonely? They always come in pairs!", type: "funny" },
  { quote: "Today's effort is tomorrow's reputation. Build it right.", type: "motivational" },
  { quote: "The difference between ordinary and extraordinary? That little 'extra' rotation.", type: "inspirational" },
  { quote: "I tried to make a belt joke, but it just went around in circles.", type: "funny" },
  { quote: "Every tire we ship keeps someone's family safe on the road.", type: "motivational" },
  { quote: "Progress is impossible without change. Time for a tire rotation!", type: "inspirational" },
  { quote: "What's a tire's favorite dance? The rubber band!", type: "funny" },

  // February (32-59/60)
  { quote: "February may be short, but our commitment to quality isn't.", type: "motivational" },
  { quote: "Love your work like you love your lug nuts - tight and reliable.", type: "inspirational" },
  { quote: "Why did the tire break up with the rim? It felt too much pressure in the relationship.", type: "funny" },
  { quote: "Cold weather, warm hearts. Let's keep customers safe out there.", type: "motivational" },
  { quote: "A team that balances together, stays together.", type: "inspirational" },
  { quote: "I'm reading a book about tires. It's riveting - no wait, it's riveted.", type: "funny" },
  { quote: "Excellence is not a destination but a continuous journey of improvement.", type: "motivational" },
  { quote: "The grip you provide today keeps families safe tomorrow.", type: "inspirational" },
  { quote: "What did the tire say to the pothole? 'We need to stop meeting like this!'", type: "funny" },
  { quote: "Winter challenges make spring victories even sweeter.", type: "motivational" },
  { quote: "Your expertise is someone's peace of mind on the road.", type: "inspirational" },
  { quote: "I'm not lazy, I'm just in energy-saving mode. Like a tire in storage.", type: "funny" },
  { quote: "Quality isn't expensive - it's priceless.", type: "motivational" },
  { quote: "Behind every safe journey is a technician who cared.", type: "inspirational" },
  { quote: "Relationships are like tires - they need regular maintenance to last.", type: "funny" },
  { quote: "Push yourself, because no one else is going to do it for you.", type: "motivational" },
  { quote: "Every tire you mount is a story of safety you're writing.", type: "inspirational" },
  { quote: "What do you call a sleeping tire? Retired!", type: "funny" },
  { quote: "The best time to plant a tree was 20 years ago. The best time to check tire pressure is now.", type: "motivational" },
  { quote: "Your hands create the traction that moves communities forward.", type: "inspirational" },
  { quote: "I'm on a roll today - and for once, it's not down a hill without brakes.", type: "funny" },
  { quote: "Small progress is still progress. One tire at a time.", type: "motivational" },
  { quote: "In a world full of flats, be the one who patches things up.", type: "inspirational" },
  { quote: "Why did the tire get promoted? It had great drive!", type: "funny" },
  { quote: "Don't wait for opportunity. Create it.", type: "motivational" },
  { quote: "Safety isn't just our job - it's our legacy.", type: "inspirational" },
  { quote: "I tried to catch some fog this morning. I mist. Also, my windshield needs new wipers.", type: "funny" },
  { quote: "The only limit is the one you set for yourself.", type: "motivational" },

  // March (60-90)
  { quote: "March forward with purpose and precision.", type: "motivational" },
  { quote: "Spring is coming - time to help customers emerge from winter safely.", type: "inspirational" },
  { quote: "What's a tire's favorite type of music? Rubber band!", type: "funny" },
  { quote: "New season, new opportunities. Roll into them!", type: "motivational" },
  { quote: "Like spring flowers, good work ethic blooms with nurturing.", type: "inspirational" },
  { quote: "Why don't tires ever win at poker? They always fold under pressure!", type: "funny" },
  { quote: "The comeback is always stronger than the setback.", type: "motivational" },
  { quote: "Every tire change is a chance to exceed expectations.", type: "inspirational" },
  { quote: "I'm not saying I'm the best, but my torque wrench agrees with me.", type: "funny" },
  { quote: "Green means go - in traffic and in giving your best effort.", type: "motivational" },
  { quote: "Your skill today is someone's safe arrival tonight.", type: "inspirational" },
  { quote: "What did one tire say to the other at the gym? 'Let's get pumped!'", type: "funny" },
  { quote: "Success is the sum of small efforts repeated day in and day out.", type: "motivational" },
  { quote: "Precision is not an act, it's a habit.", type: "inspirational" },
  { quote: "I'm tired of these puns. Get it? Tired? I'll see myself out.", type: "funny" },
  { quote: "Wake up determined, go to bed satisfied.", type: "motivational" },
  { quote: "The road respects those who respect the road.", type: "inspirational" },
  { quote: "My career is really gaining traction!", type: "funny" },
  { quote: "Don't count the days, make the days count.", type: "motivational" },
  { quote: "Excellence is doing ordinary things extraordinarily well.", type: "inspirational" },
  { quote: "What do you call a tire with a great personality? Very a-tire-active!", type: "funny" },
  { quote: "Today's preparation determines tomorrow's achievement.", type: "motivational" },
  { quote: "In every job, there's an opportunity to make a difference.", type: "inspirational" },
  { quote: "I used to hate changing tires. Then it grew on me. Like rubber.", type: "funny" },
  { quote: "The secret to getting ahead is getting started.", type: "motivational" },
  { quote: "Pride in your work is the first step to customer satisfaction.", type: "inspirational" },
  { quote: "Why was the tire so good at its job? It knew how to handle pressure!", type: "funny" },
  { quote: "Dream big, work hard, stay focused.", type: "motivational" },
  { quote: "Every interaction is a chance to build trust.", type: "inspirational" },
  { quote: "I'm wheely good at my job, and that's not just hot air.", type: "funny" },
  { quote: "March madness? More like March maintenance season!", type: "motivational" },

  // April (91-120)
  { quote: "April showers bring May flowers - and lots of tire rotations.", type: "motivational" },
  { quote: "Foolish is the one who skips tire maintenance!", type: "funny" },
  { quote: "Spring cleaning applies to cars too. Let's help them shine!", type: "inspirational" },
  { quote: "What do you call a tire in April? Spring loaded!", type: "funny" },
  { quote: "New beginnings start with proper preparation.", type: "motivational" },
  { quote: "The best view comes after the hardest climb - and the safest tires.", type: "inspirational" },
  { quote: "My jokes may be flat, but the tires I mount never are!", type: "funny" },
  { quote: "Growth happens outside your comfort zone.", type: "motivational" },
  { quote: "Every vehicle that leaves safer is a family protected.", type: "inspirational" },
  { quote: "Why did the tire go to school? To get a little more traction in life!", type: "funny" },
  { quote: "Action is the foundational key to all success.", type: "motivational" },
  { quote: "Quality is remembered long after the price is forgotten.", type: "inspirational" },
  { quote: "I'm outstanding at my job. I stand out... in the parking lot... checking tires.", type: "funny" },
  { quote: "The difference between try and triumph is just a little 'umph'!", type: "motivational" },
  { quote: "Safety is our craft, excellence is our standard.", type: "inspirational" },
  { quote: "What's a tire's least favorite day? Flat Friday!", type: "funny" },
  { quote: "Work hard in silence, let your success be your noise.", type: "motivational" },
  { quote: "Every customer deserves our best effort.", type: "inspirational" },
  { quote: "I'm not arguing, I'm just explaining why I'm right about tire pressure.", type: "funny" },
  { quote: "Believe you can and you're halfway there.", type: "motivational" },
  { quote: "The hands that mount tires hold families' safety.", type: "inspirational" },
  { quote: "Why did the tire get an award? For outstanding roll-formance!", type: "funny" },
  { quote: "Success usually comes to those who are too busy to be looking for it.", type: "motivational" },
  { quote: "Your work today creates trust for tomorrow.", type: "inspirational" },
  { quote: "I'm having a wheely great day!", type: "funny" },
  { quote: "The only way to do great work is to love what you do.", type: "motivational" },
  { quote: "In the tire business, every detail matters.", type: "inspirational" },
  { quote: "What do tires do when they're feeling down? They bounce back!", type: "funny" },
  { quote: "Stay positive, work hard, make it happen.", type: "motivational" },
  { quote: "Expertise is earned one tire at a time.", type: "inspirational" },

  // May (121-151)
  { quote: "May your torque be accurate and your seals be tight!", type: "motivational" },
  { quote: "Road trip season begins - let's make sure everyone travels safe.", type: "inspirational" },
  { quote: "What did May say to April? 'I'll take it from here, no more showers needed!'", type: "funny" },
  { quote: "Warmer days mean busier bays. Let's crush it!", type: "motivational" },
  { quote: "The journey of a thousand miles begins with properly inflated tires.", type: "inspirational" },
  { quote: "I'm so good with tires, I should be called the Spin Doctor.", type: "funny" },
  { quote: "Summer's coming - time to ensure everyone's ready for adventures.", type: "motivational" },
  { quote: "Excellence is a habit, not an act.", type: "inspirational" },
  { quote: "Why do tires make great employees? They always deliver under pressure!", type: "funny" },
  { quote: "Make each day your masterpiece.", type: "motivational" },
  { quote: "Behind every smooth ride is a technician who cared.", type: "inspirational" },
  { quote: "I'm on a roll - and this time it's intentional!", type: "funny" },
  { quote: "Work like someone's safety depends on it. Because it does.", type: "motivational" },
  { quote: "The best compliment? A returning customer.", type: "inspirational" },
  { quote: "What's a tire's favorite season? Fall... just kidding, no one likes falling!", type: "funny" },
  { quote: "Opportunity dances with those already on the dance floor.", type: "motivational" },
  { quote: "Your expertise keeps families connected across miles.", type: "inspirational" },
  { quote: "I tried to write a joke about bald tires, but there was nothing to work with.", type: "funny" },
  { quote: "Success is not final, failure is not fatal: it's the courage to continue that counts.", type: "motivational" },
  { quote: "Safety first, quality always.", type: "inspirational" },
  { quote: "Why don't tires ever get lost? They always know which way to roll!", type: "funny" },
  { quote: "The harder you work for something, the greater you'll feel when you achieve it.", type: "motivational" },
  { quote: "In the tire industry, trust is built one customer at a time.", type: "inspirational" },
  { quote: "I've got 99 problems but a properly mounted tire ain't one!", type: "funny" },
  { quote: "Don't watch the clock; do what it does. Keep going.", type: "motivational" },
  { quote: "Every tire tells a story. Make yours about excellence.", type: "inspirational" },
  { quote: "What do you call a tire that can sing? A car-aoke champion!", type: "funny" },
  { quote: "The expert in anything was once a beginner.", type: "motivational" },
  { quote: "Your dedication shows in every vehicle that leaves this shop.", type: "inspirational" },
  { quote: "I'm not speeding, I'm qualifying. In the shop parking lot. Slowly.", type: "funny" },
  { quote: "May the force of proper torque be with you!", type: "motivational" },

  // June (152-181)
  { quote: "June brings sunshine and road trips - let's keep them safe!", type: "motivational" },
  { quote: "Summer heat? Our work ethic is hotter.", type: "inspirational" },
  { quote: "Why did the tire go to the beach? To catch some waves... of customers!", type: "funny" },
  { quote: "Long days, longer opportunities. Make them count!", type: "motivational" },
  { quote: "The sun is up, and so is our commitment to quality.", type: "inspirational" },
  { quote: "I'm not saying I'm Superman, but have you ever seen me and a perfectly balanced tire in the same room?", type: "funny" },
  { quote: "Vacation season means every tire matters more.", type: "motivational" },
  { quote: "Be the reason someone gets home safely today.", type: "inspirational" },
  { quote: "What do summer tires and ice cream have in common? They both perform best when it's hot!", type: "funny" },
  { quote: "Success doesn't just find you. You have to go out and get it.", type: "motivational" },
  { quote: "Your skills are the bridge between here and there.", type: "inspirational" },
  { quote: "I'm outstanding in my field. My field is the service bay.", type: "funny" },
  { quote: "Dreams don't work unless you do.", type: "motivational" },
  { quote: "Each properly mounted tire is a promise kept.", type: "inspirational" },
  { quote: "Why are tires so optimistic? They always look forward to the next rotation!", type: "funny" },
  { quote: "The best project you'll ever work on is you.", type: "motivational" },
  { quote: "Pride in workmanship is timeless.", type: "inspirational" },
  { quote: "I'm not late, I'm just on a different rotation schedule.", type: "funny" },
  { quote: "Great things never come from comfort zones.", type: "motivational" },
  { quote: "Safety is the gift that keeps families together.", type: "inspirational" },
  { quote: "What do you call a tire that tells the truth? Radial honesty!", type: "funny" },
  { quote: "Your limitation—it's only your imagination.", type: "motivational" },
  { quote: "Excellence is not being the best; it's doing your best.", type: "inspirational" },
  { quote: "I've been working on my core strength. My tire core strength.", type: "funny" },
  { quote: "Push yourself, because no one else is going to do it for you.", type: "motivational" },
  { quote: "The work you do matters. Every single tire.", type: "inspirational" },
  { quote: "What's a tire's favorite snack? Rubber bands!", type: "funny" },
  { quote: "Sometimes later becomes never. Do it now.", type: "motivational" },
  { quote: "Your expertise is invisible until it prevents disaster.", type: "inspirational" },
  { quote: "I tried to make a tire joke, but it fell flat.", type: "funny" },

  // July (182-212)
  { quote: "July heat can't match our fire for excellence!", type: "motivational" },
  { quote: "Summer adventures need summer-ready tires. Let's deliver!", type: "inspirational" },
  { quote: "Why do tires love summer? The heat helps them perform at their peak!", type: "funny" },
  { quote: "Hot pavement demands quality work. Rise to the occasion!", type: "motivational" },
  { quote: "Every road trip memory starts with a safe departure.", type: "inspirational" },
  { quote: "I'm not sweating, I'm just leaking enthusiasm!", type: "funny" },
  { quote: "When the going gets hot, the professionals keep rolling.", type: "motivational" },
  { quote: "Your work today creates memories for families tomorrow.", type: "inspirational" },
  { quote: "What did the tire say during the heatwave? 'I'm under a lot of pressure!'", type: "funny" },
  { quote: "Stay cool, stay focused, stay excellent.", type: "motivational" },
  { quote: "Behind every family vacation is a vehicle you made safe.", type: "inspirational" },
  { quote: "It's so hot, my tires are begging for air conditioning!", type: "funny" },
  { quote: "The only thing that should be inflated is your tires and your pride in good work.", type: "motivational" },
  { quote: "Quality work is its own reward.", type: "inspirational" },
  { quote: "Why don't tires complain about heat? They're used to friction!", type: "funny" },
  { quote: "Hustle beats talent when talent doesn't hustle.", type: "motivational" },
  { quote: "Safe travels begin in this bay.", type: "inspirational" },
  { quote: "I'm reading a book on anti-lock braking systems. I just can't stop!", type: "funny" },
  { quote: "Be so good they can't ignore you.", type: "motivational" },
  { quote: "The difference between good and great is attention to detail.", type: "inspirational" },
  { quote: "What do you call a tire in July? Well-seasoned!", type: "funny" },
  { quote: "Don't stop when you're tired. Stop when you're done.", type: "motivational" },
  { quote: "Your dedication speaks through your work.", type: "inspirational" },
  { quote: "Why did the tire apply for a summer job? To gain more experience!", type: "funny" },
  { quote: "Winners are not people who never fail, but people who never quit.", type: "motivational" },
  { quote: "Trust is built through consistent quality.", type: "inspirational" },
  { quote: "My tires are so good, they should come with a trophy.", type: "funny" },
  { quote: "If it doesn't challenge you, it won't change you.", type: "motivational" },
  { quote: "Every customer leaves with more than new tires - they leave with confidence.", type: "inspirational" },
  { quote: "What's a tire's favorite summer activity? Rolling with the homies!", type: "funny" },
  { quote: "July: Halfway through the year, still giving 100%!", type: "motivational" },

  // August (213-243)
  { quote: "August heat, peak performance. Let's finish summer strong!", type: "motivational" },
  { quote: "Back-to-school means back-to-safety. Parents are counting on us.", type: "inspirational" },
  { quote: "Why did the tire fail summer school? It kept going around in circles!", type: "funny" },
  { quote: "The dog days of summer demand our best work.", type: "motivational" },
  { quote: "School buses, family cars, daily commutes - they all deserve excellence.", type: "inspirational" },
  { quote: "I'm not saying it's hot, but I saw a tire trying to apply sunscreen.", type: "funny" },
  { quote: "Success is the result of preparation, hard work, and learning from failure.", type: "motivational" },
  { quote: "Your expertise keeps communities moving safely.", type: "inspirational" },
  { quote: "What do back-to-school and tires have in common? Both need proper alignment!", type: "funny" },
  { quote: "The last mile of summer is the first mile of fall prep.", type: "motivational" },
  { quote: "Behind every school bus is a family trusting our work.", type: "inspirational" },
  { quote: "I told my tire a secret. It promised not to leak it.", type: "funny" },
  { quote: "August isn't the end - it's the beginning of the final push.", type: "motivational" },
  { quote: "Reliability is the ultimate compliment in our business.", type: "inspirational" },
  { quote: "Why are August tires the best students? They're ready to roll!", type: "funny" },
  { quote: "Stay committed to your decisions, but flexible in your approach.", type: "motivational" },
  { quote: "Quality is doing the right thing when no one is watching.", type: "inspirational" },
  { quote: "I tried to come up with a tire joke for August, but I'm running low on tread.", type: "funny" },
  { quote: "Your work ethic is your signature. Sign it proudly.", type: "motivational" },
  { quote: "The safest roads are paved with attention to detail.", type: "inspirational" },
  { quote: "What did August say to July? 'Hold my lug nuts, I've got this!'", type: "funny" },
  { quote: "Fall is coming - let's prepare every vehicle for the transition.", type: "motivational" },
  { quote: "Excellence isn't achieved overnight. It's earned daily.", type: "inspirational" },
  { quote: "I'm not just changing tires, I'm changing lives. One rotation at a time.", type: "funny" },
  { quote: "The best preparation for tomorrow is doing your best today.", type: "motivational" },
  { quote: "Your hands hold more than tools - they hold trust.", type: "inspirational" },
  { quote: "Why did the tire win employee of the month? It was always well-rounded!", type: "funny" },
  { quote: "Success is walking from failure to failure with no loss of enthusiasm.", type: "motivational" },
  { quote: "Pride in your work is the foundation of a great reputation.", type: "inspirational" },
  { quote: "End of summer? More like beginning of tire season!", type: "funny" },
  { quote: "August: 31 days of opportunities to excel.", type: "motivational" },

  // September (244-273)
  { quote: "September signals change - let's help customers transition safely.", type: "motivational" },
  { quote: "Fall preparation starts now. Every tire matters more.", type: "inspirational" },
  { quote: "Why do tires love fall? They get to show off their tread depth!", type: "funny" },
  { quote: "Cooler temps, hot work ethic. Let's roll!", type: "motivational" },
  { quote: "The leaves may fall, but our standards never do.", type: "inspirational" },
  { quote: "I'm not saying I'm ready for fall, but my torque wrench is.", type: "funny" },
  { quote: "September: When tire season shifts into high gear.", type: "motivational" },
  { quote: "Prepare today for tomorrow's challenges.", type: "inspirational" },
  { quote: "What do you call a tire in autumn? Fall-proof!", type: "funny" },
  { quote: "Change is coming - make sure every vehicle is ready.", type: "motivational" },
  { quote: "Your expertise bridges summer and winter safety.", type: "inspirational" },
  { quote: "Why did the tire start wearing a sweater? It heard fall was coming!", type: "funny" },
  { quote: "The busiest seasons reveal the best technicians.", type: "motivational" },
  { quote: "Safety doesn't take seasons off.", type: "inspirational" },
  { quote: "I'm outstanding in autumn. And spring. And summer. And winter.", type: "funny" },
  { quote: "Opportunity doesn't knock twice. Be ready the first time.", type: "motivational" },
  { quote: "Fall colors are beautiful, but safe travels are better.", type: "inspirational" },
  { quote: "What's a tire's favorite fall activity? Leaf me alone, I'm rotating!", type: "funny" },
  { quote: "Success is not about being the best. It's about being better than yesterday.", type: "motivational" },
  { quote: "Your work prepares families for winter's challenges.", type: "inspirational" },
  { quote: "September: 30 days to prove we're the best in the business.", type: "funny" },
  { quote: "Embrace the challenge of the changing season.", type: "motivational" },
  { quote: "Trust is earned through consistent excellence.", type: "inspirational" },
  { quote: "Why do tires love pumpkin spice season? Because they're gourd at their job!", type: "funny" },
  { quote: "Quality is not an act, it's a habit.", type: "motivational" },
  { quote: "Every vehicle you service carries precious cargo.", type: "inspirational" },
  { quote: "I'm falling for this job all over again!", type: "funny" },
  { quote: "September sun, September work ethic, September excellence.", type: "motivational" },
  { quote: "The transition seasons separate good from great.", type: "inspirational" },
  { quote: "What did September say to the tire? 'Time to get serious!'", type: "funny" },

  // October (274-304)
  { quote: "October: Where tire season really gets rolling!", type: "motivational" },
  { quote: "Fall is in full swing - so is our commitment to safety.", type: "inspirational" },
  { quote: "Why do tires love October? The air is crisp and so is their performance!", type: "funny" },
  { quote: "Pre-winter prep time. Every customer deserves peace of mind.", type: "motivational" },
  { quote: "The crunch of leaves, the squeal of properly balanced tires.", type: "inspirational" },
  { quote: "I'm not scared of Halloween. Just low tire pressure.", type: "funny" },
  { quote: "October momentum builds November success.", type: "motivational" },
  { quote: "Your expertise is the treat that keeps customers safe.", type: "inspirational" },
  { quote: "What's scarier than a ghost? Driving on bald tires!", type: "funny" },
  { quote: "Cool air means peak tire changing conditions. Let's excel!", type: "motivational" },
  { quote: "Safety is no accident - it's intentional excellence.", type: "inspirational" },
  { quote: "Why did the tire dress up for Halloween? It wanted to be a-spare-ition!", type: "funny" },
  { quote: "The road to winter readiness starts today.", type: "motivational" },
  { quote: "October brings change - we bring consistency.", type: "inspirational" },
  { quote: "My costume this year? A perfectly balanced technician.", type: "funny" },
  { quote: "Champions prepare when others procrastinate.", type: "motivational" },
  { quote: "Every vehicle you prepare is a family you protect.", type: "inspirational" },
  { quote: "What do you call a tire on Halloween? A pump-kin!", type: "funny" },
  { quote: "Fall back, but never fall behind on quality.", type: "motivational" },
  { quote: "Your hands create the confidence that moves people forward.", type: "inspirational" },
  { quote: "I've got a skeleton crew working today. And they're crushing it!", type: "funny" },
  { quote: "October: 31 days to be legendary.", type: "motivational" },
  { quote: "The scariest thing in October? Customers with worn tires heading into winter.", type: "inspirational" },
  { quote: "Why don't tires like haunted houses? Too many flats!", type: "funny" },
  { quote: "Preparation today prevents problems tomorrow.", type: "motivational" },
  { quote: "Trust is built through actions, not words.", type: "inspirational" },
  { quote: "What's a tire's favorite candy? Anything that's not too hard on the treads!", type: "funny" },
  { quote: "The best way to predict the future is to create it.", type: "motivational" },
  { quote: "Excellence in October sets the tone for winter.", type: "inspirational" },
  { quote: "My jack-o-lantern has a tire pattern carved in it. I'm committed.", type: "funny" },
  { quote: "October excellence leads to year-end success!", type: "motivational" },

  // November (305-334)
  { quote: "November: Gratitude for the team, dedication to the craft.", type: "motivational" },
  { quote: "Winter prep season in full effect. Every tire counts double!", type: "inspirational" },
  { quote: "Why do tires love November? They're thankful for good techs!", type: "funny" },
  { quote: "Cold weather coming - warm up your work ethic!", type: "motivational" },
  { quote: "Be grateful for the skills you have and the customers who trust you.", type: "inspirational" },
  { quote: "I'm grateful for my torque wrench. It really tightens up my day.", type: "funny" },
  { quote: "November hustle equals December success.", type: "motivational" },
  { quote: "Every tire swap prepares a family for winter adventures.", type: "inspirational" },
  { quote: "What's a tire thankful for? A good balance in life!", type: "funny" },
  { quote: "The best time to prepare for winter was last month. The second best time is now.", type: "motivational" },
  { quote: "Your expertise keeps holiday travelers safe.", type: "inspirational" },
  { quote: "I'm stuffed with gratitude for this amazing team!", type: "funny" },
  { quote: "November: Short days, long commitment to excellence.", type: "motivational" },
  { quote: "Gratitude turns what we have into enough.", type: "inspirational" },
  { quote: "Why did the turkey get new tires? To have a smooth Thanksgiving trip!", type: "funny" },
  { quote: "Success is stumbling from failure to failure with enthusiasm.", type: "motivational" },
  { quote: "Thankful for every vehicle we send out safer.", type: "inspirational" },
  { quote: "My family asked what I'm grateful for. I said properly inflated tires.", type: "funny" },
  { quote: "The harvest of excellence comes from seeds planted daily.", type: "motivational" },
  { quote: "Safety is the gift that keeps on giving.", type: "inspirational" },
  { quote: "What do tires eat at Thanksgiving? Rubber turkey!", type: "funny" },
  { quote: "November work ethic defines December results.", type: "motivational" },
  { quote: "Thankful for challenges that make us better.", type: "inspirational" },
  { quote: "I've got a lot on my plate. My service plate, that is.", type: "funny" },
  { quote: "Every day is a chance to be thankful and excellent.", type: "motivational" },
  { quote: "Gratitude and hard work: the perfect combination.", type: "inspirational" },
  { quote: "Why don't tires skip Thanksgiving? They're too well-rounded!", type: "funny" },
  { quote: "Be thankful for the opportunity to make a difference.", type: "motivational" },
  { quote: "The best teams are built on gratitude and excellence.", type: "inspirational" },
  { quote: "November: Giving thanks, giving excellence, giving safety.", type: "motivational" },

  // December (335-365)
  { quote: "December: Finish the year as strong as you started!", type: "motivational" },
  { quote: "Holiday travel means families counting on our work.", type: "inspirational" },
  { quote: "Why do tires love December? Snow much opportunity!", type: "funny" },
  { quote: "Year-end push time. Let's make it memorable!", type: "motivational" },
  { quote: "The gift of safety is the best present you can give.", type: "inspirational" },
  { quote: "I'm dreaming of a white Christmas... with properly installed snow tires.", type: "funny" },
  { quote: "December: 31 days to exceed every expectation.", type: "motivational" },
  { quote: "Winter conditions demand our best work.", type: "inspirational" },
  { quote: "What did the tire say to the snowflake? 'I've got the grip for this!'", type: "funny" },
  { quote: "End the year with pride in every tire you touch.", type: "motivational" },
  { quote: "Holiday travelers deserve holiday-quality service.", type: "inspirational" },
  { quote: "My holiday list: 1. Mount tires 2. Balance wheels 3. Save Christmas.", type: "funny" },
  { quote: "The busiest season shows our true character.", type: "motivational" },
  { quote: "Excellence is the best gift you can give yourself and others.", type: "inspirational" },
  { quote: "Why did Santa get new tires? For a smoother sleigh ride!", type: "funny" },
  { quote: "Push through December - champions are made in the struggle.", type: "motivational" },
  { quote: "Your work keeps holiday magic on the road.", type: "inspirational" },
  { quote: "All I want for Christmas is good tire pressure.", type: "funny" },
  { quote: "December success is earned through daily dedication.", type: "motivational" },
  { quote: "The year's end is just the beginning of next year's story.", type: "inspirational" },
  { quote: "What do elves check before delivering presents? Tire pressure!", type: "funny" },
  { quote: "Strong finish, stronger reputation.", type: "motivational" },
  { quote: "Safety is the reason for the season.", type: "inspirational" },
  { quote: "I'm on the nice list because I always check tire pressure.", type: "funny" },
  { quote: "December demands our best - let's deliver.", type: "motivational" },
  { quote: "The holiday rush rewards the prepared.", type: "inspirational" },
  { quote: "Why do reindeer need good tires? For extra traction on rooftops!", type: "funny" },
  { quote: "Finish strong, start stronger.", type: "motivational" },
  { quote: "Every safe journey home is a gift you helped give.", type: "inspirational" },
  { quote: "Jingle bells, tire smells... wait, that's a brake issue.", type: "funny" },
  { quote: "December 31st: One more day to be excellent. Make it count!", type: "motivational" },
];

export default DAILY_QUOTES;
