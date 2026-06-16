import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Gauge,
  HeartPulse,
  ScanLine,
  Search,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  Timer,
  Waves,
  X
} from 'lucide-react';
import { MEDICAL_COURSES, MEDICAL_SOURCES, filterMedicalCourses, getMedicalSource } from '../medical/medicalCatalog.js';
import { IMAGING_MODALITIES, getImagingPrep } from '../medical/medicalImaging.js';
import { evaluateVitals } from '../medical/medicalVitals.js';
import type { ImagingModalityId, ImagingProfile, MedicalLevel, MedicalTrack, VitalInput } from '../medical/medicalTypes.js';
import { formatFusionDate, formatFusionDateTime, formatFusionTime } from '../i18n/localeFormatting.js';
import { useI18n } from '../i18n/I18nContext';
import { useSettings } from '../state/SettingsContext';

interface FusionMedicalHubProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

type TrackFilter = MedicalTrack | 'all';

const TRACKS: Array<{ id: TrackFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'medicine', label: '醫學' },
  { id: 'health', label: '健康' },
  { id: 'imaging', label: '影像' },
  { id: 'engineering', label: '醫工' }
];

const LEVEL_LABELS: Record<MedicalLevel, string> = {
  steady: '穩定',
  watch: '留意',
  review: '建議檢視',
  urgent: '緊急'
};

const COURSE_LEVEL_LABELS = {
  foundation: '基礎',
  intermediate: '進階'
};

const VITAL_FIELDS: Array<{ key: keyof VitalInput; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { key: 'temperatureC', label: '體溫 C', icon: Thermometer },
  { key: 'systolic', label: '收縮壓', icon: Gauge },
  { key: 'diastolic', label: '舒張壓', icon: Gauge },
  { key: 'pulse', label: '脈搏', icon: HeartPulse },
  { key: 'respiration', label: '呼吸', icon: Activity },
  { key: 'spo2', label: '血氧 %', icon: Waves }
];

const PROFILE_TOGGLES: Array<{ key: keyof ImagingProfile; label: string }> = [
  { key: 'pregnant', label: '懷孕或可能懷孕' },
  { key: 'hasMetalImplant', label: '金屬植入物' },
  { key: 'kidneyDisease', label: '腎臟病史' },
  { key: 'contrastAllergy', label: '顯影劑過敏' }
];

const VISIT_CHECKLIST = [
  '記錄症狀開始時間、誘因、持續時間與目前用藥。',
  '帶上檢查報告、影像光碟、藥袋與過敏紀錄。',
  '影像檢查前主動告知懷孕可能、金屬植入、腎臟病史與顯影劑過敏。',
  '胸痛、呼吸困難、單側無力、意識改變或血氧偏低時請立即尋求緊急協助。'
];

const DEFAULT_VITALS: VitalInput = {
  temperatureC: 36.8,
  systolic: 118,
  diastolic: 76,
  pulse: 72,
  respiration: 16,
  spo2: 98
};

const DEFAULT_PROFILE: ImagingProfile = {
  pregnant: false,
  hasMetalImplant: false,
  kidneyDisease: false,
  contrastAllergy: false
};

const levelClass = (level: MedicalLevel) => `level-${level}`;

