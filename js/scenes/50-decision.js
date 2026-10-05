/* L1 — Decision Core. From the model's output to an executed action or feedback: propose, parse, validate,
 * and the completion checks that accept a stop. */
(function () {
  var D = window.OutageDraw;
  var DEC = window.OUTAGE_DECISIONS;

  function pipeline(ctx, S) {
    S.P = {};
    var defs = [
      ['llm_call', 540, 170, 'amber', 'proposes a decision'],
      ['parse', 540, 290, 'magenta', 'three parts or an error'],
      ['validate_action', 540, 410, 'magenta', 'against registry and State'],
      ['execute_query', 220, 530, 'blue', 'a valid query action'],
      ['completion_checks', 860, 530, 'pink', 'a finish request'],
      ['record_error_obs', 1180, 290, 'red', 'what failed and why']
    ];
    defs.forEach(function (d) {
      S.P[d[0]] = ctx.node({ x: d[1], y: d[2], w: 260, h: 56, title: d[0], sub: d[4], color: d[3], titleSize: 13, subSize: 10.5, glow: false });
    });
    S.PL = [
      ctx.link(S.P.llm_call, S.P.parse, { color: 'dim' }),
      ctx.link(S.P.parse, S.P.validate_action, { color: 'dim', label: 'parsed' }),
      ctx.link(S.P.validate_action, S.P.execute_query, { color: 'blue', dash: '4 3', label: 'valid query' }),
      ctx.link(S.P.validate_action, S.P.completion_checks, { color: 'pink', dash: '4 3', label: 'finish request' }),
      ctx.link(S.P.parse, S.P.record_error_obs, { color: 'red', dash: '4 3', label: 'does not parse' }),
      ctx.link(S.P.validate_action, S.P.record_error_obs, { color: 'red', dash: '4 3', label: 'invalid', from: 'r', to: 'b' }),
      ctx.link(S.P.completion_checks, S.P.record_error_obs, { color: 'pink', dash: '4 3', label: 'unmet', from: 'r', to: 'b', bend: { x: 1180, y: 530 } })
    ];
  }
  function focus(S, names) {
    Object.keys(S.P).forEach(function (n) { S.P[n].setAttribute('opacity', !names || names.indexOf(n) >= 0 ? 1 : 0.3); });
  }

  Atlas.register({
    id: 'decision',
    refs: [
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026',
      'Guo et al., <i>From Question Answering to Task Completion: A Survey on Agent System and Harness Design</i>, arXiv 2606.20683, 2026'
    ],
    poster: 1,
    setup: function (ctx) { pipeline(ctx, ctx.state); },
    steps: [
      {
        title: 'The model proposes',
        beats: [
          {
            say: 'The model\'s output is one decision in three parts: the action, its parameters, and the information gap the action is meant to close. The model proposes; it does not execute and it does not update State.',
            card: { tag: 'KEY IDEA', title: 'Action, parameters, gap', body: 'The gap is a sentence about what is not yet known. It is the model\'s reason, and the program can later compare it with State.' },
            deep: '<p>The three parts are the whole interface between model and program. Nothing else the model writes is used. The gap is kept because it is checkable: if the gap names a region as unqueried while State shows it queried, the program can say so.</p>'
          },
          {
            say: 'Each step the model reads the rendered context and writes one decision. One decision per step keeps every Step in the trace tied to exactly one choice.',
            card: { tag: 'HOW IT WORKS', title: 'One decision per step', body: 'Several references can be named in one action through a set-valued parameter. Several actions in one reply are not accepted.' },
            deep: '<p>Error localization and the modified-step re-run experiment both need a one-to-one link between a decision and the State change it caused. Set-valued parameters give the latency benefit of parallel calls without breaking that link.</p>'
          },
          {
            say: 'In the recorded case the actions are the scripted ones. The decision texts shown with them are hand-written illustrations of what the model would produce.',
            card: { tag: 'HOW IT WORKS', title: 'Illustrative decisions', body: 'No model was called in the recorded run. The decision cards in the case chamber show the form of the output, not a model\'s words.' },
            deep: '<p>This keeps the UI honest about what exists. The internal loop under construction produces this three-part output; its runs are not part of this UI yet.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          focus(S, ['llm_call']);
          S.dec = D.decision(ctx, 80, 150, 400, DEC[4], { title: 'a decision' });
          return ctx.reveal(S.dec.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.one = D.kv(ctx, 80, 300, 400, [['per step', 'one decision'], ['per action', 'one or more references (set-valued)'], ['several actions in one reply', 'not accepted']], { title: 'one decision per step', color: 'amber' });
            return ctx.reveal(S.one.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            return ctx.pulse(S.dec.g, { color: 'amber', times: 1, dur: 700 });
          });
        }
      },
      {
        title: 'Parse',
        beats: [
          {
            say: 'The parser is strict. Either the text yields the three parts, or it does not. There is no guessing and no partial acceptance.',
            card: { tag: 'HOW IT WORKS', title: 'Three parts or nothing', body: 'A reply that does not parse is not an action. It becomes an error observation: the problem and the required format, written into State.' },
            deep: '<p>The error is rendered into the next context, so the model sees what was wrong and tries again. The retry counter increments on every parse failure.</p>'
          },
          {
            say: 'Retries are capped. After three failed parses in a row the run ends with the typed reason retry cap, and a person reviews the trace.',
            card: { tag: 'NUMBERS', title: 'Retry cap', stat: { v: '3', l: 'consecutive parse failures end the run with a typed reason' } },
            deep: '<p>The cap keeps a stuck model from spending the budget on malformed replies. The end reason is recorded in the trace, so runs that failed this way can be counted separately from runs that completed.</p>'
          },
          {
            say: 'If the model service supports structured output, the parser can consume a structured call instead of text. The rules after parsing stay the same.',
            card: { tag: 'TRADE-OFF', title: 'Text or structured', body: 'Text in three parts works with any model. Structured output removes most parse failures where it is available. Whether the internal endpoint offers it is an open item.' },
            deep: '<p>The design does not depend on the answer. Validation, the error rules and the completion checks apply to the parsed decision, whichever way it arrived.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          focus(S, ['llm_call', 'parse', 'record_error_obs']);
          if (S.dec) ctx.fade(S.dec.g, 0.15, 300);
          if (S.one) ctx.fade(S.one.g, 0.15, 300);
          S.parse = D.kv(ctx, 80, 150, 400, [['parses', 'decision → validate'], ['does not parse', 'error observation: problem + required format'], ['counter', 'retries + 1']], { title: 'parse', color: 'magenta' });
          return ctx.reveal(S.parse.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.cap = ctx.node({ x: 1180, y: 410, w: 260, h: 56, title: 'END: retry cap', sub: 'typed reason · human reviews the trace', color: 'red', kind: 'pill', titleSize: 13, subSize: 10.5, glow: false });
            S.capL = ctx.link(S.P.record_error_obs, S.cap, { color: 'red', dash: '4 3', label: '3 in a row' });
            return ctx.reveal([S.cap, S.capL], { from: 'fade' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.fmt = D.kv(ctx, 80, 300, 400, [['text, three parts', 'any model'], ['structured output', 'where the service offers it'], ['after parsing', 'identical rules']], { title: 'input form', color: 'magenta' });
            return ctx.reveal(S.fmt.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Validate',
        beats: [
          {
            say: 'Validation asks four questions of a parsed decision. Does the action exist in the registry? Do the parameters have the right types and refer to things in State? Do the preconditions hold? Does the stated gap agree with State?',
            card: { tag: 'HOW IT WORKS', title: 'Four checks, all program', body: 'Action name · parameters · preconditions · gap versus State. Deterministic, reproducible from the trace, no model involved.' },
            deep: '<p>The gap check compares the model\'s sentence with region summaries: a gap that says a region is unqueried when State shows it queried is a contradiction. Only gaps that name a region, a time or an indicator can be checked; free text is left alone.</p>'
          },
          {
            say: 'Each failure has its own response. Unknown action: the list of valid actions. Bad parameter: which one and why. Unmet precondition: the missing step by name. Contradicted gap: the fact in State.',
            card: { tag: 'KEY IDEA', title: 'One rule per failure', body: 'The response is specific, so the model can correct the decision rather than guess. Every rejection increments a counter; repeated rejections end the run.' },
            deep: '<p>A rejection is never fatal by itself. It becomes an error observation, rendered into the next context. The rejection cap, like the retry cap, ends the run with a typed reason after repeated disagreement.</p>'
          },
          {
            say: 'Validation checks that an action is well formed and allowed. It does not judge whether it is a good move. That judgment is left to the model, and at the end to the completion checks.',
            card: { tag: 'TRADE-OFF', title: 'Well formed, not wise', body: 'The program can tell a bad parameter from a good one. It cannot tell a useful query from a wasteful one, and it does not try.' },
            deep: '<p>Keeping these apart is what the handoff asked for: do not confuse parameter checking with judging the investigation strategy. A reviewer model for strategy is possible later, if observed failures call for it.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          focus(S, ['parse', 'validate_action', 'record_error_obs', 'execute_query']);
          ['parse', 'fmt'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g, 0.15, 300); });
          if (S.cap) { ctx.fade(S.cap, 0.3, 300); ctx.fade(S.capL, 0.3, 300); }
          S.val = D.kv(ctx, 80, 150, 400, [['action name', 'exists in the registry'], ['parameters', 'types, units, refer to State'], ['preconditions', 'hold in State'], ['stated gap', 'agrees with State']], { title: 'validate', color: 'magenta' });
          return ctx.reveal(S.val.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.rules = D.kv(ctx, 80, 320, 400, [['unknown action', 'list of valid actions'], ['bad parameter', 'which one and why'], ['unmet precondition', 'the missing step by name'], ['contradicted gap', 'the fact in State']], { title: 'one rule per failure', color: 'red' });
            return ctx.reveal(S.rules.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.notwise = D.kv(ctx, 80, 500, 400, [['validation decides', 'well formed and allowed'], ['validation does not decide', 'useful or wasteful'], ['that is', 'the model\'s, then the completion checks\'']], { title: 'the boundary', color: 'magenta' });
            return ctx.reveal(S.notwise.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Finish request and completion',
        beats: [
          {
            say: 'The model may propose to stop. A finish request is a decision like any other, and it is accepted only if the program\'s completion checks pass.',
            card: { tag: 'KEY IDEA', title: 'The model proposes, the program accepts', body: 'A stop that fails the checks returns the unmet requirements, rendered into the next context. The investigation continues.' },
            deep: '<p>In a general agent the run ends when the model stops calling tools. Here that is not enough: a request may be complete within its scope while the scope is too small. The checks exist to catch exactly that.</p>'
          },
          {
            say: 'Four checks are designed. Does the boundary of the queried area still show the down cell? Were the task-relevant regions queried, or was a reason recorded? Are the queried locations labelled? Is the backup analysis done for the relevant cells?',
            card: { tag: 'HOW IT WORKS', title: 'Four completion checks', body: 'Boundary · key regions · labels · backup load. All computed from State. Passing them means the conditions hold, not that the result is correct.' },
            deep: '<p>The thresholds are open: how much down-cell presence on the boundary blocks a stop, and which regions count as task-relevant. They will be set from reference results of real or controlled cases.</p>'
          },
          {
            say: 'When the checks pass, the run ends as complete and the report is produced. When they fail, the unmet requirements go back to the model. Either way the end is a typed reason in the trace.',
            card: { tag: 'HOW IT WORKS', title: 'Two outcomes, both recorded', body: 'Complete, with the report. Or unmet requirements, with the loop continuing. A run that hits a cap instead is never recorded as complete.' },
            deep: '<p>In the recorded case the script ends after eight actions with the boundary still showing the down cell at ninety nine of one hundred sixty eight frontier locations and three rural references unqueried. The checks would not accept a stop there.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          focus(S, ['validate_action', 'completion_checks', 'record_error_obs']);
          ['val', 'rules', 'notwise'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g, 0.15, 300); });
          S.fin = D.kv(ctx, 80, 150, 400, [['finish request', 'a decision like any other'], ['checks pass', 'END: complete, report'], ['checks fail', 'unmet requirements into State; continue']], { title: 'finish request', color: 'pink' });
          return ctx.reveal(S.fin.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.four = D.kv(ctx, 80, 300, 400, [['boundary', 'down cell still present at the frontier?'], ['key regions', 'queried, or a reason recorded?'], ['labels', 'queried locations classified?'], ['backup load', 'KPI, transfer, load done?']], { title: 'four completion checks', color: 'pink' });
            return ctx.reveal(S.four.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.endc = ctx.node({ x: 860, y: 650, w: 260, h: 56, title: 'END: complete', sub: 'report', color: 'red', kind: 'pill', titleSize: 13, subSize: 10.5, glow: false });
            S.endL = ctx.link(S.P.completion_checks, S.endc, { color: 'pink', dash: '4 3', label: 'met' });
            return ctx.reveal([S.endc, S.endL], { from: 'fade' });
          });
        }
      }
    ]
  });
})();
