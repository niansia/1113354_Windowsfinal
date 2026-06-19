const pexels = (id: number, w = 500) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export interface BaseBody {
  id: string;
  name: string;
  photo: string;
  credit: string;
}

/** Neutral, front-facing, full-body photos used as the try-on canvas. */
export const BASE_BODIES: BaseBody[] = [
  { id: 'body-a', name: '模特兒 A', photo: pexels(20610322, 700), credit: 'Pexels' }
];

export type GarmentCategory = 'dress' | 'top' | 'bottom';

export const GARMENT_CATEGORIES: GarmentCategory[] = ['dress', 'top', 'bottom'];

export interface Garment {
  id: string;
  name: string;
  category: GarmentCategory;
  photo: string;
  credit: string;
  /** background-removal tuning (higher = removes more backdrop) */
  bgTolerance?: number;
  cropTopFrac?: number;
  /** placement: width as a multiple of the reference body span */
  widthMul: number;
  /** independent vertical stretch after width scaling */
  heightScale?: number;
  topAnchor: 'shoulder' | 'hip';
  topOffset: number;
}

export const GARMENTS: Garment[] = [
  { id: 'red-dress', name: '紅洋裝', category: 'dress', photo: pexels(19895956), credit: 'Pexels', bgTolerance: 82, cropTopFrac: 0.1, widthMul: 2.0, heightScale: 1.05, topAnchor: 'shoulder', topOffset: -0.02 },
  { id: 'pattern-dress', name: '印花洋裝', category: 'dress', photo: pexels(14513896), credit: 'Pexels', bgTolerance: 76, cropTopFrac: 0.16, widthMul: 2.0, heightScale: 1.0, topAnchor: 'shoulder', topOffset: -0.01 },
  { id: 'floral-top', name: '花卉上衣', category: 'top', photo: pexels(19895949), credit: 'Pexels', bgTolerance: 84, cropTopFrac: 0.12, widthMul: 2.2, heightScale: 0.92, topAnchor: 'shoulder', topOffset: -0.02 }
];

export const garmentsByCategory = (category: GarmentCategory) =>
  GARMENTS.filter((garment) => garment.category === category);

const Z_ORDER: Record<GarmentCategory, number> = { bottom: 0, top: 1, dress: 2 };
export const sortGarments = (garments: Garment[]) =>
  [...garments].sort((a, b) => Z_ORDER[a.category] - Z_ORDER[b.category]);
