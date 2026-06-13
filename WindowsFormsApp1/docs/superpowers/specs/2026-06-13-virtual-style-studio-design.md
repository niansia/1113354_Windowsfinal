# Virtual Style Studio Design

## Goal

Add a polished in-shell Fusion OS application where users can build a personal 3D mannequin, preview makeup and outfit color combinations, receive explainable palette suggestions, and save looks locally.

## Product Shape

The application is named **Virtual Style Studio**. It replaces the earlier cosmetics-information direction with an interactive styling experience and does not add another media-literacy application because VeriLens already covers that space.

The studio opens as a full Fusion OS overlay from App Center. Its visual language follows the existing deep navy glass shell with cyan, ice blue, indigo, violet, and restrained magenta highlights.

## Main Experience

The screen is divided into three working areas:

1. **Profile rail**
   - Skin tone and undertone presets.
   - Hair color and one of several procedural hairstyles.
   - Adjustable body presentation presets.
   - Reset and randomize actions.

2. **3D stage**
   - A procedural full-body mannequin rendered with React Three Fiber.
   - Orbit rotation, constrained zoom, soft studio lighting, floor reflection, and a subtle Fusion energy backdrop.
   - Separate materials or geometry for skin, hair, eyeshadow, blush, lipstick, top, bottom, dress, shoes, and accessories.
   - Front, face, and full-body camera presets.

3. **Styling inspector**
   - Tabs for Makeup, Wardrobe, Palette, and Saved Looks.
   - Color swatches plus intensity or finish controls where appropriate.
   - Garment silhouettes for tops, bottoms, dresses, shoes, and accessories.
   - Palette recommendations based on skin undertone, contrast, and the currently selected anchor color.
   - A compatibility score with short aesthetic reasons. It is presented as styling guidance, not a medical or objective attractiveness claim.

## Makeup Model

Makeup is represented by independent layers:

- Eyeshadow: color, intensity, and finish.
- Blush: color and intensity.
- Lipstick: color, intensity, and finish.
- Eyeliner: enabled state and intensity.

The model uses shallow overlay meshes positioned above the face surface to prevent z-fighting. Makeup changes update materials immediately without replacing the whole model.

## Wardrobe Model

Wardrobe pieces are procedural geometry so the feature remains offline and avoids third-party asset licensing:

- Tops: fitted, relaxed, cropped.
- Bottoms: trousers, skirt, shorts.
- Dresses: column, flare.
- Shoes: sneakers, boots, heels.
- Accessories: earrings and necklace.

Selecting a dress hides the top and bottom. Selecting a top or bottom clears the dress. Each visible garment has an independent color.

## Color Guidance

The recommendation engine is deterministic and testable:

- Skin presets map to warm, cool, or neutral undertones.
- Palette entries carry undertone affinity, lightness, saturation, and supported roles.
- Recommendations rank colors by undertone affinity, useful contrast against skin lightness, and harmony with the current garment or makeup anchor.
- The UI explains the leading factors in plain language.

The recommendation engine never claims a color is universally correct. It uses wording such as "balanced contrast" and "supports a warm undertone."

## State And Persistence

`StyleLook` stores:

- Version and unique id.
- User-provided name.
- ISO creation timestamp.
- Avatar profile.
- Makeup settings.
- Wardrobe selections.

The current draft and saved looks use localStorage. Parsing validates and normalizes data so malformed or older data cannot crash the application. Saved timestamps are displayed through Fusion OS locale, timezone, and 12/24-hour settings.

## Internationalization

All visible product text uses Traditional Chinese source keys and provides Simplified Chinese, English, Japanese, and Korean translations. The app consumes the existing `useI18n` provider and `formatFusionDateTime`, so language, timezone, and clock format follow System Settings immediately.

## Integration

- Add App ID `style`.
- Register a featured creative overlay entry in `fusionApps.ts`.
- Open it inside `SpatialHomeStage` like Circuit Studio.
- Add a dedicated component and stylesheet.
- Add a focused `style` domain for types, presets, recommendation logic, and persistence.
- Lazy-load the 3D studio so the main Fusion shell does not pay the Three.js cost until the app is opened.

## Accessibility And Performance

- Every icon-only action has an accessible label.
- Swatches expose their color name and selection state.
- Keyboard users can switch tabs and select presets.
- Reduced-motion disables idle mannequin motion and animated stage accents.
- Canvas device pixel ratio is capped.
- Lighting and geometry remain intentionally modest to preserve performance in WebView2.
- A CSS loading surface appears while the lazy 3D bundle loads.

## Validation

- Unit tests cover defaults, wardrobe exclusivity, recommendation ordering, persistence normalization, and catalog translation coverage.
- `npx tsc --noEmit` must pass.
- `npm run test:features` must pass.
- `npm run build` must pass.
- The local preview must be inspected in the in-app browser at desktop and constrained viewport sizes.
- Browser console errors must be checked before completion.

