# Fusion Medical Hub Design

## Goal

Build a new Fusion OS medical application that turns the course-like prompt
(`醫學與健康`, `醫學影像概論`, `醫學工程概論`, `醫學概論`) into a humane health
learning and preparation workspace.

## Product Boundary

- This is an education and organization tool, not a diagnosis or treatment
  system.
- Red-flag symptoms and urgent ranges point users to professional care or
  emergency services.
- The UI must avoid fear-based medical visuals and avoid gore.
- The medical app background must be designed with CSS and DOM layers only; no
  generated or photographic image background assets.

## Experience

- App name: `MediSphere`.
- Visual language: deep navy glass, cyan, ice blue, electric blue, indigo,
  violet, and soft magenta, matching Fusion OS.
- Default language: Traditional Chinese.
- App entry and app interior both use Fusion i18n and follow system language,
  timezone, date, and 12/24-hour settings.
- The screen contains:
  - Course navigator for medicine, imaging, and biomedical engineering topics.
  - Vital-sign organizer with educational status labels.
  - Imaging modality guide for X-ray, CT, MRI, ultrasound, and nuclear medicine.
  - Visit-prep checklist and red-flag safety rail.
  - Source panel with public medical references.

## Data And Sources

Use bundled educational content based on public, reputable sources:

- MedlinePlus for vital-sign and health education framing.
- RadiologyInfo for medical imaging patient explanations.
- WHO hand hygiene / infection-prevention guidance.
- CDC emergency warning-sign framing.

The app links to these sources and keeps calculations conservative.

## Accessibility And Safety

- Use clear, non-alarmist language.
- Make high-risk states visually obvious but not panic-inducing.
- Include explicit disclaimers near vital signs and red flags.
- Keep controls keyboard accessible and readable on narrow viewports.

