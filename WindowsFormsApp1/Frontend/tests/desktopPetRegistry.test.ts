import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildImportedDesktopPet,
  createDefaultDesktopPet,
  normalizeDesktopPetManifest
} from '../src/pets/desktopPetRegistry.js';

const dataUrl = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/vuUAAA=';

test('creates the bundled Yuexin Miao pet with a public base URL', () => {
  const pet = createDefaultDesktopPet('./');

  assert.equal(pet.id, 'yuexin-miao');
  assert.equal(pet.displayName, 'Yuexin Miao');
  assert.equal(pet.source, 'default');
  assert.equal(pet.spritesheetUrl, './pets/yuexin-miao/spritesheet.webp');
});

test('normalizes incomplete Codex pet manifests into a usable desktop pet manifest', () => {
  const manifest = normalizeDesktopPetManifest(
    {
      displayName: '  Crystal Core  ',
      description: '',
      spritesheetPath: 'spritesheet.webp'
    },
    'Imported Pet'
  );

  assert.deepEqual(manifest, {
    id: 'crystal-core',
    displayName: 'Crystal Core',
    description: '匯入的桌寵。',
    spritesheetPath: 'spritesheet.webp'
  });
});

test('builds a custom imported pet from pet.json and an image data URL', () => {
  const pet = buildImportedDesktopPet({
    manifestText: JSON.stringify({
      id: 'nova-pet',
      displayName: 'Nova Pet',
      description: 'A local Codex pet.',
      spritesheetPath: 'spritesheet.webp'
    }),
    imageDataUrl: dataUrl,
    imageName: 'spritesheet.webp',
    importedAt: '2026-06-05T00:00:00.000Z'
  });

  assert.equal(pet.id, 'nova-pet');
  assert.equal(pet.displayName, 'Nova Pet');
  assert.equal(pet.description, 'A local Codex pet.');
  assert.equal(pet.spritesheetUrl, dataUrl);
  assert.equal(pet.source, 'custom');
  assert.equal(pet.importedAt, '2026-06-05T00:00:00.000Z');
});

test('rejects imports without a PNG or WebP spritesheet data URL', () => {
  assert.throws(
    () =>
      buildImportedDesktopPet({
        manifestText: '{"displayName":"Broken Pet"}',
        imageDataUrl: 'data:text/plain;base64,SGVsbG8=',
        imageName: 'notes.txt'
      }),
    /PNG|WebP/
  );
});
