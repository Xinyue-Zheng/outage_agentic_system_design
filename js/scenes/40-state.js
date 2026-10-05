/* L1 — State and Trace. What State holds, and how State, Step, Trace and checkpoint relate. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;
  var GRID = { x: 900, y: 150, w: 640, h: 426 };

  Atlas.register({
    id: 'state',
    refs: ['Guo et al., <i>From Question Answering to Task Completion: A Survey on Agent System and Harness Design</i>, arXiv 2606.20683, 2026'],
    poster: 1,
    steps: [
      {
        title: 'What State holds',
        beats: [
          {
            say: 'State is every fact the investigation has established at one moment, with the observation that produced each fact. It is rewritten as a new snapshot after every action.',
            card: { tag: 'KEY IDEA', title: 'Facts with their source', body: 'Task and time · areas and relations · coverage per location · summaries per area and the query boundary · impact · what is still unknown · the source of each fact.' },
            deep: '<p>Each snapshot is complete and immutable. Nothing from a later action changes an earlier snapshot.</p>'
          },
          {
            say: 'Coverage per location has five classes: not queried, queried but missing, valid with no cell, valid with other cells only, and valid with D0 present.',
            card: { tag: 'HOW IT WORKS', title: 'Five classes per location', body: 'Only the last marks a potentially affected location. Missing and no coverage are never merged.' },
            deep: '<p>The map colours each location by its class. The model reads the counts per area; the map is for people.</p>'
          },
          {
            say: 'Per area, State keeps the counts and the query boundary: queried grid cells that share an edge with at least one unqueried grid cell. Signal values play no part in choosing it.',
            card: { tag: 'HOW IT WORKS', title: 'Query boundary', body: 'Queried grid cells that share an edge with at least one unqueried grid cell. Then the program counts how many of them show D0.' },
            deep: '<p>Within the same area, by the four-neighbour rule. D0 present on the boundary means coverage probably continues into the unqueried part, which is what a completion check reads.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.grid = D.grid(ctx, GRID);
          S.grid.setClasses(CASE.states[4].classes);
          S.grid.legendRow(900, 600, false);
          var secs = ['task and time', 'areas and relations', 'coverage per location', 'summaries per area · query boundary', 'impact, when computed', 'what is still unknown', 'source of each fact'];
          S.secs = secs.map(function (t, i) { return ctx.node({ x: 440, y: 170 + i * 62, w: 740, h: 46, title: t, color: 'teal', kind: 'pill', titleSize: 14, glow: false }); });
          return ctx.reveal(S.secs.concat([S.grid.g]), { from: 'fade', stagger: 40 }).then(function () { return ctx.beat(1); }).then(function () {
            S.secs.forEach(function (n, i) { n.setAttribute('opacity', i === 2 ? 1 : 0.35); });
            return ctx.pulse(S.secs[2], { color: 'teal', times: 2, dur: 700 });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.secs.forEach(function (n, i) { n.setAttribute('opacity', i === 3 ? 1 : 0.35); });
            var s2 = D.region(4, 'S2');
            S.grid.outline(s2.boundary_ids, '#ffffff');
            S.bnd = D.kv(ctx, 70, 640, 740, [['S2 after action 4', s2.queried + ' of ' + s2.total + ' queried'], ['query boundary', s2.boundary + ' locations, D0 at ' + s2.boundary_target]], { title: 'query boundary, outlined on the map', color: 'teal' });
            return ctx.reveal(S.bnd.g, { from: 'up' });
          });
        }
      },
      {
        title: 'State, Step, Trace, checkpoint',
        beats: [
          {
            say: 'A Step is one decision and its effect: the decision, the observation, and the State before and after. The Trace is the ordered Steps of one run.',
            card: { tag: 'KEY IDEA', title: 'Snapshot, Step, Trace', body: 'States sit on a line. A Step connects two of them. The Trace is the whole line. It is a record for reading and scoring.' },
            deep: '<p>Because every State is complete, a Step already holds the before and after of one decision.</p>'
          },
          {
            say: 'A checkpoint is a Step plus everything a restart needs: the full State inside the Step, the counters, the data version and the query cache.',
            card: { tag: 'HOW IT WORKS', title: 'Checkpoint = Step + restart context', body: 'Full State, counters, data version, query cache, registry version. The Trace alone cannot restart a run; a checkpoint can.' },
            deep: '<p>The tools are read-only, so nothing in the world needs undoing. What can be wrong is a decision, and what is restored is State.</p>'
          },
          {
            say: 'Resuming means loading a checkpoint, correcting its State, rendering from the corrected State, and re-running the later steps. The earlier steps are kept.',
            card: { tag: 'HOW IT WORKS', title: 'Resume from a checkpoint', body: 'Load State 4, correct it, render, continue with a new step 5. Steps 1 to 4 stay; steps 5 to 8 are replaced.' },
            deep: '<p>This is how a reviewer fixes a run that ended on a cap, and how a corrected decision is compared with the original.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          if (S.bnd) ctx.fade(S.bnd.g, 0, 250);
          S.secs.forEach(function (n) { ctx.fade(n, 0, 250); });
          ctx.fade(S.grid.g, 0, 250);
          S.tl = ctx.group();
          ctx.text(60, 180, 'State', { size: 14, weight: 700, parent: S.tl });
          ctx.line(170, 200, 1540, 200, { color: 'line', sw: 2, parent: S.tl });
          S.snaps = [0, 1, 2, 3, 4, 5, 8].map(function (i, k) { var x = 200 + k * 220; return ctx.node({ x: x, y: 200, w: 70, h: 40, title: 'S' + i, color: 'teal', kind: 'pill', titleSize: 14, glow: false, parent: S.tl }); });
          ctx.text(60, 290, 'Step', { size: 14, weight: 700, parent: S.tl });
          S.stps = [1, 2, 3, 4, 5, 8].map(function (i, k) { var x = 310 + k * 220; return ctx.node({ x: x, y: 290, w: 110, h: 42, title: 'step ' + i, color: 'magenta', titleSize: 13.5, glow: false, parent: S.tl }); });
          S.stps.forEach(function (n, k) { ctx.link(S.snaps[k], n, { color: 'dim', sw: 1, arrow: false, parent: S.tl }); ctx.link(n, S.snaps[k + 1], { color: 'dim', sw: 1, arrow: false, parent: S.tl }); });
          ctx.text(970, 260, '…', { size: 16, color: 'dim', parent: S.tl });
          S.trace = ctx.path('M255,350 L255,362 L1575,362 L1575,350', { stroke: 'pink', sw: 1.5, parent: S.tl });
          S.traceT = ctx.text(915, 384, 'Trace = the ordered Steps of one run', { size: 14, weight: 700, color: 'pink', anchor: 'middle', parent: S.tl });
          return ctx.reveal(S.tl, { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.cp = D.kv(ctx, 60, 430, 700, [['the Step', 'decision · observation · State before and after'], ['full State', 'inside the Step, not a path'], ['counters', 'steps · locations spent · retries · rejections'], ['data version · query cache · registry version', '']], { title: 'checkpoint 4 = step 4 + what a restart needs', color: 'teal' });
            S.cpl = ctx.link(S.stps[3], { x: 400, y: 430 }, { color: 'teal', sw: 1.2, dash: '4 3' });
            return ctx.reveal([S.cp.g, S.cpl], { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.rs = D.kv(ctx, 840, 430, 700, [['load', 'checkpoint 4'], ['correct', 'State 4, for example reopen an area'], ['render and continue', "new step 5'"], ['kept · replaced', 'steps 1 to 4 · steps 5 to 8']], { title: 'resume from checkpoint 4', color: 'red' });
            S.rsl = ctx.link({ x: 1190, y: 430 }, S.stps[4], { color: 'red', sw: 1.2, dash: '4 3' });
            return ctx.reveal([S.rs.g, S.rsl], { from: 'up' });
          });
        }
      }
    ]
  });
})();
