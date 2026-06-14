"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortGarments = exports.garmentsByCategory = exports.GARMENTS = exports.GARMENT_CATEGORIES = exports.BASE_BODIES = void 0;
const pexels = (id, w = 500) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
/** Neutral, front-facing, full-body photos used as the try-on canvas. */
exports.BASE_BODIES = [
    { id: 'body-a', name: '模特兒 A', photo: pexels(20610322, 700), credit: 'Pexels' }
];
exports.GARMENT_CATEGORIES = ['dress', 'top', 'bottom'];
exports.GARMENTS = [
    { id: 'red-dress', name: '紅洋裝', category: 'dress', photo: pexels(19895956), credit: 'Pexels', bgTolerance: 82, cropTopFrac: 0.1, widthMul: 2.0, heightScale: 1.05, topAnchor: 'shoulder', topOffset: -0.02 },
    { id: 'pattern-dress', name: '印花洋裝', category: 'dress', photo: pexels(14513896), credit: 'Pexels', bgTolerance: 76, cropTopFrac: 0.16, widthMul: 2.0, heightScale: 1.0, topAnchor: 'shoulder', topOffset: -0.01 },
    { id: 'floral-top', name: '花卉上衣', category: 'top', photo: pexels(19895949), credit: 'Pexels', bgTolerance: 84, cropTopFrac: 0.12, widthMul: 2.2, heightScale: 0.92, topAnchor: 'shoulder', topOffset: -0.02 }
];
const garmentsByCategory = (category) => exports.GARMENTS.filter((garment) => garment.category === category);
exports.garmentsByCategory = garmentsByCategory;
const Z_ORDER = { bottom: 0, top: 1, dress: 2 };
const sortGarments = (garments) => [...garments].sort((a, b) => Z_ORDER[a.category] - Z_ORDER[b.category]);
exports.sortGarments = sortGarments;
