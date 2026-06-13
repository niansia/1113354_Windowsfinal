# English Flashcards Integration Design

## Goal

Import `niansia/1113354_TSV` into Fusion OS and expose it as a native application named `英文單字卡`.

## Scope

- Copy the existing WinForms source into `IntegratedApps/EnglishFlashcards`.
- Build the imported project with the other integrated applications.
- Register a `flashcards` application in the Fusion OS catalog and launch bridge.
- Add Fusion OS translations for the catalog title, subtitle, description, tags, and status.
- Keep the imported application source behavior, language, timezone, and date handling unchanged.

## Architecture

The app remains a separate .NET Framework executable. Fusion OS launches it through the existing `LaunchIntegratedExeApp` path and tracks its open/closed state in the same way as Piano Studio, Multimedia Studio, and Wave Studio.

The React catalog uses Traditional Chinese source strings as translation keys. The new catalog entry therefore uses `英文單字卡` as its canonical title and provides Simplified Chinese, English, Japanese, and Korean values through the existing translation table.

## Validation

- App catalog tests prove the application is registered, host-launched, and translated in every selectable Fusion OS language.
- TypeScript type-check and production build pass.
- The imported WinForms project builds through the main MSBuild target.
- The local Fusion OS preview shows the new card in App Center and launches the host route without browser console errors.
