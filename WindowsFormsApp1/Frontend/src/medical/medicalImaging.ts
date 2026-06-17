import type {
  ImagingModality,
  ImagingModalityId,
  ImagingPrep,
  ImagingProfile,
  MedicalLevel
} from './medicalTypes.js';

export const IMAGING_MODALITIES: ImagingModality[] = [
  {
    id: 'xray',
    title: 'X 光',
    bestFor: ['骨骼與關節', '胸部初步檢查', '牙科與急診快速評估'],
    notes: ['X 光通常時間短、輻射劑量較低，但仍應主動告知懷孕可能。', '檢查前可能需要移除金屬飾品或含金屬衣物。'],
    prepQuestions: ['是否懷孕或可能懷孕？', '檢查部位是否有金屬物、石膏或固定器？']
  },
  {
    id: 'ct',
    title: 'CT',
    bestFor: ['外傷與急症', '胸腹部結構', '血管或腫瘤評估'],
    notes: ['CT 解析度高，可能使用放射線、游離輻射與含碘造影劑。', '若安排造影，請確認腎功能、過敏史與禁食指示。'],
    prepQuestions: ['是否懷孕或可能懷孕？', '是否有腎臟病史或近期腎功能異常？', '是否曾對含碘造影劑過敏？']
  },
  {
    id: 'mri',
    title: 'MRI',
    bestFor: ['腦部與神經', '肌肉骨骼軟組織', '脊椎與關節'],
    notes: ['MRI 使用強磁場，金屬植入物與部分電子裝置需要事前確認。', '檢查時間較長，幽閉恐懼或疼痛姿勢需提前告知。'],
    prepQuestions: ['是否有心律調節器、人工耳蝸、金屬植入物或彈片？', '是否有幽閉恐懼或無法長時間平躺？', '是否需要注射含釓造影劑？']
  },
  {
    id: 'ultrasound',
    title: '超音波',
    bestFor: ['腹部器官', '婦產科', '血流與血管', '肌腱與軟組織'],
    notes: ['超音波不使用游離輻射，常用於即時動態觀察。', '腹部檢查可能需要禁食，泌尿或婦科檢查可能需要憋尿。'],
    prepQuestions: ['檢查前是否需要禁食或喝水憋尿？', '檢查部位是否有敷料、傷口或疼痛限制？']
  },
  {
    id: 'nuclear',
    title: '核醫',
    bestFor: ['器官功能評估', '骨骼掃描', '甲狀腺或心肌灌流'],
    notes: ['核醫檢查使用少量放射性示蹤劑，可能需要等待藥物分布後再掃描。', '檢查後依指示補充水分並注意與孕婦、幼兒接觸建議。'],
    prepQuestions: ['是否懷孕、哺乳或可能懷孕？', '檢查前是否需要停用特定藥物或調整飲食？']
  }
];

const levelWeight: Record<MedicalLevel, number> = {
  steady: 0,
  watch: 1,
  review: 2,
  urgent: 3
};

const higher = (a: MedicalLevel, b: MedicalLevel): MedicalLevel =>
  levelWeight[b] > levelWeight[a] ? b : a;

export const getImagingModality = (id: ImagingModalityId) =>
  IMAGING_MODALITIES.find((modality) => modality.id === id) ?? IMAGING_MODALITIES[0];

export const getImagingPrep = (id: ImagingModalityId, profile: ImagingProfile): ImagingPrep => {
  const modality = getImagingModality(id);
  let level: MedicalLevel = 'steady';
  const questions = [...modality.prepQuestions];
  const notes = [...modality.notes];

  if ((id === 'xray' || id === 'ct' || id === 'nuclear') && profile.pregnant) {
    level = higher(level, 'review');
    questions.push('請主動告知懷孕或可能懷孕，讓醫療團隊評估檢查必要性與防護方式。');
  }
  if (id === 'mri' && profile.hasMetalImplant) {
    level = higher(level, 'review');
    questions.push('請提供植入物型號或手術資料，確認 MRI 相容性後再安排檢查。');
  }
  if ((id === 'ct' || id === 'mri') && profile.kidneyDisease) {
    level = higher(level, 'review');
    questions.push('若需造影，請詢問是否需要近期腎功能檢驗或調整用藥。');
  }
  if (id === 'ct' && profile.contrastAllergy) {
    level = higher(level, 'review');
    questions.push('曾有造影劑過敏請提前告知，醫療團隊可能調整檢查或預防處置。');
  }

  return {
    modality,
    level,
    questions,
    notes
  };
};
