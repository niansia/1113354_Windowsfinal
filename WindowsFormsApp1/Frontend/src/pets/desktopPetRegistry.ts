import { DESKTOP_PET_TEXT } from '../settings/settingsText';

export type DesktopPetSource = 'default' | 'custom';

export interface DesktopPetManifest {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
}

export interface DesktopPetAsset extends DesktopPetManifest {
  source: DesktopPetSource;
  spritesheetUrl: string;
  importedAt?: string;
}

export interface DesktopPetPosition {
  x: number;
  y: number;
}

export interface DesktopPetImportInput {
  manifestText: string;
  imageDataUrl: string;
  imageName: string;
  importedAt?: string;
}

const DEFAULT_DESCRIPTION = DESKTOP_PET_TEXT.importedDescription;
const ID_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;
const SUPPORTED_IMAGE_RE = /^data:image\/(?:png|webp);base64,/i;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(DESKTOP_PET_TEXT.invalidManifestError);
  }
  return value as Record<string, unknown>;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function sanitizeDesktopPetId(value: string, fallback = 'custom-pet'): string {
  const source = value.trim() || fallback;
  const slug = source
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const id = slug || fallback;
  return ID_RE.test(id) ? id : 'custom-pet';
}

export function normalizeDesktopPetManifest(input: unknown, fallbackName = 'Custom Pet'): DesktopPetManifest {
  const raw = asRecord(input);
  const displayName = cleanText(raw.displayName) || cleanText(raw.name) || fallbackName;
  const id = ID_RE.test(cleanText(raw.id)) ? cleanText(raw.id) : sanitizeDesktopPetId(displayName, fallbackName);
  const description = cleanText(raw.description) || DEFAULT_DESCRIPTION;
  const spritesheetPath = cleanText(raw.spritesheetPath) || cleanText(raw.spriteSheetPath) || cleanText(raw.spritesheet) || 'spritesheet.webp';

  return {
    id,
    displayName,
    description,
    spritesheetPath
  };
}

export function createDefaultDesktopPet(publicBaseUrl = ''): DesktopPetAsset {
  const base = publicBaseUrl.endsWith('/') || publicBaseUrl === '' ? publicBaseUrl : `${publicBaseUrl}/`;
  return {
    id: 'yuexin-miao',
    displayName: 'Yuexin Miao',
    description: DESKTOP_PET_TEXT.bundledDescription,
    spritesheetPath: 'spritesheet.webp',
    spritesheetUrl: `${base}pets/yuexin-miao/spritesheet.webp`,
    source: 'default'
  };
}

export function buildImportedDesktopPet(input: DesktopPetImportInput): DesktopPetAsset {
  if (!SUPPORTED_IMAGE_RE.test(input.imageDataUrl)) {
    throw new Error(DESKTOP_PET_TEXT.unsupportedSpritesheetError);
  }

  const parsed = JSON.parse(input.manifestText) as unknown;
  const manifest = normalizeDesktopPetManifest(parsed, input.imageName.replace(/\.[^.]+$/, '') || 'Custom Pet');

  return {
    ...manifest,
    source: 'custom',
    spritesheetUrl: input.imageDataUrl,
    importedAt: input.importedAt ?? new Date().toISOString()
  };
}

export function isDesktopPetAsset(value: unknown): value is DesktopPetAsset {
  if (!value || typeof value !== 'object') return false;
  const pet = value as Partial<DesktopPetAsset>;
  return (
    typeof pet.id === 'string' &&
    typeof pet.displayName === 'string' &&
    typeof pet.spritesheetUrl === 'string' &&
    (pet.source === 'default' || pet.source === 'custom')
  );
}

export function mergeDesktopPetLibrary(defaults: DesktopPetAsset[], customs: unknown): DesktopPetAsset[] {
  const customPets = Array.isArray(customs) ? customs.filter(isDesktopPetAsset) : [];
  const byId = new Map<string, DesktopPetAsset>();
  defaults.forEach((pet) => byId.set(pet.id, pet));
  customPets.forEach((pet) => byId.set(pet.id, pet));
  return Array.from(byId.values());
}

export function clampDesktopPetPosition(position: DesktopPetPosition, viewportWidth: number, viewportHeight: number): DesktopPetPosition {
  const maxX = Math.max(16, viewportWidth - 120);
  const maxY = Math.max(16, viewportHeight - 130);
  return {
    x: Math.min(Math.max(16, Math.round(position.x)), maxX),
    y: Math.min(Math.max(16, Math.round(position.y)), maxY)
  };
}
