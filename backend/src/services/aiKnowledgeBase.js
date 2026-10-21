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
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

const PLANET_NAMES = {
  sun: 'Sun (Surya)',
  moon: 'Moon (Chandra)',
  mercury: 'Mercury (Budha)',
  venus: 'Venus (Shukra)',
  mars: 'Mars (Mangala)',
  jupiter: 'Jupiter (Guru/Brihaspati)',
  saturn: 'Saturn (Shani)',
  rahu: 'Rahu (North Lunar Node)',
  ketu: 'Ketu (South Lunar Node)'
};

function eclipticToSignName(lon) {
  const normalized = ((lon % 360) + 360) % 360;
  const index = Math.floor(normalized / 30);
  return ZODIAC_SIGNS[index];
}

function eclipticToNakshatra(lon) {
  const normalizedLon = ((lon % 360) + 360) % 360;
  const nakshatraSize = 360 / 27;
  const index = Math.floor(normalizedLon / nakshatraSize);
  return NAKSHATRAS[index % 27];
}

function getMeanLunarNode(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const meanLon = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T;
  return ((meanLon % 360) + 360) % 360;
}

function getCurrentPlanetaryPositions(date) {
  const time = astronomy.MakeTime(date);

  const moonLon = astronomy.EclipticLongitude('Moon', time);
  const mercuryLon = astronomy.EclipticLongitude('Mercury', time);
  const venusLon = astronomy.EclipticLongitude('Venus', time);
  const marsLon = astronomy.EclipticLongitude('Mars', time);
  const jupiterLon = astronomy.EclipticLongitude('Jupiter', time);
  const saturnLon = astronomy.EclipticLongitude('Saturn', time);
  const sunLon = astronomy.SunPosition(time).elon;
  const rahuLon = getMeanLunarNode(date);
  const ketuLon = (rahuLon + 180) % 360;

  const allPlanets = {
    sun: sunLon, moon: moonLon, mercury: mercuryLon, venus: venusLon,
    mars: marsLon, jupiter: jupiterLon, saturn: saturnLon,
    rahu: rahuLon, ketu: ketuLon
  };

  const positions = {};
  for (const [key, lon] of Object.entries(allPlanets)) {
    const signName = eclipticToSignName(lon);
    positions[key] = {
      longitude: lon,
      sign: signName,
      sanskritSign: ZODIAC_SANSKRIT[signName],
      nakshatra: eclipticToNakshatra(lon),
      degreeInSign: (lon % 30).toFixed(1)
    };
  }
  return positions;
}

function getMoonPhase(date) {
  const phaseAngle = astronomy.MoonPhase(date);

  if (phaseAngle < 1) return { name: 'New Moon (Amavasya)', emoji: '🌑', description: 'A time for new beginnings, introspection, and setting intentions.' };
  if (phaseAngle < 25) return { name: 'Waxing Crescent', emoji: '🌒', description: 'A growing phase good for planting seeds of new projects and building momentum.' };
  if (phaseAngle < 50) return { name: 'First Quarter', emoji: '🌓', description: 'A time of action, decision-making, and overcoming challenges.' };
  if (phaseAngle < 75) return { name: 'Waxing Gibbous', emoji: '🌔', description: 'Refinement and patience — the culmination is approaching.' };
  if (phaseAngle < 100) return { name: 'Full Moon (Pournami)', emoji: '🌕', description: 'A time of fulfillment, heightened energy, and emotional clarity. Great for prayer and spiritual practices.' };
  if (phaseAngle < 125) return { name: 'Waning Gibbous', emoji: '🌖', description: 'A period for gratitude, sharing wisdom, and releasing excess.' };
  if (phaseAngle < 150) return { name: 'Last Quarter', emoji: '🌗', description: 'A time for reflection, letting go, and forgiving.' };
  return { name: 'Waning Crescent', emoji: '🌘', description: 'Rest and preparation before the next cycle begins.' };
}

