import * as astronomy from 'astronomy-engine';

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const ZODIAC_SANSKRIT = {
  Aries: 'Mesha', Taurus: 'Vrishabha', Gemini: 'Mithuna', Cancer: 'Karka',
  Leo: 'Simha', Virgo: 'Kanya', Libra: 'Tula', Scorpio: 'Vrischika',
  Sagittarius: 'Dhanus', Capricorn: 'Makara', Aquarius: 'Kumbha', Pisces: 'Meena'
};

const NAKSHATRAS = [
  { number: 1, name: 'Ashwini', lord: 'Ketu', tamil: 'Ashwini' },
  { number: 2, name: 'Bharani', lord: 'Venus', tamil: 'Bharani' },
  { number: 3, name: 'Krittika', lord: 'Sun', tamil: 'Krittika' },
  { number: 4, name: 'Rohini', lord: 'Moon', tamil: 'Rohini' },
  { number: 5, name: 'Mrigashira', lord: 'Mars', tamil: 'Mrigashira' },
  { number: 6, name: 'Ardra', lord: 'Rahu', tamil: 'Ardra' },
  { number: 7, name: 'Punarvasu', lord: 'Jupiter', tamil: 'Punarvasu' },
  { number: 8, name: 'Pushya', lord: 'Saturn', tamil: 'Pushya' },
  { number: 9, name: 'Ashlesha', lord: 'Mercury', tamil: 'Ashlesha' },
  { number: 10, name: 'Magha', lord: 'Ketu', tamil: 'Magha' },
  { number: 11, name: 'Purva Phalguni', lord: 'Venus', tamil: 'Purva Phalguni' },
  { number: 12, name: 'Uttara Phalguni', lord: 'Sun', tamil: 'Uttara Phalguni' },
  { number: 13, name: 'Hasta', lord: 'Moon', tamil: 'Hasta' },
  { number: 14, name: 'Chitra', lord: 'Mars', tamil: 'Chitra' },
  { number: 15, name: 'Swati', lord: 'Rahu', tamil: 'Swati' },
  { number: 16, name: 'Vishakha', lord: 'Jupiter', tamil: 'Vishakha' },
  { number: 17, name: 'Anuradha', lord: 'Saturn', tamil: 'Anuradha' },
  { number: 18, name: 'Jyeshtha', lord: 'Mercury', tamil: 'Jyeshtha' },
  { number: 19, name: 'Mula', lord: 'Ketu', tamil: 'Mula' },
  { number: 20, name: 'Purva Ashadha', lord: 'Venus', tamil: 'Purva Ashadha' },
  { number: 21, name: 'Uttara Ashadha', lord: 'Sun', tamil: 'Uttara Ashadha' },
  { number: 22, name: 'Shravana', lord: 'Moon', tamil: 'Shravana' },
  { number: 23, name: 'Dhanishta', lord: 'Mars', tamil: 'Dhanishta' },
  { number: 24, name: 'Shatabhisha', lord: 'Rahu', tamil: 'Shatabhisha' },
  { number: 25, name: 'Purva Bhadrapada', lord: 'Jupiter', tamil: 'Purva Bhadrapada' },
  { number: 26, name: 'Uttara Bhadrapada', lord: 'Saturn', tamil: 'Uttara Bhadrapada' },
  { number: 27, name: 'Revati', lord: 'Mercury', tamil: 'Revati' }
];

const DASHA_SEQUENCE = [
  { code: 'ketu', name: 'Ketu', years: 7 },
  { code: 'venus', name: 'Venus', years: 20 },
  { code: 'sun', name: 'Sun', years: 6 },
  { code: 'moon', name: 'Moon', years: 10 },
  { code: 'mars', name: 'Mars', years: 7 },
  { code: 'rahu', name: 'Rahu', years: 18 },
  { code: 'jupiter', name: 'Jupiter', years: 16 },
  { code: 'saturn', name: 'Saturn', years: 19 },
  { code: 'mercury', name: 'Mercury', years: 17 }
];

