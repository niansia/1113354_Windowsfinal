import { LEGAL_DOMAIN_LABELS, LEGAL_PROVISIONS, type LegalDomain, type LegalProvision } from './legalCorpus.js';

export type LegalUrgency = 'routine' | 'prompt' | 'urgent';

export interface LegalMatch {
  provision: LegalProvision;
  score: number;
  confidence: number;
  reasons: string[];
  label: '可能涉及';
}

export interface LegalAnalysis {
  query: string;
  primaryDomain: LegalDomain | null;
  urgency: LegalUrgency;
  matches: LegalMatch[];
  evidence: string[];
  actions: string[];
  safety: string[];
  disclaimer: string;
}

const normalize = (value: string) => value
  .normalize('NFKC')
  .toLocaleLowerCase('zh-Hant')
  .replace(/[，。！？、；：,.!?;:()（）\[\]【】\s]+/g, ' ')
  .trim();

const QUERY_ALIASES: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /unpaid overtime|overtime pay|overtime|残業|연장 근로|야근|加班费/i, canonical: '加班 加班費 延長工時 出勤' },
  { pattern: /online (purchase|shopping)|distance sale|return (an )?item|返品|온라인 쇼핑|网购|退货/i, canonical: '網路購物 退貨 到貨 七日' },
  { pattern: /dismissed|laid off|termination|解雇|解雇された|해고|资遣/i, canonical: '資遣 解雇 預告 非自願離職' },
  { pattern: /data (leak|breach)|privacy leak|個人情報漏洩|개인정보 유출|个资外泄|资料外泄/i, canonical: '個資外洩 資安事件' },
  { pattern: /rental deposit|security deposit|landlord|敷金|임대 보증금|押金不退|房东/i, canonical: '房東 押金不退 租約' },
  { pattern: /domestic violence|threat|threaten|家庭内暴力|脅迫|가정폭력|협박|家庭暴力|威胁/i, canonical: '家暴 伴侶威脅 恐嚇' },
  { pattern: /fraud|scam|詐欺|사기|诈骗/i, canonical: '詐騙 詐欺 騙錢' },
  { pattern: /car accident|traffic accident|交通事故|교통사고|车祸/i, canonical: '車禍 交通事故' }
];

const expandQuery = (value: string) => {
  const normalized = normalize(value);
  const aliases = QUERY_ALIASES.filter((item) => item.pattern.test(normalized)).map((item) => item.canonical);
  return normalize([normalized, ...aliases].join(' '));
};

const articleDigits = (article: string) => article.replace(/\D/g, '');

const phraseHits = (query: string, provision: LegalProvision) => provision.keywords
  .filter((keyword) => query.includes(normalize(keyword)));

const scoreProvision = (rawQuery: string, provision: LegalProvision) => {
  const query = expandQuery(rawQuery);
  if (!query) return { score: 1, reasons: [] as string[] };

  const hits = phraseHits(query, provision);
  let score = hits.reduce((sum, hit) => sum + Math.max(7, normalize(hit).length * 2.6), 0);
  const reasons = hits.slice(0, 3).map((hit) => `命中「${hit}」`);
  if (query.includes(normalize(provision.lawName))) {
    score += 24;
    reasons.push(`指定「${provision.lawName}」`);
  }
  const digits = articleDigits(provision.article);
  if (digits && new RegExp(`(^|\\D)${digits}(\\D|$)`).test(query)) {
    score += 22;
    reasons.push(`指定「${provision.article}」`);
  }

  const searchable = normalize(`${provision.title} ${provision.summary} ${LEGAL_DOMAIN_LABELS[provision.domain]}`);
  const terms = query.split(' ').filter((term) => term.length >= 2);
  for (const term of terms) {
    if (searchable.includes(term)) score += Math.min(6, term.length * 1.5);
  }
  return { score, reasons };
};

export const searchLegalProvisions = (query: string, domain?: LegalDomain | 'all'): LegalProvision[] => {
  const candidates = domain && domain !== 'all'
    ? LEGAL_PROVISIONS.filter((item) => item.domain === domain)
    : LEGAL_PROVISIONS;
  if (!expandQuery(query)) return [...candidates];

  return candidates
    .map((provision) => ({ provision, ...scoreProvision(query, provision) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.provision.id.localeCompare(right.provision.id))
    .map((item) => item.provision);
};

const unique = (values: string[]) => [...new Set(values)];

const urgentTerms = ['現在', '立即', '堵門', '不讓離開', '威脅要打', '威脅殺', '持刀', '受傷', '流血', '家暴'];
const promptTerms = ['資遣', '解雇', '車禍', '個資外洩', '被詐騙', '匯款後失聯', '保護令'];

export const analyzeLegalScenario = (rawQuery: string): LegalAnalysis => {
  const query = expandQuery(rawQuery);
  const ranked = LEGAL_PROVISIONS
    .map((provision) => ({ provision, ...scoreProvision(query, provision) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.provision.id.localeCompare(right.provision.id))
    .slice(0, 5);

  const peak = Math.max(1, ranked[0]?.score ?? 1);
  const matches: LegalMatch[] = ranked.map((item) => ({
    provision: item.provision,
    score: Math.round(item.score * 10) / 10,
    confidence: Math.max(0.22, Math.min(0.96, item.score / (peak + 12))),
    reasons: item.reasons.length ? item.reasons : [`與「${item.provision.title}」語意接近`],
    label: '可能涉及'
  }));

  const primaryDomain = matches[0]?.provision.domain ?? null;
  const isUrgent = urgentTerms.some((term) => query.includes(term));
  const isPrompt = promptTerms.some((term) => query.includes(term));
  const urgency: LegalUrgency = isUrgent ? 'urgent' : isPrompt ? 'prompt' : 'routine';
  const selected = matches.slice(0, 3).map((match) => match.provision);

  return {
    query: rawQuery.trim(),
    primaryDomain,
    urgency,
    matches,
    evidence: unique(selected.flatMap((item) => item.evidence)).slice(0, 7),
    actions: unique(selected.flatMap((item) => item.actions)).slice(0, 6),
    safety: isUrgent
      ? ['若有立即人身危險，先離開現場並撥打 110。', '受傷或需要緊急醫療時撥打 119。', '不要為了蒐證讓自己持續處於危險中。']
      : [],
    disclaimer: '這是本機資訊整理，不是法律意見，也不會取代律師或主管機關的判斷。'
  };
};
