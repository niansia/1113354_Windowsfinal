import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brush,
  Check,
  Crown,
  Download,
  Droplet,
  Eye,
  FolderOpen,
  Heart,
  LayoutGrid,
  Palette,
  PenLine,
  PenTool,
  RotateCcw,
  Save,
  Shirt,
  Smile,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Triangle,
  Upload,
  Users,
  X
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { formatFusionDateTime } from '../i18n/localeFormatting';
import { useSettings } from '../state/SettingsContext';
import { createDefaultLook, HAIR_COLORS, STYLE_COLORS } from '../style/styleCatalog';
import { recommendColors } from '../style/styleEngine';
import { FACE_MODELS, getFaceModel } from '../style/styleModels';
import { STYLE_LOOKBOOK } from '../style/styleLookbook';
import {
  loadSavedLooks,
  removeSavedLook,
  saveSavedLooks,
  upsertSavedLook
} from '../style/styleStorage';
import type {
  EyelinerStyle,
  MakeupFinish,
  MakeupStyle,
  OutfitLook,
  StyleColorRole,
  StyleLook,
  Undertone
} from '../style/styleTypes';
import { MakeupPortrait } from './style/MakeupPortrait';
import { GarmentTryOn } from './style/GarmentTryOn';
import {
  BASE_BODIES,
  GARMENTS,
  garmentsByCategory,
  type Garment,
  type GarmentCategory
} from '../style/styleGarments';

interface FusionStyleStudioProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

type StudioTab = 'lookbook' | 'garments' | 'model' | 'makeup' | 'palette' | 'saved';
type StageView = 'face' | 'look' | 'fitting';
type GarmentSelection = Partial<Record<GarmentCategory, string | null>>;

const MODEL_TONE: Record<string, { undertone: Undertone; skin: string }> = {
  fair: { undertone: 'cool', skin: '#EAD2C2' },
  medium: { undertone: 'warm', skin: '#D2A074' },
  deep: { undertone: 'neutral', skin: '#5E3D2B' }
};

const randomItem = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const roleColors = (role: StyleColorRole) => STYLE_COLORS.filter((color) => color.roles.includes(role));
const makeupColor = (look: StyleLook, target: StyleColorRole) =>
  target === 'lip' ? look.makeup.lipstickColor : target === 'eye' ? look.makeup.eyeshadowColor : look.makeup.blushColor;

type MakeupTarget =
  | 'foundation' | 'contour' | 'highlight' | 'blush' | 'eyeshadow'
  | 'eyeliner' | 'lash' | 'aegyo' | 'brow' | 'lip';

interface TargetSpec {
  id: MakeupTarget;
  label: string;
  icon: React.ReactNode;
  intensityKey: keyof MakeupStyle;
  colorKey?: keyof MakeupStyle;
  colorRole?: StyleColorRole;
  browPalette?: boolean;
  finishKey?: keyof MakeupStyle;
  toggleKey?: keyof MakeupStyle;
}

const TARGETS: TargetSpec[] = [
  { id: 'foundation', label: '粉底', icon: <Droplet size={15} />, intensityKey: 'foundationIntensity' },
  { id: 'contour', label: '修容', icon: <Triangle size={15} />, intensityKey: 'contourIntensity' },
  { id: 'highlight', label: '高光', icon: <Sun size={15} />, intensityKey: 'highlightIntensity' },
  { id: 'blush', label: '腮紅', icon: <Heart size={15} />, intensityKey: 'blushIntensity', colorKey: 'blushColor', colorRole: 'blush' },
  { id: 'eyeshadow', label: '眼影', icon: <Eye size={15} />, intensityKey: 'eyeshadowIntensity', colorKey: 'eyeshadowColor', colorRole: 'eye', finishKey: 'eyeshadowFinish' },
  { id: 'eyeliner', label: '眼線', icon: <PenTool size={15} />, intensityKey: 'eyelinerIntensity', toggleKey: 'eyelinerEnabled' },
  { id: 'lash', label: '睫毛', icon: <Brush size={15} />, intensityKey: 'lashIntensity' },
  { id: 'aegyo', label: '臥蠶', icon: <Star size={15} />, intensityKey: 'aegyoIntensity' },
  { id: 'brow', label: '眉毛', icon: <PenLine size={15} />, intensityKey: 'browIntensity', colorKey: 'browColor', browPalette: true },
  { id: 'lip', label: '唇彩', icon: <Sparkles size={15} />, intensityKey: 'lipstickIntensity', colorKey: 'lipstickColor', colorRole: 'lip', finishKey: 'lipstickFinish' }
];

