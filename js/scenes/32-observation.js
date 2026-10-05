/* L2 — Observation and Status. What a query returns and how the program keeps the four coverage situations
 * apart: one record per requested location, valid or missing, result status, and the proposed wrapper statuses. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'observation',
    refs: [
      'Yang et al., <i>SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering</i>, NeurIPS 2024',
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026'
    ],
    poster: 2,
    steps: [
      {
        title: 'One record per location',
        beats: [
          {
            say: 'A coverage query returns exactly one record for every grid location it was asked about. No fewer, no more. A record is either valid or missing.',
            card: { tag: 'KEY IDEA', title: 'Requested set equals returned set', body: 'The contract is checked after every call. A missing id or an extra id is a contract violation, not a quiet gap.' },
            deep: '<p>The requested set is the reference\'s grid ids, resolved by the program. The result must contain one record per id. This rule is what lets State count unqueried locations exactly: a location is queried if and only if some executed observation returned a record for it.</p>'
          },
          {
            say: 'A valid record lists the cells heard at that location, each with RSRP and RSRQ, and the synthetic D0 traffic. A missing record lists nothing. It is not allowed to carry a signal or a demand value.',
            card: { tag: 'HOW IT WORKS', title: 'valid or missing, nothing between', body: 'valid: cells[], down_cell_traffic_mbps. missing: no cells, no traffic. The validator rejects a missing record with data.' },
            deep: '<p>Step 4\'s first record: grid G_r10_c40, status valid, cells D0 at minus 111 dBm, B2 at minus 80.64, B3 at minus 108.57, traffic 1.18 Mbps. Missing records in step 5: nine locations with status missing and empty fields. Both kinds count as queried; only the valid kind carries evidence.</p>'
          },
          {
            say: 'The result as a whole has a status: complete when every record is valid, partial missing when some are, all missing when none is. Only step four of the recorded case was complete.',
            card: { tag: 'NUMBERS', title: 'Result status over the run', stat: { v: '1 of 7', l: 'coverage results were complete; six were partial_missing; none all_missing' } },
            deep: '<p>The result status is derived from the records and checked for agreement. It is a quick signal for the model: a partial result means some locations in the scope remain unknown even though the query ran. The rendering says so in the unknowns section.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.req = ctx.node({ x: 300, y: 250, w: 280, h: 60, title: 'requested grid ids', sub: 'from resolve_reference', color: 'blue', titleSize: 13, subSize: 10.5, glow: false });
          S.res = ctx.node({ x: 760, y: 250, w: 280, h: 60, title: 'returned records', sub: 'exactly one per id', color: 'teal', titleSize: 13, subSize: 10.5, glow: false });
          S.eq = ctx.link(S.req, S.res, { color: 'teal', sw: 1.4, label: 'set equality checked', labelDy: -10 });
          return Promise.all([ctx.reveal([S.req, S.res], { from: 'up', stagger: 100 }), ctx.reveal(S.eq, { from: 'draw', delay: 200 })]).then(function () { return ctx.beat(1); }).then(function () {
            S.recs = ctx.code({ x: 80, y: 340, w: 1000, title: 'records from obs_04 and obs_05', lang: 'json', size: 11, color: 'teal', lines: [
              '{"grid_id": "G_r10_c40", "status": "valid",',
              '  "cells": [{"cell_id": "D0", "rsrp_dbm": -111.0, "rsrq_db": -14.17}, {"cell_id": "B2", "rsrp_dbm": -80.64, "rsrq_db": -8.48}, ...],',
              '  "down_cell_traffic_mbps": 1.18}',
              '{"grid_id": "G_r17_c42", "status": "missing", "cells": [], "down_cell_traffic_mbps": null}'
            ] });
            return ctx.reveal(S.recs, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            var rows = CASE.steps.filter(function (s) { return s.observation; }).map(function (s) { return [s.observation.id + ' · ' + s.observation.reference_id, s.observation.valid + ' valid / ' + s.observation.missing + ' missing → ' + s.observation.result_status]; });
            S.status = D.kv(ctx, 1120, 180, 440, rows, { title: 'result_status per observation', color: 'teal', lh: 20 });
            return ctx.reveal(S.status.g, { from: 'left' });
          });
        }
      },
      {
        title: 'Four situations',
        beats: [
          {
            say: 'From the records the program keeps four situations apart for every location. Not queried. Queried but missing. Valid with an empty cell list, which means no coverage at all. And valid with cells, which splits into D0 present and other cells only.',
            card: { tag: 'KEY IDEA', title: 'Unknown is not no coverage', body: 'Unqueried and missing are both unknown but differ in progress. An empty valid list is evidence of no coverage. Other cells only is a fourth, distinct fact.' },
            deep: '<p>These are the distinctions in the handoff\'s section 3. Collapsing any two of them produces a wrong conclusion: treating missing as no coverage underestimates impact; treating unqueried as not affected ends the investigation too early; treating other cells only as no coverage misreads a served location as a hole.</p>'
          },
          {
            say: 'At state eight the study area has one thousand nine hundred thirty four unqueried locations, thirteen missing, fifteen with no coverage, one hundred eighty six with other cells only and two hundred fifty two with D0.',
            card: { tag: 'NUMBERS', title: 'Study area at state_08', stat: { v: '1,934 · 13 · 15 · 186 · 252', l: 'unqueried · missing · no coverage · other cells only · D0 present' } },
            deep: '<p>The five numbers sum to 2,400. They are computed from the evidence index, not stored, and the region summary for every other reference is computed the same way from the same records. Overlapping references share locations and each location counts once per reference.</p>'
          },
          {
            say: 'The map uses one colour per situation. The model never sees the map; it reads the same five numbers as sentences. The colours are for the people checking that the sentences are right.',
            card: { tag: 'HOW IT WORKS', title: 'Same facts, two renderings', body: 'Grid colours for people, counted sentences for the model. Both come from the same State; neither comes from the other.' },
            deep: '<p>The maps in the recorded run are SVG files written per step. They are supplementary artifacts. The design forbids image paths or image descriptions in the model input; the internal model cannot read images, and the program has the facts anyway.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.req, S.res, S.eq, S.recs, S.status.g], 0.1, 400);
          S.grid = D.grid(ctx, { x: 80, y: 170, w: 720, h: 480 });
          S.grid.setClasses(CASE.states[8].classes);
          S.grid.legend(80, 690, false);
          return ctx.reveal(S.grid.g, { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            var sa = D.region(8, 'Study_area');
            S.counts = D.kv(ctx, 860, 200, 680, [['not queried (unknown)', sa.unqueried], ['queried, missing data (unknown)', sa.missing], ['valid, no cell coverage', sa.no_coverage], ['valid, other cells only (no D0)', sa.other_only], ['valid, D0 present', sa.target], ['sum', sa.total]], { title: 'Study_area at state_08', color: 'teal' });
            return ctx.reveal(S.counts.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            var lines = CASE.states[8].context.split('\n'), out = [];
            for (var i = 0; i < lines.length; i++) if (lines[i].indexOf('- Study_area contains') === 0) { out = lines.slice(i, i + 3).map(function (l) { return l.trim(); }); break; }
            S.sent = ctx.code({ x: 860, y: 420, w: 680, title: 'the same facts as the model reads them', lang: 'text', size: 10.5, color: 'amber', lines: out });
            return ctx.reveal(S.sent, { from: 'up' });
          });
        }
      },
      {
        title: 'Status for sets and failures',
        beats: [
          {
            say: 'The proposed Observation wraps the existing result with a status for the call itself: ok, empty, missing data, error or timeout. For a set valued query each member gets its own status and records.',
            card: { tag: 'HOW IT WORKS', title: 'Observation { status, members[] }', body: 'A member that timed out has status timeout and no records. The others still enter State. Nothing is lost to one slow query.' },
            deep: '<p>This is the H3 pattern from the harness comparison: every call gets a result, even on timeout or denial, so the next model call is valid.</p>'
          },
          {
            say: 'Empty means the query ran and the scope had no locations, which can happen for a reference that resolves to nothing. Missing data means every record came back missing. Error means the function failed. Each is rendered differently.',
            card: { tag: 'PITFALL', title: 'Five statuses, five sentences', body: 'The rendering must never say "no coverage" for empty, missing or error. Each status has its own wording in the unknowns.' },
            deep: '<p>The distinction extends the four coverage situations to the call level. A reference that resolves to zero grid ids is a registry error in the synthetic case, but a real data source can legitimately return nothing for a window; the status keeps the two apart for the model and for offline evaluation.</p>'
          },
          {
            say: 'The duration of each call is recorded with the Observation. It is the input of the wall time cap and the per query timeout, and it tells the offline evaluation where the time went.',
            card: { tag: 'NUMBERS', title: 'Timing fields', stat: { v: 'duration_ms', l: 'per member and per Observation; the proposed per-query timeout turns a slow member into status timeout' } },
            deep: '<p>The outage design records duration at the point where the function returns, so the trace carries it from the first run.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.grid.g, S.counts.g, S.sent], 0.1, 400);
          S.obs = ctx.code({ x: 80, y: 180, w: 720, title: 'Observation (proposed wrapper)', lang: 'text', size: 11, color: 'teal', lines: [
            'id, action, parameters', 'status:   ok | empty | missing | error | timeout', 'members:  [{member_id, status, result_status, records_ref}]', 'duration_ms', 'recorded_at, data_version'
          ] });
          return ctx.reveal(S.obs, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.words = D.kv(ctx, 840, 180, 700, [['ok', 'records present; coverage sentences rendered'], ['empty', '"<ref> resolved to no locations"'], ['missing', '"all <n> records missing; coverage unknown"'], ['error', '"query failed: <message>; scope remains unqueried"'], ['timeout', '"query exceeded <t> s; scope remains unqueried"']], { title: 'status → rendered sentence', color: 'teal' });
            return ctx.reveal(S.words.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.time = ctx.code({ x: 80, y: 420, w: 1460, title: 'timing in the trace', lang: 'text', size: 11, color: 'teal', lines: ['per member:     duration_ms, status', 'per Observation: duration_ms = max over members (concurrent) ', 'loop_guards:    elapsed wall time vs time_cap;  per-query timeout → member status timeout'] });
            return ctx.reveal(S.time, { from: 'up' });
          });
        }
      },
      {
        title: 'Provenance',
        beats: [
          {
            say: 'Every observation is stored once, in full, under its own id, and State keeps a link to it: the id, the file path, the reference and the grid ids it covers. Evidence is never overwritten.',
            card: { tag: 'HOW IT WORKS', title: 'Stored once, linked from State', body: 'observations/obs_NN.json on disk; ObservationLink in State. Eight links at state_08, one per executed query plus the impact file.' },
            deep: '<p>The provenance section of the rendering lists these links, so the model can name the observation behind a fact. Offline evaluation follows the same links to recompute any summary from raw records, which is how the prototype\'s tests check that State and context agree.</p>'
          },
          {
            say: 'Per grid location, an evidence index names the observation that produced the current record. When a location is queried again, the index moves to the newer observation. The older file stays.',
            card: { tag: 'KEY IDEA', title: 'Newest observation wins per location', body: 'Step 7 re-queried S2 roadside: 40 index entries moved from obs_04 to obs_07. Counts did not change.' },
            deep: '<p>The current fact per location comes from the latest evidence, and the older evidence is kept for audit, not for reasoning.</p>'
          },
          {
            say: 'From the links and the index, the program can rebuild every record it ever used. The prototype does this on every update, so a State that disagrees with its evidence is rejected before it is written.',
            card: { tag: 'HOW IT WORKS', title: 'State is checked against its sources', body: '<code>records_from_state</code> re-reads the linked observations, re-derives every region summary and compares. A mismatch raises.' },
            deep: '<p>The check is expensive in the prototype\'s terms, re-deriving eleven region summaries from up to 466 records, and cheap in practice. It guarantees that nothing in State was written by hand or left over from an earlier version of the code.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.obs, S.words.g, S.time], 0.1, 400);
          var st = CASE.states[8];
          S.links = ctx.code({ x: 80, y: 180, w: 700, title: 'State.observations at state_08 (ObservationLink)', lang: 'text', size: 10.5, color: 'teal', lines: st.observation_ids.map(function (id, i) { var s = CASE.steps[i]; return id + '  observations/' + id + '.json  reference ' + (s ? s.action.reference_id : '') + '  ' + (s && s.observation ? s.observation.requested + ' locations' : ''); }) });
          return ctx.reveal(S.links, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.idx = ctx.code({ x: 820, y: 180, w: 720, title: 'evidence index (grid id → observation) for two roadside locations', lang: 'text', size: 10.5, color: 'teal', lines: ['state_04:  G_r10_c40 → obs_04    G_r10_c41 → obs_04', 'state_07:  G_r10_c40 → obs_07    G_r10_c41 → obs_07   (obs_04 kept on disk)', 'counts at state_07: unchanged, 466 queried, 252 with D0'] });
            return ctx.reveal(S.idx, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.chk = ctx.code({ x: 80, y: 420, w: 1460, title: 'records_from_state (prototype)', lang: 'text', size: 10.5, color: 'teal', lines: ['for every link: read the observation file, validate the contract, index its records', 'for every evidence entry: resolve grid id → record; every linked grid id must have exactly one entry', 'recompute all region summaries from those records; compare with State.regions; mismatch → raise'] });
            return ctx.reveal(S.chk, { from: 'up' });
          });
        }
      }
    ]
  });
})();
