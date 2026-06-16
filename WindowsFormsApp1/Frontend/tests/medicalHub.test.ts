import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MEDICAL_COURSES, filterMedicalCourses } from '../src/medical/medicalCatalog.js';
import { getImagingPrep } from '../src/medical/medicalImaging.js';
import { MEDICAL_TRANSLATIONS } from '../src/medical/medicalText.js';
import { evaluateVitals } from '../src/medical/medicalVitals.js';

test('organizes the requested medical course areas into a searchable curriculum', () => {
  const titles = MEDICAL_COURSES.map((course) => course.title);

  assert.ok(titles.includes('醫學與健康'));
  assert.ok(titles.includes('醫學影像概論（一）'));
  assert.ok(titles.includes('醫學影像概論（二）'));
  assert.ok(titles.includes('醫學工程概論（二）'));
  assert.ok(titles.includes('醫學概論'));
  assert.ok(filterMedicalCourses('影像', 'imaging').every((course) => course.track === 'imaging'));
});

test('evaluates vital signs conservatively without pretending to diagnose', () => {
  const normal = evaluateVitals({
    temperatureC: 36.8,
    systolic: 118,
    diastolic: 76,
    pulse: 72,
    respiration: 16,
    spo2: 98
  });
  const urgent = evaluateVitals({
    temperatureC: 39.4,
    systolic: 184,
    diastolic: 122,
    pulse: 132,
    respiration: 28,
    spo2: 91
  });

  assert.equal(normal.overallLevel, 'steady');
  assert.equal(urgent.overallLevel, 'urgent');
  assert.ok(urgent.summary.includes('請儘快尋求專業醫療協助'));
  assert.ok(urgent.flags.every((flag) => !flag.explanation.includes('診斷為')));
});

test('builds imaging preparation guidance for modality-specific safety questions', () => {
  const mri = getImagingPrep('mri', { hasMetalImplant: true, pregnant: false, kidneyDisease: false });
  const ct = getImagingPrep('ct', { hasMetalImplant: false, pregnant: true, kidneyDisease: true });

  assert.equal(mri.level, 'review');
  assert.ok(mri.questions.some((question) => question.includes('金屬')));
  assert.ok(ct.questions.some((question) => question.includes('懷孕')));
  assert.ok(ct.questions.some((question) => question.includes('腎臟')));
  assert.ok(ct.notes.some((note) => note.includes('放射線')));
});

test('provides complete medical translations for supported system languages', () => {
  for (const key of ['MediSphere', '醫療學習與健康導航', '生命徵象整理', '醫學影像導覽', '就醫準備清單']) {
    const translation = MEDICAL_TRANSLATIONS[key];
    assert.ok(translation, `missing translation for ${key}`);
    for (const lang of ['zh-CN', 'en', 'ja', 'ko'] as const) {
      assert.ok(translation[lang], `missing ${lang} translation for ${key}`);
    }
  }
});

test('keeps the medical hub background as designed CSS instead of image assets', () => {
  const repositoryRoot = resolve(process.cwd(), '..');
  const css = readFileSync(resolve(repositoryRoot, 'Frontend/src/styles/fusionMedicalHub.css'), 'utf8');

  assert.doesNotMatch(css, /url\(/i);
  assert.match(css, /radial-gradient/i);
  assert.match(css, /linear-gradient/i);
});