function detectAiIntent(messageText) {
  const text = messageText.toLowerCase();

  if (text.includes('nakshatra') || text.includes('star') || text.includes('birth star'))
    return 'nakshatra';
  if (text.includes('rasi') || text.includes('moon sign') || text.includes('raasi'))
    return 'rasi';
  if (text.includes('lagna') || text.includes('ascendant') || text.includes('asc'))
    return 'lagna';
  if (text.includes('sani') || text.includes('saturn'))
    return 'sani_peyarchi';
  if (text.includes('guru') || text.includes('jupiter') || text.includes('brihaspathi'))
    return 'guru_peyarchi';
  if (text.includes('rahu') || text.includes('ketu'))
    return 'rahu_ketu';
  if (text.includes('marriage') || text.includes('porutham') || text.includes('wedding') || text.includes('mangal dosha') || text.includes('sevvai dosham'))
    return 'marriage';
  if (text.includes('career') || text.includes('job') || text.includes('profession') || text.includes('business'))
    return 'career';
  if (text.includes('remedy') || text.includes('pariharam') || text.includes('pooja') || text.includes('mantra'))
    return 'remedy';
  if (text.includes('dasa') || text.includes('bhukthi') || text.includes('dasabukthi'))
    return 'dasa';
  if (text.includes('transit') || text.includes('gochar'))
    return 'transit';
  if (text.includes('daily') || text.includes('today') || text.includes('horoscope'))
    return 'daily';
  if (text.includes('birth chart') || text.includes('kundali') || text.includes('horoscope chart'))
    return 'birth_chart';
  if (text.includes('dosham') || text.includes('dosha'))
    return 'dosham';
  if (text.includes('muhurtham') || text.includes('auspicious') || text.includes('muhurat'))
    return 'muhurtham';
  if (text.includes('numerology') || text.includes('number') || text.includes('life path'))
    return 'numerology';
  if (text.includes('festival') || text.includes('celebration'))
    return 'festival';
  if (text.includes('family') || text.includes('children') || text.includes('child'))
    return 'family';
  if (text.includes('moon phase') || text.includes('tithi') || text.includes('amavasya') || text.includes('pournami'))
    return 'moon_phase';
  if (text.includes('planet') || text.includes('graha'))
    return 'planets';
  if (text.includes('zodiac') || text.includes('rashi'))
    return 'zodiac';

  return 'general_astrology';
}

function generateTransitInfo(positions) {
  const saturnSign = positions.saturn.sign;
  const jupiterSign = positions.jupiter.sign;
  const rahuSign = positions.rahu.sign;
  const ketuSign = positions.ketu.sign;
  const moonSign = positions.moon.sign;

  let info = `\n\n🔭 Current Planetary Transits (Live Data):\n`;
  info += `• Saturn (Shani) is currently in ${saturnSign} (${ZODIAC_SANSKRIT[saturnSign]}) — Degree: ${positions.saturn.degreeInSign}°\n`;
  info += `• Jupiter (Guru) is currently in ${jupiterSign} (${ZODIAC_SANSKRIT[jupiterSign]}) — Degree: ${positions.jupiter.degreeInSign}°\n`;
  info += `• Rahu is currently in ${rahuSign} — Ketu is in ${ketuSign}\n`;
  info += `• Moon is currently in ${moonSign} (${ZODIAC_SANSKRIT[moonSign]}) — Nakshatra: ${positions.moon.nakshatra}\n`;
  return info;
}

function generateAllPlanetPositions(positions) {
  let info = `🪐 Current Positions of All Grahas (Live Astronomical Data):\n\n`;
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'rahu', 'ketu'];
  for (const key of keys) {
    const p = positions[key];
    const name = PLANET_NAMES[key];
    info += `• ${name}: ${p.sign} (${p.sanskritSign}) — ${p.degreeInSign}° — Nakshatra: ${p.nakshatra}\n`;
  }
  return info;
}

function getSignEnergy(sign) {
  const energies = {
    Aries: 'energy, initiative, and bold action',
    Taurus: 'stability, comfort, and material pleasures',
    Gemini: 'communication, learning, and social connection',
    Cancer: 'emotions, nurturing, and home matters',
    Leo: 'creativity, leadership, and self-expression',
    Virgo: 'analysis, health, and attention to detail',
    Libra: 'balance, relationships, and harmony',
    Scorpio: 'transformation, depth, and inner power',
    Sagittarius: 'adventure, wisdom, and expansion',
    Capricorn: 'discipline, structure, and career focus',
    Aquarius: 'innovation, community, and unconventional thinking',
    Pisces: 'intuition, compassion, and spiritual matters'
  };
  return energies[sign] || 'general cosmic energy';
}

