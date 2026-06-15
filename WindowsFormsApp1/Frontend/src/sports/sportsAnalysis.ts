import type { Lang } from '../i18n/strings.js';
import type { SquadSummary } from './sportsTypes.js';

// Turns two squad summaries into a short, localized scouting note for the AI card. This
// is the "compare every player's strength" surface: it reasons over the full rosters
// (squad size, average age, attacking depth) rather than a single rating number.

interface SquadInsightParams {
  homeName: string;
  awayName: string;
  home: SquadSummary | null;
  away: SquadSummary | null;
}

const fmtAge = (summary: SquadSummary | null) =>
  summary && summary.avgAge != null ? summary.avgAge.toFixed(1) : '—';

const youngerVerdict = (home: SquadSummary, away: SquadSummary, p: SquadInsightParams, lang: Lang): string => {
  if (home.avgAge == null || away.avgAge == null) return '';
  const diff = home.avgAge - away.avgAge;
  if (Math.abs(diff) < 0.6) {
    return {
      'zh-TW': '兩隊年齡結構相近。',
      'zh-CN': '两队年龄结构相近。',
      en: 'Both squads are similar in age.',
      ja: '両チームの年齢構成は近い。',
      ko: '두 팀의 연령 구성이 비슷하다.'
    }[lang];
  }
  const younger = diff < 0 ? p.homeName : p.awayName;
  return {
    'zh-TW': `${younger} 陣容較年輕。`,
    'zh-CN': `${younger} 阵容较年轻。`,
    en: `${younger} field a younger squad.`,
    ja: `${younger} の方が若い構成。`,
    ko: `${younger}의 스쿼드가 더 젊다.`
  }[lang];
};

const attackVerdict = (home: SquadSummary, away: SquadSummary, p: SquadInsightParams, lang: Lang): string => {
  const diff = home.byGroup.FWD - away.byGroup.FWD;
  if (diff === 0) return '';
  const deeper = diff > 0 ? p.homeName : p.awayName;
  return {
    'zh-TW': `${deeper} 鋒線人手較充足。`,
    'zh-CN': `${deeper} 锋线人手较充足。`,
    en: `${deeper} carry more attacking options.`,
    ja: `${deeper} は攻撃の選択肢が多い。`,
    ko: `${deeper}의 공격 옵션이 더 많다.`
  }[lang];
};

export function buildSquadInsight(lang: Lang, params: SquadInsightParams): string | null {
  const { home, away } = params;
  if (!home && !away) return null;

  const header = {
    'zh-TW': `陣容對比 — ${params.homeName}：${home?.count ?? '—'} 人、平均 ${fmtAge(home)} 歲；${params.awayName}：${away?.count ?? '—'} 人、平均 ${fmtAge(away)} 歲。`,
    'zh-CN': `阵容对比 — ${params.homeName}：${home?.count ?? '—'} 人、平均 ${fmtAge(home)} 岁；${params.awayName}：${away?.count ?? '—'} 人、平均 ${fmtAge(away)} 岁。`,
    en: `Squad check — ${params.homeName}: ${home?.count ?? '—'} players, avg ${fmtAge(home)} yrs; ${params.awayName}: ${away?.count ?? '—'} players, avg ${fmtAge(away)} yrs.`,
    ja: `スカッド比較 — ${params.homeName}：${home?.count ?? '—'}名、平均${fmtAge(home)}歳；${params.awayName}：${away?.count ?? '—'}名、平均${fmtAge(away)}歳。`,
    ko: `스쿼드 비교 — ${params.homeName}: ${home?.count ?? '—'}명, 평균 ${fmtAge(home)}세; ${params.awayName}: ${away?.count ?? '—'}명, 평균 ${fmtAge(away)}세.`
  }[lang];

  const verdicts: string[] = [];
  if (home && away) {
    const younger = youngerVerdict(home, away, params, lang);
    const attack = attackVerdict(home, away, params, lang);
    if (younger) verdicts.push(younger);
    if (attack) verdicts.push(attack);
  }

  return [header, ...verdicts].join(' ');
}
