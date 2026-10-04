/* L2 — Action Registry. The declared action set the program validates against: parameters, units,
 * allowed values, preconditions, phase, cost and concurrency, for the two existing tools and the proposed ones. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'registry',
    refs: [
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026',
      'Model Context Protocol project (originated at Anthropic), <i>Model Context Protocol</i> specification, revisions 2024-11-05 to 2026-07-28'
    ],
    poster: 1,
    steps: [
      {
        title: 'ActionSpec',
        beats: [
          {
            say: 'An action spec declares everything the program needs to validate a proposal without running it: a name, a description for the model, the phase, the parameters with types and units, preconditions over State, a cost estimate and a concurrency flag.',
            card: { tag: 'HOW IT WORKS', title: 'Eight fields per action', body: 'name · description · phase · params · preconditions · cost_estimate · concurrency · result type.' },
            deep: '<p>Codex sends each tool as a JSON schema with a description; Gemini validates parameters in two stages, schema then values. The outage registry adds what those do not have because they do not know the task: a phase, preconditions as predicates over State, and a cost estimate in queried locations so the budget check can run before execution.</p>'
          },
          {
            say: 'Parameters are ids of things that exist in State, not free text. A reference id resolves to geometry and grid ids. A cell id resolves to a known site. The model never writes coordinates.',
            card: { tag: 'KEY IDEA', title: 'Ids, not coordinates', body: 'Prefer identifiers to free text: Codex\'s own failure-mode advice. A bad id is caught by lookup; bad coordinates are not.' },
            deep: '<p>The prototype\'s <code>resolve_reference</code> is the lookup. It takes a reference id and returns the geometry and the exact set of grid ids, and it refuses unknown ids. This is why the parameter type is <code>reference_id</code> with allowed values equal to the references in State, not a polygon.</p>'
          },
          {
            say: 'The description is what the model reads. The rest is what the program reads. Keeping both in one record means the model is never told about an action the program cannot validate.',
            card: { tag: 'WHY IT MATTERS', title: 'One record, two readers', body: 'The rendered "allowed actions" list is generated from the registry, so model view and program view cannot drift apart.' },
            deep: '<p>Gemini CLI\'s plan mode shows the failure this prevents: when the model must not write, the write tools\' descriptions are prefixed with a warning and the policy engine denies them. Two mechanisms that must agree. Generating the model-facing text from the registry removes the second mechanism.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.spec = ctx.code({ x: 80, y: 180, w: 700, title: 'ActionSpec', lang: 'text', size: 11, color: 'blue', lines: [
            'name:          str', 'description:   str                    # read by the model', 'phase:         init | coverage | backup | any',
            'params:        {name: {type, unit, allowed_values | reference_kind, set_valued, max_members}}',
            'preconditions: [predicate over State]', 'cost_estimate: (params) -> queried locations', 'concurrency:   parallel_safe | serialized', 'result:        Observation'
          ] });
          return ctx.reveal(S.spec, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.ids = D.kv(ctx, 820, 180, 720, [['reference_id', CASE.references.map(function (r) { return r.id; }).slice(0, 6).join(', ') + ', …'], ['cell_id', 'D0, B1, B2, B3'], ['coordinates', 'never a parameter'], ['resolution', 'resolve_reference(id) → geometry + grid ids, or an error']], { title: 'parameter values are ids in State', color: 'blue' });
            return ctx.reveal(S.ids.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.two = ctx.code({ x: 80, y: 430, w: 1460, title: 'rendered for the model from the same record', lang: 'text', size: 11, color: 'amber', lines: [
              'coverage.query(references: set of reference ids, max 4) — pre-outage coverage records for every grid location in the references',
              'impact.estimate(scope, min_rsrp_dbm, min_rsrq_db)       — backup assignment and load for queried D0 locations in scope (needs coverage evidence)'
            ] });
            return ctx.reveal(S.two, { from: 'up' });
          });
        }
      },
      {
        title: 'coverage.query',
        beats: [
          {
            say: 'Coverage query belongs to the coverage phase. Its one parameter is a set of reference ids, at most four. It has no precondition. Its cost is the number of grid locations in the set, after deduplication.',
            card: { tag: 'HOW IT WORKS', title: 'The main action', body: 'references: set of reference_id, max 4 · cost = union of grid ids · parallel-safe · no precondition.' },
            deep: '<p>In the recorded case the costs were 36, 88, 192, 40, 160, 48 and 40 locations, 604 in total, of which 466 distinct. The cost estimate is computed before execution from the reference grid sets, so a budget check can refuse a step that would exceed the remaining area budget.</p>'
          },
          {
            say: 'Allowed values are the references in State. The synthetic case has eleven, including two sub areas of S2 declared in advance. Declaring sub areas is how the program lets the model query part of a settlement without inventing geometry.',
            card: { tag: 'KEY IDEA', title: 'Sub-areas are declared, not drawn', body: 'S2_roadside and S2_remaining are references like any other. The model picks one; the program resolves it.' },
            deep: '<p>Whether to query part of a settlement first was a case-specific strategy in the manual trace. The registry does not encode the strategy; it makes it expressible. A later version could let the program derive sub-areas from roads and settlement polygons automatically, still as named references.</p>'
          },
          {
            say: 'The result is one Observation with one member per reference, each with its records and status. A repeat of a reference already queried is allowed by the registry; the repeated query guard in loop control is what catches it.',
            card: { tag: 'TRADE-OFF', title: 'The registry does not judge repeats', body: 'Re-querying is legal and sometimes right. The guard counts identical action and parameters; the registry stays simple.' },
            deep: '<p>Keeping the registry free of policy is deliberate. It answers "is this a valid call" only. Repeats, budgets and caps are counters in loop control with their own typed end reasons, so a run that ends for a policy reason is recorded as such.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.spec, S.ids.g, S.two], 0.1, 400);
          S.cq = ctx.code({ x: 80, y: 180, w: 700, title: 'coverage.query', lang: 'text', size: 11, color: 'blue', lines: [
            'phase:         coverage', 'params:        references: {type: reference_id, set_valued: true, max_members: 4}',
            'preconditions: []', 'cost_estimate: |union of grid ids of the references|', 'concurrency:   parallel_safe',
            'recorded costs: 36, 88, 192, 40, 160, 48, 40  (604 total, 466 distinct)'
          ] });
          return ctx.reveal(S.cq, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.refs = D.kv(ctx, 820, 180, 720, CASE.references.map(function (r) { return [r.id + (r.buffer_width_m ? ' (buffer ' + r.buffer_width_m + ' m)' : ''), r.grid_count + ' locations']; }), { title: 'allowed values: references in State', color: 'blue', lh: 19 });
            return ctx.reveal(S.refs.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.rep = ctx.code({ x: 80, y: 420, w: 700, title: 'repeat handling', lang: 'text', size: 11, color: 'red', lines: ['registry:   coverage.query(S2_roadside) at step 7 is valid', 'loop_guards: hash(action, parameters) seen at step 4 → repeated_query', 'recorded run: allowed through to show deduplication'] });
            return ctx.reveal(S.rep, { from: 'up' });
          });
        }
      },
      {
        title: 'impact.estimate',
        beats: [
          {
            say: 'Impact estimate belongs to the backup phase. Its parameters are a scope reference and two thresholds with units: minimum RSRP in dBm and minimum RSRQ in dB. Its precondition is that the scope has queried locations with D0 present.',
            card: { tag: 'HOW IT WORKS', title: 'The phase-two action', body: 'scope: reference_id · min_rsrp_dbm: float · min_rsrq_db: float · precondition: scope.target &gt; 0 · cost 0 locations.' },
            deep: '<p>The recorded step used the study area as scope with thresholds minus 112 dBm and minus 16 dB. The selection rule and the load formula are fixed strings in the prototype and are checked for equality; a different formula is rejected. That is a conservative choice for a demonstration model that must not be mistaken for a calibrated one.</p>'
          },
          {
            say: 'The precondition is also the phase boundary. Before any coverage evidence exists the action is rejected with a message that names the missing step. The model learns the order from the error, not from a prompt rule.',
            card: { tag: 'KEY IDEA', title: 'Order enforced by a check', body: 'At state_00 the scope has zero D0 locations. The error says so. At state_07 it has 252 and the action runs.' },
            deep: '<p>This replaces a sentence in the skill such as "do the impact analysis after coverage" with a check the program runs. A prompt rule can be ignored; a precondition cannot. Codex uses the same idea for apply_patch, which fails verification when the file does not match.</p>'
          },
          {
            say: 'Any later spatial observation invalidates the impact result. The registry records this as an effect: coverage query clears impact. The State update enforces it, and the model is told that the analysis has not been performed.',
            card: { tag: 'PITFALL', title: 'Stale estimates are removed', body: 'A new coverage query after step 8 would reset impact to none, so the rendering never shows an estimate older than the evidence.' },
            deep: '<p>In the prototype <code>apply_coverage</code> sets <code>impact</code> to none on every new observation, and <code>apply_impact</code> recomputes the estimate from current evidence and rejects a result that does not match. The registry makes the dependency visible to the model through the rendered unknowns.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.cq, S.refs.g, S.rep], 0.1, 400);
          S.ie = ctx.code({ x: 80, y: 180, w: 720, title: 'impact.estimate', lang: 'text', size: 11, color: 'blue', lines: [
            'phase:         backup', 'params:        scope: reference_id · min_rsrp_dbm: float (dBm) · min_rsrq_db: float (dB)',
            'preconditions: [scope.target > 0]', 'cost_estimate: 0 queried locations', 'concurrency:   serialized',
            'fixed:         selection rule and load formula are checked for equality'
          ] });
          return ctx.reveal(S.ie, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.gate = D.kv(ctx, 840, 180, 700, [['state_00', 'target = 0 → precondition_unmet'], ['state_03', 'target = 222 → ok (would run on partial evidence)'], ['state_07', 'target = 252 → ok, recorded step 8'], ['message', '"impact.estimate needs queried D0 locations; Study_area has 0"']], { title: 'the precondition over the run', color: 'blue' });
            return ctx.reveal(S.gate.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.inv = ctx.code({ x: 80, y: 410, w: 1460, title: 'effects', lang: 'text', size: 11, color: 'red', lines: ['coverage.query  → State.impact = none   ("Backup selection, traffic transfer, and load estimation have not been performed.")', 'impact.estimate → recomputed from current evidence; a stale or mismatching result is rejected before it enters State'] });
            return ctx.reveal(S.inv, { from: 'up' });
          });
        }
      },
      {
        title: 'Proposed actions',
        beats: [
          {
            say: 'Two actions are proposed and not yet built. Inspect observation returns a bounded table of the rows of one observation. Finish carries the model\'s stop proposal to the completion checks.',
            card: { tag: 'HOW IT WORKS', title: 'inspect_observation and finish', body: 'Drill down with zero area cost; and an explicit stop action instead of silence.' },
            deep: '<p>Gemini CLI\'s subagents must end with an explicit <code>complete_task</code> call; the parent loop stops on silence. The outage loop takes the explicit form for the main loop too: a finish action with a reason the completion checks can read, so "no more queries" is never confused with "done".</p>'
          },
          {
            say: 'Both have costs and preconditions like any other action. Inspect observation costs no area but is capped in rows. Finish has no cost and its precondition is that at least one query has run.',
            card: { tag: 'NUMBERS', title: 'Bounded drill-down', stat: { v: '≤ 50', l: 'rows per inspect_observation call, proposed cap; raw results are 36 to 192 rows' } },
            deep: '<p>The row cap keeps the next rendering bounded. The returned rows go into State as an Observation of kind inspection, so the step is recorded like any other and the model\'s reason for looking is in the gap field.</p>'
          },
          {
            say: 'What the registry does not hold: thresholds for completion checks, caps, or strategy. Those live in the checks module and in loop control. The registry answers one question only: is this a valid call.',
            card: { tag: 'KEY IDEA', title: 'One question only', body: 'Valid or not. Wisdom, budgets and stopping are other modules, recorded separately in the trace.' },
            deep: '<p>Keeping modules single-purpose is what makes the run record readable: a rejection by the registry, a cap in loop control and a failed completion check are three different lines in the trace with three different fixes.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.ie, S.gate.g, S.inv], 0.1, 400);
          S.p1 = ctx.code({ x: 80, y: 180, w: 720, title: 'inspect_observation (proposed)', lang: 'text', size: 11, color: 'amber', lines: ['phase: any', 'params: observation_id: id in State.observations · max_rows: int ≤ 50', 'preconditions: [observation exists]', 'cost_estimate: 0', 'result: Observation(kind=inspection, rows)'] });
          S.p2 = ctx.code({ x: 820, y: 180, w: 720, title: 'finish (proposed)', lang: 'text', size: 11, color: 'amber', lines: ['phase: any', 'params: reason: str', 'preconditions: [at least one executed query]', 'cost_estimate: 0', 'result: completion_checks → accepted | unmet requirements'] });
          return ctx.reveal([S.p1, S.p2], { from: 'up', stagger: 150 }).then(function () { return ctx.beat(1); }).then(function () {
            S.cap = ctx.label(800, 400, 'rows per inspect call capped at 50; raw results are 36 to 192 rows', { color: 'amber', size: 12 });
            return ctx.reveal(S.cap, { from: 'down' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.not = D.kv(ctx, 80, 450, 1460, [['completion thresholds', 'checks module'], ['step cap, area budget, time cap, repeat threshold', 'loop control'], ['is this the best query', 'the model; a reviewer later, if recorded failures call for it']], { title: 'not in the registry', color: 'red' });
            return ctx.reveal(S.not.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
