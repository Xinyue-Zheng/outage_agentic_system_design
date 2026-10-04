/* L1 — Tool Management. From a parsed decision to data: the declared registry, validation before execution,
 * set-valued parameters, timeouts, and one Observation with a status for every call. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'tools',
    refs: [
      'Model Context Protocol project (originated at Anthropic), <i>Model Context Protocol</i> specification, revisions 2024-11-05 to 2026-07-28',
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026',
      'Yang et al., <i>SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering</i>, NeurIPS 2024'
    ],
    poster: 1,
    steps: [
      {
        title: 'Two tools and a registry',
        beats: [
          {
            say: 'The prototype has two tools. Coverage query takes a geographic reference and returns one record per grid location. Impact estimate takes a scope and thresholds and returns backup assignments and loads.',
            card: { tag: 'HOW IT WORKS', title: 'Two Python functions', body: '<code>coverage.query(reference)</code> and <code>impact.estimate(scope, thresholds)</code>. Both exist and run in the synthetic demo.' },
            deep: '<p>Both functions are read-only over frozen data. <code>coverage.query</code> resolves the reference to its geometry and exact grid ids, then returns a record for each id with status valid or missing, the list of cells with RSRP and RSRQ, and the synthetic D0 traffic. <code>impact.estimate</code> reads State and the current observations, never the hidden dataset.</p>'
          },
          {
            say: 'What is missing around them is the declaration layer: a registry that says, for each action, its parameters with types and units, its allowed values, its preconditions, the phase it belongs to, and its cost.',
            card: { tag: 'KEY IDEA', title: 'The registry is what validation checks against', body: 'Codex has JSON schemas per tool; Gemini validates in two stages. The outage loop needs the same declaration before it can validate.' },
            deep: '<p>The handoff says the program checks tool names, parameters and region references. That requires a declared action set. The registry makes it explicit: <code>ActionSpec</code> with name, description, phase, parameter specs, preconditions over State, a cost estimate in queried locations, and a concurrency flag. The <b>Action Registry</b> chamber opens each spec.</p>'
          },
          {
            say: 'Every result is normalized into an Observation with a status: ok, empty, missing data, error, or timeout. The status is what makes the handoff\'s four coverage situations computable rather than inferred.',
            card: { tag: 'KEY IDEA', title: 'Every call yields an Observation', body: 'Including failures. The next model call is always valid because every action has a result, as in all three studied harnesses.' },
            deep: '<p>The prototype already distinguishes valid from missing per record and complete, partial missing and all missing per result. The proposal adds the wrapper statuses error and timeout so a failed or slow query still produces an Observation that enters State and is rendered. The <b>Observation and Status</b> chamber shows the contract.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.t1 = ctx.node({ x: 330, y: 240, w: 400, h: 70, title: 'coverage.query', sub: 'reference → one record per grid id', icon: 'search', color: 'blue', titleSize: 15, subSize: 11, glow: false });
          S.t2 = ctx.node({ x: 330, y: 340, w: 400, h: 70, title: 'impact.estimate', sub: 'scope, thresholds → assignments, loads', icon: 'chart', color: 'blue', titleSize: 15, subSize: 11, glow: false });
          return ctx.reveal([S.t1, S.t2], { from: 'left', stagger: 150 }).then(function () { return ctx.beat(1); }).then(function () {
            S.reg = ctx.node({ x: 900, y: 290, w: 300, h: 120, title: 'action registry', sub: 'ActionSpec per action: params, units, allowed values, preconditions, phase, cost, concurrency', icon: 'doc', color: 'blue', kind: 'ghost', titleSize: 15, subSize: 10.5, glow: false });
            S.r1 = ctx.link(S.t1, S.reg, { color: 'blue', sw: 1.2, dash: '3 4', label: 'declared by', labelDy: -10 });
            S.r2 = ctx.link(S.t2, S.reg, { color: 'blue', sw: 1.2, dash: '3 4' });
            ctx.hotspot(S.reg, 'registry');
            return Promise.all([ctx.reveal(S.reg, { from: 'up' }), ctx.reveal([S.r1, S.r2], { from: 'draw', delay: 200 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.obs = ctx.node({ x: 1350, y: 290, w: 300, h: 120, title: 'Observation', sub: 'status: ok | empty | missing | error | timeout · records · members · duration', icon: 'db', color: 'teal', kind: 'cyl', titleSize: 15, subSize: 10.5, glow: false });
            S.o1 = ctx.link(S.reg, S.obs, { color: 'teal', sw: 1.2, label: 'every call returns one', labelDy: -10 });
            ctx.hotspot(S.obs, 'observation');
            return Promise.all([ctx.reveal(S.obs, { from: 'up' }), ctx.reveal(S.o1, { from: 'draw', delay: 200 })]);
          });
        }
      },
      {
        title: 'Validate before you run',
        beats: [
          {
            say: 'Validation is deterministic and happens before any query. The action name must be in the registry. Each parameter must have the right type and unit. A reference must exist in State. Preconditions over State must hold.',
            card: { tag: 'HOW IT WORKS', title: 'Four checks, no model', body: 'name · parameter types and values · references exist · preconditions. Each failure has its own message back to the model.' },
            deep: '<p>The prototype\'s <code>validate_observation</code> already enforces the tool contract after execution: the geometry equals the reference geometry, the requested grid set equals the reference set, the epoch is pre-outage, and the result has exactly one record per requested id. The proposal moves the first three checks in front of execution, where they belong, and adds the registry lookup.</p>'
          },
          {
            say: 'A precondition is a predicate over State. Impact estimate requires queried locations where D0 was present. Before step one it would be rejected with the message that the study area has zero queried locations.',
            card: { tag: 'KEY IDEA', title: 'Preconditions are the phase boundary', body: 'The backup phase cannot start without coverage evidence. Not a prompt instruction: a check the program runs.' },
            deep: '<p>This is how the fixed-versus-model boundary from the handoff becomes code. The model may propose <code>impact.estimate</code> at any time; the registry says it needs <code>Study_area.target &gt; 0</code>. In the recorded case the first seven steps build that evidence and step 8 passes the check.</p>'
          },
          {
            say: 'Parameter validation and strategy judgment are kept apart. Whether a reference exists is a program fact. Whether querying it is a good idea is a judgment, and the design leaves it to the model until a baseline shows that a reviewer is needed.',
            card: { tag: 'TRADE-OFF', title: 'Validity is not wisdom', body: 'The handoff warns against mixing "the parameters are checked" with "the strategy is right". The registry checks the first only.' },
            deep: '<p>The September deck had one Action verifier box doing both. Codex\'s approval module shows the ordering that works: deterministic rules first, an optional reviewer model behind them, a person as the fallback. The reviewer is deferred here because no recorded failure yet shows what it would have to catch.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.t1, S.t2, S.reg, S.obs, S.r1, S.r2, S.o1], 0.12, 400);
          S.checks = ctx.code({ x: 80, y: 180, w: 720, title: 'validate(decision, State) → ok | failure', lang: 'text', size: 11, color: 'blue', lines: [
            '1. action name in registry           coverage.query ✓',
            '2. parameter types, units, values    reference: id ✓   epoch: pre_outage ✓',
            '3. references exist in State         S2_roadside → 40 grid ids ✓',
            '4. preconditions over State          (none for coverage.query) ✓'
          ] });
          return ctx.reveal(S.checks, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.pre = ctx.code({ x: 840, y: 180, w: 700, title: 'precondition example: impact.estimate', lang: 'text', size: 11, color: 'blue', lines: [
              'requires: Study_area.target > 0   (queried, valid, D0 present)',
              'at state_00: target = 0   → precondition_unmet:',
              '  "impact.estimate needs queried D0 locations; Study_area has 0 queried"',
              'at state_07: target = 252 → ok'
            ] });
            return ctx.reveal(S.pre, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.split = D.kv(ctx, 80, 400, 1460, [['program fact (validate)', 'reference exists · types match · precondition holds'], ['judgment (model, reviewer later)', 'is this the best next query? is the scope sufficient?'], ['why apart', 'a passing check must not be read as "the strategy is right" (handoff §13 item 4)']], { title: 'validity vs wisdom', color: 'blue' });
            return ctx.reveal(S.split.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Set-valued parameters',
        beats: [
          {
            say: 'Most outage queries are independent: two settlements, the corridor east and west of a site, three candidate backup cells, two time windows. The design handles this with set valued parameters, not with several actions per reply.',
            card: { tag: 'KEY IDEA', title: 'One decision, a set of members', body: 'regions {S2, S3} is one action. The tool executes the members concurrently; the loop sees one Step and one Observation.' },
            deep: '<p>Codex allows the model to emit several tool calls in one reply and runs the parallel-safe ones under a read lock. That is a representation detail of a harness that does not know its tools\' meaning. The outage harness owns its tools, so it can declare a parameter as a set and keep one decision per Step, which error localization needs.</p>'
          },
          {
            say: 'Each member gets its own status inside the Observation. A member that times out does not hide the others. Validation checks every member against State, and the cost is the sum over members.',
            card: { tag: 'HOW IT WORKS', title: 'Per-member status, summed cost', body: 'Observation.members: [{member, status, records}]. A batch cap, four by default, bounds the cost of one step.' },
            deep: '<p>The batch cap of four matches TurnL\'s default for parallel tools. With the 2,400-location study area a set of four settlements could still cost several hundred locations, so the per-step budget check uses the summed cost estimate before execution.</p>'
          },
          {
            say: 'Does the task ever require two different actions at the same moment? No. The dependency structure is a partial order and a query result never expires, so pending gaps can always be closed one at a time. Sets are an efficiency, never a necessity.',
            card: { tag: 'WHY IT MATTERS', title: 'Simultaneity is possible, never necessary', body: 'Frontier expansion is strictly sequential. Known candidates can be batched. Nothing is lost by sequencing except model rounds.' },
            deep: '<p>Latency is the real argument for sets. A model call with a few thousand input tokens takes on the order of 10 to 30 seconds; a coverage query takes seconds. Six independent queries as six rounds cost six model calls; as one set they cost one. Together with a per-query timeout and a wall-time cap, the run\'s delay is bounded from both sides.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.checks, S.pre, S.split.g], 0.1, 400);
          S.dec = ctx.code({ x: 80, y: 180, w: 640, title: 'one decision with a set-valued parameter', lang: 'text', size: 11, color: 'amber', lines: ['action:     coverage.query', 'parameters: references = {S2_remaining, S3}', 'gap:        does D0 reach the S2 interior, and is S3 covered at all?'] });
          return ctx.reveal(S.dec, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.m1 = ctx.node({ x: 980, y: 210, w: 240, h: 54, title: 'S2_remaining', sub: '160 locations · status ok · 9 missing', color: 'blue', titleSize: 13, subSize: 10.5, glow: false });
            S.m2 = ctx.node({ x: 980, y: 290, w: 240, h: 54, title: 'S3', sub: '48 locations · status ok · 2 missing', color: 'blue', titleSize: 13, subSize: 10.5, glow: false });
            S.m3 = ctx.node({ x: 1380, y: 250, w: 260, h: 70, title: 'Observation (one)', sub: 'members: 2 · cost: 208 locations · duration: max of members', color: 'teal', kind: 'cyl', titleSize: 13, subSize: 10.5, glow: false });
            S.ml = [ctx.link(S.m1, S.m3, { color: 'teal', sw: 1.2 }), ctx.link(S.m2, S.m3, { color: 'teal', sw: 1.2 })];
            S.mlab = ctx.label(980, 360, 'executed concurrently inside the tool · batch cap 4', { color: 'blue', size: 11.5 });
            return Promise.all([ctx.reveal([S.m1, S.m2, S.m3], { from: 'up', stagger: 100 }), ctx.reveal(S.ml, { from: 'draw', delay: 250 }), ctx.reveal(S.mlab, { from: 'down', delay: 300 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.dep = D.kv(ctx, 80, 420, 1460, [['frontier expansion', 'sequential: the next scope depends on the frontier result'], ['known candidates (settlements, corridors, backup cells, windows)', 'independent: one set-valued action'], ['different data for one region (coverage, OSM)', 'OSM is loaded at initialization; never needed at decision time'], ['two different actions at once', 'never required; results do not expire'], ['delay', 'six rounds → one round; per-query timeout + wall-time cap bound both sides']], { title: 'dependency structure of outage queries', color: 'blue' });
            return ctx.reveal(S.dep.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Execute and normalize',
        beats: [
          {
            say: 'Execution routes the action name to the Python function, runs it under a per query timeout, and wraps the result. The reference is resolved to geometry and grid ids first; the function never receives a step id or anything that could select an answer.',
            card: { tag: 'HOW IT WORKS', title: 'Resolve, run, wrap', body: 'resolve_reference → grid ids; query_coverage(ids) → records; normalize → Observation with status and duration.' },
            deep: '<p>In the prototype <code>resolve_reference</code> turns a reference id into its geometry and exact grid id set, and <code>query_coverage</code> returns one record per id. The proposal adds the timeout and the wrapper. A timed-out member gets status timeout and no records; the Observation still exists and State records that the scope was attempted.</p>'
          },
          {
            say: 'The result is checked against the contract before it reaches State: exactly one record per requested id, missing records carry no signals, valid records have finite values, and the result status agrees with the records.',
            card: { tag: 'PITFALL', title: 'A tool result can be wrong too', body: 'The program verifies the result shape. A record for an id that was not requested, or a missing record with a signal, is rejected loudly.' },
            deep: '<p>These checks exist in the prototype as <code>validate_observation</code>. They are the analog of Codex verifying a patch against the current file: the environment\'s answer is checked before it changes anything. A contract violation raises; there is no silent default, by project policy.</p>'
          },
          {
            say: 'The raw result stays on disk with a path. State keeps a link and an evidence index from each grid id to the observation that produced its current record. The model gets counts; the file is there for drill down and for offline evaluation.',
            card: { tag: 'NUMBERS', title: 'Seven query results on disk', stat: { v: '232 KB', l: 'obs_01 to obs_07 kept in full; the model saw about 3,000 tokens of rendered facts per step' } },
            deep: '<p>Codex does the same in its own way: full tool output goes to the rollout log while the live history gets a truncated copy. Here the split is cleaner because the program knows the output format and can render facts instead of truncating text.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.dec, S.m1, S.m2, S.m3, S.ml, S.mlab, S.dep.g], 0.1, 400);
          S.ex = D.loop(ctx, { names: ['resolve_reference', 'query_coverage', 'validate_result', 'normalize'], subs: { resolve_reference: 'id → geometry + grid ids', query_coverage: 'ids → records · timeout', validate_result: 'one record per id · shapes', normalize: 'Observation + status' }, colors: { normalize: 'teal' }, x: 120, y: 230, w: 300, h: 60, gap: 60, loopBack: false });
          return ctx.reveal(S.ex.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.contract = ctx.code({ x: 80, y: 340, w: 720, title: 'validate_result (prototype: validate_observation)', lang: 'text', size: 10.5, color: 'blue', lines: [
              'exactly one record per requested grid id',
              'missing record → no cells, no traffic',
              'valid record   → finite RSRP/RSRQ, unique cell ids, finite demand',
              'result_status agrees with the records (complete | partial_missing | all_missing)',
              'violation → raise; no silent default'
            ] });
            return ctx.reveal(S.contract, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            var rows = CASE.steps.filter(function (s) { return s.observation; }).map(function (s) { return [s.observation.id + ' · ' + s.observation.reference_id, (s.observation.bytes / 1024).toFixed(0) + ' KB · ' + s.observation.result_status]; });
            S.disk = D.kv(ctx, 840, 340, 700, rows, { title: 'raw results kept on disk', color: 'teal', lh: 20 });
            return ctx.reveal(S.disk.g, { from: 'up' });
          });
        }
      },
      {
        title: 'MCP and what is left out',
        beats: [
          {
            say: 'MCP does not let the model reach data by itself. The model emits a tool call; the harness, as MCP client, calls a server; the result comes back through the harness. Who interprets the data does not change.',
            card: { tag: 'KEY IDEA', title: 'MCP is a wire protocol', body: 'Host, client, server. It standardizes how a harness calls tools. It does not change what the model sees or who computes.' },
            deep: '<p>Inside the outage loop MCP would add a process boundary and a JSON schema that the registry needs anyway, and nothing else. The handoff lists it as a candidate; the design leaves it out of the loop.</p>'
          },
          {
            say: 'Where MCP is worth doing once: wrap the same query functions as an MCP server and run Codex CLI on the same cases. That is the baseline that answers the question why not just use Codex, with a measurement.',
            card: { tag: 'HOW IT WORKS', title: 'MCP for the baseline only', body: 'Same functions, exposed to Codex CLI; skill text as AGENTS.md; same cases, same budget. Then compare.' },
            deep: '<p>Precondition: the internal model endpoint must be reachable from Codex and support tool calling. If it does not, the baseline becomes a minimal append-only loop written in the project, which is also acceptable. Either way the comparison is the evidence the design needs, not an argument.</p>'
          },
          {
            say: 'Also left out, with reasons: a shell tool, file editing, an operating system sandbox, and subagents. The tools are read only queries over frozen data in one process.',
            card: { tag: 'TRADE-OFF', title: 'Left out on purpose', body: 'shell, file edits, sandbox, subagents, interactive approval. Each exists in Codex because coding needs it. Outage analysis does not.' },
            deep: '<p>The mentor\'s rule applies: no components for their own sake. Each omission is recorded with its reason so that it can be revisited if a recorded failure calls for it. The sandbox collapses into parameter rules: time window inside the outage window, maximum query area, budget remaining, only declared actions.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.ex.g, S.contract, S.disk.g], 0.1, 400);
          S.host = ctx.node({ x: 300, y: 240, w: 240, h: 60, title: 'harness (MCP client)', sub: 'still parses, validates, renders', color: 'magenta', titleSize: 13, subSize: 10.5, glow: false });
          S.srv = ctx.node({ x: 680, y: 240, w: 240, h: 60, title: 'MCP server', sub: 'wraps coverage.query, impact.estimate', color: 'blue', titleSize: 13, subSize: 10.5, glow: false });
          S.mdl = ctx.node({ x: 300, y: 360, w: 240, h: 60, title: 'model', sub: 'emits a tool call; never reaches data', color: 'amber', titleSize: 13, subSize: 10.5, glow: false });
          S.ms = [ctx.link(S.mdl, S.host, { color: 'amber', sw: 1.2, label: 'tool call', labelDx: 50 }), ctx.link(S.host, S.srv, { color: 'blue', sw: 1.2, label: 'call', labelDy: -10 }), ctx.link(S.srv, S.host, { color: 'teal', sw: 1.2, from: 'b', to: 'b', bend: { x: 490, y: 330 }, dash: '3 4', label: 'result', labelDy: 14 })];
          return Promise.all([ctx.reveal([S.host, S.srv, S.mdl], { from: 'up', stagger: 100 }), ctx.reveal(S.ms, { from: 'draw', delay: 250 })]).then(function () { return ctx.beat(1); }).then(function () {
            S.codex = ctx.node({ x: 1200, y: 240, w: 300, h: 60, title: 'Codex CLI (baseline)', sub: 'AGENTS.md = skill · tools via the MCP server', color: 'dim', kind: 'ghost', titleSize: 13, subSize: 10.5, glow: false });
            S.cl = ctx.link(S.codex, S.srv, { color: 'blue', sw: 1.2, dash: '3 4', label: 'same functions, same cases', labelDy: -10 });
            return Promise.all([ctx.reveal(S.codex, { from: 'right' }), ctx.reveal(S.cl, { from: 'draw', delay: 150 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.out = D.kv(ctx, 80, 470, 1460, [['shell tool, file edits', 'no files to change; queries are read-only'], ['operating-system sandbox', 'collapses into parameter rules: window, max area, budget, declared actions only'], ['subagents', 'tightly coupled spatial investigation; one thread'], ['interactive approval mid-run', 'nothing irreversible happens; a person reviews the typed end'], ['MCP inside the loop', 'a process boundary and a schema the registry needs anyway']], { title: 'left out, with the reason', color: 'red' });
            return ctx.reveal(S.out.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
