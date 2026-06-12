# Fusion Power Menu Design

## Summary

Add a compact power control to the Fusion OS home dock. Activating it opens a
deep-navy glass menu inspired by the supplied reference with four localized
actions: Lock, Sleep, Shut down, and Restart.

## Product Decisions

- Place the power control at the right edge of the existing bottom dock.
- Keep the menu visually consistent with Fusion OS instead of copying the
  reference image's white Windows surface.
- Use the existing account lock screen for Lock.
- Simulate Sleep inside Fusion OS with a full-viewport low-power overlay that
  wakes on click, keyboard input, or pointer input.
- Shut down by closing the current WinForms host application.
- Restart by launching the current executable and then closing the current
  WinForms host application.
- Do not invoke real Windows shutdown, sleep, or restart operations.

## Interaction

1. Selecting the dock power button opens the menu above it.
2. Selecting outside the menu or pressing Escape closes it.
3. Lock signs the current Fusion OS account out and returns to the existing
   lock screen.
4. Sleep hides the desktop behind a low-power surface. Any normal user input
   restores the desktop.
5. Shut down sends `FUSION_SYSTEM_ACTION` with `action: "shutdown"` to the
   WinForms host.
6. Restart sends `FUSION_SYSTEM_ACTION` with `action: "restart"` to the
   WinForms host.

## Localization And Date

- Menu labels are source-as-key entries in the existing translation dictionary
  for Traditional Chinese, Simplified Chinese, English, Japanese, and Korean.
- The power button accessible label and sleep screen copy also use `useI18n()`.
- The sleep screen clock uses `formatFusionTime()` and
  `formatFusionDate()` with the shared language, timezone, and 12/24-hour
  setting from `SettingsContext`.
- No separate locale, clock, or date state is introduced.

## Architecture

- `Frontend/src/system/powerActions.ts` defines the supported action type and
  maps host-backed actions to bridge messages. Keeping this logic outside
  React makes it testable with the existing Node test runner.
- `SpatialHomeStage.tsx` owns menu visibility, sleep visibility, Lock
  integration, keyboard dismissal, and rendering.
- `spatialHome.css` owns the glass menu, power button, and sleep surface.
- `Form1.cs` handles the new host message and performs the process lifecycle
  action on the WinForms UI thread.

## Error Handling

- In browser preview, host-backed actions safely no-op because the existing
  bridge returns `false` when WebView2 is unavailable.
- Restart resolves the current executable path before attempting to launch it.
- Host lifecycle exceptions are logged and shown with a localized-neutral
  English failure toast rather than affecting the real operating system.

## Testing And Validation

- Add tests for the supported action list and host-message mapping.
- Add translation assertions for all power menu labels.
- Run `npm run test:features`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.
- Build the WinForms project.
- Verify the power menu, sleep surface, language switching, date formatting,
  lock flow, and browser console in the in-app browser.

## Acceptance Criteria

- The dock has a distinct power button that opens a four-action menu.
- The menu matches the Fusion OS navy/cyan/violet visual direction.
- Lock returns to the existing account lock screen.
- Sleep can always be exited without restarting the app.
- Shut down closes the current C# application.
- Restart launches a new instance and closes the current instance.
- All new visible text follows the selected Fusion OS language.
- Sleep-screen time and date follow the selected timezone and clock format.
- The feature never shuts down, sleeps, or restarts Windows itself.
