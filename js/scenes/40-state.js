/* L1 — State and Trace. What the program remembers: immutable State snapshots with provenance, region summaries,
 * the frontier rule, impact invalidation, Steps, the Trace, and the Step as a checkpoint candidate. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'state',
    refs: [
      'Anthropic, <i>Effective harnesses for long-running agents</i>, 2025',
      'Yang et al., <i>SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering</i>, NeurIPS 2024',
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026'
    ],
    poster: 1,
    steps: [
      {
        title: 'What State holds',
        beats: [
          {
            say: 'State is everything the investigation has established so far, as data. The task. The grid and geography. Spatial relations with their evidence. The references. One summary per reference. Links to observations. The evidence index. The impact result if any. And the list of unknowns.',
            card: { tag: 'KEY IDEA', title: 'Facts, not messages', body: 'Fourteen typed fields. No model text, no history of actions. In Codex the transcript is the state; here State is a record the program owns.' },
            deep: '<p>The State dataclass in the prototype: id, source, task, coordinate_system, grid_spacing_m, grid, geography, relations, references, regions, observations, evidence, impact, unknowns. All fields are immutable; an update returns a new snapshot. Nine snapshots exist for the recorded run, 543 KB to 764 KB each, because every snapshot carries the full grid and summaries.</p>'
          },
          {
            say: 'A region summary holds, for one reference, the sets of grid ids in each situation: total, queried, unqueried, valid, missing, covered, no coverage, other cells only, D0 present, and the frontier sets. Plus the D0 RSRP range and the observation ids involved.',
            card: { tag: 'HOW IT WORKS', title: 'Sets, not counts', body: 'The summary stores grid id sets. Counts, frontier sentences and ranges are derived at render time, so nothing can disagree.' },
            deep: '<p>Storing sets instead of counts costs space and buys consistency: the rendering, the map and the completion checks all derive from the same sets. The summary for S2 at state 4 has 40 queried ids, 160 unqueried, 20 target, 8 boundary ids of which 4 are target.</p>'
          },
          {
            say: 'Nothing enters State that was not returned by an executed query. The update function receives the previous State and the new observation and cannot see the hidden dataset. Unqueried signals, coverage classes and traffic cannot enter.',
            card: { tag: 'PITFALL', title: 'No leak from the data source', body: 'Geography may enter unqueried; signals may not. The prototype\'s tests check that unqueried data never leaks into State.' },
            deep: '<p>This boundary is what makes the recorded trace honest: at any state the model could not have known more than the queries returned. It is also the boundary that keeps evaluation data out of the live context.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.fields = ctx.code({ x: 80, y: 180, w: 640, title: 'State (prototype dataclass, immutable)', lang: 'text', size: 11, color: 'teal', lines: ['id · source · task', 'coordinate_system · grid_spacing_m · grid', 'geography · relations · references', 'regions: RegionSummary per reference', 'observations: ObservationLink[]', 'evidence: GridEvidence[]  (grid id → observation id)', 'impact: ImpactAnalysis | none', 'unknowns: str[]'] });
          return ctx.reveal(S.fields, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            var r = D.region(4, 'S2');
            S.reg = D.kv(ctx, 760, 180, 780, [['total / queried / unqueried', r.total + ' / ' + r.queried + ' / ' + r.unqueried], ['valid / missing', r.valid + ' / ' + r.missing], ['covered / no coverage / other only', r.covered + ' / ' + r.no_coverage + ' / ' + r.other_only], ['D0 present', r.target], ['D0 RSRP range (dBm)', r.rsrp_min + ' to ' + r.rsrp_max], ['frontier / frontier with D0', r.boundary + ' / ' + r.boundary_target], ['stored as', 'grid id sets; counts derived at render time']], { title: 'RegionSummary S2 at state_04', color: 'teal' });
            return ctx.reveal(S.reg.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.leak = ctx.code({ x: 80, y: 500, w: 1460, title: 'apply_coverage(state, observation, …) → new State', lang: 'text', size: 11, color: 'red', lines: ['inputs: previous State, the executed observation, the index of executed observations', 'never:  dataset.records, baseline KPIs, anything not returned by a query', 'may enter unqueried: geometry, grid ids, references       may not: signals, coverage class, traffic'] });
            return ctx.reveal(S.leak, { from: 'up' });
          });
        }
      },
      {
        title: 'Update and frontier',
        beats: [
          {
            say: 'An update merges the new observation into the record map, with the newest observation winning per grid id, and recomputes every region summary from the merged records. Overlapping queries never add locations.',
            card: { tag: 'HOW IT WORKS', title: 'Merge, then recompute everything', body: 'All summaries are rebuilt from all evidence on each update. The H2 corridor query changed the S2 summary without S2 being named.' },
            deep: '<p>Recomputing everything is simpler and safer than patching the affected summaries, and at 2,400 locations it is cheap. It is also why a region summary is cumulative evidence rather than the last result: after step 3, S2 already had 36 queried locations from the corridor overlap.</p>'
          },
          {
            say: 'The frontier of a reference is the set of queried locations with at least one orthogonally adjacent unqueried location in the same reference. Diagonal neighbours do not count. Signal values play no part in choosing the frontier.',
            card: { tag: 'KEY IDEA', title: 'Frontier by adjacency, then counted', body: 'First select by adjacency only. Then count how many frontier locations are valid, missing, and have D0. The order matters.' },
            deep: '<p>If signal strength selected the frontier, a weak edge would disappear from it and the investigation would stop too early. The rule selects by geometry, then reports D0 presence on it: at state 4, S2\'s frontier is its fifth roadside row, 8 locations, D0 at 4. The completion check reads this number.</p>'
          },
          {
            say: 'A new spatial observation invalidates the impact result, because backup assignment depends on which locations are known. The unknowns list then says the load analysis has not been performed, and the model is told.',
            card: { tag: 'PITFALL', title: 'Derived results expire', body: 'impact is set to none on every coverage update. A stale load estimate never survives new evidence.' },
            deep: '<p>Before an impact result is written, the program recomputes it from current evidence and compares; a result that does not match is rejected as stale or invalid. The two mechanisms together make it impossible for the rendering to show an estimate older than the evidence under it.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.fields, S.reg.g, S.leak], 0.1, 400);
          S.grid = D.grid(ctx, { x: 80, y: 170, w: 600, h: 400 });
          S.grid.setClasses(CASE.states[3].classes);
          S.before = D.kv(ctx, 720, 180, 400, [['S2 queried', D.region(3, 'S2').queried + ' (from H2 overlap)'], ['S2 with D0', D.region(3, 'S2').target], ['S2 frontier', D.region(3, 'S2').boundary + ', D0 at ' + D.region(3, 'S2').boundary_target]], { title: 'state_03 (before S2 was named)', color: 'teal' });
          return ctx.reveal([S.grid.g, S.before.g], { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.grid.setClasses(CASE.states[4].classes);
            var r4 = D.region(4, 'S2');
            S.grid.outline(r4.boundary_ids, '#ffffff');
            S.after = D.kv(ctx, 1140, 180, 400, [['S2 queried', r4.queried], ['S2 with D0', r4.target], ['S2 frontier (white outline)', r4.boundary + ', D0 at ' + r4.boundary_target], ['rule', 'queried with an unqueried orthogonal neighbour in S2']], { title: 'state_04 (after S2_roadside)', color: 'teal' });
            return Promise.all([ctx.reveal(S.after.g, { from: 'up' }), ctx.pulse(S.grid.g, { color: 'cyan', times: 1, dur: 700 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.inv = ctx.code({ x: 720, y: 440, w: 820, title: 'invalidation', lang: 'text', size: 11, color: 'red', lines: ['apply_coverage(...)  → impact = none;  unknowns += "Backup selection, traffic transfer and load have not been computed."', 'apply_impact(...)    → expected = estimate_impact(current evidence); if impact != expected: raise "stale"'] });
            return ctx.reveal(S.inv, { from: 'up' });
          });
        }
      },
      {
        title: 'Step and Trace',
        beats: [
          {
            say: 'A Step records one executed decision: the State before, the context preview, the action and parameters, the observation file, the State after, the context after, and the map. The Trace is the ordered list of Steps.',
            card: { tag: 'HOW IT WORKS', title: 'Nine fields per Step', body: 'id · source · state_before · context_preview · action · observation · state_after · context_after · visualization. Eight Steps in the recorded run.' },
            deep: '<p>Each field is a path to a file written during the run, so the trace is a set of plain JSON and text files that any tool can read. The prototype\'s static HTML page is built from it. Offline evaluation reads the same files, not the page.</p>'
          },
          {
            say: 'Because every State is a complete snapshot, a Step already holds the before and after of one decision. Serializing the State inside the Step, with the data version and the counters, makes a Step a checkpoint from which a run can resume.',
            card: { tag: 'KEY IDEA', title: 'A Step is almost a checkpoint', body: 'The handoff says Trace is not yet a runtime checkpoint. The gap is what a Step stores: add the snapshot, the data version, the query cache, the counters.' },
            deep: '<p>In all three studied harnesses the log is the recovery mechanism: Codex rebuilds history from its rollout file, Gemini keeps a JSONL session and a shadow git repository, TurnL saves a checkpoint per tool turn. The outage design is in the same position with less work, because its State is already structured and already saved per step.</p>'
          },
          {
            say: 'The proposed extension also adds the parsed decision with its raw text, the validation result, and the counters: step, retries, rejections, queried area, elapsed time. These make the trace evaluable without re-running anything.',
            card: { tag: 'NUMBERS', title: 'Proposed additions to Step', stat: { v: '+6', l: 'fields: decision, validation_result, state_snapshot, data_version, query_cache_ref, counters' } },
            deep: '<p>The counters are what the typed end reason is computed from, so a trace alone explains why a run ended. The raw model text is kept so that a parse failure can be inspected afterwards, which the current Step, written for a scripted run, has no place for.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.grid.g, S.before.g, S.after.g, S.inv], 0.1, 400);
          S.step = ctx.code({ x: 80, y: 180, w: 700, title: 'steps/step_04.json', lang: 'json', size: 10.5, color: 'lime', lines: ['{"id": "step_04", "execution_source": "scripted_demo",', ' "state_before": "states/state_03.json", "context_preview": "previews/step_04.txt",', ' "action": {"tool": "coverage.query", "parameters": {"reference_id": "S2_roadside", ...}},', ' "observation": "observations/obs_04.json",', ' "state_after": "states/state_04.json", "context_after": "contexts/state_04.txt",', ' "visualization": "maps/step_04.svg"}'] });
          return ctx.reveal(S.step, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.chain = ctx.group();
            CASE.steps.forEach(function (s, i) {
              var n = ctx.node({ x: 900 + (i % 4) * 160, y: 200 + Math.floor(i / 4) * 70, w: 140, h: 48, title: s.id, sub: s.action.reference_id, color: 'lime', kind: 'chip', titleSize: 12, subSize: 10, glow: false, parent: S.chain });
              if (i % 4) ctx.link({ x: 900 + ((i - 1) % 4) * 160 + 70, y: 200 + Math.floor((i - 1) / 4) * 70 }, n, { color: 'lime', sw: 1, parent: S.chain });
            });
            S.trLbl = ctx.label(1140, 340, 'trace.json: 8 Steps; each is a before/after pair', { color: 'lime', size: 11.5, parent: S.chain });
            return ctx.reveal(S.chain, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.ext = ctx.code({ x: 80, y: 420, w: 1460, title: 'Step (proposed extension)', lang: 'text', size: 11, color: 'lime', lines: ['+ decision:          {action, parameters, information_gap, raw_text}', '+ validation_result: ok | {kind, message}', '+ state_snapshot:    serialized State after · data_version · query_cache_ref', '+ counters:          {step, retries, rejections, queried_area, elapsed_s}   → EndReason is computed from these'] });
            return ctx.reveal(S.ext, { from: 'up' });
          });
        }
      },
      {
        title: 'Conclusions cite State',
        beats: [
          {
            say: 'A proposed rule: a conclusion in the final report, and a gap in a decision, may only cite facts that exist in State, with their provenance. The program checks the citation; it does not judge the reasoning.',
            card: { tag: 'KEY IDEA', title: 'Cite what exists', body: 'The analog of Codex verifying a patch against the current file. A claim about an unqueried region is rejected before it reaches the report.' },
            deep: '<p>The check is mechanical: a conclusion names regions, counts and cells; each must resolve to a State fact and its observation. "S3 is not affected" resolves to S3: 0 of 48 queried with D0, observation obs_06. "F1 is not affected" does not resolve, because F1 has no queried locations, and is rejected with that message.</p>'
          },
          {
            say: 'The same check runs online on the information gap. A gap that State already answers is returned as a contradiction. This is one of the two online error checks the handoff keeps: does State already answer the stated gap.',
            card: { tag: 'HOW IT WORKS', title: 'Gap versus State', body: 'Match the region, the time window and the fact type. If State has the answer, say so and reject the step.' },
            deep: '<p>The handoff is careful here: this is not a general correctness guarantee. Only when the gap names a region, window and fact type the program can resolve does the check apply. A free-text gap that cannot be matched is passed through, not rejected.</p>'
          },
          {
            say: 'Together, provenance per location, newest observation wins, impact invalidation and conclusions that cite State are the four state sync rules of the design. They are the analysis version of read before you edit.',
            card: { tag: 'WHY IT MATTERS', title: 'Four rules keep State and world aligned', body: 'provenance · newest wins · derived results expire · conclusions cite facts. All program code; all testable.' },
            deep: '<p>Claude Code enforces read-before-edit on files; Gemini hashes file content before an edit; SWE-agent drops stale file views. None of the open-source harnesses keeps a full read-before-write record. The outage design can, because every fact arrives through one update function.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.step, S.chain, S.ext], 0.1, 400);
          S.cite = ctx.code({ x: 80, y: 180, w: 720, title: 'conclusion check (proposed)', lang: 'text', size: 11, color: 'pink', lines: ['"S3 is not affected"   → S3.target = 0 of 48 queried (obs_06)      ✓ cited', '"F1 is not affected"   → F1.queried = 0                             ✗ no fact; rejected', '"B1 overloads to 242%" → impact.backup_loads[B1].estimated_prb = 242 ✓ cited'] });
          return ctx.reveal(S.cite, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.gap = ctx.code({ x: 840, y: 180, w: 700, title: 'gap vs State (online)', lang: 'text', size: 11, color: 'pink', lines: ['gap: "is the S2 interior covered by D0?"  after step 5', 'State: S2_remaining queried 160/160, D0 at 30 (obs_05)', '→ gap_contradicted: the stated gap is already answered'] });
            return ctx.reveal(S.gap, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.rules = D.kv(ctx, 80, 400, 1460, [['provenance per location', 'implemented: evidence index grid id → observation'], ['newest observation wins', 'implemented: step 7 moved 40 entries from obs_04 to obs_07'], ['derived results expire', 'implemented: impact reset on every coverage update'], ['conclusions cite State facts', 'proposed: mechanical resolution of named regions, counts, cells']], { title: 'four state-sync rules', color: 'teal' });
            return ctx.reveal(S.rules.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