const NAKSHATRA_SPAN = 360 / 27;
const PLANETS_BODY = ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

function getMeanLunarNode(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  return ((125.0445479 - 1934.1362891 * T + 0.0020754 * T * T) % 360 + 360) % 360;
}

function eclipticToSign(lon) {
  return ZODIAC_SIGNS[Math.floor(((lon % 360 + 360) % 360) / 30)];
}

function eclipticToNakshatra(lon) {
  const idx = Math.floor((((lon % 360) + 360) % 360) / NAKSHATRA_SPAN);
  return NAKSHATRAS[Math.min(idx, 26)];
}

function eclipticToPada(lon) {
  const normalized = ((lon % 360) + 360) % 360;
  const nakIdx = Math.floor(normalized / NAKSHATRA_SPAN);
  const withinNak = normalized - nakIdx * NAKSHATRA_SPAN;
  return Math.floor(withinNak / (NAKSHATRA_SPAN / 4)) + 1;
}

function getPlanetPositions(date) {
  const time = astronomy.MakeTime(date);
  const result = {};

  for (const body of PLANETS_BODY) {
    const lon = astronomy.EclipticLongitude(body, time);
    result[body.toLowerCase()] = { longitude: lon, sign: eclipticToSign(lon) };
  }

  const sunPos = astronomy.SunPosition(time);
  result.sun = { longitude: sunPos.elon, sign: eclipticToSign(sunPos.elon) };

  result.rahu = { longitude: getMeanLunarNode(date), sign: eclipticToSign(getMeanLunarNode(date)) };
  result.ketu = { longitude: (result.rahu.longitude + 180) % 360, sign: eclipticToSign((result.rahu.longitude + 180) % 360) };

  return result;
}

function reduceToSingleDigit(num) {
  while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
    num = String(num).split('').reduce((s, d) => s + Number(d), 0);
  }
  return num;
}

const PYTHAGOREAN = {
  A: 1, J: 1, S: 1, B: 2, K: 2, T: 2, C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4, E: 5, N: 5, W: 5, F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7, H: 8, Q: 8, Z: 8, I: 9, R: 9
};

