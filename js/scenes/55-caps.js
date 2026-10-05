/* L1 — Run Caps. What loop_guards checks at the end of every round, and what a typed end means. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'caps',
    refs: [
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026'
    ],
    poster: 1,
    steps: [
      {
        title: 'Checked every round',
        beats: [
          {
            say: 'Loop guards is one program node at the end of every round. It does not decide anything about the investigation. It checks four caps and either lets the next round start or ends the run.',
            card: { tag: 'KEY IDEA', title: 'Caps, not judgment', body: 'Step cap, query budget, wall time, repeated query. Each is a number compared with a counter. None of them reads the model\'s reasoning.' },
            deep: '<p>The caps bound the cost of a run before any verifier exists. A query has a real cost in area and a model may repeat itself, so the loop cannot rely on the model to stop.</p>'
          },
          {
            say: 'The budget is counted in queried grid locations, not in calls. One query can cover a whole settlement or a few roadside rows, so counting calls would hide the real cost.',
            card: { tag: 'HOW IT WORKS', title: 'Budget in area', body: 'Every query\'s cost is its number of locations, known from the registry before it runs. The recorded case spent 466 unique locations in 7 queries.' },
            deep: '<p>Because the cost is known before execution, validation can already reject a query that would exceed the remaining budget, and loop guards only has to confirm the total after the round.</p>'
          },
          {
            say: 'The repeated-query detector hashes the action and its parameters. The same hash twice is the signature of a stuck model, and it ends the run rather than spending the budget again.',
            card: { tag: 'HOW IT WORKS', title: 'Repeated query', body: 'Hash of action plus parameters. A second identical query ends the run with the reason repeated query.' },
            deep: '<p>A short step history in the context also lets the model notice its own repeat.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.node = ctx.node({ x: 300, y: 220, w: 300, h: 64, title: 'loop_guards', sub: 'after write_step, every round', color: 'magenta', titleSize: 14, subSize: 11, glow: false });
          S.caps = D.kv(ctx, 520, 170, 560, [['step cap', 'steps taken vs. maximum'], ['query budget', 'queried locations vs. budget'], ['wall time', 'elapsed vs. limit'], ['repeated query', 'hash of action + parameters seen before']], { title: 'four caps', color: 'magenta' });
          S.l1 = ctx.link(S.node, { x: 520, y: 220 }, { color: 'dim' });
          return ctx.reveal([S.node, S.caps.g, S.l1], { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            var sa = D.region(CASE.states.length - 1, 'Study_area');
            S.bud = D.kv(ctx, 520, 330, 560, [['unit', 'grid locations, not calls'], ['recorded case', sa.queried + ' unique locations in 7 coverage queries'], ['known before execution', 'yes, from the registry cost estimate']], { title: 'budget', color: 'blue' });
            return ctx.reveal(S.bud.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.rep = D.kv(ctx, 520, 460, 560, [['signature', 'hash(action, parameters)'], ['threshold', 'second identical query'], ['recorded case', 'action 7 repeats action 4']], { title: 'repeated query', color: 'red' });
            return ctx.reveal(S.rep.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Typed ends',
        beats: [
          {
            say: 'Every run ends with a typed reason: complete, step cap, query budget, time cap, retry cap, rejection cap, or repeated query. Only one of them is complete.',
            card: { tag: 'KEY IDEA', title: 'Ended is not finished', body: 'A run that hit a cap is recorded as such. It is never confused with a run whose completion checks passed.' },
            deep: '<p>Typed end reasons make failures countable across cases and tell a reviewer where to look first.</p>'
          },
          {
            say: 'A person reviews the cases the program could not finish, not every case. A run that ends complete delivers its report. A run that ends on a cap is handed to a person with its trace.',
            card: { tag: 'HOW IT WORKS', title: 'Human at the boundary', body: 'No input during the run; the tools are read-only. A cap routes the case to a person, who corrects a Step and resumes, or closes the case.' },
            deep: '<p>Complete runs are reviewed only when sampled for evaluation. Runs ended by a cap are the ones that need a person, and their end reasons, counted across cases, show which failure is most common.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['caps', 'bud', 'rep'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g, 0.15, 300); });
          S.ends = ['complete', 'step_cap', 'query_budget', 'time_cap', 'retry_cap', 'rejection_cap', 'repeated_query'].map(function (n, i) {
            return ctx.node({ x: 240 + (i % 4) * 330, y: 360 + Math.floor(i / 4) * 80, w: 290, h: 48, title: n, color: n === 'complete' ? 'lime' : 'red', kind: 'pill', titleSize: 12.5, glow: false });
          });
          return ctx.reveal(S.ends, { from: 'up', stagger: 50 }).then(function () { return ctx.beat(1); }).then(function () {
            S.human = D.kv(ctx, 80, 540, 1000, [['during the run', 'no human input; tools are read-only'], ['at a typed end', 'a person reviews the trace'], ['then', 'resume from a corrected Step, or close the case']], { title: 'human at the boundary', color: 'pink' });
            return ctx.reveal(S.human.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
