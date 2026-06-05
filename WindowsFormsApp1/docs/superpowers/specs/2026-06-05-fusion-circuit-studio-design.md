# Fusion Circuit Studio And App Center Design

## Summary

Add a full native Fusion OS circuit-design application and reorganize the
growing bottom dock around a single App Center entry.

Circuit Studio runs inside the React shell as a full-screen spatial glass
workspace. Users can place components, connect terminals, edit values, run a
DC simulation, inspect voltage/current/power, manage a complete editing
history, use measurement components, load templates, save locally, and
import/export versioned project files.

App Center becomes the launcher for grouped creative, development, data, and
utility applications. Core shell destinations remain directly available in
the dock.

## Product Decisions

- Keep all existing WinForms app IDs stable.
- Use `tool` as the App Center shell entry instead of the current direct
  Toolbox overlay.
- Add `circuit` as a React-only application ID.
- Keep these applications in the primary shell carousel and dock:
  - This PC
  - Project Files
  - App Center
  - Web Zone
  - Fusion RPG
  - Settings
- Move these applications into App Center:
  - Piano Studio
  - Aurora Media Center
  - Audio Studio
  - Cosmic Gesture
  - MetroPulse
  - Development Lab
  - Toolbox
  - Database
  - Terminal
  - Circuit Studio

## Circuit Studio

### Workspace

The overlay uses three regions:

- Left palette: battery, voltage source, current source, resistor, variable
  resistor, LED, lamp, switch, fuse, capacitor, inductor, ammeter, voltmeter,
  and ground.
- Center board: snap-grid component placement, dragging, selection, zoom,
  pan, rotation, duplication, terminal wiring, wire deletion, and animated
  current paths after simulation.
- Right inspector: selected component values, simulation readings, warnings,
  and circuit summary.

The top bar provides templates, undo, redo, rotate, duplicate, delete, clear,
save, load, import, export, auto-run, and run actions.

### Interaction

1. Select a component in the palette to place it on the board.
2. Drag components to arrange the circuit.
3. Select one terminal and then another terminal to create a wire.
4. Select a component to edit voltage, resistance, LED forward voltage, or
   switch state.
5. Run the simulation to calculate node voltages and component current.
6. Lit LEDs and lamps receive a controlled cyan/magenta glow.
7. Use undo/redo for every document mutation and keyboard shortcuts for common
   editing actions.

### Simulation

The simulation engine is a pure TypeScript module using modified nodal
analysis:

- Ideal DC voltage sources are stamped as additional current unknowns.
- Resistors and lamps are linear resistive branches.
- Closed switches use a small resistance; open switches are omitted.
- LEDs use a piecewise-linear forward-voltage model with bounded iteration.
- Current sources are stamped directly into the nodal equations.
- Ammeters are low-resistance branches and voltmeters are high-resistance
  branches.
- Capacitors are open and inductors are near-short in DC steady state.
- Fuses open automatically in the displayed result when rated current is
  exceeded.
- Wires are collapsed into electrical nets with union-find.
- Ground is required for a valid solved circuit.

Results include:

- net voltage
- component voltage
- component current
- component power
- LED/lamp active state
- diagnostics for missing ground, floating or open circuits, and singular
  matrices

The simulator is educational and intentionally limited to DC circuits. It
does not claim SPICE compatibility.

### Persistence

- Save and load use `localStorage`.
- Changes are auto-saved with recovery on next launch.
- Export downloads a versioned JSON circuit document.
- Import accepts the same versioned format with validation.
- Templates include LED, series resistors, parallel loads, switched lamp, and
  measurement bench circuits.

## App Center

App Center uses the same deep navy glass language as Web Zone but remains a
React overlay. It provides:

- category rail
- searchable application cards
- featured application hero
- recent-launch tracking
- keyboard navigation
- short user-facing descriptions
- direct launch actions
- a featured Circuit Studio card

React-native tools open as shell overlays. Existing WinForms and external
applications continue through the current WebView bridge.

## Architecture

New modules:

- `Frontend/src/circuit/circuitTypes.ts`
- `Frontend/src/circuit/circuitSimulator.ts`
- `Frontend/src/circuit/circuitTemplates.ts`
- `Frontend/src/components/FusionCircuitStudio.tsx`
- `Frontend/src/components/FusionAppCenter.tsx`
- `Frontend/src/styles/fusionCircuit.css`

Updated modules:

- `Frontend/src/types.ts`
- `Frontend/src/data/fusionApps.ts`
- `Frontend/src/components/SpatialHomeStage.tsx`
- `Frontend/src/styles/fusionApps.css`
- `Frontend/src/index.css`

The simulator has no React or browser dependency so it can be tested with
Node's built-in test runner.

## Error Handling

- Invalid or singular circuits show a readable diagnostic and preserve the
  design.
- Invalid numeric values are clamped to safe positive ranges.
- Wiring a terminal to itself is ignored.
- Duplicate wires are ignored.
- Import/load failures show a workspace notification instead of replacing the
  current circuit.
- Host application launch behavior remains unchanged.

## Testing

Automated tests cover:

- resistor current from a DC source
- open-switch current
- LED forward-voltage behavior
- missing-ground diagnostics
- shell versus App Center grouping

Validation:

- `npm run test:features`
- `npx tsc --noEmit`
- `npm run build`
- local browser preview
- browser console error check

## Acceptance Criteria

- App Center replaces the long list of grouped applications in the primary
  dock.
- Circuit Studio can be opened from App Center.
- Users can place, move, connect, edit, save, load, export, and test a DC
  circuit.
- The starter LED circuit solves and displays plausible readings.
- Opening a switch stops current.
- Existing grouped applications still launch through their original route.
- The interface matches Fusion OS visual direction and contains clean English
  UI copy.
