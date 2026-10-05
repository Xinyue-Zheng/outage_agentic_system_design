/* L1 — Offline Evaluation. From recorded traces to metrics, the baseline, error localization and recovery. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'offline',
    refs: [
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026',
      'Zhang et al., <i>Which Agent Causes Task Failures and When?</i>, ICML 2025'
    ],
    poster: 1,
    steps: [
      {
        title: 'From trace to metrics',
        beats: [
          {
            say: 'Every run leaves a trace with a typed end reason. Metrics are computed from traces against reference results, never from the model\'s own report.',
            card: { tag: 'KEY IDEA', title: 'The trace is the evidence', body: 'Steps, States, Observations, end reason. Scored against a reference, not against the model\'s claims.' },
            deep: '<p>The reference for a case is the result of a full investigation of the same data: which locations were affected and which backups were loaded.</p>'
          },
          {
            say: 'Four metrics per case: missed affected area, result error, query cost in locations, and execution cost in steps and tokens.',
            card: { tag: 'HOW IT WORKS', title: 'Four metrics', body: 'missed area · result error · query cost in locations · steps and tokens. Cost is counted in locations because one query can cover a whole settlement.' },
            deep: '<p>Typed end reasons are counted across cases as a fifth view: which cap ends runs most often tells which part of the loop to improve.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.tr = ctx.node({ x: 300, y: 220, w: 320, h: 60, title: 'trace', sub: 'Steps · States · end reason', color: 'lime', kind: 'cyl', titleSize: 15, subSize: 11.5, glow: false });
          S.ref = ctx.node({ x: 300, y: 340, w: 320, h: 60, title: 'reference result', sub: 'affected area · backup load', color: 'white', titleSize: 15, subSize: 11.5, glow: false });
          S.sc = ctx.node({ x: 760, y: 280, w: 260, h: 60, title: 'score', sub: 'program', color: 'magenta', titleSize: 15, subSize: 11.5, glow: false });
          S.ls = [ctx.link(S.tr, S.sc, { color: 'dim' }), ctx.link(S.ref, S.sc, { color: 'dim' })];
          return ctx.reveal([S.tr, S.ref, S.sc].concat(S.ls), { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.m = D.kv(ctx, 960, 180, 560, [['missed affected area', 'locations'], ['result error', 'per backup cell'], ['query cost', 'locations queried'], ['execution cost', 'steps · tokens'], ['end reasons', 'counted across cases']], { title: 'metrics per case', color: 'lime' });
            S.l3 = ctx.link(S.sc, { x: 960, y: 300 }, { color: 'dim' });
            return ctx.reveal([S.m.g, S.l3], { from: 'up' });
          });
        }
      },
      {
        title: 'The baseline',
        beats: [
          {
            say: 'The baseline is a general coding agent given the same tools. The query functions are served through the same MCP server, the investigation skill becomes its instruction file, and it runs the same cases with the same budget.',
            card: { tag: 'HOW IT WORKS', title: 'Same tools, same cases', body: 'Codex CLI with the MCP server and the skill as AGENTS.md. The only difference is the harness: a growing transcript versus State rendered each round.' },
            deep: '<p>The baseline answers the question why not use an existing agent with a measurement rather than an argument.</p>'
          },
          {
            say: 'Three context conditions run on the same cases: State rendered alone, State with a short step history, and raw observations appended with compaction, which is also what the baseline does.',
            card: { tag: 'HOW IT WORKS', title: 'Three context conditions', body: 'A: rendered State · B: rendered State + last steps · C: appended raw observations. Same cases, same model, same budget.' },
            deep: '<p>In the recorded case the rendered State stays near three thousand tokens while the appended observations pass fifty thousand by action 7.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['tr', 'ref', 'sc', 'l3'].forEach(function (k) { if (S[k]) ctx.fade(S[k], 0, 250); }); S.ls.forEach(function (l) { ctx.fade(l, 0, 250); }); if (S.m) ctx.fade(S.m.g, 0, 250);
          S.ours = ctx.node({ x: 400, y: 220, w: 420, h: 64, title: 'outage harness', sub: 'State rendered each round', color: 'magenta', titleSize: 15, subSize: 12, glow: false });
          S.base = ctx.node({ x: 1180, y: 220, w: 420, h: 64, title: 'baseline: Codex CLI', sub: 'transcript · compaction', color: 'dim', kind: 'ghost', titleSize: 15, subSize: 12, glow: false });
          S.srv = ctx.node({ x: 790, y: 360, w: 360, h: 64, title: 'MCP server', sub: 'the same tools for both', color: 'blue', titleSize: 15, subSize: 12, glow: false });
          S.bl = [ctx.link(S.ours, S.srv, { color: 'dim' }), ctx.link(S.base, S.srv, { color: 'dim' })];
          return ctx.reveal([S.ours, S.base, S.srv].concat(S.bl), { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.cond = D.kv(ctx, 300, 480, 980, [['A', 'rendered State'], ['B', 'rendered State + last steps'], ['C', 'appended raw observations, compacted · the baseline']], { title: 'context conditions · same cases, model and budget', color: 'amber' });
            return ctx.reveal(S.cond.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Localizing an error',
        beats: [
          {
            say: 'A wrong final result does not say which decision was wrong. Localization compares the trace with the reference and finds the step where the two first diverge.',
            card: { tag: 'HOW IT WORKS', title: 'Find the first divergence', body: 'The program diffs each State against the reference. A person or a model then reads the steps around the first difference.' },
            deep: '<p>Because every Step holds the State before and after, the comparison is per step, not per run.</p>'
          },
          {
            say: 'Three ways to confirm a suspect decision: the program shows the difference, a model diagnoses the related steps, or the decision is changed and the later steps re-run.',
            card: { tag: 'HOW IT WORKS', title: 'Three confirmations', body: 'program diff · model diagnosis over the trace · change one decision and re-run. A better result after a change supports the fix; it does not prove a single cause.' },
            deep: '<p>Reference results never enter the context of a normal run. They are used only here, offline.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['ours', 'base', 'srv'].forEach(function (k) { if (S[k]) ctx.fade(S[k], 0, 250); }); S.bl.forEach(function (l) { ctx.fade(l, 0, 250); }); if (S.cond) ctx.fade(S.cond.g, 0, 250);
          S.row = [0, 1, 2, 3, 4, 5].map(function (i) { return ctx.node({ x: 240 + i * 220, y: 220, w: 150, h: 46, title: 'S' + (i + 3), color: i === 3 ? 'red' : 'teal', kind: 'pill', titleSize: 13.5, glow: false }); });
          S.rowT = ctx.text(80, 220, 'trace', { size: 13.5, weight: 700 });
          S.refRow = [0, 1, 2, 3, 4, 5].map(function (i) { return ctx.node({ x: 240 + i * 220, y: 300, w: 150, h: 46, title: 'R' + (i + 3), color: 'white', kind: 'pill', titleSize: 13.5, glow: false }); });
          S.refT = ctx.text(80, 300, 'reference', { size: 13.5, weight: 700 });
          S.mark = ctx.text(900, 360, 'first divergence at S6: an area closed too early', { size: 13.5, color: 'red', anchor: 'middle' });
          return ctx.reveal(S.row.concat(S.refRow, [S.rowT, S.refT, S.mark]), { from: 'fade', stagger: 30 }).then(function () { return ctx.beat(1); }).then(function () {
            S.three = D.kv(ctx, 300, 430, 980, [['program', 'diff State against the reference, per step'], ['model', 'diagnose the steps around the divergence'], ['re-run', 'change the decision at S6, re-run S7 onward, compare']], { title: 'confirming a suspect decision', color: 'red' });
            return ctx.reveal(S.three.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Recovery',
        beats: [
          {
            say: 'Three ways to recover from a wrong decision: tell the model in text and continue, correct State in the program and continue, or resume from the checkpoint before the decision with the same correction.',
            card: { tag: 'HOW IT WORKS', title: 'Three recovery paths', body: 'text feedback · program-corrected State · resume from checkpoint. Compared under the same correction, data version and budget.' },
            deep: '<p>The third path needs the checkpoint fields from the State and Trace chamber: full State, counters, data version and cache inside the Step.</p>'
          },
          {
            say: 'Whichever path is used, the corrected run is scored like any other, and its trace shows the correction as a fact in State.',
            card: { tag: 'KEY IDEA', title: 'A correction is a fact', body: 'Written into State with its source, read by the model, visible in the trace.' },
            deep: '<p>This keeps the three paths comparable: each produces a trace that the same scoring reads.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.row.forEach(function (n) { ctx.fade(n, 0, 250); }); S.refRow.forEach(function (n) { ctx.fade(n, 0, 250); }); [S.rowT, S.refT, S.mark].forEach(function (e) { ctx.fade(e, 0, 250); }); if (S.three) ctx.fade(S.three.g, 0, 250);
          S.paths = [['text feedback', 'tell the model, continue'], ['corrected State', 'program fixes State, continue'], ['resume from checkpoint', 'go back before the decision, correct, re-run']].map(function (p, i) {
            return ctx.node({ x: 330 + i * 460, y: 240, w: 400, h: 70, title: p[0], sub: p[1], color: i === 2 ? 'teal' : 'magenta', titleSize: 15, subSize: 12, glow: false });
          });
          return ctx.reveal(S.paths, { from: 'up', stagger: 80 }).then(function () { return ctx.beat(1); }).then(function () {
            S.same = D.kv(ctx, 300, 400, 980, [['same correction', 'the same facts, written into State'], ['same data version and budget', 'so the three paths compare'], ['same scoring', 'missed area · result error · cost']], { title: 'compared under the same conditions', color: 'lime' });
            return ctx.reveal(S.same.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