const NUMEROLOGY_MEANINGS = {
  1: { title: 'The Leader', planet: 'Sun', shortMeaning: 'Independent, ambitious, original', positiveTraits: 'Confident, determined, creative', negativeTraits: 'Stubborn, self-centered, dominant', careerHint: 'Leadership roles, entrepreneurship, politics', relationshipHint: 'Needs freedom and recognition in relationships', luckyColors: 'Gold, Orange, Yellow', luckyDays: 'Sunday', luckyNumbers: '1, 10, 19, 28' },
  2: { title: 'The Peacemaker', planet: 'Moon', shortMeaning: 'Cooperative, sensitive, diplomatic', positiveTraits: 'Gentle, intuitive, supportive', negativeTraits: 'Indecisive, oversensitive, dependent', careerHint: 'Counseling, arts, diplomacy, HR', relationshipHint: 'Deep emotional bonds, values harmony', luckyColors: 'Silver, White, Cream', luckyDays: 'Monday', luckyNumbers: '2, 11, 20, 29' },
  3: { title: 'The Expressive', planet: 'Jupiter', shortMeaning: 'Creative, social, optimistic', positiveTraits: 'Articulate, enthusiastic, humorous', negativeTraits: 'Scattered, superficial, dramatic', careerHint: 'Writing, acting, teaching, design', relationshipHint: 'Needs creative expression and social life', luckyColors: 'Yellow, Purple, Lavender', luckyDays: 'Thursday', luckyNumbers: '3, 12, 21, 30' },
  4: { title: 'The Builder', planet: 'Rahu/Uranus', shortMeaning: 'Practical, organized, hardworking', positiveTraits: 'Reliable, methodical, loyal', negativeTraits: 'Rigid, stubborn, limited', careerHint: 'Engineering, real estate, accounting, construction', relationshipHint: 'Values stability and commitment', luckyColors: 'Green, Brown, Grey', luckyDays: 'Saturday', luckyNumbers: '4, 13, 22, 31' },
  5: { title: 'The Freedom Seeker', planet: 'Mercury', shortMeaning: 'Adventurous, versatile, curious', positiveTraits: 'Energetic, charming, adaptable', negativeTraits: 'Restless, impulsive, irresponsible', careerHint: 'Travel, marketing, media, sales', relationshipHint: 'Needs variety and freedom', luckyColors: 'Turquoise, Silver, Light Grey', luckyDays: 'Wednesday', luckyNumbers: '5, 14, 23, 32' },
  6: { title: 'The Nurturer', planet: 'Venus', shortMeaning: 'Caring, responsible, family-oriented', positiveTraits: 'Compassionate, warm, protective', negativeTraits: 'Self-righteous, anxious, controlling', careerHint: 'Healthcare, teaching, social work, hospitality', relationshipHint: 'Deep commitment, family-first', luckyColors: 'Pink, Rose, Pastel shades', luckyDays: 'Friday', luckyNumbers: '6, 15, 24, 33' },
  7: { title: 'The Seeker', planet: 'Neptune/Ketu', shortMeaning: 'Spiritual, analytical, introspective', positiveTraits: 'Wisdom, deep thinking, perfectionist', negativeTraits: 'Isolated, critical, secretive', careerHint: 'Research, spirituality, technology, academia', relationshipHint: 'Needs space and deep connection', luckyColors: 'Purple, Lavender, White', luckyDays: 'Monday', luckyNumbers: '7, 16, 25, 34' },
  8: { title: 'The Powerhouse', planet: 'Saturn', shortMeaning: 'Ambitious, authoritative, prosperous', positiveTraits: 'Driven, efficient, decisive', negativeTraits: 'Workaholic, materialistic, domineering', careerHint: 'Business, finance, law, management', relationshipHint: 'Values success and status in partner', luckyColors: 'Dark Blue, Black, Grey', luckyDays: 'Saturday', luckyNumbers: '8, 17, 26, 35' },
  9: { title: 'The Humanitarian', planet: 'Mars', shortMeaning: 'Compassionate, idealistic, creative', positiveTraits: 'Generous, emotional, artistic', negativeTraits: 'Moody, scattered, frustrated', careerHint: 'Charity, arts, healing, global work', relationshipHint: 'Idealistic in love, needs purpose', luckyColors: 'Red, Magenta, Coral', luckyDays: 'Tuesday', luckyNumbers: '9, 18, 27, 36' }
};

function calculateBirthNumber(dateOfBirth) {
  const day = Number(dateOfBirth.split('-')[2]);
  return reduceToSingleDigit(day);
}

function calculateLifePathNumber(dateOfBirth) {
  const digits = dateOfBirth.replace(/\D/g, '');
  const total = digits.split('').reduce((s, d) => s + Number(d), 0);
  return reduceToSingleDigit(total);
}

function calculateNameNumber(fullName) {
  const cleaned = fullName.toUpperCase().replace(/[^A-Z]/g, '');
  const total = cleaned.split('').reduce((s, ch) => s + (PYTHAGOREAN[ch] || 0), 0);
  return reduceToSingleDigit(total);
}

export function numerologyReport({ fullName, dateOfBirth }) {
  const birthNumber = calculateBirthNumber(dateOfBirth);
  const lifePathNumber = calculateLifePathNumber(dateOfBirth);
  const nameNumber = calculateNameNumber(fullName);

  return {
    fullName,
    dateOfBirth,
    birthNumber,
    lifePathNumber,
    nameNumber,
    birthNumberMeaning: NUMEROLOGY_MEANINGS[birthNumber],
    lifePathMeaning: NUMEROLOGY_MEANINGS[lifePathNumber],
    nameNumberMeaning: NUMEROLOGY_MEANINGS[nameNumber]
  };
}

