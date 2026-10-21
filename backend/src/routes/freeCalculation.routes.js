import { Router } from 'express';
import { fail } from '../utils/response.js';
import {
  numerologyReport,
  calculateDashaTimeline,
  calculateBirthChart,
  calculateNakshatra,
  calculatePanchangam,
  checkPorutham,
  searchBabyNames
} from '../services/freeCalculation.service.js';

const router = Router();

router.post('/numerology', (req, res) => {
  try {
    const { fullName, dateOfBirth } = req.body;
    if (!fullName || !dateOfBirth) return fail(res, 'fullName and dateOfBirth are required');
    res.json(numerologyReport({ fullName, dateOfBirth }));
  } catch (e) { return fail(res, e.message); }
});

router.post('/dasha', (req, res) => {
  try {
    const { birthDateTime, moonLongitude, yearsToGenerate } = req.body;
    if (!birthDateTime || moonLongitude == null) return fail(res, 'birthDateTime and moonLongitude are required');
    res.json(calculateDashaTimeline({ birthDateTime, moonLongitude, yearsToGenerate }));
  } catch (e) { return fail(res, e.message); }
});

router.post('/birth-chart', (req, res) => {
  try {
    const { dateOfBirth, timeOfBirth, latitude, longitude } = req.body;
    if (!dateOfBirth || !timeOfBirth) return fail(res, 'dateOfBirth and timeOfBirth are required');
    res.json(calculateBirthChart({ dateOfBirth, timeOfBirth, latitude, longitude }));
  } catch (e) { return fail(res, e.message); }
});

router.post('/nakshatra', (req, res) => {
  try {
    const { dateOfBirth, timeOfBirth } = req.body;
    if (!dateOfBirth || !timeOfBirth) return fail(res, 'dateOfBirth and timeOfBirth are required');
    res.json(calculateNakshatra({ dateOfBirth, timeOfBirth }));
  } catch (e) { return fail(res, e.message); }
});

router.post('/panchangam', (req, res) => {
  try {
    const { date, latitude, longitude, timezone } = req.body;
    if (!date) return fail(res, 'date is required');
    res.json(calculatePanchangam({ date, latitude, longitude, timezone }));
  } catch (e) { return fail(res, e.message); }
});

// Marriage Matching
router.post('/marriage-matching', (req, res) => {
  try {
    const { boy, girl } = req.body;
    if (!boy || !girl) return fail(res, 'boy and girl details are required');
    
    // Accept both formats (dob/tob and dateOfBirth/timeOfBirth)
    const normalizedBoy = {
      name: boy.name,
      dateOfBirth: boy.dateOfBirth || boy.dob,
      timeOfBirth: boy.timeOfBirth || boy.tob,
    };
    const normalizedGirl = {
      name: girl.name,
      dateOfBirth: girl.dateOfBirth || girl.dob,
      timeOfBirth: girl.timeOfBirth || girl.tob,
    };
    
    if (!normalizedBoy.dateOfBirth || !normalizedBoy.timeOfBirth) return fail(res, 'Boy dateOfBirth and timeOfBirth are required');
    if (!normalizedGirl.dateOfBirth || !normalizedGirl.timeOfBirth) return fail(res, 'Girl dateOfBirth and timeOfBirth are required');
    
    res.json(checkPorutham({ boy: normalizedBoy, girl: normalizedGirl }));
  } catch (e) { return fail(res, e.message); }
});

router.post('/baby-names', (req, res) => {
  try {
    const { nakshatra, pada, gender, startingLetter } = req.body;
    if (!nakshatra) return fail(res, 'nakshatra is required');
    res.json(searchBabyNames({ nakshatra, pada, gender, startingLetter }));
  } catch (e) { return fail(res, e.message); }
});

export default router;
