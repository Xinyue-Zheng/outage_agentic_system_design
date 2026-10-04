/* Scene catalog: the single source of truth for the chamber tree of the outage workflow UI.
 * Scene files implement these ids via Atlas.register({ id, steps, ... }).
 * Order inside a parent = order here. Levels: 0 = the whole case, 1 = one module, 2 = inside a module. */
window.ATLAS_CATALOG = [
  { id: 'case', parent: null, level: 0, file: '00-case.js', color: 'cyan',
    title: 'Outage Case, End to End', kicker: 'One recorded investigation',
    summary: 'A down cell and an outage time become an impact report: eight recorded steps, each with a decision, a query, an observation, a state update and a rendered context.' },

  { id: 'loop', parent: 'case', level: 1, file: '10-loop.js', color: 'magenta',
    title: 'The Investigation Loop', kicker: 'Program around the model',
    summary: 'Render, decide, parse, validate, execute, update, record, guard. Who decides what, where failures go, and how a run ends.' },
  { id: 'context', parent: 'case', level: 1, file: '20-context.js', color: 'amber',
    title: 'Context Builder', kicker: 'What the model sees',
    summary: 'The model input is rendered from State by a program template each step, not appended as a transcript. Sections, sizes, and the stable prefix.' },
  { id: 'tools', parent: 'case', level: 1, file: '30-tools.js', color: 'blue',
    title: 'Tool Management', kicker: 'From decision to data',
    summary: 'A declared action registry, validation before execution, set-valued parameters, timeouts, and one Observation with a status for every call.' },
  { id: 'registry', parent: 'tools', level: 2, file: '31-registry.js', color: 'blue',
    title: 'Action Registry', kicker: 'The declared action set',
    summary: 'Each action with its parameters, units, allowed values, preconditions, phase and cost estimate: what the program validates against.' },
  { id: 'observation', parent: 'tools', level: 2, file: '32-observation.js', color: 'teal',
    title: 'Observation and Status', kicker: 'What a query returns',
    summary: 'One record per requested location; valid or missing; result status; and the four coverage situations the program keeps apart.' },
  { id: 'state', parent: 'case', level: 1, file: '40-state.js', color: 'teal',
    title: 'State and Trace', kicker: 'What the program remembers',
    summary: 'Immutable State snapshots with provenance per grid location, region summaries, the frontier rule, impact invalidation, Steps and the Trace.' },
  { id: 'checks', parent: 'case', level: 1, file: '50-checks.js', color: 'pink',
    title: 'Validation and Completion', kicker: 'The program decides',
    summary: 'Parsing with a retry cap, one response rule per failure, completion checks that accept a stop, and run caps with typed end reasons.' },
  { id: 'offline', parent: 'case', level: 1, file: '60-offline.js', color: 'lime',
    title: 'Offline Evaluation', kicker: 'From trace to evidence',
    summary: 'How recorded traces become metrics, error localization, recovery experiments and the baseline comparison against a general coding agent.' }
];

/* Main tour: the case, then the modules in loop order. The full tour is computed depth-first by the engine. */
window.ATLAS_TOURS = {
  bigpicture: ['case', 'loop', 'context', 'tools', 'state', 'checks', 'offline'],
  deep: null
};
