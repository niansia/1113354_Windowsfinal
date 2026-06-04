import { createDefaultDesktopPet } from './desktopPetRegistry';

const publicBaseUrl = import.meta.env.BASE_URL || './';

export const DEFAULT_DESKTOP_PETS = [createDefaultDesktopPet(publicBaseUrl)];