function getNakshatraFromLongitude(lon) {
  const normalized = ((lon % 360) + 360) % 360;
  const idx = Math.min(Math.floor(normalized / NAKSHATRA_SPAN), 26);
  const nak = NAKSHATRAS[idx];
  const startDegree = idx * NAKSHATRA_SPAN;
  return { ...nak, lordCode: nak.lord.toLowerCase(), startDegree, endDegree: startDegree + NAKSHATRA_SPAN, moonLongitude: normalized };
}

function rotateSequence(startCode) {
  const idx = DASHA_SEQUENCE.findIndex(p => p.code === startCode);
  return [...DASHA_SEQUENCE.slice(idx), ...DASHA_SEQUENCE.slice(0, idx)];
}

function getNextPlanetCode(code) {
  const idx = DASHA_SEQUENCE.findIndex(p => p.code === code);
  return DASHA_SEQUENCE[(idx + 1) % DASHA_SEQUENCE.length].code;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function generateBhukthis(lordCode, start, yearDays = 365.25) {
  const lord = DASHA_SEQUENCE.find(p => p.code === lordCode);
  const seq = rotateSequence(lordCode);
  let cur = new Date(start);
  return seq.map(b => {
    const durYears = (lord.years * b.years) / 120;
    const end = addDays(cur, durYears * yearDays);
    const bh = { lordCode: b.code, lordName: b.name, durationYears: Number(durYears.toFixed(4)), startDate: cur.toISOString(), endDate: end.toISOString() };
    cur = end;
    return bh;
  });
}

export function calculateDashaTimeline({ birthDateTime, moonLongitude, yearsToGenerate = 120 }) {
  const birthDate = new Date(birthDateTime);
  const nak = getNakshatraFromLongitude(moonLongitude);
  const birthLord = DASHA_SEQUENCE.find(p => p.code === nak.lordCode);
  const elapsedFrac = (nak.moonLongitude - nak.startDegree) / NAKSHATRA_SPAN;
  const balanceYears = birthLord.years * (1 - elapsedFrac);
  const elapsedYears = birthLord.years * elapsedFrac;
  const birthDashaStart = addDays(birthDate, -elapsedYears * 365.25);
  const generateUntil = addDays(birthDate, yearsToGenerate * 365.25);

  let curCode = nak.lordCode;
  let curStart = birthDashaStart;
  const timeline = [];

  while (curStart < generateUntil) {
    const planet = DASHA_SEQUENCE.find(p => p.code === curCode);
    const curEnd = addDays(curStart, planet.years * 365.25);
    if (curEnd >= birthDate) {
      timeline.push({
        lordCode: planet.code, lordName: planet.name, durationYears: planet.years,
        startDate: curStart.toISOString(), endDate: curEnd.toISOString(),
        isBirthMahadasha: birthDate >= curStart && birthDate < curEnd,
        bhukthis: generateBhukthis(planet.code, curStart)
      });
    }
    curStart = curEnd;
    curCode = getNextPlanetCode(curCode);
  }

  let current = null;
  const now = new Date().getTime();
  for (const md of timeline) {
    const ms = new Date(md.startDate).getTime();
    const me = new Date(md.endDate).getTime();
    if (now >= ms && now < me) {
      const bh = md.bhukthis.find(b => now >= new Date(b.startDate).getTime() && now < new Date(b.endDate).getTime());
      current = {
        mahadashaLordName: md.lordName, bhukthiLordName: bh?.lordName || null,
        mahadashaStartDate: md.startDate, mahadashaEndDate: md.endDate,
        bhukthiStartDate: bh?.startDate || null, bhukthiEndDate: bh?.endDate || null
      };
      break;
    }
  }

  return {
    birthNakshatra: { name: nak.name, lordName: birthLord.name, moonLongitude: Number(nak.moonLongitude.toFixed(4)) },
    birthMahadasha: { lordName: birthLord.name, balanceYearsAtBirth: Number(balanceYears.toFixed(4)), elapsedYearsAtBirth: Number(elapsedYears.toFixed(4)) },
    current,
    timeline
  };
}

export function calculateBirthChart({ dateOfBirth, timeOfBirth, latitude, longitude }) {
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  const [hh, mm] = timeOfBirth.split(':').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, hh - 5, mm - 30));
  const positions = getPlanetPositions(utcDate);

  const planets = [];
  for (const body of PLANETS_BODY) {
    const key = body.toLowerCase();
    const lon = positions[key].longitude;
    const sign = eclipticToSign(lon);
    const nak = eclipticToNakshatra(lon);
    const pada = eclipticToPada(lon);
    planets.push({
      code: key, name: body,
      longitude: Number(lon.toFixed(4)),
      rasi: { name: sign, sanskrit: ZODIAC_SANSKRIT[sign] },
      degreeInRasi: Number((lon % 30).toFixed(2)),
      nakshatra: { name: nak.name, number: nak.number, pada },
      lord: nak.lord
    });
  }

  const sunLon = positions.sun.longitude;
  const sunSign = eclipticToSign(sunLon);
  const sunNak = eclipticToNakshatra(sunLon);
  planets.push({
    code: 'sun', name: 'Sun',
    longitude: Number(sunLon.toFixed(4)),
    rasi: { name: sunSign, sanskrit: ZODIAC_SANSKRIT[sunSign] },
    degreeInRasi: Number((sunLon % 30).toFixed(2)),
    nakshatra: { name: sunNak.name, number: sunNak.number, pada: eclipticToPada(sunLon) },
    lord: sunNak.lord
  });

  planets.push({
    code: 'rahu', name: 'Rahu',
    longitude: Number(positions.rahu.longitude.toFixed(4)),
    rasi: { name: positions.rahu.sign, sanskrit: ZODIAC_SANSKRIT[positions.rahu.sign] },
    degreeInRasi: Number((positions.rahu.longitude % 30).toFixed(2)),
    nakshatra: { name: eclipticToNakshatra(positions.rahu.longitude).name, number: eclipticToNakshatra(positions.rahu.longitude).number, pada: eclipticToPada(positions.rahu.longitude) },
    lord: 'Rahu'
  });

  planets.push({
    code: 'ketu', name: 'Ketu',
    longitude: Number(positions.ketu.longitude.toFixed(4)),
    rasi: { name: positions.ketu.sign, sanskrit: ZODIAC_SANSKRIT[positions.ketu.sign] },
    degreeInRasi: Number((positions.ketu.longitude % 30).toFixed(2)),
    nakshatra: { name: eclipticToNakshatra(positions.ketu.longitude).name, number: eclipticToNakshatra(positions.ketu.longitude).number, pada: eclipticToPada(positions.ketu.longitude) },
    lord: 'Ketu'
  });

  const moonLon = positions.moon.longitude;
  const moonProfile = {
    rasi: { name: eclipticToSign(moonLon), sanskrit: ZODIAC_SANSKRIT[eclipticToSign(moonLon)] },
    nakshatra: { name: eclipticToNakshatra(moonLon).name, number: eclipticToNakshatra(moonLon).number, pada: eclipticToPada(moonLon) }
  };

  const chart = {};
  for (const sign of ZODIAC_SIGNS) chart[sign] = [];
  for (const p of planets) chart[p.rasi.name]?.push(p.name);

  const chartId = `CHART-${Date.now().toString(36).toUpperCase()}`;

  return {
    chartId,
    birth: { dateOfBirth, timeOfBirth, utcDateTime: utcDate.toISOString() },
    moonProfile,
    planets,
    chart
  };
}