function ColorSwatches({
  colors, value, onChange, translate
}: {
  colors: Array<{ name: string; hex: string }>;
  value: string;
  onChange: (hex: string) => void;
  translate: (source: string) => string;
}) {
  return (
    <div className="style-swatches">
      {colors.map((color) => (
        <button
          key={`${color.name}-${color.hex}`}
          type="button"
          className={value.toLowerCase() === color.hex.toLowerCase() ? 'is-selected' : ''}
          style={{ ['--swatch' as string]: color.hex } as React.CSSProperties}
          onClick={() => onChange(color.hex)}
          title={translate(color.name)}
          aria-label={translate(color.name)}
        >
          <i />
          {value.toLowerCase() === color.hex.toLowerCase() && <Check size={12} />}
        </button>
      ))}
      <label className="style-custom-color" title={translate('色彩')}>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <Palette size={15} />
      </label>
    </div>
  );
}

function FinishSelector({
  value, onChange, translate
}: {
  value: MakeupFinish;
  onChange: (finish: MakeupFinish) => void;
  translate: (source: string) => string;
}) {
  const finishes: Array<{ id: MakeupFinish; label: string }> = [
    { id: 'matte', label: '霧面' },
    { id: 'satin', label: '絲緞' },
    { id: 'glow', label: '光澤' }
  ];
  return (
    <div className="style-segmented">
      {finishes.map((finish) => (
        <button key={finish.id} type="button" className={value === finish.id ? 'is-selected' : ''} onClick={() => onChange(finish.id)}>
          {translate(finish.label)}
        </button>
      ))}
    </div>
  );
}

