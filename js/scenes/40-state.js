/* L1 — State and Trace. What the program remembers, how one observation changes it, and what a Step records. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'state',
    refs: [
      'Guo et al., <i>From Question Answering to Task Completion: A Survey on Agent System and Harness Design</i>, arXiv 2606.20683, 2026',
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026'
    ],
    poster: 2,
    setup: function (ctx) {
      var S = ctx.state;
      S.grid = D.grid(ctx, { x: 820, y: 170, w: 720, h: 480 });
      S.grid.setClasses(CASE.states[3].classes);
      S.grid.legendRow(820, 690, false);
    },
    steps: [
      {
        title: 'What State holds',
        beats: [
          {
            say: 'State is everything the investigation has established so far, kept by the program. It is not a transcript. It is a set of facts, each with the observation that produced it.',
            card: { tag: 'KEY IDEA', title: 'Facts with provenance', body: 'The task, the geography, progress per reference, coverage per location, the frontier, impact once computed, and the unknowns. Every fact points at its source.' },
            deep: '<p>State replaces the message history that a general agent keeps. The model never updates it; the program does, from executed observations only. Each grid location carries the id of the newest observation that described it, so any fact in the rendered context can be traced to a record on disk.</p>'
          },
          {
            say: 'Coverage per location is one of five classes: unknown, missing data, valid with no cells, valid with other cells only, or valid with the down cell present. The classes are never merged.',
            card: { tag: 'HOW IT WORKS', title: 'Five classes, kept apart', body: 'Unknown and missing both mean no evidence, but for different reasons. No coverage is evidence. Other cells only is evidence of service by someone else.' },
            deep: '<p>The distinction is the data semantics of the project: historical coverage containing the down cell does not prove the location was served by it; a missing record must never be read as no coverage; a valid empty record is a real observation of no coverage.</p>'
          },
          {
            say: 'Per reference, State keeps a summary: how many locations are queried and unqueried, how many fall in each class, and the frontier facing the unqueried part. The rendering reads these summaries.',
            card: { tag: 'HOW IT WORKS', title: 'Region summaries', body: 'One summary per reference, recomputed after every observation from all evidence so far. Overlapping references share locations; counts are never added across references.' },
            deep: '<p>A summary is cumulative evidence, not the result of the last step. When a road corridor overlaps a settlement, the settlement\'s summary changes although the settlement was never named in a query. The recorded case shows this at the third action.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.parts = ['task and time', 'geography and references', 'coverage per location', 'region summaries and frontier', 'impact (when computed)', 'unknowns', 'provenance index'].map(function (n, i) {
            return ctx.node({ x: 400, y: 170 + i * 62, w: 600, h: 48, title: n, color: i === 2 || i === 3 ? 'teal' : 'dim', titleSize: 13, glow: false });
          });
          return ctx.reveal(S.parts, { from: 'left', stagger: 60 }).then(function () { return ctx.beat(1); }).then(function () {
            S.classes = D.kv(ctx, 80, 620, 640, [['unknown', 'not queried'], ['missing', 'queried, no data returned'], ['no coverage', 'valid record, empty cell list'], ['other cells only', 'valid record, down cell absent'], ['D0 present', 'valid record, down cell listed']], { title: 'coverage classes per location', color: 'teal', lh: 20, size: 11 });
            return Promise.all([ctx.reveal(S.classes.g, { from: 'up' }), ctx.pulse(S.parts[2], { color: 'teal', times: 1, dur: 700 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            var r = D.region(3, 'S2');
            S.sum = D.kv(ctx, 820, 700, 720, [['S2 after action 3', r.queried + ' queried of ' + r.total + ', ' + r.target + ' with D0'], ['frontier into S2', r.boundary + ' locations, D0 at ' + r.boundary_target]], { title: 'a region summary', color: 'teal', lh: 20, size: 11 });
            return Promise.all([ctx.reveal(S.sum.g, { from: 'up' }), ctx.pulse(S.parts[3], { color: 'teal', times: 1, dur: 700 })]);
          });
        }
      },
      {
        title: 'Update and frontier',
        beats: [
          {
            say: 'An observation updates State in one step. The update function receives the previous State and the executed results only. It cannot see the dataset.',
            card: { tag: 'HOW IT WORKS', title: 'Previous State plus observation', body: 'Immutable snapshots: each update produces a new State and leaves the old one untouched. Later queries never rewrite earlier snapshots.' },
            deep: '<p>Immutability is what makes a Step a before-and-after record and what makes resuming from a Step possible. Every snapshot of the recorded run is on disk, nine in total.</p>'
          },
          {
            say: 'Locations are counted once. If two queries cover the same location, the newer record wins and the older observation stays on disk. A repeated query changes no count.',
            card: { tag: 'KEY IDEA', title: 'Newest record wins', body: 'Deduplication by grid id. Provenance moves to the newest observation; the old file is kept. The recorded run repeats one query to show this.' },
            deep: '<p>The current fact for a location comes from the latest evidence. Older evidence is kept for the trace but not used for counts.</p>'
          },
          {
            say: 'The frontier is computed by adjacency alone. A queried location is on the frontier if an orthogonal neighbour inside the same reference is unqueried. Signal strength plays no part in selecting it.',
            card: { tag: 'KEY IDEA', title: 'Frontier by adjacency', body: 'First find the boundary, then count what it shows: how many frontier locations have the down cell, how many are valid, how many missing.' },
            deep: '<p>Separating the geometric selection from the signal statistics lets the completion check ask a clean question: does the edge of the queried area still show the down cell? In the case after action 4, S2 has eight frontier locations and D0 at four of them.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.parts.forEach(function (p) { ctx.fade(p, 0.12, 300); });
          if (S.classes) ctx.fade(S.classes.g, 0.12, 300);
          if (S.sum) ctx.fade(S.sum.g, 0.12, 300);
          S.prev = ctx.node({ x: 220, y: 300, w: 240, h: 60, title: 'State n−1', color: 'teal', kind: 'cyl', titleSize: 14, glow: false });
          S.obs = ctx.node({ x: 220, y: 440, w: 240, h: 60, title: 'Observation n', color: 'blue', titleSize: 14, glow: false });
          S.upd = ctx.node({ x: 540, y: 370, w: 240, h: 60, title: 'update_state', sub: 'program, no dataset access', color: 'magenta', titleSize: 14, subSize: 11, glow: false });
          S.next = ctx.node({ x: 540, y: 560, w: 240, h: 60, title: 'State n', color: 'teal', kind: 'cyl', titleSize: 14, glow: false });
          S.ul = [ctx.link(S.prev, S.upd, { color: 'dim' }), ctx.link(S.obs, S.upd, { color: 'dim' }), ctx.link(S.upd, S.next, { color: 'teal' })];
          S.grid.setClasses(CASE.states[3].classes);
          return ctx.reveal([S.prev, S.obs, S.upd, S.next].concat(S.ul), { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.grid.setClasses(CASE.states[4].classes);
            S.frame = S.grid.frame(D.referenceIds('S2_roadside'), 'cyan');
            S.dd = D.kv(ctx, 80, 640, 640, [['same location, two observations', 'newest record used; older file kept'], ['repeated query', 'no count changes']], { title: 'deduplication', color: 'teal', lh: 20, size: 11 });
            return Promise.all([ctx.reveal(S.dd.g, { from: 'up' }), ctx.pulse(S.frame, { color: 'cyan', times: 1, dur: 700 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            var r = D.region(4, 'S2');
            S.grid.outline(r.boundary_ids, '#ffffff');
            S.fr = D.kv(ctx, 820, 700, 720, [['frontier rule', 'queried with an unqueried orthogonal neighbour, same reference'], ['S2 after action 4', r.boundary + ' frontier locations, D0 at ' + r.boundary_target]], { title: 'frontier', color: 'teal', lh: 20, size: 11 });
            return ctx.reveal(S.fr.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Step and Trace',
        beats: [
          {
            say: 'A Step is one executed decision: the State before, the context the model saw, the decision, the Observation, the State after, and the context rendered next. The Trace is the ordered list of Steps.',
            card: { tag: 'HOW IT WORKS', title: 'One decision, one Step', body: 'Eight Steps in the recorded case, nine State snapshots. Everything a run did can be read back from the Trace without the UI.' },
            deep: '<p>A Step links files by path: the state before and after, the preview of the context, the observation file, the map for people. Because every State is a full snapshot, a Step already holds the before and after of one decision.</p>'
          },
          {
            say: 'Adding the serialized State, the data version and the run counters to a Step makes it a checkpoint. A run can then be resumed from any Step, which the recovery experiments need.',
            card: { tag: 'KEY IDEA', title: 'A Step as checkpoint', body: 'Proposed: State snapshot, data version, query cache reference and counters inside the Step. The trace then serves resume as well as evaluation.' },
            deep: '<p>The handoff says a Trace is not yet a runtime checkpoint. The gap is only what a Step stores. The prototype already writes a full State per step, so the remaining items are the counters and the data version.</p>'
          },
          {
            say: 'One rule follows from provenance: a conclusion may cite only facts present in State. If the model claims something that State does not contain, the program can detect the contradiction.',
            card: { tag: 'KEY IDEA', title: 'Conclusions cite State', body: 'The stated gap, the finish request and the final report are checked against State. A claim without a source in State is returned as an error observation.' },
            deep: '<p>This is what makes offline error localization possible: when a conclusion is wrong, the Step where the unsupported claim first appeared can be found.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          [S.prev, S.obs, S.upd, S.next].concat(S.ul).forEach(function (e) { ctx.fade(e, 0.12, 300); });
          if (S.dd) ctx.fade(S.dd.g, 0.12, 300);
          if (S.fr) ctx.fade(S.fr.g, 0.12, 300);
          S.step = ctx.code({ x: 80, y: 170, w: 640, title: 'step_04.json', lang: 'text', size: 10.5, color: 'lime', lines: [
            'state_before:    states/state_03.json',
            'context_preview: previews/step_04.txt',
            'action:          coverage.query(S2_roadside)',
            'observation:     observations/obs_04.json',
            'state_after:     states/state_04.json',
            'context_after:   contexts/state_04.txt',
            'visualization:   maps/step_04.svg   (for people)'
          ] });
          return ctx.reveal(S.step, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.ck = D.kv(ctx, 80, 420, 640, [['exists', 'state before and after, decision, observation'], ['proposed', 'serialized State, data version, query cache, counters'], ['then', 'resume a run from any Step']], { title: 'Step as checkpoint', color: 'lime' });
            return ctx.reveal(S.ck.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.rule = D.kv(ctx, 80, 570, 640, [['checked against State', 'stated gap · finish request · final report'], ['claim without a source', 'error observation to the model']], { title: 'conclusions cite State', color: 'red' });
            return ctx.reveal(S.rule.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
