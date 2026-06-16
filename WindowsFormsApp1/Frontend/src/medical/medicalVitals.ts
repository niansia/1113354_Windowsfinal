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
  if (level === 'urgent') return '有一項以上數值落在急迫範圍，請儘快尋求專業醫療協助；若有胸痛、呼吸困難、意識改變或中風徵象，請立即急救。';
  if (level === 'review') return '有數值需要由醫療人員或合格照護者評估，請結合症狀、病史與測量情境判讀。';
  if (level === 'watch') return '有輕度偏離，建議休息後重新測量並持續觀察趨勢。';
  return '目前輸入的生命徵象落在一般成人常見範圍內，仍需搭配症狀與個人病史判斷。';
};

export const evaluateVitals = (input: VitalInput): VitalEvaluation => {
  const flags: VitalFlag[] = [];

  if (input.temperatureC >= 39 || input.temperatureC < 35) {
    flags.push(flag('temperatureC', '體溫', formatC(input.temperatureC), 'urgent', '體溫明顯偏離一般範圍，若合併不適、意識改變或免疫低下，應儘快尋求醫療協助。'));
  } else if (input.temperatureC >= 38 || input.temperatureC < 36) {
    flags.push(flag('temperatureC', '體溫', formatC(input.temperatureC), 'watch', '體溫略偏離常見範圍，建議重新測量並觀察是否伴隨其他症狀。'));
  } else {
    flags.push(flag('temperatureC', '體溫', formatC(input.temperatureC), 'steady', '體溫位於一般成人常見範圍。'));
  }

  if (input.systolic >= 180 || input.diastolic >= 120 || input.systolic < 90) {
    flags.push(flag('systolic', '血壓', `${Math.round(input.systolic)}/${Math.round(input.diastolic)} mmHg`, 'urgent', '血壓落在需要快速確認的範圍，若合併胸痛、神經症狀、呼吸困難或劇烈頭痛，請立即求助。'));
  } else if (input.systolic >= 140 || input.diastolic >= 90) {
    flags.push(flag('systolic', '血壓', `${Math.round(input.systolic)}/${Math.round(input.diastolic)} mmHg`, 'review', '血壓偏高，建議以正確姿勢重測並與醫療人員討論長期趨勢。'));
  } else if (input.systolic >= 130 || input.diastolic >= 80) {
    flags.push(flag('systolic', '血壓', `${Math.round(input.systolic)}/${Math.round(input.diastolic)} mmHg`, 'watch', '血壓略高於理想範圍，適合追蹤生活型態與連續測量紀錄。'));
  } else {
    flags.push(flag('systolic', '血壓', `${Math.round(input.systolic)}/${Math.round(input.diastolic)} mmHg`, 'steady', '血壓位於一般成人常見範圍。'));
  }

  if (input.pulse >= 130 || input.pulse < 40) {
    flags.push(flag('pulse', '脈搏', formatBpm(input.pulse), 'urgent', '脈搏明顯過快或過慢，若伴隨胸悶、暈厥、呼吸不適或虛弱，應儘快求助。'));
  } else if (input.pulse > 100 || input.pulse < 60) {
    flags.push(flag('pulse', '脈搏', formatBpm(input.pulse), 'watch', '脈搏略偏離靜息常見範圍，運動、壓力、發燒與藥物都可能影響數值。'));
  } else {
    flags.push(flag('pulse', '脈搏', formatBpm(input.pulse), 'steady', '脈搏位於一般成人靜息常見範圍。'));
  }

  if (input.respiration >= 28 || input.respiration < 10) {
    flags.push(flag('respiration', '呼吸', formatBpm(input.respiration), 'urgent', '呼吸次數明顯偏離常見範圍，若有喘、胸痛、嘴唇發紫或意識改變，請立即求助。'));
  } else if (input.respiration > 20) {
    flags.push(flag('respiration', '呼吸', formatBpm(input.respiration), 'review', '呼吸次數偏快，請結合活動量、發燒、疼痛與呼吸困難感受判讀。'));
  } else {
    flags.push(flag('respiration', '呼吸', formatBpm(input.respiration), 'steady', '呼吸次數位於一般成人常見範圍。'));
  }

  if (input.spo2 < 92) {
    flags.push(flag('spo2', '血氧', formatPercent(input.spo2), 'urgent', '血氧偏低，若數值可靠或伴隨呼吸不適，應儘快尋求專業醫療協助。'));
  } else if (input.spo2 < 95) {
    flags.push(flag('spo2', '血氧', formatPercent(input.spo2), 'review', '血氧略低，請確認手指溫度、指甲油、感測器位置並視情況諮詢醫療人員。'));
  } else {
    flags.push(flag('spo2', '血氧', formatPercent(input.spo2), 'steady', '血氧位於一般常見範圍。'));
  }

  const overallLevel = maxLevel(flags);
  return {
    overallLevel,
    summary: summaryFor(overallLevel),
    flags
  };
};

