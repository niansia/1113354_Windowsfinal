import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultLook } from '../src/style/styleCatalog.js';
import { recommendColors, setWardrobePiece } from '../src/style/styleEngine.js';
import { parseSavedLooks } from '../src/style/styleStorage.js';

test('creates a complete neutral default look', () => {
  const look = createDefaultLook(new Date('2026-06-13T12:00:00Z'));

  assert.equal(look.version, 1);
  assert.equal(look.createdAt, '2026-06-13T12:00:00.000Z');
  assert.equal(look.avatar.undertone, 'neutral');
  assert.equal(look.wardrobe.dress, 'none');
  assert.equal(look.wardrobe.top, 'fitted');
});

test('keeps dresses and separates mutually exclusive', () => {
  const dressed = setWardrobePiece(createDefaultLook(), 'dress', 'flare');

  assert.equal(dressed.wardrobe.dress, 'flare');
  assert.equal(dressed.wardrobe.top, 'none');
  assert.equal(dressed.wardrobe.bottom, 'none');

  const separated = setWardrobePiece(dressed, 'top', 'cropped');
  assert.equal(separated.wardrobe.top, 'cropped');
  assert.equal(separated.wardrobe.dress, 'none');
});

test('ranks warm lip colors above cool colors for warm undertones', () => {
  const ranked = recommendColors('warm', 'lip', '#D79A72');

  assert.ok(ranked.length >= 3);
  assert.equal(ranked[0].undertones.includes('warm'), true);
  assert.ok(ranked[0].score >= ranked[1].score);
  assert.ok(ranked[0].reasons.length > 0);
});

test('round-trips saved looks and ignores malformed entries', () => {
  const look = createDefaultLook(new Date('2026-06-13T12:00:00Z'));
  const parsed = parseSavedLooks(JSON.stringify([look, { broken: true }]));

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, look.id);
  assert.equal(parsed[0].createdAt, '2026-06-13T12:00:00.000Z');
});
