import type { MedicalCourse, MedicalSource } from './medicalTypes.js';

export const MEDICAL_SOURCES: MedicalSource[] = [
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
    scope: '急症警示與公共衛生教育'
  }
];

export const MEDICAL_COURSES: MedicalCourse[] = [
  {
    id: 'medicine-health',
    title: '醫學與健康',
    track: 'health',
    level: 'foundation',
    summary: '用日常語言理解睡眠、營養、感染預防、生命徵象與就醫準備。',
    modules: ['健康素養', '生命徵象', '感染預防', '就醫溝通'],
    skills: ['整理症狀', '讀懂檢查前說明', '判斷何時需要專業協助'],
    minutes: 36,
    sourceIds: ['medlineplus-vitals', 'who-hand-hygiene']
  },
  {
    id: 'medical-imaging-1',
    title: '醫學影像概論（一）',
    track: 'imaging',
    level: 'foundation',
    summary: '建立 X 光、超音波、CT、MRI 的基本概念與檢查前注意事項。',
    modules: ['X 光', '超音波', 'CT', 'MRI', '安全問答'],
    skills: ['比較影像 modality', '理解輻射與非輻射檢查', '準備檢查前問題'],
    minutes: 42,
    sourceIds: ['radiologyinfo']
  },
  {
    id: 'medical-imaging-2',
    title: '醫學影像概論（二）',
    track: 'imaging',
    level: 'intermediate',
    summary: '延伸到核醫、顯影劑、影像品質、臨床問題與檢查限制。',
    modules: ['核醫', '顯影劑', '影像品質', '禁忌與風險溝通'],
    skills: ['提出安全問題', '整理檢查史', '辨識需要技師或醫師確認的情境'],
    minutes: 48,
    sourceIds: ['radiologyinfo']
  },
  {
    id: 'biomedical-engineering-2',
    title: '醫學工程概論（二）',
    track: 'engineering',
    level: 'intermediate',
    summary: '從感測器、訊號、醫材安全與人因設計理解醫療科技。',
    modules: ['生理訊號', '感測器', '醫材安全', '人因工程'],
    skills: ['讀取感測資料', '理解假警報', '設計更友善的醫療介面'],
    minutes: 45,
    sourceIds: ['medlineplus-vitals']
  },
  {
    id: 'medicine-intro',
    title: '醫學概論',
    track: 'medicine',
    level: 'foundation',
    summary: '從病史、身體檢查、檢驗、影像與共同決策理解醫療流程。',
    modules: ['病史', '身體檢查', '檢驗與影像', '醫病溝通'],
    skills: ['準備問題清單', '理解檢查目的', '記錄追蹤事項'],
    minutes: 40,
    sourceIds: ['medlineplus-vitals', 'radiologyinfo']
  }
];

const normalize = (value: string) =>
  value.normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/\s+/g, '');

export const filterMedicalCourses = (query: string, track: MedicalCourse['track'] | 'all' = 'all') => {
  const term = normalize(query);
  return MEDICAL_COURSES.filter((course) => {
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

export const getMedicalSource = (id: string) =>
  MEDICAL_SOURCES.find((source) => source.id === id);

