# Fusion Circuit Studio And App Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Steps use checkbox syntax for tracking.

**Goal:** Add a complete tested DC circuit workspace and consolidate secondary
apps behind App Center.

**Architecture:** Pure TypeScript simulation and catalog modules feed React
overlays. SpatialHomeStage owns navigation between App Center, Circuit Studio,
existing native overlays, and host-launched apps.

**Tech Stack:** React 19, TypeScript 6, SVG, CSS, Node test runner, Vite.

---

## Task 1: Test Infrastructure And App Grouping

- [ ] Add a feature-test TypeScript configuration and npm script.
- [ ] Add failing tests for primary-shell and App Center membership.
- [ ] Add catalog metadata and make the tests pass.

## Task 2: Circuit Simulation Core

- [ ] Add failing source/resistor, switch, LED, current source, meter, and
  diagnostics tests.
- [ ] Implement circuit types, templates, net building, matrix solving, LED
  iteration, fuse diagnostics, and result formatting.
- [ ] Run focused tests after each behavior.

## Task 3: Circuit Studio UI

- [ ] Build component palette and searchable component library.
- [ ] Build board zoom, pan, snap, dragging, rotation, selection, duplication,
  terminal wiring, and wire deletion.
- [ ] Add undo/redo history and keyboard shortcuts.
- [ ] Add inspector, persistence, import/export, templates, auto-run, meters,
  and simulation visualization.
- [ ] Keep all copy in clean English.

## Task 4: App Center UI And Shell Integration

- [ ] Build the categorized, searchable launcher overlay with featured and
  recent applications.
- [ ] Filter the primary carousel/dock to core entries.
- [ ] Route Circuit Studio and existing React overlays internally.
- [ ] Route existing host applications through their stable IDs.

## Task 5: Styling And Verification

- [ ] Add responsive Fusion glass styling.
- [ ] Run feature tests, TypeScript, and production build.
- [ ] Start local preview, exercise App Center and Circuit Studio, capture a
  screenshot, and inspect browser console errors.
