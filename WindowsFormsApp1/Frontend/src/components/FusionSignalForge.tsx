import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Binary,
  CheckCircle2,
  CircuitBoard,
  ClipboardCheck,
  Cpu,
  Gauge,
  RadioTower,
  ShieldCheck,
  Timer,
  Waves,
  X
} from 'lucide-react';
import {
  buildSignalFrame,
  estimateChannel,
  runProcessorTrace,
  type ChannelMedium,
  type ReliabilityLevel
} from '../signal/signalForge.js';
import { formatFusionDate, formatFusionDateTime, formatFusionTime, localeForLanguage } from '../i18n/localeFormatting.js';
import { useI18n } from '../i18n/I18nContext';
import { useSettings } from '../state/SettingsContext';

interface FusionSignalForgeProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

const MEDIUM_OPTIONS: ChannelMedium[] = ['fiber', 'copper', 'wireless', 'acoustic'];

const RELIABILITY_LABELS: Record<ReliabilityLevel, string> = {
  steady: '穩定',
  watch: '觀察',
  review: '需要調整'
};

const EXPLAINERS = [
  '資料在這裡先被切成位元與訊框，讓錯誤檢查有明確邊界。',
  '處理器追蹤顯示長度、校驗碼與同位元如何進入暫存器。',
  '物理通道把距離、波速、頻率與雜訊轉成延遲與可靠度。'
];