export function calculateNakshatra({ dateOfBirth, timeOfBirth }) {
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  const [hh, mm] = timeOfBirth.split(':').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, hh - 5, mm - 30));
  const time = astronomy.MakeTime(utcDate);
  const moonLon = astronomy.EclipticLongitude('Moon', time);
  const nak = eclipticToNakshatra(moonLon);
  const pada = eclipticToPada(moonLon);
  const sign = eclipticToSign(moonLon);

  return {
    dateOfBirth, timeOfBirth,
    moonLongitude: Number(moonLon.toFixed(4)),
    nakshatra: { name: nak.name, number: nak.number, lord: nak.lord, pada },
    rasi: { name: sign, sanskrit: ZODIAC_SANSKRIT[sign] }
  };
}

export function calculatePanchangam({ date, latitude, longitude, timezone }) {
  const [y, m, d] = date.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0));
  const time = astronomy.MakeTime(utcDate);

  const sunLon = astronomy.SunPosition(time).elon;
  const moonLon = astronomy.EclipticLongitude('Moon', time);
  const diff = ((moonLon - sunLon) % 360 + 360) % 360;

  const tithiNum = Math.floor(diff / 12) + 1;
  const TITHIS = [
    'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dvadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
    'Pratipada', 'Dvitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dvadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
  ];

  const nak = eclipticToNakshatra(moonLon);
  const sunSign = eclipticToSign(sunLon);
  const moonSign = eclipticToSign(moonLon);

  const yoga = Math.floor(((sunLon + moonLon) % 360) / (360 / 27));
  const YOGAS = [
    'Vishkumbha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
    'Atiganda', 'Sukarman', 'Dhriti', 'Shula', 'Ganda',
    'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
    'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
    'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
    'Indra', 'Vaidhriti'
  ];

  return {
    date,
    weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][utcDate.getUTCDay()],
    tithi: { number: tithiNum, name: TITHIS[(tithiNum - 1) % 30] },
    nakshatra: { name: nak.name, number: nak.number },
    yoga: { name: YOGAS[yoga % 27], number: (yoga % 27) + 1 },
    karana: { name: 'Fixed' },
    moonSign,
    sunSign,
    longitudes: {
      sun: Number(sunLon.toFixed(4)),
      moon: Number(moonLon.toFixed(4)),
      ayanamsa: 0
    }
  };
}

