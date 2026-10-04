/* L1 — Tool Management. From a parsed decision to data: the declared registry, validation before execution,
 * set-valued parameters, and one Observation with a status for every call. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'tools',
    refs: [
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026',
      'Yang et al., <i>SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering</i>, NeurIPS 2024'
    ],
    poster: 1,
    steps: [
      {
        title: 'Two tools, one registry',
        beats: [
          {
            say: 'Two tools exist. Coverage query takes a geographic reference and returns one record per grid location. Impact estimate takes a scope and thresholds and returns backup assignments and loads.',
            card: { tag: 'HOW IT WORKS', title: 'Two Python functions', body: '<code>coverage.query(reference)</code> and <code>impact.estimate(scope, thresholds)</code>. Both run in the synthetic demo.' },
            deep: '<p>Both are read-only over frozen data. <code>coverage.query</code> resolves the reference to its grid ids and returns a record per id with status valid or missing, the cells heard with RSRP and RSRQ, and the synthetic D0 traffic. <code>impact.estimate</code> reads State and the executed observations only.</p>'
          },
          {
            say: 'Around them sits a registry: for each action its parameters with types and units, allowed values, preconditions, the phase it belongs to, and its cost.',
            card: { tag: 'KEY IDEA', title: 'The registry is what validation checks against', body: 'name · params · preconditions · phase · cost. Open the Action Registry chamber for each action.' },
            deep: '<p>The program can only validate a proposal against a declaration. The registry is that declaration: <code>ActionSpec</code> with parameter specs, preconditions as predicates over State, and a cost estimate in queried locations so the budget check runs before execution.</p>'
          },
          {
            say: 'Every call returns an Observation with a status: ok, empty, missing data, error or timeout. That is what makes the four coverage situations computable.',
            card: { tag: 'KEY IDEA', title: 'Every call yields an Observation', body: 'Including failures, so the next model call is always valid. Open the Observation and Status chamber for the contract.' },
            deep: '<p>Per record the prototype already distinguishes valid from missing, and per result complete from partial missing. The wrapper statuses error and timeout make a failed or slow query an Observation too, so it enters State and is rendered.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.t1 = ctx.node({ x: 330, y: 240, w: 400, h: 70, title: 'coverage.query', sub: 'reference → one record per grid id', icon: 'search', color: 'blue', titleSize: 15, subSize: 11, glow: false });
          S.t2 = ctx.node({ x: 330, y: 340, w: 400, h: 70, title: 'impact.estimate', sub: 'scope, thresholds → assignments, loads', icon: 'chart', color: 'blue', titleSize: 15, subSize: 11, glow: false });
          return ctx.reveal([S.t1, S.t2], { from: 'left', stagger: 150 }).then(function () { return ctx.beat(1); }).then(function () {
            S.reg = ctx.node({ x: 900, y: 290, w: 300, h: 120, title: 'action registry', sub: 'params · units · allowed values · preconditions · phase · cost', icon: 'doc', color: 'blue', kind: 'ghost', titleSize: 15, subSize: 10.5, glow: false });
            S.r1 = ctx.link(S.t1, S.reg, { color: 'blue', sw: 1.2, dash: '3 4', label: 'declared by', labelDy: -10 });
            S.r2 = ctx.link(S.t2, S.reg, { color: 'blue', sw: 1.2, dash: '3 4' });
            ctx.hotspot(S.reg, 'registry');
            return Promise.all([ctx.reveal(S.reg, { from: 'up' }), ctx.reveal([S.r1, S.r2], { from: 'draw', delay: 200 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.obs = ctx.node({ x: 1350, y: 290, w: 300, h: 120, title: 'Observation', sub: 'status: ok | empty | missing | error | timeout', icon: 'db', color: 'teal', kind: 'cyl', titleSize: 15, subSize: 10.5, glow: false });
            S.o1 = ctx.link(S.reg, S.obs, { color: 'teal', sw: 1.2, label: 'every call returns one', labelDy: -10 });
            ctx.hotspot(S.obs, 'observation');
            return Promise.all([ctx.reveal(S.obs, { from: 'up' }), ctx.reveal(S.o1, { from: 'draw', delay: 200 })]);
          });
        }
      },
      {
        title: 'Validate, then run',
        beats: [
          {
            say: 'Validation runs before any query. The action name must be in the registry, each parameter must have the right type and unit, a reference must exist in State, and the preconditions must hold.',
            card: { tag: 'HOW IT WORKS', title: 'Four checks, no model', body: 'name · parameter types and values · references exist · preconditions. Each failure has its own message back to the model.' },
            deep: '<p>For step 4 of the case: <code>coverage.query</code> exists; <code>S2_roadside</code> is a known reference with 40 grid ids; the geometry equals the reference geometry; the epoch is pre-outage. Had the reference been unknown, the error would list the known references and the round would start again.</p>'
          },
          {
            say: 'A precondition is a predicate over State. Impact estimate requires queried locations where D0 was present. Before step one it is rejected; at step eight it runs.',
            card: { tag: 'KEY IDEA', title: 'Preconditions are the phase boundary', body: 'The backup phase cannot start without coverage evidence. Not a prompt instruction: a check the program runs.' },
            deep: '<p>The model may propose <code>impact.estimate</code> at any time; the registry says it needs <code>Study_area.target &gt; 0</code>. In the recorded case the first seven steps build that evidence and step 8 passes the check.</p>'
          },
          {
            say: 'Validity is not wisdom. Whether a reference exists is a program fact. Whether querying it is a good idea is a judgment, left to the model.',
            card: { tag: 'TRADE-OFF', title: 'Validity, not wisdom', body: 'A passing check means the call is well formed and allowed. It does not mean the investigation strategy is right.' },
            deep: '<p>Keeping the two apart keeps the trace readable: a rejection means the model proposed something the program could not run; a failed completion check means the investigation was not finished. Different fixes, different experiments.</p>'
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
            S.pre = ctx.code({ x: 840, y: 180, w: 700, title: 'precondition: impact.estimate', lang: 'text', size: 11, color: 'blue', lines: [
              'requires: Study_area.target > 0   (queried, valid, D0 present)',
              'state_00: target = 0   → precondition_unmet',
              'state_07: target = 252 → ok'
            ] });
            return ctx.reveal(S.pre, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.split = D.kv(ctx, 80, 400, 1460, [['program fact (validate)', 'reference exists · types match · precondition holds'], ['judgment (the model)', 'is this the best next query? is the scope sufficient?']], { title: 'validity vs wisdom', color: 'blue' });
            return ctx.reveal(S.split.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Set-valued parameters',
        beats: [
          {
            say: 'Many outage queries are independent: two settlements, both sides of a corridor, three candidate backup cells. A set valued parameter handles this as one decision.',
            card: { tag: 'KEY IDEA', title: 'One decision, a set of members', body: 'regions {S2, S3} is one action. The tool executes the members concurrently; the loop sees one Step and one Observation.' },
            deep: '<p>One decision per Step is what error localization and modified-step re-runs need. The program owns the tools, so it can declare a parameter as a set instead of letting the model emit several calls per reply.</p>'
          },
          {
            say: 'Each member gets its own status inside the Observation. A member that times out does not hide the others. The cost is the sum over members, and a batch cap bounds it.',
            card: { tag: 'HOW IT WORKS', title: 'Per-member status, summed cost', body: 'Observation.members: [{member, status, records}]. Batch cap 4. Validation checks every member against State.' },
            deep: '<p>With the 2,400-location study area a set of four settlements can cost several hundred locations, so the per-step budget check uses the summed cost estimate before execution.</p>'
          },
          {
            say: 'Frontier expansion stays sequential: the next scope depends on the frontier result. Sets are an efficiency for known candidates, never a necessity.',
            card: { tag: 'WHY IT MATTERS', title: 'Fewer model rounds, same area', body: 'Six independent queries as one set cost one model call instead of six. A per-query timeout and a wall-time cap bound the delay.' },
            deep: '<p>A model call with a few thousand input tokens takes tens of seconds; a coverage query takes seconds. Sets reduce the number of model rounds; they do not change the queried area or the result.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.checks, S.pre, S.split.g], 0.1, 400);
          S.dec = ctx.code({ x: 80, y: 180, w: 640, title: 'one decision with a set-valued parameter', lang: 'text', size: 11, color: 'amber', lines: ['action:     coverage.query', 'parameters: references = {S2_remaining, S3}', 'gap:        does D0 reach the S2 interior, and is S3 covered at all?'] });
          return ctx.reveal(S.dec, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.m1 = ctx.node({ x: 980, y: 210, w: 240, h: 54, title: 'S2_remaining', sub: '160 locations · ok · 9 missing', color: 'blue', titleSize: 13, subSize: 10.5, glow: false });
            S.m2 = ctx.node({ x: 980, y: 290, w: 240, h: 54, title: 'S3', sub: '48 locations · ok · 2 missing', color: 'blue', titleSize: 13, subSize: 10.5, glow: false });
            S.m3 = ctx.node({ x: 1380, y: 250, w: 260, h: 70, title: 'Observation (one)', sub: 'members: 2 · cost: 208 locations', color: 'teal', kind: 'cyl', titleSize: 13, subSize: 10.5, glow: false });
            S.ml = [ctx.link(S.m1, S.m3, { color: 'teal', sw: 1.2 }), ctx.link(S.m2, S.m3, { color: 'teal', sw: 1.2 })];
            S.mlab = ctx.label(980, 360, 'executed concurrently inside the tool · batch cap 4', { color: 'blue', size: 11.5 });
            return Promise.all([ctx.reveal([S.m1, S.m2, S.m3], { from: 'up', stagger: 100 }), ctx.reveal(S.ml, { from: 'draw', delay: 250 }), ctx.reveal(S.mlab, { from: 'down', delay: 300 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.dep = D.kv(ctx, 80, 420, 1460, [['frontier expansion', 'sequential: the next scope depends on the frontier result'], ['known candidates (settlements, corridors, backup cells)', 'independent: one set-valued action'], ['delay', 'six rounds → one round; per-query timeout + wall-time cap']], { title: 'dependency structure of outage queries', color: 'blue' });
            return ctx.reveal(S.dep.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Execute and normalize',
        beats: [
          {
            say: 'Execution resolves the reference to grid ids, runs the function under a timeout, and wraps the result. The function never receives a step id or anything that could select an answer.',
            card: { tag: 'HOW IT WORKS', title: 'Resolve, run, wrap', body: 'resolve_reference → grid ids; query_coverage(ids) → records; normalize → Observation with status and duration.' },
            deep: '<p>A timed-out member gets status timeout and no records; the Observation still exists and State records that the scope was attempted. The duration of each call is recorded for the wall-time cap and for offline evaluation.</p>'
          },
          {
            say: 'The result is checked against the contract before it reaches State: one record per requested id, missing records carry no signals, valid records have finite values, and the result status agrees with the records.',
            card: { tag: 'PITFALL', title: 'A tool result can be wrong too', body: 'A record for an id that was not requested, or a missing record with a signal, is rejected loudly.' },
            deep: '<p>These checks exist in the prototype as <code>validate_observation</code>. A contract violation raises; there is no silent default.</p>'
          },
          {
            say: 'The raw result stays on disk with a path. State keeps a link and an evidence index from each grid id to the observation that produced its current record.',
            card: { tag: 'NUMBERS', title: 'Seven results on disk', stat: { v: '232 KB', l: 'obs_01 to obs_07 kept in full; the model saw about 3,000 tokens of rendered facts per step' } },
            deep: '<p>The model gets counts; the file is there for drill-down and for offline evaluation. The provenance section of the rendering names the observation ids so facts can be traced back.</p>'
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
              'result_status agrees with the records',
              'violation → raise; no silent default'
            ] });
            return ctx.reveal(S.contract, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            var rows = CASE.steps.filter(function (s) { return s.observation; }).map(function (s) { return [s.observation.id + ' · ' + s.observation.reference_id, (s.observation.bytes / 1024).toFixed(0) + ' KB · ' + s.observation.result_status]; });
            S.disk = D.kv(ctx, 840, 340, 700, rows, { title: 'raw results kept on disk', color: 'teal', lh: 20 });
            return ctx.reveal(S.disk.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
