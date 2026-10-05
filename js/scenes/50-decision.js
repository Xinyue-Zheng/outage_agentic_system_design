/* L1 — Decision Core. From a model output to an executed action, feedback, or an accepted stop:
 * propose, parse, validate, verify, route, complete. */
(function () {
  var D = window.OutageDraw;
  var DEC = window.OUTAGE_DECISIONS;

  function pipeline(ctx, S) {
    var names = [['llm_call', 'proposes', 'amber'], ['parse', 'program', 'magenta'], ['validate', 'program', 'magenta'], ['verifier', 'model', 'amber'], ['route', 'program', 'magenta']];
    S.P = {};
    names.forEach(function (n, i) { S.P[n[0]] = ctx.node({ x: 190 + i * 300, y: 150, w: 230, h: 54, title: n[0], sub: n[1], color: n[2], titleSize: 14, subSize: 11, glow: false }); });
    S.plinks = [0, 1, 2, 3].map(function (i) { return ctx.link(S.P[names[i][0]], S.P[names[i + 1][0]], { color: 'dim', sw: 1.3 }); });
    S.setActive = function (k) { Object.keys(S.P).forEach(function (n) { S.P[n].setAttribute('opacity', !k || n === k ? 1 : 0.35); }); };
  }

  Atlas.register({
    id: 'decision',
    refs: ['OpenAI, <i>Unrolling the Codex agent loop</i>, 2026'],
    poster: 1,
    steps: [
      {
        title: 'The model proposes',
        beats: [
          {
            say: 'Every round the model produces one decision in three parts: the action, its parameters, and the information gap the action is meant to close.',
            card: { tag: 'KEY IDEA', title: 'One decision, three parts', body: 'action · parameters · gap. The gap names its targets, the areas or cells it is about, and says in one sentence what is unknown.' },
            deep: '<p>The model only proposes. It never executes, never updates State, and never ends the run. A finish request is a decision like any other: action <code>finish</code>, with the reason in the gap.</p>'
          },
          {
            say: 'The decision goes through the same five stages whatever the action is: parse, validate, verify, route. Program stages are shown in magenta, model stages in orange.',
            card: { tag: 'HOW IT WORKS', title: 'Five stages', body: 'llm_call proposes · parse · validate · verifier · route. Two are the model, three are program.' },
            deep: '<p>Keeping one path for every decision means every decision is checked the same way and recorded the same way in the Step.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          pipeline(ctx, S);
          S.setActive('llm_call');
          S.dec = D.decision(ctx, 190, 260, 760, DEC[4], { title: 'a decision, action 4 of the case' });
          return ctx.reveal([S.dec.g, S.P.llm_call], { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.setActive(null);
            return ctx.reveal(Object.keys(S.P).filter(function (k) { return k !== 'llm_call'; }).map(function (k) { return S.P[k]; }).concat(S.plinks), { from: 'fade', stagger: 60 });
          });
        }
      },
      {
        title: 'Parse',
        beats: [
          {
            say: 'The parser reads the three parts. If they are all there, the decision moves on. If not, the error and the required format go back to the model as an observation.',
            card: { tag: 'HOW IT WORKS', title: 'Three parts, or an error', body: 'A reply that does not parse is not a crash. It becomes an observation the model reads next round.' },
            deep: '<p>The retry counter increases on every parse failure. At the cap the run ends with the reason retry cap and a person reviews it.</p>'
          },
          {
            say: 'Three failures in a row end the run. A model that cannot produce the format is not asked a fourth time.',
            card: { tag: 'NUMBERS', title: 'Retry cap', stat: { v: '3', l: 'parse failures in a row end the run' } },
            deep: '<p>The cap is a run cap like the others, with its own typed end reason.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          if (S.dec) ctx.fade(S.dec.g, 0, 250);
          S.setActive('parse');
          S.pp = D.kv(ctx, 190, 260, 760, [['parses', 'the decision moves to validate'], ['does not parse', 'error and required format → observation'], ['counter', 'retries + 1']], { title: 'parse', color: 'magenta' });
          return ctx.reveal(S.pp.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.cap = ctx.node({ x: 1250, y: 320, w: 260, h: 54, title: 'END: retry cap', sub: '3 failures in a row', color: 'red', kind: 'pill', titleSize: 14, subSize: 11, glow: false });
            return ctx.reveal(S.cap, { from: 'left' });
          });
        }
      },
      {
        title: 'Validate',
        beats: [
          {
            say: 'The validator runs four program checks against the registry and State. Any failure sends the decision back to the model with the check that failed.',
            card: { tag: 'HOW IT WORKS', title: 'Four program checks', body: '1 the action exists · 2 parameters are typed and refer to State · 3 the gap\'s targets agree with State · 4 the action can answer the gap' },
            deep: '<p>Check 3 catches a gap that calls an area unqueried when State shows it queried. Check 4 catches a coverage query for a gap about a cell\'s load. Both are rules over State and the registry; no judgment.</p>'
          },
          {
            say: 'A rejection is specific: which check failed and why. The model reads it in the next context. Rejections count toward a cap too.',
            card: { tag: 'HOW IT WORKS', title: 'Feedback, not a crash', body: 'unknown action · bad parameter · gap contradicts State · action cannot answer the gap. Each with its reason.' },
            deep: '<p>Repeated rejections end the run with the reason rejection cap, and a person reviews the trace.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['pp', 'cap'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g || S[k], 0, 250); });
          S.setActive('validate');
          S.vv = D.kv(ctx, 190, 260, 760, [['1 action', 'exists in the registry'], ['2 parameters', 'typed, with units, refer to State'], ['3 gap targets', 'agree with State'], ['4 action vs gap', 'the action can answer it']], { title: 'validate · program', color: 'magenta' });
          return ctx.reveal(S.vv.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.rej = D.kv(ctx, 1000, 260, 540, [['on failure', 'which check, and why → observation'], ['counter', 'rejections + 1'], ['at the cap', 'run ends: rejection cap']], { title: 'rejection', color: 'red' });
            return ctx.reveal(S.rej.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Verifier',
        beats: [
          {
            say: 'After the program checks pass, a verifier model reads the decision and the rendered State and answers one question: is this gap a sensible next question?',
            card: { tag: 'KEY IDEA', title: 'A model judges the question', body: 'The program can check that a gap is consistent with State. Only a model can judge whether it is worth asking now.' },
            deep: '<p>The verifier sees the same rendered State as the deciding model, plus the decision. It answers agree, or concern with a reason.</p>'
          },
          {
            say: 'A concern does not stop the action. It is written into State as a fact, and the deciding model reads it in the next round.',
            card: { tag: 'HOW IT WORKS', title: 'Advisory, written into State', body: 'agree → nothing changes. concern → a fact in State: the verifier\'s reason. The action still runs.' },
            deep: '<p>The verifier never ends a run and never rejects. Its concerns are part of the trace, so a reviewer can see when a decision was questioned and what happened next.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['vv', 'rej'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g, 0, 250); });
          S.setActive('verifier');
          S.ver = D.kv(ctx, 190, 260, 760, [['reads', 'the decision · the rendered State'], ['asks', 'is this gap a sensible next question?'], ['answers', 'agree · concern with a reason']], { title: 'verifier · model', color: 'amber' });
          return ctx.reveal(S.ver.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.adv = D.kv(ctx, 1000, 260, 540, [['agree', 'nothing changes'], ['concern', 'a fact in State, read next round'], ['the action', 'still runs']], { title: 'advisory', color: 'amber' });
            return ctx.reveal(S.adv.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Finish and completion',
        beats: [
          {
            say: 'Route reads the action name. A query goes to execution. A finish goes to the completion checks. Nothing else happens there.',
            card: { tag: 'HOW IT WORKS', title: 'Route by action', body: 'query → execute_query. finish → completion_checks.' },
            deep: '<p>The finish request has already passed parse, validate and the verifier like every other decision.</p>'
          },
          {
            say: 'Completion checks are four program rules over State. The query boundary must not show the down cell; key areas must be queried or have a recorded reason; queried locations must be labelled; backup load must be done.',
            card: { tag: 'HOW IT WORKS', title: 'Four completion rules', body: 'boundary · key areas · labels · backup load. All four pass: the run ends complete. Any fails: the unmet ones are written into State.' },
            deep: '<p>Unmet requirements become facts the model reads next round, so it can decide what to query next. The model asks to stop; the program decides.</p>'
          },
          {
            say: 'In the recorded case the checks would refuse at the end: the down cell is still present at ninety nine of one hundred sixty eight boundary locations, and three rural areas are unqueried.',
            card: { tag: 'NUMBERS', title: 'Would the case stop?', stat: { v: '99 / 168', l: 'boundary locations with D0 at the end of the recorded run: not accepted' } },
            deep: '<p>The run would continue with those facts in the context, or end on a cap if the budget were spent.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['ver', 'adv'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g, 0, 250); });
          S.setActive('route');
          S.ex = ctx.node({ x: 400, y: 330, w: 300, h: 54, title: 'execute_query', sub: 'a query action', color: 'blue', titleSize: 14, subSize: 11, glow: false });
          S.cc = ctx.node({ x: 1000, y: 330, w: 300, h: 54, title: 'completion_checks', sub: 'the finish action', color: 'pink', titleSize: 14, subSize: 11, glow: false });
          S.r1 = ctx.link(S.P.route, S.ex, { color: 'blue', sw: 1.3, dash: '4 3', label: 'query' });
          S.r2 = ctx.link(S.P.route, S.cc, { color: 'pink', sw: 1.3, dash: '4 3', label: 'finish' });
          return ctx.reveal([S.ex, S.cc, S.r1, S.r2], { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.rules = D.kv(ctx, 190, 420, 760, [['boundary', 'no down cell on the query boundary'], ['key areas', 'queried, or a reason recorded'], ['labels', 'every queried location classified'], ['backup load', 'done for the cells in scope']], { title: 'completion checks · program', color: 'pink' });
            S.ends = D.kv(ctx, 1000, 420, 540, [['all pass', 'END: complete'], ['any fails', 'unmet requirements → State']], { title: 'outcome', color: 'pink' });
            return ctx.reveal([S.rules.g, S.ends.g], { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            var sa = D.region(8, 'Study_area');
            S.num = D.kv(ctx, 190, 620, 760, [['boundary with D0', sa.boundary_target + ' of ' + sa.boundary + ' → not accepted'], ['rural areas unqueried', 'F1, V1, F2 → not accepted']], { title: 'the recorded case at its end', color: 'red' });
            return ctx.reveal(S.num.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
