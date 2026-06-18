"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeGroundedAnswer = exports.getInferencePlaybackMs = exports.buildInferenceTrace = exports.retrieveLocalKnowledge = exports.calculateReward = exports.stepLiquidNetwork = exports.createAttentionMatrix = exports.tokenizePrompt = exports.LOCAL_KNOWLEDGE = void 0;
exports.LOCAL_KNOWLEDGE = [
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
const hashString = (value) => {
    let hash = 2166136261;
    for (const char of value) {
        hash ^= char.codePointAt(0) ?? 0;
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};
const tokenizePrompt = (input) => {
    const units = input.trim().match(/[A-Za-z0-9]+(?:['_-][A-Za-z0-9]+)*|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[^\s]/gu) ?? [];
    return units.slice(0, 32).map((text, index) => {
        const id = hashString(`${index}:${text}`);
        return { text, index, id, activation: (id % 1000) / 999 };
    });
};
exports.tokenizePrompt = tokenizePrompt;
const createAttentionMatrix = (tokens, temperature = 0.8) => {
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
exports.createAttentionMatrix = createAttentionMatrix;
const stepLiquidNetwork = (state, input, params, dt) => {
    const tau = Math.max(0.05, params.timeConstant);
    return state.map((value, index) => {
        const recurrent = state[(index + state.length - 1) % state.length] ?? 0;
        const drive = input[index % Math.max(1, input.length)] ?? 0;
        const derivative = (-value + Math.tanh(drive + recurrent * params.recurrence) - params.damping * value) / tau;
        return Math.max(-1, Math.min(1, value + derivative * Math.max(0, dt)));
    });
};
exports.stepLiquidNetwork = stepLiquidNetwork;
const calculateReward = (signals, weights) => {
    const keys = Object.keys(signals);
    const weightTotal = keys.reduce((sum, key) => sum + Math.max(0, weights[key]), 0) || 1;
    const breakdown = keys.map((key) => {
        const weight = Math.max(0, weights[key]) / weightTotal;
        const signal = Math.max(0, Math.min(1, signals[key]));
        return { key, signal, weight, contribution: signal * weight };
    });
    return { total: breakdown.reduce((sum, item) => sum + item.contribution, 0), breakdown };
};
exports.calculateReward = calculateReward;
const searchableTokens = (value) => new Set((0, exports.tokenizePrompt)(value.toLocaleLowerCase()).map((token) => token.text));
const retrieveLocalKnowledge = (query, lang, limit = 3) => {
    const queryTokens = searchableTokens(query);
    const normalizedQuery = query.toLocaleLowerCase();
    return exports.LOCAL_KNOWLEDGE.map((document) => {
        const haystack = `${document.title[lang]} ${document.content[lang]} ${document.tags.join(' ')}`.toLocaleLowerCase();
        const contentTokens = searchableTokens(haystack);
        let overlap = 0;
        queryTokens.forEach((token) => { if (contentTokens.has(token))
            overlap += 1; });
        const tagBoost = document.tags.some((tag) => normalizedQuery.includes(tag.toLocaleLowerCase())) ? 4 : 0;
        const score = (overlap + tagBoost) / Math.max(1, queryTokens.size);
        return {
            id: document.id,
            title: document.title[lang],
            content: document.content[lang],
            source: 'offline',
            provider: 'NeuroFlow Core',
            score
        };
    }).filter((hit) => hit.score > 0).sort((left, right) => right.score - left.score).slice(0, limit);
};
exports.retrieveLocalKnowledge = retrieveLocalKnowledge;
const buildInferenceTrace = (prompt, architecture) => {
    const tokens = (0, exports.tokenizePrompt)(prompt);
    const multiplier = architecture === 'transformer' ? 1 : architecture === 'hybrid' ? 1.18 : 0.82;
    const layerWidth = Math.max(6, Math.min(18, tokens.length + 4));
    const layerCount = architecture === 'hybrid' ? 7 : architecture === 'transformer' ? 6 : 5;
    const nodes = layerWidth * layerCount;
    const connections = Math.round(layerWidth * layerWidth * (layerCount - 1) * multiplier);
    const loads = [0.22, 0.38, 0.88, architecture === 'transformer' ? 0.18 : 0.74, 0.46, 0.67];
    const stageIds = ['tokenize', 'embed', 'attention', 'liquid', 'reward', 'decode'];
    const stages = stageIds.map((id, index) => ({
        id,
        label: id,
        durationMs: Math.round((42 + index * 21 + tokens.length * 2.4) * multiplier),
        load: loads[index] ?? 0.5
    }));
    return {
        architecture,
        tokens,
        attention: (0, exports.createAttentionMatrix)(tokens),
        stages,
        nodes,
        connections,
        estimatedLatencyMs: stages.reduce((sum, stage) => sum + stage.durationMs, 0)
    };
};
exports.buildInferenceTrace = buildInferenceTrace;
const getInferencePlaybackMs = (stageCount, speed) => Math.max(1200, Math.round(Math.max(1, stageCount) * 340 / Math.max(0.5, speed)));
exports.getInferencePlaybackMs = getInferencePlaybackMs;
const composeGroundedAnswer = (prompt, lang, evidence) => {
    const lead = evidence[0];
    const templates = {
        'zh-TW': lead ? `根據目前取得的證據，「${prompt}」可先這樣理解：${lead.content}` : `我已在本機完成「${prompt}」的推論流程，但目前沒有足夠證據可形成可靠摘要。`,
        'zh-CN': lead ? `根据目前取得的证据，“${prompt}”可以先这样理解：${lead.content}` : `我已在本机完成“${prompt}”的推理流程，但目前没有足够证据形成可靠摘要。`,
        en: lead ? `Based on the available evidence, a useful starting point for “${prompt}” is: ${lead.content}` : `The local pipeline completed for “${prompt}”, but there is not enough evidence for a reliable summary.`,
        ja: lead ? `取得した根拠から「${prompt}」は次のように理解できます。${lead.content}` : `「${prompt}」のローカル推論は完了しましたが、信頼できる要約に十分な根拠がありません。`,
        ko: lead ? `확보한 근거를 바탕으로 “${prompt}”은 다음과 같이 이해할 수 있습니다. ${lead.content}` : `“${prompt}”에 대한 로컬 추론은 완료됐지만 신뢰할 요약을 만들 근거가 부족합니다.`
    };
    return templates[lang];
};
exports.composeGroundedAnswer = composeGroundedAnswer;