export const FusionStyleStudio: React.FC<FusionStyleStudioProps> = ({ open, onClose, accent }) => {
  const { t, tf, lang } = useI18n();
  const { settings } = useSettings();
  const [look, setLook] = useState<StyleLook>(() => createDefaultLook());
  const [savedLooks, setSavedLooks] = useState<StyleLook[]>([]);
  const [tab, setTab] = useState<StudioTab>('lookbook');
  const [makeupTarget, setMakeupTarget] = useState<MakeupTarget>('lip');
  const [recommendationTarget, setRecommendationTarget] = useState<StyleColorRole>('lip');
  const [view, setView] = useState<StageView>('face');
  const [faceStatus, setFaceStatus] = useState<'loading' | 'ready' | 'noface'>('loading');
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [bodyUrl, setBodyUrl] = useState<string | null>(null);
  const [garmentCategory, setGarmentCategory] = useState<GarmentCategory>('dress');
  const [selectedGarments, setSelectedGarments] = useState<GarmentSelection>({});
  const [fittingStatus, setFittingStatus] = useState<'loading' | 'ready' | 'nobody'>('loading');
  const [toast, setToast] = useState('');
  const [name, setName] = useState('');
  const [now, setNow] = useState(() => new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);

  const garmentList = useMemo<Garment[]>(
    () => GARMENTS.filter((g) => selectedGarments[g.category] === g.id),
    [selectedGarments]
  );

  const isUpload = look.modelId === 'upload' && !!uploadUrl;
  const baseModel = getFaceModel(look.modelId);
  const photoUrl = isUpload ? (uploadUrl as string) : baseModel.photo;
  const tone = isUpload ? { undertone: 'neutral' as Undertone, skin: '#d8b89c' } : (MODEL_TONE[baseModel.id] ?? MODEL_TONE.fair);
  const selectedOutfit = useMemo(
    () => STYLE_LOOKBOOK.find((outfit) => outfit.id === look.outfitId),
    [look.outfitId]
  );

  useEffect(() => {
    if (!open) return;
    setSavedLooks(loadSavedLooks());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => () => {
    if (uploadUrl) URL.revokeObjectURL(uploadUrl);
  }, [uploadUrl]);

  useEffect(() => () => {
    if (bodyUrl) URL.revokeObjectURL(bodyUrl);
  }, [bodyUrl]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }, []);

  const updateMakeup = useCallback((patch: Partial<MakeupStyle>) => {
    setLook((current) => ({ ...current, makeup: { ...current.makeup, ...patch } }));
  }, []);

  const chooseModel = (id: string) => {
    setLook((current) => ({ ...current, modelId: id }));
    setView('face');
  };

  const onUploadPhoto = (file: File | undefined) => {
    if (!file) return;
    if (uploadUrl) URL.revokeObjectURL(uploadUrl);
    const url = URL.createObjectURL(file);
    setUploadUrl(url);
    setLook((current) => ({ ...current, modelId: 'upload' }));
    setView('face');
    notify(t('已載入你的照片。'));
  };

  const onUploadBody = (file: File | undefined) => {
    if (!file) return;
    if (bodyUrl) URL.revokeObjectURL(bodyUrl);
    setBodyUrl(URL.createObjectURL(file));
    setView('fitting');
    notify(t('已載入你的全身照。'));
  };

  const pickGarment = (garment: Garment) => {
    setSelectedGarments((current) => {
      const isOn = current[garment.category] === garment.id;
      const next: GarmentSelection = { ...current, [garment.category]: isOn ? null : garment.id };
      if (!isOn) {
        if (garment.category === 'dress') { next.top = null; next.bottom = null; }
        else { next.dress = null; }
      }
      return next;
    });
    setView('fitting');
  };

  const applyOutfit = useCallback((outfit: OutfitLook) => {
    setLook((current) => ({
      ...current,
      outfitId: outfit.id,
      makeup: {
        ...current.makeup,
        lipstickColor: outfit.palette.lipstickColor,
        lipstickFinish: outfit.palette.lipstickFinish,
        lipstickIntensity: 0.8,
        eyeshadowColor: outfit.palette.eyeshadowColor,
        eyeshadowFinish: outfit.palette.eyeshadowFinish,
        eyeshadowIntensity: 0.58,
        blushColor: outfit.palette.blushColor,
        blushIntensity: 0.44,
        eyelinerEnabled: outfit.palette.eyelinerEnabled,
        eyelinerIntensity: outfit.palette.eyelinerEnabled ? 0.68 : 0.4
      }
    }));
    setView('look');
    notify(tf('已套用「{0}」造型。', t(outfit.name)));
  }, [notify, t, tf]);

  const recommendations = useMemo(
    () => recommendColors(tone.undertone, recommendationTarget, tone.skin, makeupColor(look, recommendationTarget)).slice(0, 5),
    [look, recommendationTarget, tone]
  );

  const applyRecommendedColor = (role: StyleColorRole, hex: string) => {
    if (role === 'lip') updateMakeup({ lipstickColor: hex });
    else if (role === 'eye') updateMakeup({ eyeshadowColor: hex });
    else if (role === 'blush') updateMakeup({ blushColor: hex });
  };

  const saveCurrentLook = useCallback(() => {
    const saved: StyleLook = {
      ...look,
      id: look.id.startsWith('look-') && savedLooks.some((item) => item.id === look.id) ? look.id : `look-${Date.now().toString(36)}`,
      name: name.trim() || t('未命名造型'),
      createdAt: new Date().toISOString()
    };
    const next = upsertSavedLook(savedLooks, saved);
    saveSavedLooks(next);
    setSavedLooks(next);
    setLook(saved);
    setName(saved.name);
    notify(t('造型已儲存。'));
  }, [look, name, notify, savedLooks, t]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveCurrentLook();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, open, saveCurrentLook]);

  const resetLook = () => {
    setLook(createDefaultLook());
    setName('');
    setView('face');
    notify(t('造型已重設。'));
  };

  const randomizeLook = () => {
    const nextModel = randomItem(FACE_MODELS);
    const outfit = randomItem(STYLE_LOOKBOOK);
    setLook((current) => ({
      ...current,
      modelId: nextModel.id,
      outfitId: outfit.id,
      makeup: {
        ...current.makeup,
        lipstickColor: outfit.palette.lipstickColor,
        lipstickFinish: outfit.palette.lipstickFinish,
        lipstickIntensity: 0.6 + Math.random() * 0.35,
        eyeshadowColor: outfit.palette.eyeshadowColor,
        eyeshadowFinish: outfit.palette.eyeshadowFinish,
        eyeshadowIntensity: 0.4 + Math.random() * 0.45,
        blushColor: outfit.palette.blushColor,
        blushIntensity: 0.3 + Math.random() * 0.4,
        eyelinerEnabled: outfit.palette.eyelinerEnabled,
        eyelinerIntensity: 0.5 + Math.random() * 0.4
      }
    }));
    setName('');
    setView('face');
    notify(t('已產生新的搭配靈感。'));
  };

  const exportLook = () => {
    const blob = new Blob([JSON.stringify(look, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(name || look.name || 'fusion-look').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'fusion-look'}.fusion-look.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify(t('造型已匯出。'));
  };

  const lookbookPanel = () => (
    <div className="style-inspector-content">
      <section className="style-guidance-head">
        <span><LayoutGrid size={18} /></span>
        <div>
          <strong>{t('造型範本')}</strong>
          <p>{t('挑選真人造型即可試穿,並自動套上對應的彩妝,包含紅毯禮服。')}</p>
        </div>
      </section>
      <div className="style-lookbook-grid">
        {STYLE_LOOKBOOK.map((outfit) => (
          <button key={outfit.id} type="button" className={`style-lookbook-card ${look.outfitId === outfit.id ? 'is-selected' : ''}`} onClick={() => applyOutfit(outfit)}>
            <span className="style-lookbook-photo">
              <img src={outfit.photo} alt={t(outfit.name)} loading="lazy" draggable={false} referrerPolicy="no-referrer" />
            </span>
            <span className="style-lookbook-info">
              <strong>{t(outfit.name)}{outfit.formal && <em><Crown size={9} /> {t('禮服')}</em>}</strong>
              <small>{t(outfit.mood)}</small>
              <span className="style-lookbook-credit">{outfit.credit}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const garmentPanel = () => {
    const cats: Array<{ id: GarmentCategory; label: string }> = [
      { id: 'dress', label: '洋裝' },
      { id: 'top', label: '上衣' },
      { id: 'bottom', label: '下身' }
    ];
    const items = garmentsByCategory(garmentCategory);
    return (
      <div className="style-inspector-content">
        <section className="style-guidance-head">
          <span><Shirt size={18} /></span>
          <div>
            <strong>{t('服裝試穿')}</strong>
            <p>{t('在同一個人身上換穿真實服裝(近似平面貼合,非真實垂墜)。')}</p>
          </div>
        </section>
        <div className="style-role-chips">
          {cats.map((cat) => (
            <button key={cat.id} type="button" className={garmentCategory === cat.id ? 'is-selected' : ''} onClick={() => setGarmentCategory(cat.id)}>
              {t(cat.label)}
            </button>
          ))}
        </div>
        <div className="style-garment-grid">
          {items.length === 0 ? (
            <div className="style-garment-empty">{t('此類別尚無服裝')}</div>
          ) : (
            items.map((garment) => (
              <button key={garment.id} type="button" className={`style-garment-card ${selectedGarments[garment.category] === garment.id ? 'is-selected' : ''}`} onClick={() => pickGarment(garment)}>
                <span className="style-garment-thumb">
                  <img src={garment.photo} alt={t(garment.name)} loading="lazy" draggable={false} referrerPolicy="no-referrer" />
                  {selectedGarments[garment.category] === garment.id && <i><Check size={12} /></i>}
                </span>
                <small>{t(garment.name)}</small>
              </button>
            ))
          )}
        </div>
        <button type="button" className="style-garment-upload" onClick={() => bodyInputRef.current?.click()}>
          <Upload size={15} /> {t('上傳全身照')}
        </button>
        <input ref={bodyInputRef} type="file" accept="image/*" hidden onChange={(event) => onUploadBody(event.target.files?.[0])} />
        {garmentList.length > 0 && (
          <button type="button" className="style-garment-clear" onClick={() => setSelectedGarments({})}>{t('清除服裝')}</button>
        )}
      </div>
    );
  };

  const makeupPanel = () => {
    const spec = TARGETS.find((target) => target.id === makeupTarget) ?? TARGETS[0];
    const colors = spec.browPalette ? HAIR_COLORS : spec.colorRole ? roleColors(spec.colorRole) : [];
    const intensity = look.makeup[spec.intensityKey] as number;
    const toggleOn = spec.toggleKey ? (look.makeup[spec.toggleKey] as boolean) : true;
    return (
      <div className="style-inspector-content">
        <div className="style-target-grid makeup">
          {TARGETS.map((target) => (
            <button key={target.id} type="button" className={makeupTarget === target.id ? 'is-selected' : ''} aria-label={t(target.label)} onClick={() => { setMakeupTarget(target.id); setView('face'); }}>
              {target.icon}<span>{t(target.label)}</span>
            </button>
          ))}
        </div>
        <section className="style-control-section">
          <h3>{t(spec.label)}</h3>
          {spec.toggleKey && (
            <label className="style-toggle-row">
              <span><strong>{t('啟用眼線')}</strong><small>{t('沿真實眼型描繪')}</small></span>
              <input type="checkbox" checked={toggleOn} onChange={(event) => updateMakeup({ [spec.toggleKey as string]: event.target.checked } as Partial<MakeupStyle>)} />
              <i />
            </label>
          )}
          {colors.length > 0 && (
            <ColorSwatches colors={colors} value={look.makeup[spec.colorKey as keyof MakeupStyle] as string} onChange={(hex) => updateMakeup({ [spec.colorKey as string]: hex } as Partial<MakeupStyle>)} translate={t} />
          )}
          <label className="style-range">
            <span>{t('濃度')} <b>{Math.round(intensity * 100)}%</b></span>
            <input type="range" min="0" max="1" step="0.01" disabled={spec.toggleKey ? !toggleOn : false} value={intensity} onChange={(event) => updateMakeup({ [spec.intensityKey as string]: Number(event.target.value) } as Partial<MakeupStyle>)} />
          </label>
          {spec.finishKey && (
            <>
              <span className="style-control-label">{t('質感')}</span>
              <FinishSelector value={look.makeup[spec.finishKey as keyof MakeupStyle] as MakeupFinish} onChange={(finish) => updateMakeup({ [spec.finishKey as string]: finish } as Partial<MakeupStyle>)} translate={t} />
            </>
          )}
        </section>
      </div>
    );
  };

  const palettePanel = () => {
    const targets: Array<{ id: StyleColorRole; label: string }> = [
      { id: 'lip', label: '唇彩' },
      { id: 'eye', label: '眼影' },
      { id: 'blush', label: '腮紅' }
    ];
    return (
      <div className="style-inspector-content">
        <section className="style-guidance-head">
          <span><Sparkles size={18} /></span>
          <div><strong>{t('配色建議')}</strong><p>{t('依模特兒膚色底調與目前彩妝提供可解釋的搭配方向。')}</p></div>
        </section>
        <span className="style-control-label">{t('建議目標')}</span>
        <div className="style-role-chips">
          {targets.map((target) => (
            <button key={target.id} type="button" className={recommendationTarget === target.id ? 'is-selected' : ''} onClick={() => setRecommendationTarget(target.id)}>
              {t(target.label)}
            </button>
          ))}
        </div>
        <div className="style-recommendations">
          {recommendations.map((recommendation) => (
            <article key={recommendation.id}>
              <i style={{ ['--recommendation' as string]: recommendation.hex } as React.CSSProperties} />
              <div>
                <strong>{t(recommendation.name)}</strong>
                <span>{tf('相容度 {0}', `${recommendation.score}%`)}</span>
                <p>{recommendation.reasons.slice(0, 2).map(t).join(' · ')}</p>
              </div>
              <button type="button" onClick={() => applyRecommendedColor(recommendationTarget, recommendation.hex)}>{t('套用')}</button>
            </article>
          ))}
        </div>
      </div>
    );
  };

  const savedPanel = () => (
    <div className="style-inspector-content">
      <section className="style-save-composer">
        <label>
          <span>{t('造型名稱')}</span>
          <input value={name} maxLength={60} placeholder={t('未命名造型')} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="button" onClick={saveCurrentLook}><Save size={15} /> {t('儲存造型')}</button>
      </section>
      {savedLooks.length === 0 ? (
        <div className="style-empty-saves">
          <FolderOpen size={34} />
          <strong>{t('尚未儲存任何造型')}</strong>
          <span>{t('建立一套搭配後即可儲存在本機。')}</span>
        </div>
      ) : (
        <div className="style-saved-list">
          {savedLooks.map((saved) => {
            const savedModel = getFaceModel(saved.modelId);
            return (
              <article key={saved.id}>
                <div className="style-saved-preview">
                  <i style={{ background: (MODEL_TONE[savedModel.id] ?? MODEL_TONE.fair).skin }} />
                  <i style={{ background: saved.makeup.lipstickColor }} />
                  <i style={{ background: saved.makeup.eyeshadowColor }} />
                </div>
                <div>
                  <strong>{saved.name}</strong>
                  <span>{tf('儲存於 {0}', formatFusionDateTime(new Date(saved.createdAt), lang, settings.timezone, settings.clock24))}</span>
                </div>
                <button type="button" title={t('載入')} onClick={() => { setLook(saved); setName(saved.name); setView('face'); notify(t('造型已載入。')); }}>
                  <FolderOpen size={15} />
                </button>
                <button type="button" className="danger" title={t('刪除造型')} onClick={() => { const next = removeSavedLook(savedLooks, saved.id); saveSavedLooks(next); setSavedLooks(next); notify(t('造型已刪除。')); }}>
                  <Trash2 size={15} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  const modelRail = () => (
    <>
      <section>
        <h3>{t('選擇模特兒')}</h3>
        <div className="style-model-grid">
          {FACE_MODELS.map((faceModel) => (
            <button key={faceModel.id} type="button" className={!isUpload && baseModel.id === faceModel.id ? 'is-selected' : ''} onClick={() => chooseModel(faceModel.id)}>
              <span className="style-model-thumb">
                <img src={faceModel.photo} alt={t(faceModel.name)} loading="lazy" draggable={false} referrerPolicy="no-referrer" />
                {!isUpload && baseModel.id === faceModel.id && <i><Check size={12} /></i>}
              </span>
              <span><strong>{t(faceModel.name)}</strong><small>{t(faceModel.toneLabel)}</small></span>
            </button>
          ))}
          <button type="button" className={`style-upload-tile ${isUpload ? 'is-selected' : ''}`} onClick={() => fileInputRef.current?.click()}>
            <span className="style-model-thumb">
              {isUpload ? <img src={uploadUrl as string} alt={t('自訂照片')} draggable={false} /> : <Upload size={20} />}
              {isUpload && <i><Check size={12} /></i>}
            </span>
            <span><strong>{t('上傳照片')}</strong><small>{t('用自己的臉')}</small></span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => onUploadPhoto(event.target.files?.[0])} />
      </section>
      <section>
        <h3>{t('目前彩妝')}</h3>
        <div className="style-makeup-summary">
          <div><i style={{ background: look.makeup.lipstickColor }} /><span>{t('唇彩')}</span></div>
          <div><i style={{ background: look.makeup.eyeshadowColor }} /><span>{t('眼影')}</span></div>
          <div><i style={{ background: look.makeup.blushColor }} /><span>{t('腮紅')}</span></div>
        </div>
      </section>
      {selectedOutfit && (
        <section>
          <h3>{t('目前造型')}</h3>
          <div className="style-current-outfit">
            <img src={selectedOutfit.photo} alt={t(selectedOutfit.name)} loading="lazy" draggable={false} referrerPolicy="no-referrer" />
            <div><strong>{t(selectedOutfit.name)}</strong><small>{t(selectedOutfit.mood)}</small></div>
          </div>
        </section>
      )}
    </>
  );

  const tabItems: Array<{ id: StudioTab; label: string; icon: React.ReactNode }> = [
    { id: 'lookbook', label: '造型範本', icon: <LayoutGrid size={16} /> },
    { id: 'garments', label: '服裝', icon: <Shirt size={16} /> },
    { id: 'model', label: '模特兒', icon: <Users size={16} /> },
    { id: 'makeup', label: '彩妝', icon: <Sparkles size={16} /> },
    { id: 'palette', label: '配色', icon: <Palette size={16} /> },
    { id: 'saved', label: '已儲存', icon: <Save size={16} /> }
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="style-studio-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ ['--accent' as string]: accent } as React.CSSProperties}>
          <motion.div className="style-studio" initial={{ opacity: 0, scale: 0.97, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.985, y: 8 }}>
            <header className="style-topbar">
              <div className="style-brand">
                <span><Sparkles size={22} /></span>
                <div>
                  <strong>{t('虛擬造型工作室')}</strong>
                  <small>{t('真人試妝與造型試穿')}</small>
                </div>
              </div>
              <div className="style-top-actions">
                <button type="button" onClick={randomizeLook}><Sparkles size={16} /> {t('隨機靈感')}</button>
                <button type="button" onClick={resetLook}><RotateCcw size={16} /> {t('重設造型')}</button>
                <button type="button" onClick={exportLook}><Download size={16} /> {t('匯出造型')}</button>
                <button type="button" className="primary" onClick={saveCurrentLook}><Save size={16} /> {t('儲存目前造型')}</button>
              </div>
              <div className="style-clock">
                <span>{formatFusionDateTime(now, lang, settings.timezone, settings.clock24)}</span>
                <button type="button" onClick={onClose} title={t('關閉虛擬造型工作室')} aria-label={t('關閉虛擬造型工作室')}>
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="style-body">
              <aside className="style-profile-rail">
                <div className="style-panel-heading">
                  <span><Users size={18} /></span>
                  <div><strong>{t('真人模特兒')}</strong><small>{t('選擇膚色並即時試妝')}</small></div>
                </div>
                <div className="style-profile-scroll">{modelRail()}</div>
              </aside>

              <main className="style-stage">
                <div className="style-stage-glow" aria-hidden="true" />
                <div className="style-view-switcher">
                  {([
                    { id: 'face', label: '臉部上妝', icon: <Smile size={15} /> },
                    { id: 'fitting', label: '試衣間', icon: <Shirt size={15} /> },
                    { id: 'look', label: '造型靈感', icon: <LayoutGrid size={15} /> }
                  ] as Array<{ id: StageView; label: string; icon: React.ReactNode }>).map((item) => (
                    <button key={item.id} type="button" className={view === item.id ? 'is-selected' : ''} onClick={() => setView(item.id)}>
                      {item.icon}{t(item.label)}
                    </button>
                  ))}
                </div>

                {view === 'face' && (
                  <>
                    {faceStatus === 'loading' && (
                      <div className="style-stage-loading">
                        <span><Sparkles size={24} /></span>
                        <strong>{t('臉部偵測中')}</strong>
                      </div>
                    )}
                    {faceStatus === 'noface' && (
                      <div className="style-stage-empty">
                        <Smile size={40} />
                        <strong>{t('未偵測到臉部')}</strong>
                        <span>{t('請換一張正面、清晰、單人的照片。')}</span>
                      </div>
                    )}
                    <div className="style-stage-photo">
                      <MakeupPortrait
                        key={photoUrl}
                        photoUrl={photoUrl}
                        fallbackModel={isUpload ? undefined : baseModel}
                        makeup={look.makeup}
                        onStatus={setFaceStatus}
                      />
                    </div>
                    <div className="style-stage-credit">{t('照片')} · {isUpload ? t('你的照片') : baseModel.credit}</div>
                  </>
                )}

                {view === 'look' && (
                  selectedOutfit ? (
                    <>
                      <div className="style-stage-photo">
                        <div className="style-outfit-frame">
                          <img src={selectedOutfit.photo} alt={t(selectedOutfit.name)} draggable={false} referrerPolicy="no-referrer" />
                          <div className="style-outfit-caption">
                            <strong>{t(selectedOutfit.name)}{selectedOutfit.formal && <em><Crown size={11} /> {t('禮服')}</em>}</strong>
                            <span>{t(selectedOutfit.mood)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="style-stage-credit">{t('照片')} · {selectedOutfit.credit}</div>
                    </>
                  ) : (
                    <div className="style-stage-empty">
                      <Shirt size={40} />
                      <strong>{t('尚未選擇造型')}</strong>
                      <span>{t('從右側「造型範本」挑選一套真人造型試穿。')}</span>
                    </div>
                  )
                )}

                {view === 'fitting' && (
                  <>
                    {fittingStatus === 'loading' && (
                      <div className="style-stage-loading">
                        <span><Sparkles size={24} /></span>
                        <strong>{t('偵測身體中')}</strong>
                      </div>
                    )}
                    {fittingStatus === 'nobody' && (
                      <div className="style-stage-empty">
                        <Users size={40} />
                        <strong>{t('未偵測到人體')}</strong>
                        <span>{t('請換一張正面、站姿、完整全身的照片。')}</span>
                      </div>
                    )}
                    <div className="style-stage-photo">
                      <GarmentTryOn
                        key={bodyUrl ?? BASE_BODIES[0].photo}
                        photoUrl={bodyUrl ?? BASE_BODIES[0].photo}
                        garments={garmentList}
                        onStatus={setFittingStatus}
                      />
                    </div>
                    <div className="style-stage-credit">{t('照片')} · {bodyUrl ? t('你的照片') : BASE_BODIES[0].credit}</div>
                  </>
                )}

                <div className="style-look-strip">
                  <span style={{ ['--look-color' as string]: tone.skin } as React.CSSProperties}>{isUpload ? t('上傳') : t(baseModel.toneLabel)}</span>
                  <i style={{ background: look.makeup.lipstickColor }} />
                  <i style={{ background: look.makeup.eyeshadowColor }} />
                  <i style={{ background: look.makeup.blushColor }} />
                </div>
              </main>

              <aside className="style-inspector">
                <nav className="style-tabs" aria-label={t('虛擬造型工作室')}>
                  {tabItems.map((item) => (
                    <button key={item.id} type="button" className={`${tab === item.id ? 'is-selected' : ''} ${item.id === 'model' ? 'style-model-tab' : ''}`} aria-label={t(item.label)} onClick={() => setTab(item.id)}>
                      {item.icon}<span>{t(item.label)}</span>
                    </button>
                  ))}
                </nav>
                {tab === 'lookbook' && lookbookPanel()}
                {tab === 'garments' && garmentPanel()}
                {tab === 'model' && <div className="style-profile-scroll style-mobile-profile">{modelRail()}</div>}
                {tab === 'makeup' && makeupPanel()}
                {tab === 'palette' && palettePanel()}
                {tab === 'saved' && savedPanel()}
              </aside>
            </div>

            {toast && <div className="style-toast">{toast}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
