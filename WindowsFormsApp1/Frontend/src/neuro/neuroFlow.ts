import type { Lang } from '../i18n/strings.js';

export type NeuroArchitecture = 'transformer' | 'hybrid' | 'liquid';

export interface VisualToken {
  text: string;
  index: number;
  id: number;
  activation: number;
}

export interface LiquidParameters {
  timeConstant: number;
  recurrence: number;
  damping: number;
}

export interface RewardSignals {
  accuracy: number;
  helpfulness: number;
  safety: number;
  clarity: number;
}

export interface RewardResult {
  total: number;
  breakdown: Array<{ key: keyof RewardSignals; signal: number; weight: number; contribution: number }>;
}

export interface KnowledgeHit {
  id: string;
  title: string;
  content: string;
  url?: string;
  source: 'online' | 'offline' | 'workspace';
  provider: string;
  score: number;
}

export interface InferenceStage {
  id: 'tokenize' | 'embed' | 'attention' | 'liquid' | 'reward' | 'decode';
  label: string;
  durationMs: number;
  load: number;
}

export interface InferenceTrace {
  architecture: NeuroArchitecture;
  tokens: VisualToken[];
  attention: number[][];
  stages: InferenceStage[];
  nodes: number;
  connections: number;
  estimatedLatencyMs: number;
  promptSeed: number;
}

type LocalDocument = {
  id: string;
  title: Record<Lang, string>;
  content: Record<Lang, string>;
  tags: string[];
};

export const LOCAL_KNOWLEDGE: LocalDocument[] = [
  {
    id: 'transformer-attention',
    title: {
      'zh-TW': 'Transformer 與注意力', 'zh-CN': 'Transformer 与注意力',
      en: 'Transformers and attention', ja: 'Transformer と注意機構', ko: 'Transformer와 어텐션'
    },
    content: {
      'zh-TW': '注意力會比較每個 token 的查詢、鍵和值，將相關上下文加權後送入下一層。多頭注意力讓模型同時觀察語意、順序與長距離關係。',
      'zh-CN': '注意力会比较每个 token 的查询、键和值，将相关上下文加权后送入下一层。多头注意力让模型同时观察语义、顺序与长距离关系。',
      en: 'Attention compares each token query, key, and value, then sends a weighted context to the next layer. Multiple heads track meaning, order, and long-range relationships.',
      ja: '注意機構は各トークンのクエリ、キー、バリューを比較し、重み付けした文脈を次の層へ送ります。',
      ko: '어텐션은 각 토큰의 쿼리, 키, 값을 비교하고 가중 문맥을 다음 계층으로 전달합니다.'
    },
    tags: ['transformer', 'attention', '注意力', '注意', '어텐션']
  },
  {
    id: 'liquid-network',
    title: {
      'zh-TW': '液態神經網路', 'zh-CN': '液态神经网络', en: 'Liquid neural networks',
      ja: '液体ニューラルネットワーク', ko: '액체 신경망'
    },
    content: {
      'zh-TW': '液態神經網路以連續時間狀態方程更新神經元，時間常數與回饋連結會改變它對新訊號和歷史狀態的反應，適合處理動態序列。',
      'zh-CN': '液态神经网络以连续时间状态方程更新神经元，时间常数与反馈连接会改变它对新信号和历史状态的反应，适合处理动态序列。',
      en: 'Liquid neural networks update neurons with continuous-time state equations. Time constants and recurrent links control how they respond to new signals and history.',
      ja: '液体ニューラルネットワークは連続時間の状態方程式でニューロンを更新し、時定数と再帰結合で履歴への応答を制御します。',
      ko: '액체 신경망은 연속 시간 상태 방정식으로 뉴런을 갱신하며 시간 상수와 순환 연결로 신호와 과거 상태에 반응합니다.'
    },
    tags: ['liquid', 'lnn', '液態', '液态', '時間', 'continuous', '액체']
  },
  {
    id: 'reinforcement-learning',
    title: {
      'zh-TW': '強化學習與人類回饋', 'zh-CN': '强化学习与人类反馈', en: 'Reinforcement learning and human feedback',
      ja: '強化学習と人間のフィードバック', ko: '강화학습과 인간 피드백'
    },
    content: {
      'zh-TW': '獎勵模型會把正確性、有用性、安全性與清晰度轉為分數，策略再依偏好訊號調整輸出分布。這是流程示意，不代表模型逐字即時訓練。',
      'zh-CN': '奖励模型会把正确性、有用性、安全性与清晰度转为分数，策略再依偏好信号调整输出分布。',
      en: 'A reward model converts accuracy, helpfulness, safety, and clarity into a score. The policy then shifts its output distribution toward preferred behavior.',
      ja: '報酬モデルは正確性、有用性、安全性、明瞭さをスコア化し、方策はその選好信号に合わせて出力分布を調整します。',
      ko: '보상 모델은 정확성, 유용성, 안전성, 명확성을 점수로 바꾸고 정책은 선호 신호에 맞춰 출력 분포를 조정합니다.'
    },
    tags: ['rl', 'rlhf', 'reward', '獎勵', '奖励', '強化學習', '보상']
  },
  {
    id: 'retrieval-generation',
    title: {
      'zh-TW': '檢索增強生成', 'zh-CN': '检索增强生成', en: 'Retrieval-augmented generation',
      ja: '検索拡張生成', ko: '검색 증강 생성'
    },
    content: {
      'zh-TW': 'RAG 先從可信來源找出相關片段，再把證據和問題一起送入生成流程。它能讓答案更新且可追溯，但仍需要檢查來源品質。',
      'zh-CN': 'RAG 先从可信来源找出相关片段，再把证据和问题一起送入生成流程。',
      en: 'RAG retrieves relevant evidence before generation. It improves freshness and traceability, while source quality still needs review.',
      ja: 'RAG は生成前に関連する根拠を検索し、情報の鮮度と追跡可能性を高めます。',
      ko: 'RAG는 생성 전에 관련 근거를 검색해 최신성과 추적 가능성을 높입니다.'
    },
    tags: ['rag', 'retrieval', '檢索', '检索', '검색']
  }
];

