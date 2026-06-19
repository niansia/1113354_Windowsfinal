import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGAL_PROVISIONS, LEGAL_SOURCES } from '../src/legal/legalCorpus.js';
import { analyzeLegalScenario, searchLegalProvisions } from '../src/legal/legalSearch.js';
import { LEGAL_TRANSLATIONS } from '../src/legal/legalText.js';
import {
  genericLegalActions,
  genericLegalEvidence,
  legalArticleLabel,
  localizedLegalSummaryKey
} from '../src/legal/legalLocalization.js';

test('matches unpaid overtime to Taiwan labor protections', () => {
  const result = analyzeLegalScenario('公司每天要求我加班到晚上十點，卻沒有給加班費，也沒有打卡紀錄。');

  assert.equal(result.primaryDomain, 'employment');
  assert.ok(result.matches.some((match) => match.provision.lawName === '勞動基準法' && match.provision.article === '第 24 條'));
  assert.ok(result.evidence.some((item) => item.includes('出勤')));
  assert.ok(result.actions.length >= 3);
});

test('matches online purchase cancellation to the seven-day distance-sales rule', () => {
  const result = analyzeLegalScenario('我在網路商店買了商品，昨天到貨後想退貨，但賣家說拆箱就不能退。');

  assert.equal(result.primaryDomain, 'consumer');
  assert.ok(result.matches.some((match) => match.provision.lawName === '消費者保護法' && match.provision.article === '第 19 條'));
  assert.ok(result.matches[0].reasons.length > 0);
});

test('understands common English scenario terms when the system language changes', () => {
  const result = analyzeLegalScenario('My employer requires unpaid overtime every night and does not keep attendance records.');

  assert.equal(result.primaryDomain, 'employment');
  assert.ok(result.matches.some((match) => match.provision.id === 'labor-24'));
});

test('raises an urgent safety path for threats or domestic violence without presenting a legal conclusion', () => {
  const result = analyzeLegalScenario('伴侶威脅要打我，現在堵在門口不讓我離開。');

  assert.equal(result.urgency, 'urgent');
  assert.ok(result.safety.some((item) => item.includes('110')));
  assert.match(result.disclaimer, /不是法律意見/);
  assert.ok(result.matches.every((match) => match.label === '可能涉及'));
});

test('searches the local legal database by law, article, topic, and plain-language terms', () => {
  const byArticle = searchLegalProvisions('民法 184');
  const byTopic = searchLegalProvisions('個資外洩');

  assert.ok(byArticle.some((item) => item.lawName === '民法' && item.article === '第 184 條'));
  assert.ok(byTopic.some((item) => item.lawName === '個人資料保護法'));
});

test('keeps every legal reference offline and links only to official Taiwan sources', () => {
  assert.ok(LEGAL_PROVISIONS.length >= 18);
  assert.ok(LEGAL_SOURCES.length >= 8);
  assert.ok(LEGAL_PROVISIONS.every((item) => item.sourceUrl.startsWith('https://law.moj.gov.tw/')));
  assert.ok(LEGAL_SOURCES.every((item) => item.url.startsWith('https://law.moj.gov.tw/') || item.url.startsWith('https://www.laf.org.tw/')));
});

test('provides complete legal navigation translations for all system languages', () => {
  const required = [
    'LexTaiwan 法律導航',
    '情境分析',
    '法規資料庫',
    '案件筆記',
    '可能涉及',
    '這是本機資訊整理，不是法律意見，也不會取代律師或主管機關的判斷。',
    '最後檢核日期',
    ...LEGAL_PROVISIONS.map((provision) => provision.title),
    ...genericLegalEvidence,
    ...genericLegalActions,
    '情境詞與法規主題相符',
    ...(['employment', 'consumer', 'housing', 'contracts', 'privacy', 'family', 'criminal', 'procedure', 'traffic'] as const).map(localizedLegalSummaryKey)
  ];

  for (const key of required) {
    const translation = LEGAL_TRANSLATIONS[key];
    assert.ok(translation, `missing legal translation for ${key}`);
    for (const lang of ['zh-CN', 'en', 'ja', 'ko'] as const) {
      assert.ok(translation[lang], `missing ${lang} legal translation for ${key}`);
    }
  }
});

test('localizes dynamic legal result content without leaking Chinese-only formatting', () => {
  assert.equal(legalArticleLabel('第 24 條', 'en'), 'Article 24');
  assert.equal(legalArticleLabel('第 24 條', 'ja'), '第24条');
  assert.equal(legalArticleLabel('第 24 條', 'ko'), '제24조');
  assert.equal(legalArticleLabel('第 24 條', 'zh-CN'), '第 24 条');
  assert.equal(localizedLegalSummaryKey('employment'), '勞動與職場相關條文摘要');
  assert.equal(genericLegalEvidence.length, 3);
  assert.equal(genericLegalActions.length, 3);
});
