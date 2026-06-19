# Development Lab Design

## Goal

Turn the existing Development Lab launcher into a full Fusion OS workspace for
the two course areas: Data Structures and Introduction to Algorithms.

The lab should teach by doing. Users can edit data, choose an operation, run it,
and inspect every state transition instead of reading a static course summary.

The default presentation is Traditional Chinese. Every visible label, module
description, validation message, trace explanation, and activity entry follows
the shared Fusion OS language setting. The header clock follows the shared
timezone and 12/24-hour setting so the lab reads as a native part of the shell.

## Product Direction

The selected direction is an integrated visual systems studio rather than a
traditional IDE or a pair of course-note pages.

- Data Structures provides direct manipulation of stacks, queues, linked lists,
  and binary search trees.
- Algorithms provides animated traces for sorting, searching, and graph
  traversal.
- A shared timeline, complexity panel, pseudocode viewer, and activity console
  connect both subjects into one coherent workflow.

The workspace uses the existing Fusion OS full-screen overlay model and its deep
navy glass, cyan, ice blue, indigo, violet, and soft magenta palette. It must
read as a focused operating-system tool, not a dashboard.

## Screen Architecture

The overlay has four stable regions:

1. A top command bar with product identity, reset, sample loading, playback
   speed, run/pause, and close controls.
2. A left navigator with Data Structures and Algorithms grouped into compact
   modules.
3. A central visual canvas with direct input controls, animated nodes or bars,
   and a frame timeline.
4. A right inspector with complexity, live metrics, highlighted pseudocode,
   and a readable operation log.

On narrow screens the inspector moves below the canvas and the navigator becomes
a horizontal strip.

## Core Interactions

### Data Structures

- Stack: push, pop, and peek.
- Queue: enqueue, dequeue, and inspect front.
- Linked list: append, prepend, remove by value, and find.
- Binary search tree: insert, remove, search, and reset.
- Every operation adds a human-readable event to the activity console.

### Algorithms

- Sorting: Bubble Sort, Insertion Sort, Selection Sort, Quick Sort, Merge Sort,
  and Heap Sort.
- Searching: Linear Search and Binary Search.
- Graph traversal: Breadth-First Search and Depth-First Search.
- Users can enter comma-separated numbers or a compact graph edge list.
- Dataset presets generate random, nearly sorted, reversed, and duplicate-heavy
  inputs at several useful sizes.
- Performance comparison runs every sorting algorithm against the current
  dataset and reports comparisons, writes, and generated frames.
- Run builds a deterministic trace; playback supports play, pause, previous,
  next, scrub, and three speed levels.
- The active pseudocode line and live comparison/write/visit counters update
  with each frame.

## Motion Direction

Motion communicates state instead of decorating the screen:

- Structure values enter, move, highlight, and exit with spring-based spatial
  transitions.
- Algorithm bars animate height and focus changes between trace frames.
- Compare, write, pivot, visit, and completion phases use distinct restrained
  light treatments.
- The canvas uses a slow aurora drift, scan beam, and depth glows while keeping
  text and data legible.
- Fusion OS accessibility settings and reduced-motion preferences disable
  non-essential movement.

## User Guidance

The lab opens with a useful sample and an immediately understandable primary
action. Traditional Chinese is the source language and all other supported
languages use the existing source-as-key i18n system. Empty, invalid, and
completed states use short instructional messages rather than technical
exceptions.

The inspector always answers four questions:

- What is happening now?
- Which values or nodes are active?
- How much work has been performed?
- What is the expected time and space complexity?

## Architecture

Pure TypeScript modules under `Frontend/src/devlab` own parsing, data structure
operations, trace generation, complexity metadata, and pseudocode metadata.
They do not import React or browser APIs and are covered by Node tests.

`FusionDevelopmentLab.tsx` owns view state, playback timing, local persistence,
and accessible controls. `fusionDevelopmentLab.css` owns the responsive spatial
layout. `SpatialHomeStage.tsx` only wires the `dev` app to the overlay.

## Error Handling

Parsing functions return or throw concise user-facing validation messages for
empty lists, non-numeric input, invalid graph edges, missing search targets, and
operations on empty structures. The React layer catches errors, preserves the
last valid visualization, and displays the problem in the command area.

Trace generation is deterministic. Playback stops at the final frame and never
continues running after the overlay closes.

## Validation

- Node feature tests cover parsing, stack/queue/list/tree operations, sorting
  traces, search traces, and graph traversals.
- `npx tsc --noEmit` validates the React integration.
- `npm run build` validates production bundling.
- The in-app browser verifies launch, manipulation, playback, responsive layout,
  and a clean browser console.
