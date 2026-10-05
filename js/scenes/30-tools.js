/* L1 — Tool Registry. One list of actions the model may propose; data-access tools on an MCP server, the
 * registry, validation and normalization in the program. */
(function () {
  var D = window.OutageDraw;

  var ACTIONS = [
    ['cell.lookup', 'MCP server', 'initialization', 'in design'],
    ['osm.geometry', 'MCP server', 'initialization', 'in design'],
    ['coverage.query', 'MCP server', 'coverage phase', 'exists (prototype)'],
    ['kpi.query', 'MCP server', 'backup phase', 'proposed'],
    ['impact.estimate', 'program', 'backup phase', 'exists (prototype)'],
    ['observation.rows', 'program', 'any', 'proposed']
  ];

  Atlas.register({
    id: 'tools',
    refs: [
      'Anthropic, <i>Model Context Protocol specification</i>, 2025',
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026'
    ],
    poster: 2,
    steps: [
      {
        title: 'One registry',
        beats: [
          {
            say: 'Every action the model may propose is an entry in one registry, keyed by name. The registry is the program\'s single source for what exists, what each action needs, and when it may be used.',
            card: { tag: 'KEY IDEA', title: 'One list, one layer', body: 'Data queries and program computations sit side by side. The model, the validator and the context builder all read the same list.' },
            deep: '<p>The registry is used three ways. The validator checks a decision against it. The context builder renders the entries allowed in the current phase as the available actions. The executor routes an action name to its implementation. Nothing else knows the tools.</p>'
          },
          {
            say: 'An entry carries more than a name. It has parameter names with types, units and allowed values, the preconditions that must hold in State, the phase it belongs to, and how its result becomes an Observation.',
            card: { tag: 'HOW IT WORKS', title: 'What an entry holds', body: 'name · description · parameters (type, unit, allowed values, set-valued or not) · preconditions over State · phase · cost estimate · result normalization.' },
            deep: '<p>Parameters refer to things that exist in State: reference ids, cell ids, time windows derived from the outage time. Preconditions are predicates over State, for example that backup candidates are known before a KPI query. The cost estimate is in queried locations, which is the budget unit of a run.</p>'
          },
          {
            say: 'Six entries are planned. Four are data access, two are program computation. Where an entry runs is an implementation detail; to the model and the validator they are all the same kind of thing.',
            card: { tag: 'NUMBERS', title: 'The action set', stat: { v: '6', l: 'entries: cell.lookup, osm.geometry, coverage.query, kpi.query, impact.estimate, observation.rows' } },
            deep: '<p>Two exist in the prototype: <code>coverage.query</code> and <code>impact.estimate</code>. Two exist in design for initialization. <code>kpi.query</code> and <code>observation.rows</code> are proposed. The recorded case used only the two prototype entries.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.reg = ctx.node({ x: 800, y: 150, w: 320, h: 56, title: 'tool registry', sub: 'one entry per action, keyed by name', color: 'blue', titleSize: 14, subSize: 11, glow: false });
          S.readers = ['validator', 'context builder', 'executor'].map(function (n, i) {
            return ctx.node({ x: 440 + i * 360, y: 280, w: 220, h: 46, title: n, color: 'magenta', titleSize: 12.5, glow: false });
          });
          S.rl = S.readers.map(function (n) { return ctx.link(S.reg, n, { color: 'dim' }); });
          return ctx.reveal([S.reg].concat(S.readers, S.rl), { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.entry = ctx.code({ x: 80, y: 360, w: 640, title: 'registry entry · coverage.query', lang: 'text', size: 11, color: 'blue', lines: [
              'name:          coverage.query',
              'parameters:    reference: reference_id in State (set-valued, max 4)',
              '               epoch: pre_outage',
              'preconditions: reference resolves; budget remaining >= cost',
              'phase:         coverage',
              'cost:          number of grid locations in the reference',
              'result:        one record per location -> Observation with status',
              'runs on:       MCP server'
            ] });
            return ctx.reveal(S.entry, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.list = D.kv(ctx, 800, 360, 700, ACTIONS.map(function (a) { return [a[0] + '  ·  ' + a[2], a[1] + '  ·  ' + a[3]]; }), { title: 'the action set · where it runs · status', color: 'blue', lh: 24 });
            return ctx.reveal(S.list.g, { from: 'up' });
          });
        }
      },
      {
        title: 'MCP for data access',
        beats: [
          {
            say: 'The tools that read confidential data run on an MCP server inside the internal environment. The loop is the MCP client. The model talks to neither; it only names an action.',
            card: { tag: 'KEY IDEA', title: 'Server for data, program for judgment', body: 'cell.lookup, osm.geometry, coverage.query and kpi.query live on the server. The registry, validation, State and normalization live in the program.' },
            deep: '<p>MCP is a protocol between an application and a tool server. A server declares its tools with a name, a description and a JSON schema; the client calls them and gets records back. It does not change who interprets the data: the client does, after the call.</p>'
          },
          {
            say: 'Computation that reads State stays in the program. Impact estimation needs to know which locations had the down cell, which is State, so it runs locally. It is still a registry entry like the others.',
            card: { tag: 'HOW IT WORKS', title: 'impact.estimate is local', body: 'Same registry, same validation, same Observation contract. Different implementation: a function in the program, because the server must not hold State.' },
            deep: '<p>The server holds no investigation state. Anything that depends on what has been learned so far, impact estimation, frontier computation, statistics, is program code. The registry hides the difference: an entry says where it runs, and the executor routes accordingly.</p>'
          },
          {
            say: 'One boundary around the data pays twice. The confidential data never leaves the environment, and the same server lets a general coding agent run the baseline with identical tools.',
            card: { tag: 'WHY IT MATTERS', title: 'One server, two harnesses', body: 'The outage loop and the Codex CLI baseline call the same MCP server. The difference between them is then only the harness, which is what the experiment measures.' },
            deep: '<p>Codex CLI sees the server\'s schema only. The outage loop sees the schema plus preconditions, phase, cost and the rendered State. Running both against the same server on the same cases isolates the effect of the harness.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['reg', 'entry'].forEach(function (k) { if (S[k]) ctx.fade(S[k], 0.15, 300); });
          S.readers.forEach(function (n) { ctx.fade(n, 0.15, 300); }); S.rl.forEach(function (l) { ctx.fade(l, 0.15, 300); });
          if (S.list) ctx.fade(S.list.g, 0.15, 300);
          S.srv = ctx.rect(80, 150, 560, 330, { rx: 12, fill: 'rgba(5,10,22,0.85)', stroke: 'blue', sw: 1.4, dash: '7 5' });
          S.srvL = ctx.text(96, 172, 'MCP server · internal environment · data access only', { size: 12.5, weight: 700, color: 'blue' });
          S.srvTools = ['cell.lookup', 'osm.geometry', 'coverage.query', 'kpi.query'].map(function (n, i) {
            return ctx.node({ x: 360, y: 230 + i * 60, w: 480, h: 44, title: n, color: 'blue', titleSize: 12.5, glow: false });
          });
          S.prg = ctx.rect(760, 150, 760, 330, { rx: 12, fill: 'rgba(5,10,22,0.85)', stroke: 'magenta', sw: 1.4 });
          S.prgL = ctx.text(776, 172, 'program · the loop · MCP client', { size: 12.5, weight: 700, color: 'magenta' });
          S.prgParts = ['tool registry', 'validation', 'execute and normalize', 'State'].map(function (n, i) {
            return ctx.node({ x: 1140, y: 230 + i * 60, w: 480, h: 44, title: n, color: i === 3 ? 'teal' : 'magenta', titleSize: 12.5, glow: false });
          });
          S.call = ctx.link({ x: 760, y: 350 }, { x: 640, y: 350 }, { color: 'blue', label: 'tools/call → records', labelDy: -10 });
          return ctx.reveal([S.srv, S.srvL, S.prg, S.prgL].concat(S.srvTools, S.prgParts, [S.call]), { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.local = ctx.node({ x: 1140, y: 520, w: 480, h: 44, title: 'impact.estimate · runs in the program', sub: 'reads State: which locations had D0', color: 'magenta', titleSize: 12.5, subSize: 10.5, glow: false });
            return ctx.reveal(S.local, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.base = ctx.node({ x: 360, y: 560, w: 480, h: 44, title: 'baseline harness (Codex CLI)', sub: 'same server, schema only', color: 'dim', kind: 'ghost', titleSize: 12.5, subSize: 10.5, glow: false });
            S.bl = ctx.link(S.base, { x: 360, y: 482 }, { color: 'dim', dash: '4 4', label: 'tools/call', labelDx: 50 });
            return ctx.reveal([S.base, S.bl], { from: 'fade' });
          });
        }
      },
      {
        title: 'Registration at startup',
        beats: [
          {
            say: 'At startup the program connects to the server and asks for its tool list. For each tool it merges the server\'s name, description and schema with a local policy entry that adds what the protocol cannot express.',
            card: { tag: 'HOW IT WORKS', title: 'Server schema plus local policy', body: 'From the server: name, description, input schema. From the program: phase, preconditions, cost estimate, set-valued cap, result normalization.' },
            deep: '<p>MCP tool declarations are generic. They cannot say that a KPI query needs known backup candidates, or that a coverage query costs its number of locations. Those rules are the investigation\'s, so they are kept in a local policy file and merged at registration.</p>'
          },
          {
            say: 'A mismatch is an error, not a default. A server tool with no policy entry, or a policy entry with no server tool, stops the program at startup.',
            card: { tag: 'PITFALL', title: 'No silent defaults', body: 'If the server and the policy disagree, nothing runs. A tool the program does not know how to validate must not be offered to the model.' },
            deep: '<p>This follows the project rule against fallback logic. The alternative, exposing a server tool with generic validation, would let the model propose an action the program cannot check against State.</p>'
          },
          {
            say: 'Local actions register the same way without a server: their entry is written directly. The result is one registry, built once per run, that the rest of the program reads.',
            card: { tag: 'KEY IDEA', title: 'Built once, read everywhere', body: 'Registration happens before the first model call. After it, the registry is read-only for the run.' },
            deep: '<p>Because the registry is fixed per run, the available-actions section of the context changes only with the phase, never with a tool appearing or disappearing mid-run. Validation results are therefore reproducible from the trace.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          [S.srv, S.srvL, S.prg, S.prgL, S.call, S.local, S.base, S.bl].concat(S.srvTools, S.prgParts).forEach(function (e) { if (e) ctx.fade(e, 0.12, 300); });
          S.lst = ctx.code({ x: 80, y: 160, w: 560, title: 'from the server · tools/list', lang: 'json', size: 10.5, color: 'blue', lines: [
            '{ "name": "coverage.query",',
            '  "description": "pre-outage coverage records for a reference",',
            '  "inputSchema": { "reference": "string[]", "epoch": "string" } }'
          ] });
          S.pol = ctx.code({ x: 680, y: 160, w: 560, title: 'from the program · policy entry', lang: 'text', size: 10.5, color: 'magenta', lines: [
            'coverage.query:',
            '  phase: coverage',
            '  preconditions: reference in State; budget >= cost',
            '  cost: locations(reference)',
            '  set_valued: reference, max 4',
            '  normalize: records -> Observation(status per location)'
          ] });
          return ctx.reveal([S.lst, S.pol], { from: 'up', stagger: 120 }).then(function () { return ctx.beat(1); }).then(function () {
            S.err = D.kv(ctx, 80, 420, 560, [['server tool, no policy entry', 'startup error'], ['policy entry, no server tool', 'startup error'], ['schema differs from policy parameters', 'startup error']], { title: 'mismatch', color: 'red' });
            return ctx.reveal(S.err.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.merged = ctx.node({ x: 960, y: 480, w: 560, h: 56, title: 'tool registry · 6 entries · read-only for the run', color: 'blue', titleSize: 13, glow: false });
            S.m1 = ctx.link({ x: 360, y: 318 }, S.merged, { color: 'blue', bend: { x: 360, y: 508 } });
            S.m2 = ctx.link({ x: 960, y: 318 }, S.merged, { color: 'magenta' });
            return ctx.reveal([S.merged, S.m1, S.m2], { from: 'fade' });
          });
        }
      },
      {
        title: 'The actions',
        beats: [
          {
            say: 'Coverage query takes one or more references and returns one record per location: valid with a list of cells and signals, or missing. Nothing is interpreted on the server.',
            card: { tag: 'HOW IT WORKS', title: 'coverage.query', body: 'In: reference ids, epoch. Out: one record per grid location. Set-valued: several references in one call, executed together, one Observation with a status per reference.' },
            deep: '<p>The record contract is strict: exactly one record per requested location, a status of valid or missing, and for a valid record a cell list that may be empty. An empty list is evidence of no coverage; a missing record is not evidence of anything.</p>'
          },
          {
            say: 'KPI query takes cell ids and a time window and returns the measured indicators per cell. It is only allowed once backup candidates are known from coverage.',
            card: { tag: 'HOW IT WORKS', title: 'kpi.query (proposed)', body: 'In: cell ids, time window, indicator names. Out: values with units and source. Precondition: the cells appear in coverage records as candidates.' },
            deep: '<p>KPI values are stored per cell, window, indicator, unit and source, as the handoff requires. They are not written into grid locations. Measured values and estimates derived from them are kept apart.</p>'
          },
          {
            say: 'Impact estimate reads State, not the server. For every queried location where the down cell was present it picks an eligible backup by stated thresholds and estimates the load, with the scope and the exclusions written into the result.',
            card: { tag: 'HOW IT WORKS', title: 'impact.estimate', body: 'In: scope reference, thresholds. Out: assignments, per-backup loads, exclusions and limitations. Invalidated by any later spatial observation.' },
            deep: '<p>The rule in the prototype is a demonstration: exclude the down cell, keep candidates above both thresholds, take the strongest, break ties by cell id. The load formula is linear in transferred traffic. Both are stated in the result so the model reads them as assumptions, not as facts about the network.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          [S.lst, S.pol, S.merged, S.m1, S.m2].forEach(function (e) { if (e) ctx.fade(e, 0.12, 300); });
          if (S.err) ctx.fade(S.err.g, 0.12, 300);
          S.a1 = D.kv(ctx, 80, 160, 460, [['in', 'reference ids (set-valued), epoch'], ['out', 'one record per location: valid + cells, or missing'], ['runs on', 'MCP server'], ['status', 'exists in the prototype']], { title: 'coverage.query', color: 'blue' });
          return ctx.reveal(S.a1.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.a2 = D.kv(ctx, 570, 160, 460, [['in', 'cell ids, time window, indicators'], ['out', 'values per cell, window, indicator, unit, source'], ['precondition', 'candidates known from coverage'], ['status', 'proposed']], { title: 'kpi.query', color: 'blue' });
            return ctx.reveal(S.a2.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.a3 = D.kv(ctx, 1060, 160, 460, [['in', 'scope reference, RSRP and RSRQ thresholds'], ['out', 'assignments, backup loads, exclusions, limitations'], ['runs in', 'the program (reads State)'], ['status', 'exists in the prototype']], { title: 'impact.estimate', color: 'magenta' });
            return ctx.reveal(S.a3.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Validate, execute, normalize',
        beats: [
          {
            say: 'Before any call, the decision is checked against the registry: the action exists, each parameter has the right type and refers to something in State, the preconditions hold, and the cost fits the remaining budget.',
            card: { tag: 'HOW IT WORKS', title: 'Checked before it runs', body: 'Name, parameters, preconditions, budget. A failure never reaches the server; it becomes a line in the next context.' },
            deep: '<p>Validation is deterministic program code. It does not judge whether the action is a good idea; that is the model\'s responsibility and, later, the completion checks\'. The Decision Pipeline chamber shows the failure types and what each returns.</p>'
          },
          {
            say: 'Execution runs the members of a set-valued call together, each under a timeout. A member that times out gets its own status; the others still return.',
            card: { tag: 'HOW IT WORKS', title: 'Together, bounded', body: 'Up to four references in one call. Each member has a timeout. Results are put back in the proposed order.' },
            deep: '<p>Set-valued parameters replace parallel tool calls. The model still makes one decision per step; the program executes its members concurrently and returns one Observation. This keeps one decision per Step, which the trace and error localization rely on.</p>'
          },
          {
            say: 'Every result is normalized into an Observation with a status: ok, empty, missing data, error or timeout. The raw result is stored on disk; State receives the Observation.',
            card: { tag: 'KEY IDEA', title: 'Every call yields an Observation', body: 'Even a failure is an Observation with a status. The next step always has something to update State with, and the model always sees what happened.' },
            deep: '<p>The status field is what makes the four coverage situations computable: unqueried, missing, no coverage, other cells only. The Observation chamber shows the contract in detail.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['a1', 'a2', 'a3'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g, 0.12, 300); });
          S.pipe = ['decision', 'validate', 'execute', 'normalize', 'Observation'].map(function (n, i) {
            return ctx.node({ x: 200 + i * 300, y: 420, w: 220, h: 56, title: n, color: i === 0 ? 'amber' : (i === 4 ? 'teal' : 'magenta'), titleSize: 13, glow: false });
          });
          S.pl = S.pipe.slice(1).map(function (n, i) { return ctx.link(S.pipe[i], n, { color: 'dim' }); });
          ctx.hotspot(S.pipe[4], 'observation');
          return ctx.reveal(S.pipe.concat(S.pl), { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.exec = D.kv(ctx, 540, 520, 520, [['members', 'up to 4 references in one call'], ['timeout', 'per member'], ['order', 'results returned in the proposed order']], { title: 'execute', color: 'magenta' });
            return ctx.reveal(S.exec.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.st = D.kv(ctx, 1100, 520, 440, [['ok', 'records returned, all valid'], ['empty', 'valid records, no cells'], ['missing', 'no data for some locations'], ['error / timeout', 'the call failed; State still updated']], { title: 'Observation status', color: 'teal' });
            return ctx.reveal(S.st.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
