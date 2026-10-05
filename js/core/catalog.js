/* Scene catalog: the single source of truth for the chamber tree of the outage workflow UI.
 * Scene files implement these ids via Atlas.register({ id, steps, ... }).
 * Order inside a parent = order here. Levels: 0 = the whole case, 1 = one module, 2 = inside a module. */
window.ATLAS_CATALOG = [
  { id: 'case', parent: null, level: 0, file: '00-case.js', color: 'cyan',
    title: 'Outage Case, End to End', kicker: 'One recorded investigation',
    summary: 'A down cell and an outage time become an impact report: eight recorded actions, each with a decision, a query, an observation, a state update and a rendered context.' },

  { id: 'init', parent: 'case', level: 1, file: '11-init.js', color: 'cyan',
    title: 'Initialization', kicker: 'Fixed logic before the loop',
    summary: 'Cell lookup, map geometry, references and relations, the initial State and the first rendering. Where fixed program logic ends and the model begins.' },
  { id: 'context', parent: 'case', level: 1, file: '20-context.js', color: 'amber',
    title: 'Context Builder', kicker: 'What the model sees',
    summary: 'Why the model input is rendered from State instead of appended as a transcript, how the sections are built, and what stays out.' },
  { id: 'decision', parent: 'case', level: 1, file: '50-decision.js', color: 'pink',
    title: 'Decision Pipeline', kicker: 'From model output to action',
    summary: 'The model proposes a three-part decision; the program parses it, validates it against the registry and State, and accepts a stop only through completion checks.' },
  { id: 'tools', parent: 'case', level: 1, file: '30-tools.js', color: 'blue',
    title: 'Tool Registry', kicker: 'One list of actions',
    summary: 'Every action in one registry. Data access on an MCP server inside the internal environment; registry, validation and normalization in the program.' },
  { id: 'observation', parent: 'tools', level: 2, file: '32-observation.js', color: 'teal',
    title: 'Observation and Status', kicker: 'What a query returns',
    summary: 'One record per requested location; valid or missing; result status; and the coverage situations the program keeps apart.' },
  { id: 'state', parent: 'case', level: 1, file: '40-state.js', color: 'teal',
    title: 'State and Trace', kicker: 'What the program remembers',
    summary: 'Facts with provenance, the coverage classes, region summaries and the frontier rule, how one observation updates State, and what a Step records.' },
  { id: 'caps', parent: 'case', level: 1, file: '55-caps.js', color: 'magenta',
    title: 'Run Caps', kicker: 'Bounded cost, typed ends',
    summary: 'Step cap, query budget in area, wall time and repeated-query detection, checked every round; and what a typed end reason means.' },
  { id: 'offline', parent: 'case', level: 1, file: '60-offline.js', color: 'lime',
    title: 'Offline Evaluation', kicker: 'From trace to evidence',
    summary: 'How recorded traces become metrics, error localization, recovery experiments and the baseline comparison against a general coding agent.' }
];

/* Main tour: the case, then the modules in loop order. The full tour is computed depth-first by the engine. */
window.ATLAS_TOURS = {
  bigpicture: ['case', 'init', 'context', 'decision', 'tools', 'state', 'caps', 'offline'],
  deep: null
};