export function checkPorutham({ boy, girl }) {
  const boyNak = calculateNakshatra({ dateOfBirth: boy.dateOfBirth, timeOfBirth: boy.timeOfBirth });
  const girlNak = calculateNakshatra({ dateOfBirth: girl.dateOfBirth, timeOfBirth: girl.timeOfBirth });

  const boyNakNum = boyNak.nakshatra.number;
  const girlNakNum = girlNak.nakshatra.number;
  const boyNakLord = boyNak.nakshatra.lord;
  const girlNakLord = girlNak.nakshatra.lord;

  function count(start, end, total = 27) {
    return ((end - start) % total + total) % total;
  }

  function reverseCount(start, end, total = 27) {
    return ((start - end) % total + total) % total;
  }

  const poruthams = [
    { name: 'Dina/Mahendra', score: (count(boyNakNum, girlNakNum) % 7 === 1 || count(boyNakNum, girlNakNum) % 7 === 3 || count(boyNakNum, girlNakNum) % 7 === 5) ? 1 : 0 },
    { name: 'Gana', score: (boyNakLord === girlNakLord) ? 1 : (['Deva', 'Manushya', 'Rakshasa'].indexOf(boyNakLord) !== -1 && boyNakLord === girlNakLord ? 1 : 0) },
    { name: 'Yoni', score: ((boyNakNum + girlNakNum) % 4 === 0 || (boyNakNum * girlNakNum) % 3 === 0) ? 1 : 0 },
    { name: 'Rashi', score: (count(boyNakNum, girlNakNum) % 12 !== 0 && count(boyNakNum, girlNakNum) % 12 !== 6 && count(boyNakNum, girlNakNum) % 12 !== 8) ? 1 : 0 },
    { name: 'Rashi Lord', score: (boyNakLord !== girlNakLord) ? 1 : 0 },
    { name: 'Vasya', score: ((count(boyNakNum, girlNakNum) % 12) <= 2 || (count(boyNakNum, girlNakNum) % 12) === 6) ? 1 : 0 },
    { name: 'Tara', score: (count(boyNakNum, girlNakNum) % 3 !== 0) ? 1 : 0 },
    { name: 'Vivaha', score: ((boyNakLord === 'Jupiter' && girlNakLord === 'Venus') || (boyNakLord !== girlNakLord)) ? 1 : 0 },
    { name: 'Yoni', score: (Math.abs(boyNakNum - girlNakNum) % 4 === 0) ? 1 : 0, skip: true },
    { name: 'Vedha', score: (Math.abs(boyNakNum - girlNakNum) % 9 !== 0) ? 1 : 0 }
  ];

  const filteredPoruthams = poruthams.filter(p => !p.skip);
  const totalScore = filteredPoruthams.reduce((s, p) => s + p.score, 0);
  const maxScore = filteredPoruthams.length;

  return {
    boy: { name: boy.name, nakshatra: boyNak.nakshatra.name, rasi: boyNak.rasi.name, pada: boyNak.nakshatra.pada },
    girl: { name: girl.name, nakshatra: girlNak.nakshatra.name, rasi: girlNak.rasi.name, pada: girlNak.nakshatra.pada },
    poruthams: filteredPoruthams,
    totalScore,
    maxScore,
    compatible: totalScore >= 7
  };
}

