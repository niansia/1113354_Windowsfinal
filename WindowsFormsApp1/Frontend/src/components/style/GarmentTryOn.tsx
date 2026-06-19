import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cutoutGarment } from '../../style/bgRemoval';
import { detectPoseGeometry, type PoseGeometry } from '../../style/poseLandmarks';
import { sortGarments, type Garment } from '../../style/styleGarments';

interface GarmentTryOnProps {
  photoUrl: string;
  garments: Garment[];
  onStatus?: (status: 'loading' | 'ready' | 'nobody') => void;
}

interface Cutout { url: string; aspect: number }

export function GarmentTryOn({ photoUrl, garments, onStatus }: GarmentTryOnProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [aspect, setAspect] = useState(0.66);
  const [pose, setPose] = useState<PoseGeometry | null>(null);
  const [cutouts, setCutouts] = useState<Record<string, Cutout>>({});

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setBox({ w: r.width, h: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    return () => { window.removeEventListener('resize', measure); ro?.disconnect(); };
  }, [aspect]);

  // Detect body pose once per base photo.
  useEffect(() => {
    let cancelled = false;
    setPose(null);
    onStatus?.('loading');
    const img = imgRef.current;
    if (!img) return;
    const run = async () => {
      const geometry = await detectPoseGeometry(img);
      if (cancelled) return;
      setPose(geometry);
      onStatus?.(geometry ? 'ready' : 'nobody');
    };
    if (img.complete && img.naturalWidth > 0) { setAspect(img.naturalWidth / img.naturalHeight); void run(); }
    const onLoad = () => { setAspect(img.naturalWidth / img.naturalHeight); void run(); };
    img.addEventListener('load', onLoad);
    return () => { cancelled = true; img.removeEventListener('load', onLoad); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl]);

  // Produce transparent cutouts for any garments not yet processed.
  useEffect(() => {
    let cancelled = false;
    garments.forEach((garment) => {
      if (cutouts[garment.id]) return;
      const gi = new Image();
      gi.crossOrigin = 'anonymous';
      gi.referrerPolicy = 'no-referrer';
      gi.onload = () => {
        if (cancelled) return;
        const result = cutoutGarment(gi, { tolerance: garment.bgTolerance, cropTopFrac: garment.cropTopFrac });
        if (result) setCutouts((prev) => ({ ...prev, [garment.id]: result }));
      };
      gi.src = garment.photo;
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garments]);

  const { w, h } = box;

  const placeStyle = (garment: Garment, cut: Cutout): React.CSSProperties | null => {
    if (!pose || w === 0) return null;
    const ref = garment.topAnchor === 'hip' ? pose.hipWidth : pose.shoulderWidth;
    const widthN = ref * garment.widthMul;
    const heightN = ((widthN * w) / cut.aspect / h) * (garment.heightScale ?? 1); // keep pixel aspect → normalized height
    const anchor = garment.topAnchor === 'hip' ? pose.hipCenter : pose.shoulderCenter;
    const topN = anchor.y + garment.topOffset;
    const leftN = anchor.x - widthN / 2;
    return {
      position: 'absolute',
      left: `${leftN * 100}%`,
      top: `${topN * 100}%`,
      width: `${widthN * 100}%`,
      height: `${heightN * 100}%`,
      transformOrigin: 'top center',
      transform: `rotate(${pose.shoulderAngle}deg)`,
      pointerEvents: 'none'
    };
  };

  return (
    <div ref={wrapRef} className="garment-tryon" style={{ aspectRatio: String(aspect) }}>
      <img ref={imgRef} className="garment-base" src={photoUrl} alt="" draggable={false} crossOrigin="anonymous" referrerPolicy="no-referrer" />
      {pose && sortGarments(garments).map((garment) => {
        const cut = cutouts[garment.id];
        if (!cut) return null;
        const style = placeStyle(garment, cut);
        if (!style) return null;
        return <img key={garment.id} className="garment-layer" src={cut.url} alt="" draggable={false} style={style} />;
      })}
    </div>
  );
}
