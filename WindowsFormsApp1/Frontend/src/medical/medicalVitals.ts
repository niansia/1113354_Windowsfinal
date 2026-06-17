import type { MedicalLevel, VitalEvaluation, VitalFlag, VitalInput } from './medicalTypes.js';

const LEVEL_WEIGHT: Record<MedicalLevel, number> = {
  steady: 0,
  watch: 1,
  review: 2,
  urgent: 3
};

const flag = (
  id: keyof VitalInput,
  label: string,
  value: string,
  level: MedicalLevel,
  explanation: string,
  sourceId = 'medlineplus-vitals'
): VitalFlag => ({ id, label, value, level, explanation, sourceId });

const formatC = (value: number) => `${value.toFixed(1)} °C`;
const formatBpm = (value: number) => `${Math.round(value)} /min`;
const formatPercent = (value: number) => `${Math.round(value)}%`;

const maxLevel = (flags: VitalFlag[]): MedicalLevel =>
  flags.reduce<MedicalLevel>(
    (level, item) => LEVEL_WEIGHT[item.level] > LEVEL_WEIGHT[level] ? item.level : level,
    'steady'
  );

const summaryFor = (level: MedicalLevel) => {
  if (level === 'urgent') return '目前輸入包含需要立即注意的警示值；若伴隨胸痛、呼吸困難、意識改變或單側無力，請儘快尋求專業醫療協助並立即尋求緊急協助。';
  if (level === 'review') return '目前有數值建議與醫療人員討論；請搭配症狀、病史、用藥與量測方式一起判斷。';
  if (level === 'watch') return '目前有數值值得持續觀察；建議在相同條件下重新量測並記錄變化。';
  return '目前輸入的生命徵象落在一般成人常見範圍內，仍需搭配症狀與個人病史判斷。';
};

export const evaluateVitals = (input: VitalInput): VitalEvaluation => {
  const flags: VitalFlag[] = [];

  if (input.temperatureC >= 39 || input.temperatureC < 35) {
    flags.push(flag('temperatureC', '體溫', formatC(input.temperatureC), 'urgent', '體溫明顯偏離常見範圍；若狀況急遽變化或伴隨嚴重症狀，請立即求助。'));
  } else if (input.temperatureC >= 38 || input.temperatureC < 36) {
    flags.push(flag('temperatureC', '體溫', formatC(input.temperatureC), 'watch', '體溫需要追蹤；請記錄量測時間、是否服藥與其他症狀。'));
  } else {
    flags.push(flag('temperatureC', '體溫', formatC(input.temperatureC), 'steady', '體溫位於一般成人常見範圍。'));
  }

  const bloodPressure = `${Math.round(input.systolic)}/${Math.round(input.diastolic)} mmHg`;
  if (input.systolic >= 180 || input.diastolic >= 120 || input.systolic < 90) {
    flags.push(flag('systolic', '血壓', bloodPressure, 'urgent', '血壓達警示區間或過低；若有胸痛、神經症狀、昏厥或呼吸困難，請立即求助。'));
  } else if (input.systolic >= 140 || input.diastolic >= 90) {
    flags.push(flag('systolic', '血壓', bloodPressure, 'review', '血壓偏高，建議記錄多次量測結果並與醫療人員討論。'));
  } else if (input.systolic >= 130 || input.diastolic >= 80) {
    flags.push(flag('systolic', '血壓', bloodPressure, 'watch', '血壓略高，建議留意休息、咖啡因、運動與量測姿勢。'));
  } else {
    flags.push(flag('systolic', '血壓', bloodPressure, 'steady', '血壓位於一般成人常見範圍。'));
  }

  if (input.pulse >= 130 || input.pulse < 40) {
    flags.push(flag('pulse', '脈搏', formatBpm(input.pulse), 'urgent', '脈搏明顯偏快或偏慢；若伴隨胸悶、暈厥或呼吸困難，請立即求助。'));
  } else if (input.pulse > 100 || input.pulse < 60) {
    flags.push(flag('pulse', '脈搏', formatBpm(input.pulse), 'watch', '脈搏值得追蹤；請記錄活動、焦慮、發燒、用藥與量測情境。'));
  } else {
    flags.push(flag('pulse', '脈搏', formatBpm(input.pulse), 'steady', '脈搏位於一般成人靜息常見範圍。'));
  }

  if (input.respiration >= 28 || input.respiration < 10) {
    flags.push(flag('respiration', '呼吸', formatBpm(input.respiration), 'urgent', '呼吸次數達警示區間；若呼吸困難、嘴唇發紫或意識改變，請立即求助。'));
  } else if (input.respiration > 20) {
    flags.push(flag('respiration', '呼吸', formatBpm(input.respiration), 'review', '呼吸次數偏快，建議搭配症狀、血氧與活動狀態一起評估。'));
  } else {
    flags.push(flag('respiration', '呼吸', formatBpm(input.respiration), 'steady', '呼吸次數位於一般成人常見範圍。'));
  }

  if (input.spo2 < 92) {
    flags.push(flag('spo2', '血氧', formatPercent(input.spo2), 'urgent', '血氧偏低可能代表氧合不足；請確認量測方式，若持續偏低或不適請立即求助。'));
  } else if (input.spo2 < 95) {
    flags.push(flag('spo2', '血氧', formatPercent(input.spo2), 'review', '血氧略低，建議重新量測並搭配呼吸症狀與既往病史判斷。'));
  } else {
    flags.push(flag('spo2', '血氧', formatPercent(input.spo2), 'steady', '血氧位於一般成人常見範圍。'));
  }

  const overallLevel = maxLevel(flags);
  return {
    overallLevel,
    summary: summaryFor(overallLevel),
    flags
  };
};
