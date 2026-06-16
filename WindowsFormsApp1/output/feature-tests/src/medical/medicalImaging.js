"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImagingPrep = exports.getImagingModality = exports.IMAGING_MODALITIES = void 0;
exports.IMAGING_MODALITIES = [
    {
        id: 'xray',
        title: 'X 光',
        bestFor: ['骨骼', '胸腔初步評估', '牙科與簡易定位'],
        notes: ['速度快、常作為第一線影像工具。', '使用少量放射線，懷孕或可能懷孕時需先告知。'],
        prepQuestions: ['是否懷孕或可能懷孕？', '檢查部位是否有金屬飾品或外物？']
    },
    {
        id: 'ct',
        title: 'CT',
        bestFor: ['急症評估', '頭胸腹影像', '血管與外傷'],
        notes: ['CT 使用放射線，影像速度快且解析度高。', '部分檢查會使用含碘顯影劑，需要確認腎功能與過敏史。'],
        prepQuestions: ['是否懷孕或可能懷孕？', '是否有腎臟疾病或近期腎功能異常？', '是否曾對含碘顯影劑過敏？']
    },
    {
        id: 'mri',
        title: 'MRI',
        bestFor: ['腦神經', '肌肉骨骼軟組織', '脊椎與關節'],
        notes: ['MRI 使用強磁場，不使用游離輻射。', '金屬植入物、心律調節器或體內異物需要檢查前確認安全性。'],
        prepQuestions: ['是否有金屬植入物、心律調節器、人工耳蝸或體內金屬異物？', '是否容易幽閉恐懼？', '是否需要顯影劑且有腎臟病史？']
    },
    {
        id: 'ultrasound',
        title: '超音波',
        bestFor: ['腹部', '婦產科', '血管', '淺層軟組織'],
        notes: ['超音波使用聲波，不使用游離輻射。', '部分腹部檢查可能需要禁食或脹尿。'],
        prepQuestions: ['檢查前是否需要禁食？', '是否需要喝水並保留尿液？']
    },
    {
        id: 'nuclear',
        title: '核醫',
        bestFor: ['功能性代謝影像', '骨掃描', '甲狀腺與心肌灌流'],
        notes: ['核醫會使用少量放射性示蹤劑，重點在功能與代謝資訊。', '懷孕、哺乳或照顧嬰幼兒時需事先告知。'],
        prepQuestions: ['是否懷孕、可能懷孕或正在哺乳？', '檢查後是否需要避免近距離接觸嬰幼兒一段時間？']
    }
];
const levelWeight = {
    steady: 0,
    watch: 1,
    review: 2,
    urgent: 3
};
const higher = (a, b) => levelWeight[b] > levelWeight[a] ? b : a;
const getImagingModality = (id) => exports.IMAGING_MODALITIES.find((modality) => modality.id === id) ?? exports.IMAGING_MODALITIES[0];
exports.getImagingModality = getImagingModality;
const getImagingPrep = (id, profile) => {
    const modality = (0, exports.getImagingModality)(id);
    let level = 'steady';
    const questions = [...modality.prepQuestions];
    const notes = [...modality.notes];
    if ((id === 'xray' || id === 'ct' || id === 'nuclear') && profile.pregnant) {
        level = higher(level, 'review');
        questions.push('已標記懷孕或可能懷孕，檢查前請務必告知醫療團隊。');
    }
    if (id === 'mri' && profile.hasMetalImplant) {
        level = higher(level, 'review');
        questions.push('已標記金屬或植入物，MRI 前需要由影像團隊確認相容性。');
    }
    if ((id === 'ct' || id === 'mri') && profile.kidneyDisease) {
        level = higher(level, 'review');
        questions.push('已標記腎臟病史，若使用顯影劑請先確認腎功能與風險。');
    }
    if (id === 'ct' && profile.contrastAllergy) {
        level = higher(level, 'review');
        questions.push('曾有含碘顯影劑過敏或嚴重過敏史，請提前告知。');
    }
    return {
        modality,
        level,
        questions,
        notes
    };
};
exports.getImagingPrep = getImagingPrep;