export function generateAiAnswer({ messageText, mode, profile }) {
  const intent = detectAiIntent(messageText);
  const now = new Date();
  const positions = getCurrentPlanetaryPositions(now);
  const moonPhase = getMoonPhase(now);

  let answer = '';

  switch (intent) {
    case 'nakshatra': {
      const moonNak = positions.moon.nakshatra;
      const moonSign = positions.moon.sign;
      answer = `Nakshatra refers to the lunar mansion where the Moon was positioned at the time of birth. In Vedic astrology, there are 27 Nakshatras, each spanning 13°20' of the zodiac.\n\nCurrently, the Moon is in ${moonNak} Nakshatra in ${moonSign} (${ZODIAC_SANSKRIT[moonSign]}).\n\nEach Nakshatra has a ruling deity, a planetary ruler, and unique qualities that influence personality, behavior, and destiny. Nakshatras are used for personality reading, marriage compatibility (Porutham), Dasa calculation, and Muhurtham selection.`;
      break;
    }
    case 'rasi': {
      const moonSign = positions.moon.sign;
      answer = `Rasi (Moon sign) is determined by the position of the Moon in a particular zodiac sign at birth. There are 12 Rasis in Vedic astrology.\n\nCurrently, the Moon is transiting through ${moonSign} (${ZODIAC_SANSKRIT[moonSign]}).\n\nYour Rasi influences your emotional nature, instincts, and how you respond to situations. It is the foundation for daily predictions, transit effects, and general horoscope reading. The Moon changes Rasi approximately every 2.5 days.`;
      break;
    }
    case 'lagna': {
      answer = `Lagna (Ascendant) is the zodiac sign that was rising on the eastern horizon at the exact moment of your birth. It represents your physical body, personality, and life direction.\n\nTo calculate your exact Lagna, your exact birth time and birth place are needed, as the Ascendant changes roughly every 2 hours.`;
      if (profile?.birthTime && profile?.birthPlace) {
        answer += `\n\nBased on your profile (DOB: ${profile.dateOfBirth || 'N/A'}, Time: ${profile.birthTime}, Place: ${profile.birthPlace}), a detailed Lagna chart can be prepared. Please consult a verified astrologer for accurate calculation.`;
      }
      break;
    }
    case 'sani_peyarchi': {
      const saturnPos = positions.saturn;
      answer = `Sani Peyarchi (Saturn Transit) occurs when Saturn moves from one zodiac sign to another, approximately every 2.5 years.\n\n🔭 Current Saturn Position:\n• Sign: ${saturnPos.sign} (${saturnPos.sanskritSign})\n• Degree: ${saturnPos.degreeInSign}°\n• Nakshatra: ${saturnPos.nakshatra}\n\nSaturn is the planet of discipline, karma, responsibility, patience, and long-term growth. Saturn's transit affects different Rasis differently:\n• 3rd, 6th, and 10th from your Rasi — generally favorable\n• 1st (Sade Sati), 4th, 7th, and 12th — may bring challenges\n\nThe exact impact depends on your birth chart, current Dasa period, and Lagna.`;
      break;
    }
    case 'guru_peyarchi': {
      const jupiterPos = positions.jupiter;
      answer = `Guru Peyarchi (Jupiter Transit) occurs when Jupiter moves from one Rasi to another, approximately every 13 months.\n\n🔭 Current Jupiter Position:\n• Sign: ${jupiterPos.sign} (${jupiterPos.sanskritSign})\n• Degree: ${jupiterPos.degreeInSign}°\n• Nakshatra: ${jupiterPos.nakshatra}\n\nJupiter is the planet of wisdom, expansion, education, fortune, children, and spiritual growth. When Jupiter transits favorable houses from your Moon sign, it brings blessings and positive developments in education, finance, and family matters.`;
      break;
    }
    case 'rahu_ketu': {
      const rahuPos = positions.rahu;
      const ketuPos = positions.ketu;
      answer = `Rahu and Ketu are shadow planets (lunar nodes) that are always 180° apart.\n\n🔭 Current Positions:\n• Rahu: ${rahuPos.sign} (${rahuPos.sanskritSign}) — ${rahuPos.degreeInSign}° — Nakshatra: ${rahuPos.nakshatra}\n• Ketu: ${ketuPos.sign} (${ketuPos.sanskritSign}) — ${ketuPos.degreeInSign}° — Nakshatra: ${ketuPos.nakshatra}\n\n• Rahu represents desire, ambition, obsession, foreign connections, technology, and unconventional paths.\n• Ketu represents detachment, spirituality, past-life karma, intuition, and liberation.\n\nWhen Rahu or Ketu transit key houses in your chart, they can bring sudden changes, confusion, or spiritual awakening.`;
      break;
    }
    case 'marriage': {
      answer = `Marriage prediction in Vedic astrology involves analyzing multiple factors:\n• 7th house and its lord (partnership and spouse)\n• Venus (romance, love, harmony)\n• Jupiter (marriage blessings, especially for women)\n• 2nd house (family life), 4th house (domestic happiness)\n• Dasa/Bhukthi periods timing\n• Current planetary transits\n• Nakshatra Porutham compatibility\n\n🔭 Current transits relevant to marriage:\n• Venus is in ${positions.venus.sign} (${positions.venus.sanskritSign}) — Venus governs love and marriage\n• Jupiter is in ${positions.jupiter.sign} (${positions.jupiter.sanskritSign}) — Jupiter blesses partnerships\n\n⚠️ For personal marriage decisions, it is strongly recommended to consult a verified astrologer for detailed chart analysis.`;
      break;
    }
    case 'career': {
      answer = `Career prediction in Vedic astrology considers:\n• 10th house (career, profession, public image)\n• 6th house (service, competition, daily work)\n• 2nd house (wealth, speech)\n• 11th house (income, gains, aspirations)\n• Saturn (career discipline and long-term work)\n• Sun (authority, leadership)\n• Mercury (communication, business)\n• Current Dasa and transit periods\n\n🔭 Current planetary influences on career:\n• Saturn in ${positions.saturn.sign} (${positions.saturn.sanskritSign}) — Saturn rules career discipline\n• Jupiter in ${positions.jupiter.sign} (${positions.jupiter.sanskritSign}) — Jupiter governs expansion and wisdom\n\n⚠️ For career-related personal decisions, consult a verified astrologer for a detailed birth chart analysis.`;
      break;
    }
    case 'remedy': {
      const saturnPos = positions.saturn;
      const marsPos = positions.mars;
      answer = `Remedy (Pariharam) in Vedic astrology refers to practices recommended to reduce the negative effects of planetary influences:\n\n• Mantras: Chanting specific planetary mantras\n• Donations: Giving items related to the affecting planet\n• Fasting: Observing fasts on specific days\n• Temple visits: Praying at specific temples\n• Poojas: Performing rituals for planetary appeasement\n• Disciplined action: Changing behavior patterns\n\n🔭 Key planetary positions to note:\n• Saturn in ${saturnPos.sign} — Remedy for Saturn: Donate black sesame, iron, visit Shani temples on Saturdays\n• Mars in ${marsPos.sign} — Remedy for Mars: Donate red lentils, visit Murugan/Hanuman temples on Tuesdays\n\n⚠️ Remedies should be recommended only after proper horoscope analysis. Consult a verified astrologer for personalized remedies.`;
      break;
    }
    case 'dasa': {
      const moonNak = positions.moon.nakshatra;
      answer = `Dasa/Bhukthi system in Vedic astrology is a unique timing system based on the Nakshatra at birth.\n\nThe 9 major Dasas are:\n• Ketu (Ashwini) — 7 years\n• Venus (Bharani) — 20 years\n• Sun (Krittika) — 6 years\n• Moon (Rohini) — 10 years\n• Mars (Mrigashira) — 7 years\n• Rahu (Ardra) — 18 years\n• Jupiter (Punarvasu) — 16 years\n• Saturn (Pushya) — 19 years\n• Mercury (Ashlesha) — 17 years\n\nEach Dasa has Bhukthi (sub-periods) and Antharam. Your current Dasa period greatly influences your life events, health, career, and relationships.\n\nCurrently, the Moon is in ${moonNak} Nakshatra. The Dasa ruling this Nakshatra would be the primary Dasa for someone born under this star.`;
      break;
    }
    case 'transit': {
      answer = `Transit (Gochar) in Vedic astrology refers to the current movement of planets through the zodiac.\n\n🔭 Current Planetary Transits (Live Data):`;
      const transitPlanets = [
        ['saturn', 'Saturn (Sani) — ~2.5 years per sign'],
        ['jupiter', 'Jupiter (Guru) — ~13 months per sign'],
        ['rahu', 'Rahu — ~18 months per sign'],
        ['ketu', 'Ketu — ~18 months per sign (always opposite Rahu)']
      ];
      for (const [key, desc] of transitPlanets) {
        const p = positions[key];
        answer += `\n• ${desc}: Currently in ${p.sign} (${p.sanskritSign}) at ${p.degreeInSign}° — Nakshatra: ${p.nakshatra}`;
      }
      answer += `\n\nTransits are one tool used in prediction. They work in combination with your Dasa period.`;
      break;
    }
    case 'daily': {
      const moon = positions.moon;
      answer = `☀️ Daily Horoscope Update (Live Astronomical Data):\n\n🌙 Moon is in ${moon.sign} (${moon.sanskritSign}), Nakshatra: ${moon.nakshatra}\n\n🌕 Moon Phase: ${moonPhase.emoji} ${moonPhase.name}\n${moonPhase.description}\n\nThe Moon transiting through ${moon.sign} generally brings energies related to ${getSignEnergy(moon.sign)}. This is a general overview — your personal effect depends on your birth chart.`;
      break;
    }
    case 'birth_chart': {
      answer = `A birth chart (Kundali) is a map of the sky at the exact moment of your birth.\n\nKey components:\n• Lagna (Ascendant) — rising sign at birth\n• Rasi (Moon Sign) — Moon's position\n• 12 Houses (Bhavas) — different life areas\n• 9 Planets (Grahas) — Sun through Ketu\n• Nakshatras — 27 lunar mansions\n\nTo create your birth chart, you need: exact date of birth, time of birth, and place of birth.`;
      answer += `\n\n${generateAllPlanetPositions(positions)}`;
      break;
    }
    case 'dosham': {
      const marsPos = positions.mars;
      answer = `Dosham (Dosha) in Vedic astrology refers to afflictions caused by unfavorable planetary placements.\n\nCommon doshas:\n• Mangal Dosha (Sevvai Dosham) — Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house\n• Sani Dosha — Saturn affecting key houses\n• Rahu-Ketu Dosha — Shadow planet afflictions\n• Kalasarpa Dosha — All planets between Rahu and Ketu\n\n🔭 Current Mars Position:\n• Mars is in ${marsPos.sign} (${marsPos.sanskritSign}) — ${marsPos.degreeInSign}°\n\nDoshas are not always negative — they can bring intensity, transformation, and unique strengths. Consult a verified astrologer for personalized analysis.`;
      break;
    }
    case 'muhurtham': {
      answer = `Muhurtham (Auspicious Time) is the practice of selecting the most favorable time for important events.\n\nFactors considered:\n• Tithi (lunar day)\n• Nakshatra (star)\n• Yoga and Karana\n• Day of the week\n• Planetary positions\n• Rahu Kalam and other inauspicious periods\n\nFor selecting a good Muhurtham for your specific needs, consult a verified astrologer who can check the Panchangam for your location and requirements.`;
      break;
    }
    case 'numerology': {
      answer = `Numerology is the study of numbers and their influence on human life.\n\n• Number 1 — Sun (leadership, ambition)\n• Number 2 — Moon (creativity, sensitivity)\n• Number 3 — Jupiter (wisdom, expansion)\n• Number 4 — Uranus (innovation, structure)\n• Number 5 — Mercury (communication, versatility)\n• Number 6 — Venus (love, harmony)\n• Number 7 — Neptune (intuition, spirituality)\n• Number 8 — Saturn (discipline, authority)\n• Number 9 — Mars (courage, completion)\n\nYour Life Path Number is calculated from your date of birth and reveals your life purpose.`;
      break;
    }
    case 'festival': {
      answer = `Hindu festivals are closely connected to the lunar calendar and planetary positions.\n\nCurrent Moon Phase: ${moonPhase.emoji} ${moonPhase.name}\n${moonPhase.description}\n\nMajor festivals include Diwali, Navaratri, Sankranti, Maha Shivaratri, Janmashtami, and Guru Peyarchi. Each festival has specific Muhurtham for rituals and prayers.\n\nFollowing the Panchangam helps identify the best times for worship.`;
      break;
    }
    case 'family': {
      answer = `Family and children-related predictions involve analyzing:\n\n• 2nd house — Family, speech, accumulated wealth\n• 4th house — Domestic happiness, mother, home\n• 5th house — Children, education, creativity\n• 7th house — Spouse, partnership\n• 9th house — Father, fortune, dharma\n• 11th house — Gains, aspirations\n\nThe 5th house and its lord, along with Jupiter's influence, are key factors for children-related predictions.\n\n🔭 Jupiter in ${positions.jupiter.sign} (${positions.jupiter.sanskritSign}) — Jupiter is the Karaka (significator) for children and family blessings.\n\n⚠️ Consult a verified astrologer for family-related personal guidance.`;
      break;
    }
    case 'moon_phase': {
      const moon = positions.moon;
      answer = `🌙 Current Moon Phase (Live Astronomical Data):\n\nPhase: ${moonPhase.emoji} ${moonPhase.name}\n${moonPhase.description}\n\nMoon is in ${moon.sign} (${moon.sanskritSign}), Nakshatra: ${moon.nakshatra}\n\nIn Vedic astrology, the Moon phase (Tithi) is crucial for determining auspicious timing, fasting days, and prayer schedules.`;
      break;
    }
    case 'planets': {
      answer = generateAllPlanetPositions(positions);
      answer += `\nThese positions are live astronomical data. For interpretation in the context of your birth chart, please consult a verified astrologer.`;
      break;
    }
    case 'zodiac': {
      answer = `The 12 Zodiac Signs (Rasis) in Vedic Astrology:\n\n`;
      const planetCounts = {};
      for (const sign of ZODIAC_SIGNS) planetCounts[sign] = [];
      for (const [key, pos] of Object.entries(positions)) {
        planetCounts[pos.sign]?.push(PLANET_NAMES[key]);
      }
      for (const sign of ZODIAC_SIGNS) {
        const planetsHere = planetCounts[sign];
        answer += `• ${ZODIAC_SANSKRIT[sign]} (${sign})${planetsHere.length ? ' — ' + planetsHere.join(', ') : ''}\n`;
      }
      answer += `\nIn Vedic astrology, we use the sidereal zodiac (based on actual star positions), not the tropical zodiac used in Western astrology.`;
      break;
    }
    default: {
      answer = `I can help you understand various aspects of Vedic astrology:\n\n• Rasi (Moon Sign) and Lagna (Ascendant)\n• Nakshatra and Pada calculations\n• Dasa/Bhukthi periods\n• Planet transits (Gochar) — Saturn, Jupiter, Rahu-Ketu\n• Marriage compatibility and timing\n• Career and education guidance\n• Remedies and Pariharam\n• Birth chart interpretation\n• Numerology basics\n• Moon phases and Tithis\n• Current planetary positions\n\nPlease ask your question with a little more detail so I can provide a more relevant answer.`;
      answer += `\n\n${generateTransitInfo(positions)}`;
      break;
    }
  }

  if (mode === 'personal' && profile) {
    const details = [];
    if (profile.zodiacSign) details.push(`Rasi: ${profile.zodiacSign}`);
    if (profile.moonSign) details.push(`Moon Sign: ${profile.moonSign}`);
    if (profile.ascendant) details.push(`Lagna: ${profile.ascendant}`);
    if (profile.dateOfBirth) details.push(`DOB: ${profile.dateOfBirth}`);
    if (profile.birthTime) details.push(`Birth Time: ${profile.birthTime}`);
    if (profile.birthPlace) details.push(`Birth Place: ${profile.birthPlace}`);
    if (details.length) {
      answer += `\n\n📋 Based on your selected profile (${details.join(', ')}): The above explanation applies to your chart context. For exact predictions, please consult a verified astrologer with your complete birth chart.`;
    }
  }

  if (['marriage', 'career', 'remedy', 'family'].includes(intent)) {
    answer += '\n\n⚠️ For personal decisions in this area, it is strongly recommended to consult a verified astrologer for detailed chart-based guidance rather than relying on general explanations.';
  }

  const categoryMap = {
    nakshatra: 'basic_astrology', rasi: 'basic_astrology', lagna: 'basic_astrology',
    sani_peyarchi: 'transit', guru_peyarchi: 'transit', rahu_ketu: 'transit',
    marriage: 'marriage', career: 'career', remedy: 'remedy',
    dasa: 'basic_astrology', transit: 'transit', daily: 'daily_prediction',
    birth_chart: 'basic_astrology', dosham: 'basic_astrology', muhurtham: 'basic_astrology',
    numerology: 'numerology', festival: 'general', family: 'family',
    moon_phase: 'basic_astrology', planets: 'basic_astrology', zodiac: 'basic_astrology',
    general_astrology: 'general'
  };

  return {
    answer,
    category: categoryMap[intent] || 'general',
    intent
  };
}

export { detectAiIntent, getCurrentPlanetaryPositions, getMoonPhase, ZODIAC_SIGNS, ZODIAC_SANSKRIT, NAKSHATRAS };