export const FusionSignalForge: React.FC<FusionSignalForgeProps> = ({ open, onClose, accent }) => {
  const { t, lang } = useI18n();
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const [payload, setPayload] = useState('Fusion OS telemetry');
  const [medium, setMedium] = useState<ChannelMedium>('fiber');
  const [distanceMeters, setDistanceMeters] = useState(1200);
  const [dataRateMbps, setDataRateMbps] = useState(100);
  const [carrierFrequencyMhz, setCarrierFrequencyMhz] = useState(2400);
  const [noiseDb, setNoiseDb] = useState(18);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  const frame = useMemo(() => buildSignalFrame(payload), [payload]);
  const channel = useMemo(
    () => estimateChannel({ medium, distanceMeters, dataRateMbps, carrierFrequencyMhz, noiseDb }),
    [medium, distanceMeters, dataRateMbps, carrierFrequencyMhz, noiseDb]
  );
  const trace = useMemo(() => runProcessorTrace(frame), [frame]);
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(localeForLanguage(lang), { maximumFractionDigits: 2 }),
    [lang]
  );

  const metric = (value: number, unit: string) => `${numberFormat.format(value)} ${unit}`;
  const traceResult = (result: string) => {
    const framedBytes = /^(\d+) 訊框位元組$/.exec(result);
    if (framedBytes) return `${numberFormat.format(Number(framedBytes[1]))} ${t('訊框位元組')}`;
    const bytes = /^(\d+) 位元組$/.exec(result);
    if (bytes) return `${numberFormat.format(Number(bytes[1]))} ${t('位元組')}`;
    const bits = /^(\d+) 位元$/.exec(result);
    if (bits) return `${numberFormat.format(Number(bits[1]))} ${t('位元')}`;
    return t(result);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="signal-forge-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ ['--signal-accent' as string]: accent } as React.CSSProperties}
        >
          <motion.section
            className="signal-forge-shell"
            role="dialog"
            aria-modal="true"
            aria-label={t('SignalForge')}
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="signal-grid-glow" aria-hidden="true" />
            <header className="signal-topbar">
              <div className="signal-brand">
                <span className="signal-brand-mark"><RadioTower size={23} strokeWidth={1.8} /></span>
                <div>
                  <strong>{t('SignalForge')}</strong>
                  <small>{t('通訊與硬體實驗場')}</small>
                </div>
              </div>
              <div className="signal-time">
                <span>{t('系統時間')}</span>
                <strong>{formatFusionTime(now, lang, settings.timezone, settings.clock24)}</strong>
                <small>{formatFusionDate(now, lang, settings.timezone)}</small>
              </div>
              <button type="button" className="signal-close" onClick={onClose} aria-label={t('關閉')}>
                <X size={20} strokeWidth={1.8} />
              </button>
            </header>

            <main className="signal-layout">
              <aside className="signal-control-panel">
                <div className="signal-section-title">
                  <CircuitBoard size={18} strokeWidth={1.8} />
                  <div>
                    <span>{t('訊號工作台')}</span>
                    <strong>{t('輸入訊息、選擇通道，立即看見封包、延遲與暫存器變化。')}</strong>
                  </div>
                </div>

                <label className="signal-payload-box">
                  <span>{t('訊息內容')}</span>
                  <textarea value={payload} onChange={(event) => setPayload(event.target.value)} />
                </label>

                <div className="signal-mediums" aria-label={t('通道介質')}>
                  {MEDIUM_OPTIONS.map((option) => {
                    const estimate = estimateChannel({ medium: option, distanceMeters, dataRateMbps, carrierFrequencyMhz, noiseDb });
                    return (
                      <button
                        key={option}
                        type="button"
                        className={medium === option ? 'active' : ''}
                        onClick={() => setMedium(option)}
                      >
                        <span>{t(estimate.mediumLabel)}</span>
                      </button>
                    );
                  })}
                </div>

                <label className="signal-range">
                  <span>{t('距離')} <b>{distanceMeters} {t('公尺')}</b></span>
                  <input type="range" min={10} max={5000} step={10} value={distanceMeters} onChange={(event) => setDistanceMeters(Number(event.target.value))} />
                </label>
                <label className="signal-range">
                  <span>{t('資料率')} <b>{dataRateMbps} {t('Mbps')}</b></span>
                  <input type="range" min={1} max={1000} step={1} value={dataRateMbps} onChange={(event) => setDataRateMbps(Number(event.target.value))} />
                </label>
                <label className="signal-range">
                  <span>{t('載波頻率')} <b>{carrierFrequencyMhz} {t('MHz')}</b></span>
                  <input type="range" min={1} max={6000} step={1} value={carrierFrequencyMhz} onChange={(event) => setCarrierFrequencyMhz(Number(event.target.value))} />
                </label>
                <label className="signal-range">
                  <span>{t('雜訊')} <b>{noiseDb} {t('dB')}</b></span>
                  <input type="range" min={0} max={40} step={1} value={noiseDb} onChange={(event) => setNoiseDb(Number(event.target.value))} />
                </label>
              </aside>

              <section className="signal-main-panel">
                <div className="signal-hero-card">
                  <div>
                    <span>{t('鏈路摘要')}</span>
                    <h2>{t(channel.mediumLabel)}</h2>
                    <p>{t('把訊號、位元、處理器與物理通道整合成可操作的系統實驗。')}</p>
                  </div>
                  <div className="signal-hero-metrics">
                    <span><Binary size={16} /> {frame.bitCount} {t('位元')}</span>
                    <span><Timer size={16} /> {metric(channel.propagationDelayUs, 'us')}</span>
                    <span className={`signal-level level-${channel.reliabilityLevel}`}>
                      <ShieldCheck size={16} /> {t(RELIABILITY_LABELS[channel.reliabilityLevel])}
                    </span>
                  </div>
                </div>

                <section className="signal-card">
                  <div className="signal-card-head">
                    <ClipboardCheck size={18} />
                    <strong>{t('封包建構')}</strong>
                  </div>
                  <div className="signal-frame-grid">
                    <article>
                      <span>{t('位元組')}</span>
                      <strong>{frame.byteCount}</strong>
                    </article>
                    <article>
                      <span>{t('偶同位檢查')}</span>
                      <strong>{frame.parityBit}</strong>
                    </article>
                    <article>
                      <span>{t('校驗碼')}</span>
                      <strong>0x{frame.hexChecksum}</strong>
                    </article>
                    <article>
                      <span>{t('訊框 Hex')}</span>
                      <strong>{frame.frameHex}</strong>
                    </article>
                  </div>
                  <div className="signal-binary-preview">
                    <span>{t('二進位預覽')}</span>
                    <code>{frame.binaryPreview}</code>
                  </div>
                </section>

                <section className="signal-card">
                  <div className="signal-card-head">
                    <Waves size={18} />
                    <strong>{t('通道物理')}</strong>
                  </div>
                  <div className="signal-physics-grid">
                    <article><Activity size={16} /><span>{t('傳播延遲')}</span><strong>{metric(channel.propagationDelayUs, 'us')}</strong></article>
                    <article><Timer size={16} /><span>{t('傳輸延遲')}</span><strong>{metric(channel.transmissionDelayUs, 'us')}</strong></article>
                    <article><Waves size={16} /><span>{t('波長')}</span><strong>{metric(channel.wavelengthMeters, 'm')}</strong></article>
                    <article><Gauge size={16} /><span>{t('衰減')}</span><strong>{metric(channel.attenuationDb, 'dB')}</strong></article>
                    <article><ShieldCheck size={16} /><span>{t('餘裕')}</span><strong>{metric(channel.signalMarginDb, 'dB')}</strong></article>
                  </div>
                </section>

                <section className="signal-card">
                  <div className="signal-card-head">
                    <Cpu size={18} />
                    <strong>{t('處理器追蹤')}</strong>
                  </div>
                  <div className="signal-register-grid">
                    {trace.registers.map((register) => (
                      <article key={register.name}>
                        <span>{register.name}</span>
                        <strong>{register.value}</strong>
                        <small>{t(register.note)}</small>
                      </article>
                    ))}
                  </div>
                  <div className="signal-instruction-list">
                    {trace.steps.map((step) => (
                      <article key={step.instruction}>
                        <code>{step.instruction}</code>
                        <span>{step.register}</span>
                        <strong>{traceResult(step.result)}</strong>
                      </article>
                    ))}
                  </div>
                </section>
              </section>

              <aside className="signal-right-panel">
                <section className="signal-side-card">
                  <div className="signal-card-head">
                    <CheckCircle2 size={18} />
                    <strong>{t('整合模型')}</strong>
                  </div>
                  <ul>
                    {EXPLAINERS.map((item) => <li key={item}>{t(item)}</li>)}
                  </ul>
                </section>
                <section className="signal-side-card signal-next">
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
