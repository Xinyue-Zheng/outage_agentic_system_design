# Outage Workflow

An interactive, zoomable walkthrough of the agentic outage analysis system. One recorded synthetic case is followed end to end: how each query is chosen, what data comes back, how the program turns it into State, text and a stopping decision. Each module of the harness has its own chamber with the numbers from that run.

The app is static. Open `index.html` in Chrome or Edge. No build step, no server, no network. Fonts are bundled.

## What it shows

Nine chambers in three levels:

```
L0  case         Outage Case, End to End        10 steps  Start, Action 1 to 8, End of the run
├─ L1 init       Initialization                  4 steps  task in, geometry around the cell, initial State, hand-off
├─ L1 context    Context Builder                 3 steps  why render from State, how it is built, what stays out
├─ L1 decision   Decision Pipeline               4 steps  the model proposes, parse, validate, finish request and completion
├─ L1 tools      Tool Registry                   5 steps  one registry, MCP for data access, registration, the actions, validate-execute-normalize
│   └─ L2 observation  Observation and Status    4 steps  one record per location, four situations, status, provenance
├─ L1 state      State and Trace                 3 steps  what State holds, update and frontier, Step and Trace
├─ L1 caps       Run Caps                        2 steps  checked every round, typed ends
└─ L1 offline    Offline Evaluation              5 steps  metrics, baseline, localization, recovery, tuning
```

Every step is cut into points. For each point the page changes four things together: the diagram on the stage, the text in the left box, a callout card below it, and a deep-dive block on the right. Components with a dashed ring and a plus badge open their own chamber. Back zooms out. A system map lists every chamber.

The actions in the case are the recorded ones. The decision texts shown at each step (action, parameters, information gap) are hand-written illustrations, not model output. Nothing in the UI calls a model.

## Status vocabulary used in the chambers

- **implemented**: runs today in the synthetic prototype (`agentic_test`).
- **designed**: defined in the project handoff or the September deck, not implemented.
- **proposed**: derived from the comparison with Codex CLI, Gemini CLI and TurnL; a design proposal.
- **left out**: deliberately not built, with the reason.

## Data

`js/data/case.js` is generated from a recorded run and must not be edited by hand. To regenerate it from the synthetic prototype:

```bash
cd ../agentic_test
uv run python -m outage_poc.export_ui --run outputs/demo --out ../outage_workflow_UI/js/data/case.js
```

The exporter copies facts from the run (trace, states, rendered contexts, observation summaries, impact results); it computes nothing new. When a real run exists in the internal system, point `--run` at its output directory and the chambers show the real case without any change to the scene files.

`js/data/decisions.js` holds the hand-written decision texts, indexed by step number.

## Layout of the repository

```
index.html            the shell: top bar, stage (SVG 1600 x 900), left panel, deep-dive panel, settings, map
references.html       the reference list, built from the scene files
css/                  theme, panels, fonts
fonts/                bundled fonts (Inter, Instrument Serif, JetBrains Mono; all OFL)
js/core/catalog.js    the chamber tree and the tours
js/core/glossary.js   hover definitions for the deep-dive text
js/core/draw.js       shared drawing helpers: the grid map, key-value panels, decision cards
js/core/engine.js     playback, zoom, cards, deep dive, progress, map (from Genesis Atlas, voice removed)
js/core/ctx.js        the drawing and animation toolkit handed to every scene (from Genesis Atlas)
js/core/narrator.js   reading-speed clock that paces points (voice is disabled)
js/core/refs.js       reference numbering
js/data/case.js       generated case data
js/data/decisions.js  hand-written decision texts
js/scenes/NN-*.js     one file per chamber; each calls Atlas.register({ id, refs, steps })
docs/SCENE_API.md     the scene authoring contract (inherited; the ctx API section is the useful part)
tools/                check.py (lint), smoke.py (headless browser tests), shot.py (screenshots)
```

## Checks

```bash
python3 tools/check.py                 # static lint of every scene; needs: python3 -m pip install --user esprima
python3 tools/smoke.py                 # runtime test in a headless Chrome or Edge; prints SMOKE OK
python3 tools/smoke.py --layout        # layout audit: text overlap, off-canvas; prints LAYOUT: 0 issue(s)
python3 tools/shot.py case 4 2         # screenshot of chamber "case", step 4, point 2
```

The smoke and screenshot tools need Chrome or Edge on the machine. The lint runs anywhere.

## Origin

The shell, the drawing toolkit and the tools are copied from Genesis Atlas (LAB1/genesis-atlas) with the author's agreement. The voice narration was removed; points are paced by a reading clock and the text stays. The catalog, glossary, data, drawing helpers and all nine scenes are new.
