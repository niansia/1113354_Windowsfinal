"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMedicalSource = exports.filterMedicalCourses = exports.MEDICAL_COURSES = exports.MEDICAL_SOURCES = void 0;
exports.MEDICAL_SOURCES = [
    {
        id: 'medlineplus-vitals',
        label: 'MedlinePlus',
        url: 'https://medlineplus.gov/vitalsigns.html',
        scope: '生命徵象與一般健康教育'
    },
    {
        id: 'radiologyinfo',
        label: 'RadiologyInfo',
        url: 'https://www.radiologyinfo.org/',
        scope: '醫學影像檢查與病人準備'
    },
    {
        id: 'who-hand-hygiene',
        label: 'WHO',
        url: 'https://www.who.int/teams/integrated-health-services/infection-prevention-control/hand-hygiene',
        scope: '手部衛生與感染預防'
    },
    {
        id: 'cdc-emergency',
        label: 'CDC',
        url: 'https://www.cdc.gov/',
        scope: '公共衛生與緊急照護資訊'
    }
];
exports.MEDICAL_COURSES = [
    {
        id: 'health-action-overview',
        title: '健康行動總覽',
        track: 'health',
        level: 'foundation',
        summary: '把睡眠、飲食、活動、用藥與生命徵象整理成今天可執行的健康摘要。',
        modules: ['生命徵象整理', '生活型態紀錄', '感染預防', '風險提醒'],
        skills: ['建立每日健康摘要', '辨識需要追蹤的變化', '把症狀轉成可溝通的紀錄'],
        minutes: 12,
        sourceIds: ['medlineplus-vitals', 'who-hand-hygiene']
    },
    {
        id: 'imaging-readiness',
        title: '影像檢查準備',
        track: 'imaging',
        level: 'foundation',
        summary: '依檢查型態整理安全問題、禁食提醒、攜帶資料與檢查前溝通重點。',
        modules: ['檢查類型比對', '安全問答', '造影劑提醒', '檢查前清單'],
        skills: ['確認影像檢查適合情境', '整理造影與金屬植入風險', '準備檢查前要問的問題'],
        minutes: 15,
        sourceIds: ['radiologyinfo']
    },
    {
        id: 'visit-brief',
        title: '門診溝通助手',
        track: 'medicine',
        level: 'foundation',
        summary: '把症狀時間線、目前用藥、過敏史與想問的問題收束成清楚的看診摘要。',
        modules: ['症狀時間線', '用藥與過敏', '問題清單', '回診追蹤'],
        skills: ['用精簡語句描述症狀', '整理檢查報告與影像資料', '判斷何時需要專業協助'],
        minutes: 10,
        sourceIds: ['medlineplus-vitals', 'radiologyinfo']
    },
    {
        id: 'device-safety',
        title: '醫療設備安全',
        track: 'engineering',
        level: 'intermediate',
        summary: '把血壓計、血氧機、穿戴感測與影像設備的量測限制整理成使用前檢查。',
        modules: ['感測器限制', '量測誤差', '資料可信度', '設備安全'],
        skills: ['辨識量測值可能失真的情境', '建立重測與校準習慣', '理解設備資料不能單獨診斷'],
        minutes: 14,
        sourceIds: ['medlineplus-vitals']
    },
    {
        id: 'urgent-signal-check',
        title: '急症警示辨識',
        track: 'medicine',
        level: 'intermediate',
        summary: '把胸痛、呼吸困難、單側無力、意識改變與低血氧等警示整理成求助判斷。',
        modules: ['警示症狀', '生命徵象門檻', '緊急求助', '照護交接'],
        skills: ['辨識不可等待的狀況', '準備給急救或醫療人員的關鍵資訊', '避免把教育工具當成診斷結果'],
        minutes: 8,
        sourceIds: ['cdc-emergency', 'medlineplus-vitals']
    }
];
const normalize = (value) => value.normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/\s+/g, '');
const filterMedicalCourses = (query, track = 'all') => {
    const term = normalize(query);
    return exports.MEDICAL_COURSES.filter((course) => {
        const inTrack = track === 'all' || course.track === track;
        const haystack = normalize([
            course.title,
            course.summary,
            course.track,
            ...course.modules,
            ...course.skills
        ].join(' '));
        return inTrack && (!term || haystack.includes(term));
    });
};
exports.filterMedicalCourses = filterMedicalCourses;
const getMedicalSource = (id) => exports.MEDICAL_SOURCES.find((source) => source.id === id);
exports.getMedicalSource = getMedicalSource;
