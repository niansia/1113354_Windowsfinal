# Makeup Geometry Redesign

## Goal

Repair the Virtual Style Studio makeup alignment and replace the simplified eyebrow, eyeliner, and lash rendering with a controllable system that follows normal makeup placement.

## Root Cause

The portrait uses `object-fit: cover`. When the portrait container has a different aspect ratio from the source image, the source is cropped, but normalized landmarks are currently multiplied by the container width and height. This maps makeup to the wrong visible pixels. The current closed Catmull-Rom paths can also overshoot at eye corners and create hooks or self-intersections.

## Chosen Approach

Use a small, pure geometry module that:

- Computes the rendered source-image rectangle for `cover`.
- Maps normalized face landmarks through that rectangle.
- Builds eyeliner bands, independent wing geometry, eyebrow shapes, and lash curves without unsafe closed-spline smoothing.
- Mirrors left and right eye behavior from inner/outer landmarks rather than assuming a fixed screen direction.

This is preferred over forcing `object-fit: contain`, which would add empty bars and change the current studio framing, and over manual per-photo offsets, which would fail on uploads.

## Makeup Behavior

### Eyeliner

Styles:

- Natural: tapered upper line with no extended tail.
- Tightline: thin line held close to the lash roots.
- Puppy: short, gently lowered outer tail.
- Cat eye: lifted triangular wing.
- Fox eye: longer, shallower lifted extension.
- Smoky: broader, softer outer line.

Controls:

- Color.
- Intensity.
- Thickness.
- Wing length.
- Wing angle, including a lowered puppy-eye direction.

The wing is a separate polygon joined at the outer third of the eye. It must never be produced by smoothing a closed path through one distant tip.

### Eyebrows

Styles:

- Natural.
- Straight.
- Soft arch.
- Defined arch.
- Lifted tail.

The renderer starts from the detected brow region, applies bounded vertical shaping around its centerline, then overlays soft fill and short hair strokes. Styling must stay within a fraction of the eye-to-brow gap.

### Lashes

Styles:

- Natural.
- Doll.
- Cat eye.
- Wispy.

Curved lash strokes start on the upper lash line. Length distribution depends on style, while length and curl remain adjustable. Left and right eyes must be mirrored through geometry, not duplicated screen-space directions.

## State And Compatibility

`MakeupStyle` gains eyeliner, brow, and lash shape controls. Existing version-1 saved looks remain valid: missing fields normalize to the new defaults, and old eyeliner `bold` values map to `smoky`.

## UI

The existing makeup inspector layout remains. Contextual controls appear only for eyeliner, brow, and lash targets. Traditional Chinese remains the source language, with Simplified Chinese, English, Japanese, and Korean translations.

## Validation

- Unit tests cover cover-fit mapping, mirrored wing direction, bounded brow transformations, curved lash generation, and old-look normalization.
- `npx tsc --noEmit`, `npm run test:features`, and `npm run build` pass.
- The built-in fair, medium, and deep models are visually checked in the in-app browser.
- Natural, puppy, cat-eye, fox-eye, smoky, brow, and lash states are inspected.
- Browser console errors are checked before completion.