export const BABY_NAMES_BY_NAKSHATRA = {
  'Ashwini': ['Aakash', 'Aarav', 'Aditi', 'Anika', 'Arjun', 'Diya', 'Kabir', 'Meera', 'Nisha', 'Rohan'],
  'Bharani': ['Bhavana', 'Bhavesh', 'Charu', 'Chetan', 'Darsh', 'Jaya', 'Kiran', 'Neha', 'Ravi', 'Sunita'],
  'Krittika': ['Karthik', 'Kavya', 'Kiran', 'Kriti', 'Nikhil', 'Pradeep', 'Rohit', 'Surya', 'Tanvi', 'Vikram'],
  'Rohini': ['Ramya', 'Ravi', 'Rekha', 'Rohan', 'Rohit', 'Sanjay', 'Shruti', 'Suman', 'Vijay', 'Vineet'],
  'Mrigashira': ['Madhav', 'Madhavi', 'Manav', 'Manisha', 'Milan', 'Nandini', 'Raj', 'Rajan', 'Saroj', 'Shashi'],
  'Ardra': ['Arun', 'Aruna', 'Darshan', 'Harsha', 'Kavitha', 'Nishant', 'Prakash', 'Rajesh', 'Savita', 'Sunil'],
  'Punarvasu': ['Aditya', 'Anjali', 'Gopal', 'Hema', 'Jay', 'Jyoti', 'Prasad', 'Rama', 'Suresh', 'Usha'],
  'Pushya': ['Bhaskar', 'Deepa', 'Ganesh', 'Geeta', 'Hari', 'Kamala', 'Naveen', 'Pooja', 'Rajni', 'Suman'],
  'Ashlesha': ['Aarti', 'Ashish', 'Chandan', 'Deepika', 'Mangesh', 'Nitin', 'Pallavi', 'Rajendra', 'Sachin', 'Vandana'],
  'Magha': ['Akash', 'Chandra', 'Deepak', 'Durga', 'Girish', 'Kavita', 'Mahesh', 'Padma', 'Ramesh', 'Suman'],
  'Purva Phalguni': ['Ashok', 'Bhavna', 'Chitra', 'Kamal', 'Manju', 'Pradeep', 'Rajani', 'Sanjay', 'Savita', 'Vijay'],
  'Uttara Phalguni': ['Amit', 'Anand', 'Deepa', 'Ganesh', 'Geeta', 'Hari', 'Kamala', 'Manoj', 'Pratibha', 'Suresh'],
  'Hasta': ['Harish', 'Hema', 'Hitesh', 'Komal', 'Manisha', 'Rajesh', 'Reena', 'Sanjay', 'Sunita', 'Vijay'],
  'Chitra': ['Chetan', 'Kriti', 'Madhu', 'Manav', 'Nandini', 'Praveen', 'Rajiv', 'Savita', 'Vikram', 'Vinita'],
  'Swati': ['Anil', 'Anita', 'Arun', 'Deepak', 'Geeta', 'Kamal', 'Neelam', 'Rajesh', 'Saroj', 'Vijay'],
  'Vishakha': ['Akash', 'Anjali', 'Bharat', 'Jyoti', 'Lalit', 'Meena', 'Naveen', 'Pooja', 'Rajni', 'Sanjay'],
  'Anuradha': ['Anil', 'Anita', 'Arun', 'Deepa', 'Ganesh', 'Geeta', 'Hari', 'Kamal', 'Manoj', 'Sunita'],
  'Jyeshtha': ['Bharat', 'Chandra', 'Durga', 'Girish', 'Kavita', 'Mahesh', 'Nisha', 'Rajesh', 'Suman', 'Vijay'],
  'Mula': ['Ashvini', 'Ganesh', 'Kavitha', 'Lalit', 'Manisha', 'Naveen', 'Pallavi', 'Raj', 'Savita', 'Vikram'],
  'Purva Ashadha': ['Anil', 'Anita', 'Bhavna', 'Chetan', 'Deepa', 'Kamal', 'Manju', 'Rajiv', 'Saroj', 'Vijay'],
  'Uttara Ashadha': ['Aditya', 'Bhaskar', 'Geeta', 'Hari', 'Hema', 'Jay', 'Kamala', 'Manoj', 'Pratibha', 'Rajesh'],
  'Shravana': ['Akash', 'Anjali', 'Gopal', 'Jyoti', 'Kavita', 'Manav', 'Neelam', 'Pradeep', 'Rajni', 'Sanjay'],
  'Dhanishta': ['Darshan', 'Deepa', 'Ganesh', 'Hema', 'Kamal', 'Milan', 'Nisha', 'Rajesh', 'Suman', 'Vijay'],
  'Shatabhisha': ['Arun', 'Bhavana', 'Chandra', 'Geeta', 'Hari', 'Kavitha', 'Manju', 'Naveen', 'Saroj', 'Vikram'],
  'Purva Bhadrapada': ['Amit', 'Anand', 'Deepak', 'Durga', 'Girish', 'Kamala', 'Madhu', 'Neha', 'Rajni', 'Suresh'],
  'Uttara Bhadrapada': ['Ashok', 'Chetan', 'Geeta', 'Hari', 'Hema', 'Kavita', 'Manish', 'Padma', 'Rajiv', 'Usha'],
  'Revati': ['Aditi', 'Bhaskar', 'Deepa', 'Ganesh', 'Hema', 'Jay', 'Komal', 'Manoj', 'Pratibha', 'Suman']
};

export function searchBabyNames({ nakshatra, pada, gender, startingLetter }) {
  let names = BABY_NAMES_BY_NAKSHATRA[nakshatra] || [];
  if (startingLetter) {
    names = BABY_NAMES_BY_NAKSHATRA[nakshatra]?.filter(n => n.toLowerCase().startsWith(startingLetter.toLowerCase())) || [];
  }
  if (names.length === 0) names = BABY_NAMES_BY_NAKSHATRA[nakshatra] || [];
  return { nakshatra, pada, names, count: names.length };
}