export const FusionMedicalHub: React.FC<FusionMedicalHubProps> = ({ open, onClose, accent }) => {
  const { t, lang } = useI18n();
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState<TrackFilter>('all');
  const [selectedCourseId, setSelectedCourseId] = useState(MEDICAL_COURSES[0]?.id ?? '');
  const [vitals, setVitals] = useState<VitalInput>(DEFAULT_VITALS);
  const [modalityId, setModalityId] = useState<ImagingModalityId>('ct');
  const [profile, setProfile] = useState<ImagingProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  const filteredCourses = useMemo(() => filterMedicalCourses(query, track), [query, track]);
  const selectedCourse = useMemo(
    () => MEDICAL_COURSES.find((course) => course.id === selectedCourseId) ?? filteredCourses[0] ?? MEDICAL_COURSES[0],
    [filteredCourses, selectedCourseId]
  );
  const vitalEvaluation = useMemo(() => evaluateVitals(vitals), [vitals]);
  const imagingPrep = useMemo(() => getImagingPrep(modalityId, profile), [modalityId, profile]);
  const courseSources = useMemo(
    () => selectedCourse.sourceIds.map(getMedicalSource).filter((source): source is NonNullable<typeof source> => Boolean(source)),
    [selectedCourse]
  );

  useEffect(() => {
    if (filteredCourses.length && !filteredCourses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId(filteredCourses[0].id);
    }
  }, [filteredCourses, selectedCourseId]);

  const updateVital = (key: keyof VitalInput, value: number) => {
    setVitals((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
  };

  const toggleProfile = (key: keyof ImagingProfile) => {
    setProfile((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="medical-hub-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ ['--medical-accent' as string]: accent } as React.CSSProperties}
        >
          <motion.section
            className="medical-hub-shell"
            role="dialog"
            aria-modal="true"
            aria-label={t('MediSphere')}
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="medical-atmosphere" aria-hidden="true">
              <span className="medical-orbit orbit-a" />
              <span className="medical-orbit orbit-b" />
              <span className="medical-pulse-dot dot-a" />
              <span className="medical-pulse-dot dot-b" />
            </div>

            <header className="medical-hub-topbar">
              <div className="medical-brand">
                <span className="medical-brand-mark"><Stethoscope size={23} strokeWidth={1.8} /></span>
                <div>
                  <strong>{t('MediSphere')}</strong>
                  <small>{t('醫療學習與健康導航')}</small>
                </div>
              </div>
              <div className="medical-time">
                <span>{t('系統時間')}</span>
                <strong>{formatFusionTime(now, lang, settings.timezone, settings.clock24)}</strong>
                <small>{formatFusionDate(now, lang, settings.timezone)}</small>
              </div>
              <button type="button" className="medical-close" onClick={onClose} aria-label={t('關閉')}>
                <X size={20} strokeWidth={1.8} />
              </button>
            </header>

            <main className="medical-hub-grid">
              <aside className="medical-course-panel">
                <div className="medical-section-title">
                  <BookOpenText size={18} strokeWidth={1.8} />
                  <div>
                    <span>{t('課程路線')}</span>
                    <strong>{t('五個醫療學習主題')}</strong>
                  </div>
                </div>
                <label className="medical-search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('搜尋課程、影像或健康主題')}
                  />
                </label>
                <div className="medical-track-tabs" role="tablist" aria-label={t('健康焦點')}>
                  {TRACKS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={track === item.id ? 'active' : ''}
                      onClick={() => setTrack(item.id)}
                    >
                      {t(item.label)}
                    </button>
                  ))}
                </div>
                <div className="medical-course-list">
                  {filteredCourses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      className={selectedCourse.id === course.id ? 'active' : ''}
                      onClick={() => setSelectedCourseId(course.id)}
                    >
                      <span>{t(COURSE_LEVEL_LABELS[course.level])}</span>
                      <strong>{t(course.title)}</strong>
                      <small>{t(course.summary)}</small>
                      <em>{course.minutes} {t('分鐘')}</em>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="medical-main-panel">
                <div className="medical-hero-card">
                  <div>
                    <span>{t('教育模式')}</span>
                    <h2>{t(selectedCourse.title)}</h2>
                    <p>{t(selectedCourse.summary)}</p>
                  </div>
                  <div className="medical-hero-metrics">
                    <span><BookOpenText size={16} /> {selectedCourse.modules.length} {t('單元')}</span>
                    <span><Timer size={16} /> {selectedCourse.minutes} {t('分鐘')}</span>
                    <span><ShieldCheck size={16} /> {t('非診斷')}</span>
                  </div>
                </div>

                <div className="medical-learning-grid">
                  <section className="medical-glass-card">
                    <div className="medical-card-head">
                      <ClipboardCheck size={18} />
                      <strong>{t('學習重點')}</strong>
                    </div>
                    <div className="medical-chip-list">
                      {selectedCourse.modules.map((module) => <span key={module}>{t(module)}</span>)}
                    </div>
                  </section>
                  <section className="medical-glass-card">
                    <div className="medical-card-head">
                      <CheckCircle2 size={18} />
                      <strong>{t('實作能力')}</strong>
                    </div>
                    <ul className="medical-compact-list">
                      {selectedCourse.skills.map((skill) => <li key={skill}>{t(skill)}</li>)}
                    </ul>
                  </section>
                </div>

                <section className="medical-vitals-panel">
                  <div className="medical-section-row">
                    <div className="medical-section-title">
                      <HeartPulse size={19} />
                      <div>
                        <span>{t('生命徵象整理')}</span>
                        <strong className={levelClass(vitalEvaluation.overallLevel)}>
                          {t(LEVEL_LABELS[vitalEvaluation.overallLevel])}
                        </strong>
                      </div>
                    </div>
                    <button type="button" onClick={() => setVitals(DEFAULT_VITALS)}>{t('重新評估')}</button>
                  </div>
                  <div className="medical-vitals-grid">
                    {VITAL_FIELDS.map((field) => {
                      const Icon = field.icon;
                      return (
                        <label key={field.key} className="medical-vital-input">
                          <span><Icon size={16} /> {t(field.label)}</span>
                          <input
                            type="number"
                            value={vitals[field.key]}
                            min={field.key === 'spo2' ? 40 : undefined}
                            max={field.key === 'spo2' ? 100 : undefined}
                            step={field.key === 'temperatureC' ? 0.1 : 1}
                            onChange={(event) => updateVital(field.key, Number(event.target.value))}
                          />
                        </label>
                      );
                    })}
                  </div>
                  <p className={`medical-vital-summary ${levelClass(vitalEvaluation.overallLevel)}`}>
                    {t(vitalEvaluation.summary)}
                  </p>
                  <div className="medical-flag-grid">
                    {vitalEvaluation.flags.map((flag) => (
                      <article key={flag.id} className={`medical-flag ${levelClass(flag.level)}`}>
                        <span>{t(LEVEL_LABELS[flag.level])}</span>
                        <strong>{t(flag.label)} · {flag.value}</strong>
                        <p>{t(flag.explanation)}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="medical-imaging-panel">
                  <div className="medical-section-row">
                    <div className="medical-section-title">
                      <ScanLine size={19} />
                      <div>
                        <span>{t('醫學影像導覽')}</span>
                        <strong>{t(imagingPrep.modality.title)}</strong>
                      </div>
                    </div>
                    <span className={`medical-level-pill ${levelClass(imagingPrep.level)}`}>
                      {t(LEVEL_LABELS[imagingPrep.level])}
                    </span>
                  </div>
                  <div className="medical-modality-tabs">
                    {IMAGING_MODALITIES.map((modality) => (
                      <button
                        key={modality.id}
                        type="button"
                        className={modalityId === modality.id ? 'active' : ''}
                        onClick={() => setModalityId(modality.id)}
                      >
                        {t(modality.title)}
                      </button>
                    ))}
                  </div>
                  <div className="medical-profile-grid">
                    {PROFILE_TOGGLES.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={profile[item.key] ? 'active' : ''}
                        onClick={() => toggleProfile(item.key)}
                      >
                        <span />
                        {t(item.label)}
                      </button>
                    ))}
                  </div>
                  <div className="medical-imaging-columns">
                    <div>
                      <strong>{t('適合觀察')}</strong>
                      <ul>{imagingPrep.modality.bestFor.map((item) => <li key={item}>{t(item)}</li>)}</ul>
                    </div>
                    <div>
                      <strong>{t('準備問題')}</strong>
                      <ul>{imagingPrep.questions.slice(0, 5).map((item) => <li key={item}>{t(item)}</li>)}</ul>
                    </div>
                  </div>
                </section>
              </section>

              <aside className="medical-right-panel">
                <section className="medical-side-card medical-disclaimer">
                  <AlertTriangle size={18} />
                  <strong>{t('這不是診斷工具')}</strong>
                  <p>{t('本工具提供健康教育與就醫準備，不取代醫師、護理師或合格醫療人員。')}</p>
                </section>

                <section className="medical-side-card">
                  <div className="medical-card-head">
                    <CalendarClock size={18} />
                    <strong>{t('就醫準備清單')}</strong>
                  </div>
                  <ul className="medical-checklist">
                    {VISIT_CHECKLIST.map((item) => (
                      <li key={item}><CheckCircle2 size={15} /> {t(item)}</li>
                    ))}
                  </ul>
                </section>

                <section className="medical-side-card">
                  <div className="medical-card-head">
                    <ShieldCheck size={18} />
                    <strong>{t('可信來源')}</strong>
                  </div>
                  <div className="medical-source-list">
                    {[...courseSources, ...MEDICAL_SOURCES.filter((source) => !courseSources.some((item) => item.id === source.id))]
                      .slice(0, 4)
                      .map((source) => (
                        <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                          <span>
                            <strong>{source.label}</strong>
                            <small>{t(source.scope)}</small>
                          </span>
                          <ExternalLink size={14} />
                        </a>
                      ))}
                  </div>
                </section>

                <section className="medical-side-card medical-next-step">
                  <strong>{t('下一步')}</strong>
                  <p>{formatFusionDateTime(now, lang, settings.timezone, settings.clock24)}</p>
                  <span>{t('依系統語言與日期格式同步顯示。')}</span>
                </section>
              </aside>
            </main>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