const hashString = (value: string) => {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const tokenizePrompt = (input: string): VisualToken[] => {
  const units = input.trim().match(/[A-Za-z0-9]+(?:['_-][A-Za-z0-9]+)*|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[^\s]/gu) ?? [];
  return units.slice(0, 32).map((text, index) => {
    const id = hashString(`${index}:${text}`);
    return { text, index, id, activation: (id % 1000) / 999 };
  });
};

export const createAttentionMatrix = (tokens: VisualToken[], temperature = 0.8): number[][] => {
  const safeTemperature = Math.max(0.08, temperature);
  return tokens.map((query, rowIndex) => {
    const raw = tokens.map((key, columnIndex) => {
      const semantic = query.text.toLocaleLowerCase() === key.text.toLocaleLowerCase() ? 1.4 : 0.45;
      const proximity = 1 / (1 + Math.abs(rowIndex - columnIndex));
      const activationAffinity = 1 - Math.abs(query.activation - key.activation);
      return Math.exp((semantic + proximity + activationAffinity) / safeTemperature);
    });
    const total = raw.reduce((sum, value) => sum + value, 0) || 1;
    return raw.map((value) => value / total);
  });
};

export const stepLiquidNetwork = (
  state: number[],
  input: number[],
  params: LiquidParameters,
  dt: number
): number[] => {
  const tau = Math.max(0.05, params.timeConstant);
  return state.map((value, index) => {
    const recurrent = state[(index + state.length - 1) % state.length] ?? 0;
    const drive = input[index % Math.max(1, input.length)] ?? 0;
    const derivative = (-value + Math.tanh(drive + recurrent * params.recurrence) - params.damping * value) / tau;
    return Math.max(-1, Math.min(1, value + derivative * Math.max(0, dt)));
  });
};

export const calculateReward = (signals: RewardSignals, weights: RewardSignals): RewardResult => {
  const keys = Object.keys(signals) as Array<keyof RewardSignals>;
  const weightTotal = keys.reduce((sum, key) => sum + Math.max(0, weights[key]), 0) || 1;
  const breakdown = keys.map((key) => {
    const weight = Math.max(0, weights[key]) / weightTotal;
    const signal = Math.max(0, Math.min(1, signals[key]));
    return { key, signal, weight, contribution: signal * weight };
  });
  return { total: breakdown.reduce((sum, item) => sum + item.contribution, 0), breakdown };
};

const searchableTokens = (value: string) => new Set(tokenizePrompt(value.toLocaleLowerCase()).map((token) => token.text));

export const retrieveLocalKnowledge = (query: string, lang: Lang, limit = 3): KnowledgeHit[] => {
  const queryTokens = searchableTokens(query);
  const normalizedQuery = query.toLocaleLowerCase();
  return LOCAL_KNOWLEDGE.map((document) => {
    const haystack = `${document.title[lang]} ${document.content[lang]} ${document.tags.join(' ')}`.toLocaleLowerCase();
    const contentTokens = searchableTokens(haystack);
    let overlap = 0;
    queryTokens.forEach((token) => { if (contentTokens.has(token)) overlap += 1; });
    const tagBoost = document.tags.some((tag) => normalizedQuery.includes(tag.toLocaleLowerCase())) ? 4 : 0;
    const score = (overlap + tagBoost) / Math.max(1, queryTokens.size);
    return {
      id: document.id,
      title: document.title[lang],
      content: document.content[lang],
      source: 'offline' as const,
      provider: 'NeuroFlow Core',
      score
    };
  }).filter((hit) => hit.score > 0).sort((left, right) => right.score - left.score).slice(0, limit);
};

export const buildInferenceTrace = (prompt: string, architecture: NeuroArchitecture): InferenceTrace => {
  const tokens = tokenizePrompt(prompt);
  const multiplier = architecture === 'transformer' ? 1 : architecture === 'hybrid' ? 1.18 : 0.82;
  const layerWidth = Math.max(6, Math.min(18, tokens.length + 4));
  const layerCount = architecture === 'hybrid' ? 7 : architecture === 'transformer' ? 6 : 5;
  const nodes = layerWidth * layerCount;
  const connections = Math.round(layerWidth * layerWidth * (layerCount - 1) * multiplier);
  const loads = [0.22, 0.38, 0.88, architecture === 'transformer' ? 0.18 : 0.74, 0.46, 0.67];
  const stageIds: InferenceStage['id'][] = ['tokenize', 'embed', 'attention', 'liquid', 'reward', 'decode'];
  const stages = stageIds.map((id, index) => ({
    id,
    label: id,
    durationMs: Math.round((42 + index * 21 + tokens.length * 2.4) * multiplier),
    load: loads[index] ?? 0.5
  }));
  return {
    architecture,
    tokens,
    attention: createAttentionMatrix(tokens),
    stages,
    nodes,
    connections,
    estimatedLatencyMs: stages.reduce((sum, stage) => sum + stage.durationMs, 0),
    promptSeed: hashString(`${architecture}:${prompt}`)
  };
};

export const getInferencePlaybackMs = (stageCount: number, speed: number) =>
  Math.max(1200, Math.round(Math.max(1, stageCount) * 340 / Math.max(0.5, speed)));

export type PromptIntent = 'compare' | 'explain' | 'define' | 'reason' | 'general';

// Multi-language cue lists so the same question typed in any supported language is
// routed to the same answer shape. Order of evaluation = specificity priority.
const INTENT_CUES: Record<Exclude<PromptIntent, 'general'>, string[]> = {
  compare: ['差異', '差別', '差别', '不同', '比較', '比较', 'versus', ' vs', 'difference', 'differ', '違い', '比べ', '차이', '비교'],
  define: ['是什麼', '是什么', '什麼是', '什么是', '定義', '定义', 'what is', 'what are', 'definition', 'define', 'とは', '何ですか', '무엇', '정의', '뭐야'],
  reason: ['為什麼', '为什么', '為何', '影響', '影响', '原因', 'why', 'affect', 'impact', 'reason', 'なぜ', '理由', '왜', '영향', '이유'],
  explain: ['如何', '怎麼', '怎么', '解釋', '解释', '說明', '说明', '流程', '步驟', '步骤', 'how', 'explain', 'process', 'step', 'どのように', '仕組み', '어떻게', '설명', '과정']
};

// Read the question's intent + salient tokens so the visualization and answer can react
// differently to different prompts (compare vs explain vs define vs reason).
export const analyzePrompt = (prompt: string, lang: Lang): { intent: PromptIntent; focus: string[] } => {
  const lower = prompt.toLocaleLowerCase();
  let intent: PromptIntent = 'general';
  for (const candidate of ['compare', 'define', 'reason', 'explain'] as Array<Exclude<PromptIntent, 'general'>>) {
    if (INTENT_CUES[candidate].some((cue) => lower.includes(cue.toLocaleLowerCase()))) { intent = candidate; break; }
  }
  const focus = tokenizePrompt(prompt)
    .filter((token) => token.text.length > 1 || /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(token.text))
    .map((token) => token.text);
  return { intent, focus };
};

// Split a generated answer into small reveal units (Latin words stay whole, CJK reveals
// per glyph) so the decoder can stream tokens like an autoregressive model.
export const streamChunks = (text: string): string[] => {
  const pieces = text.match(/[A-Za-z0-9]+|[^A-Za-z0-9]/gu) ?? [];
  const chunks: string[] = [];
  for (const piece of pieces) {
    if (/^\s+$/u.test(piece) && chunks.length > 0) chunks[chunks.length - 1] += piece;
    else chunks.push(piece);
  }
  return chunks;
};

interface AnswerCopy {
  intro: Record<PromptIntent, string>;
  connectors: string[];
  join: string;
  providerSep: string;
  closing: string;
  fallback: string;
}

const ANSWER_COPY: Record<Lang, AnswerCopy> = {
  'zh-TW': {
    intro: {
      compare: '關於「{q}」，可以從幾個面向來比較：',
      explain: '要理解「{q}」，可以拆成幾個重點：',
      define: '先給「{q}」一個簡單的說明：',
      reason: '針對「{q}」，關鍵在於它的運作方式與影響：',
      general: '針對「{q}」，目前彙整到的重點如下：'
    },
    connectors: ['首先，', '其次，', '此外，'],
    join: '',
    providerSep: '、',
    closing: '（以上整理自 {src}，屬本機教學模擬，並非真實模型的即時訓練。）',
    fallback: '我已在本機完成「{q}」的推論流程，但目前沒有足夠證據可形成可靠摘要，可改用連網模式或加入工作區知識再試一次。'
  },
  'zh-CN': {
    intro: {
      compare: '关于“{q}”，可以从几个方面来比较：',
      explain: '要理解“{q}”，可以拆成几个重点：',
      define: '先给“{q}”一个简单的说明：',
      reason: '针对“{q}”，关键在于它的运作方式与影响：',
      general: '针对“{q}”，目前汇整到的重点如下：'
    },
    connectors: ['首先，', '其次，', '此外，'],
    join: '',
    providerSep: '、',
    closing: '（以上整理自 {src}，属本机教学模拟，并非真实模型的实时训练。）',
    fallback: '我已在本机完成“{q}”的推理流程，但目前没有足够证据形成可靠摘要，可改用联网模式或加入工作区知识再试一次。'
  },
  en: {
    intro: {
      compare: 'Here is how “{q}” compares across a few angles: ',
      explain: 'To understand “{q}”, break it into a few key points: ',
      define: 'Here is a simple way to define “{q}”: ',
      reason: 'For “{q}”, the key lies in how it works and what it affects: ',
      general: 'Here are the main points gathered for “{q}”: '
    },
    connectors: ['First, ', 'Next, ', 'Also, '],
    join: ' ',
    providerSep: ', ',
    closing: ' (Synthesized from {src}; this is a local educational simulation, not real-time model training.)',
    fallback: 'The local pipeline finished for “{q}”, but there is not enough evidence for a reliable summary — try online mode or add workspace knowledge.'
  },
  ja: {
    intro: {
      compare: '「{q}」について、いくつかの観点から比較します。',
      explain: '「{q}」を理解するために、要点を分けて説明します。',
      define: 'まず「{q}」を簡単に説明します。',
      reason: '「{q}」については、その仕組みと影響が鍵になります。',
      general: '「{q}」についてまとめた要点は次のとおりです。'
    },
    connectors: ['まず、', '次に、', 'さらに、'],
    join: '',
    providerSep: '、',
    closing: '（以上は {src} を基にしたローカル教育用シミュレーションで、実際のモデル学習ではありません。）',
    fallback: '「{q}」のローカル推論は完了しましたが、信頼できる要約に十分な根拠がありません。オンラインモードを使うか、ワークスペース知識を追加してください。'
  },
  ko: {
    intro: {
      compare: '“{q}”을(를) 몇 가지 측면에서 비교하면 다음과 같습니다. ',
      explain: '“{q}”을(를) 이해하기 위해 핵심을 나눠 설명합니다. ',
      define: '먼저 “{q}”을(를) 간단히 설명합니다. ',
      reason: '“{q}”의 핵심은 작동 방식과 그 영향에 있습니다. ',
      general: '“{q}”에 대해 정리한 핵심은 다음과 같습니다. '
    },
    connectors: ['먼저, ', '다음으로, ', '또한, '],
    join: ' ',
    providerSep: ', ',
    closing: ' (위 내용은 {src} 기반의 로컬 교육용 시뮬레이션이며 실제 모델 학습이 아닙니다.)',
    fallback: '“{q}”에 대한 로컬 추론은 끝났지만 신뢰할 요약을 만들 근거가 부족합니다. 온라인 모드를 쓰거나 작업 공간 지식을 추가해 보세요.'
  }
};

// Build a grounded answer that reflects the detected intent and stitches together the
// retrieved evidence, so different questions visibly produce different responses.
export const composeGroundedAnswer = (prompt: string, lang: Lang, evidence: KnowledgeHit[]): string => {
  const copy = ANSWER_COPY[lang];
  const top = evidence.filter((hit) => hit.content && hit.content.trim()).slice(0, 3);
  if (top.length === 0) return copy.fallback.replace('{q}', prompt);
  const { intent } = analyzePrompt(prompt, lang);
  const body = top
    .map((hit, index) => `${copy.connectors[Math.min(index, copy.connectors.length - 1)]}${hit.content.trim()}`)
    .join(copy.join);
  const providers = Array.from(new Set(top.map((hit) => hit.provider))).join(copy.providerSep);
  return `${copy.intro[intent].replace('{q}', prompt)}${body}${copy.closing.replace('{src}', providers)}`;
};
