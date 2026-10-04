/* L1 — The Investigation Loop. The graph the program runs around the model: nodes, conditional edges,
 * where failures go, who decides what, how a run ends. Numbers from the recorded case. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  function endPill(ctx, x, y, title, sub, parent) {
    return ctx.node({ x: x, y: y, w: 190, h: 44, title: title, sub: sub, color: 'red', kind: 'pill', titleSize: 12.5, subSize: 10.5, glow: false, parent: parent });
  }

  Atlas.register({
    id: 'loop',
    refs: [
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026',
      'Yao et al., <i>ReAct: Synergizing Reasoning and Acting in Language Models</i>, ICLR 2023',
      'Anthropic, <i>Building effective agents</i>, 2024',
      'Guo et al., <i>From Question Answering to Task Completion: A Survey on Agent System and Harness Design</i>, arXiv 2606.20683, 2026'
    ],
    poster: 1,
    steps: [
      {
        title: 'The graph',
        beats: [
          {
            say: 'The loop is a graph of program functions with one model call inside it. Solid edges always run. The model proposes; every other node is deterministic code.',
            card: { tag: 'KEY IDEA', title: 'One model call, seven program nodes', body: 'render, call, parse, validate, execute, update, record, guard. Only <code>llm_call</code> is a model. The rest is testable code.' },
            deep: '<p>The shape is the same as every tool-calling harness: assemble input, call the model, act on its output, append the result, repeat. The differences are in what each node does. Here the input is rendered from State instead of being a transcript, the output is validated against a registry and the State, and the stop is accepted by program checks rather than by the model falling silent.</p>'
          },
          {
            say: 'One round starts at render context and ends at loop guards. The dashed return edge is the next round. In the recorded case eight rounds ran.',
            card: { tag: 'HOW IT WORKS', title: 'A round is one Step', body: 'Each lap writes exactly one Step: one decision, one action, one Observation, one State update.' },
            deep: '<p>Keeping one decision per Step is a design rule, not an accident. Offline error localization asks "which decision caused this", and the modified-step re-run experiment replaces one decision and replays. Both need a one-to-one mapping between a Step and a State change. This is why the design uses set-valued parameters instead of several actions per reply.</p>'
          },
          {
            say: 'Three nodes carry the state of the run between laps: update state writes facts, write step records the lap, and render context reads everything back for the next decision.',
            card: { tag: 'KEY IDEA', title: 'Memory lives in State, not in the model', body: 'The model is stateless between calls. What it knows at step 5 is exactly what render_context wrote from State 4.' },
            deep: '<p>Codex CLI and Gemini CLI keep memory between calls by resending the whole transcript. The outage loop keeps it in a structured State and sends a fresh rendering each time. The rendering stayed between 2,167 and 3,498 tokens across the nine states of the recorded run; the transcript alternative would have reached about 58,000 tokens by step 7.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.loop = D.loop(ctx, { x: 60, y: 300, w: 160, h: 60, gap: 24, bend: 90 });
          S.loop.g.setAttribute('opacity', 0);
          return ctx.reveal(S.loop.g, { from: 'up', dur: 500 }).then(function () { return ctx.beat(1); }).then(function () {
            return ctx.packet(S.loop.back, { color: 'magenta', dur: 1400, label: 'round 2' }).then(function () {
              S.roundLbl = ctx.label(800, 470, '8 rounds in the recorded case', { color: 'magenta', size: 12 });
              return ctx.reveal(S.roundLbl, { from: 'down' });
            });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.stateBand = ctx.node({ x: 800, y: 560, w: 1120, h: 56, title: 'shared State and Trace', sub: 'read by render_context, validate, loop_guards · written by update_state, write_step', color: 'teal', kind: 'ghost', titleSize: 14, subSize: 11, glow: false });
            S.l1 = ctx.link(S.loop.nodes.update_state, S.stateBand, { color: 'teal', from: 'b', to: 't', sw: 1.2, label: 'writes', labelDx: 24 });
            S.l2 = ctx.link(S.loop.nodes.write_step, S.stateBand, { color: 'teal', from: 'b', to: 't', sw: 1.2 });
            S.l3 = ctx.link(S.stateBand, S.loop.nodes.render_context, { color: 'teal', from: 't', to: 'b', sw: 1.2, dash: '3 4', label: 'reads', labelDx: -26 });
            return Promise.all([ctx.reveal(S.stateBand, { from: 'up' }), ctx.reveal([S.l1, S.l2, S.l3], { from: 'draw', delay: 200 })]);
          });
        }
      },
      {
        title: 'One round in detail',
        beats: [
          {
            say: 'Take step four of the case. Render context writes about twenty nine hundred tokens from State three: progress per reference, coverage, frontier counts, unknowns, references, provenance.',
            card: { tag: 'NUMBERS', title: 'The input to the model', stat: { v: '2,917', u: 'tokens', l: 'rendered from state_03, plus the fixed skill text in front' } },
            deep: '<p>The rendering is a template over State. It contains no raw records and no earlier model text. The fixed investigation skill, about 2.7 KB, precedes it and does not change between steps. Together they are the entire model input.</p>'
          },
          {
            say: 'The model answers with three parts. Parse turns the text into a decision or an error. Validate checks the action name, the reference, the geometry, the epoch and the preconditions against State.',
            card: { tag: 'HOW IT WORKS', title: 'Parse, then validate, then act', body: 'Two program gates before anything runs. Both return a readable error to the model instead of raising.' },
            deep: '<p>For step 4: action <code>coverage.query</code> exists; <code>S2_roadside</code> is a known reference with 40 grid ids; the geometry equals the reference geometry; the epoch is pre-outage; no precondition applies to a coverage query. Had the reference been unknown, the error would name the valid references and the round would go back to render_context with the error written into State.</p>'
          },
          {
            say: 'Execute runs the query and normalizes the result. Update state recomputes every region summary from all evidence. Write step records the lap. Loop guards check the caps. Then the next round.',
            card: { tag: 'NUMBERS', title: 'What one lap changed', stat: { v: '40', l: 'locations queried, 20 with D0; study area frontier 119 with D0 at 92; context 2,895 tokens' } },
            deep: '<p>Observation <code>obs_04</code>: 40 requested, 40 valid, 0 missing, result status complete, 17 KB on disk. State 4 differs from State 3 in the S2, S2_roadside and Study_area summaries and in the provenance list. Nothing else moved. The next rendering is smaller than the previous one because unknowns were resolved.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.stateBand, S.l1, S.l2, S.l3, S.roundLbl], 0.25, 400);
          S.loop.setActive('render_context');
          S.p1 = D.kv(ctx, 60, 620, 440, [['input', 'skill (2.7 KB) + context state_03'], ['size', '2,917 tokens'], ['raw records in it', 'none']], { title: 'render_context', color: 'amber' });
          return ctx.reveal(S.p1.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.loop.setActive('validate');
            S.p2 = D.kv(ctx, 560, 620, 460, [['parse', 'action · parameters · gap'], ['name in registry', 'coverage.query ✓'], ['reference known', 'S2_roadside, 40 ids ✓'], ['geometry and epoch', '✓ pre_outage']], { title: 'parse and validate', color: 'magenta' });
            return ctx.reveal(S.p2.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.loop.setActive('update_state');
            S.p3 = D.kv(ctx, 1080, 620, 460, [['observation', 'obs_04 · complete · 17 KB'], ['D0 present', '20 of 40'], ['study-area frontier', '119, D0 at 92'], ['context after', '2,895 tokens']], { title: 'execute, update, record', color: 'teal' });
            return ctx.reveal(S.p3.g, { from: 'up' }).then(function () { return ctx.packet(S.loop.back, { color: 'magenta', dur: 1200, label: 'round 5' }); });
          });
        }
      },
      {
        title: 'Where failures go',
        beats: [
          {
            say: 'Every failure inside a round becomes an observation the model can read on the next round. Nothing raises an exception to the caller, and nothing is silently repaired.',
            card: { tag: 'KEY IDEA', title: 'Errors are observations', body: 'Unparseable output, unknown action, bad parameter, unmet precondition, a gap contradicted by State: each writes an error into State and returns to render_context.' },
            deep: '<p>This is the one rule all three studied harnesses share. Codex returns argument parse errors as the tool output; Gemini wraps every failure as a function response with an error field; TurnL appends a corrective user message. The outage loop had detection of bad actions in the handoff but no rule for what happens after detection. These edges are that rule.</p>'
          },
          {
            say: 'Each failure type has its own message. An unknown action lists the valid actions. A bad parameter names the parameter and why. An unmet precondition names the missing step. A contradicted gap cites the State fact.',
            card: { tag: 'HOW IT WORKS', title: 'One message per failure type', body: 'Specific text, so the model can correct the exact mistake. A counter increments on every rejection.' },
            deep: '<p>Example for a contradicted gap: the model proposes to query S2_remaining "because the S2 interior is unqueried" after step 5. State says S2 has 0 unqueried locations. The message: "S2_remaining: 160 of 160 locations are already queried (obs_05); the stated gap is closed." The rejection counter goes to 1.</p>'
          },
          {
            say: 'Repeated failures are bounded. Parse failures stop at three. Rejections stop at a cap. Then the run ends with a typed reason and a person reviews the trace. The loop never spins.',
            card: { tag: 'NUMBERS', title: 'Retry cap', stat: { v: '3', l: 'parse failures before the run ends with reason retry_cap; Gemini CLI uses 4 and TurnL uses 3' } },
            deep: '<p>Codex has a circuit breaker after three denials in a row; Claude Code stops auto mode after three blocks. The pattern transfers: repeated disagreement between the program and the model is a signal to stop and ask a person, not to try again forever.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.p1.g, S.p2.g, S.p3.g], 0.2, 400);
          S.loop.setActive(null);
          S.errNode = ctx.node({ x: 520, y: 470, w: 230, h: 50, title: 'record_error_obs', sub: 'which check failed and why', color: 'magenta', kind: 'ghost', titleSize: 13, subSize: 10.5, glow: false });
          S.e1 = ctx.link(S.loop.nodes.parse, S.errNode, { color: 'red', from: 'b', to: 't', dash: '4 3', sw: 1.2, label: 'does not parse', labelDx: -40 });
          S.e2 = ctx.link(S.loop.nodes.validate, S.errNode, { color: 'red', from: 'b', to: 't', dash: '4 3', sw: 1.2, label: 'invalid', labelDx: 30 });
          S.e3 = ctx.link(S.errNode, S.loop.nodes.render_context, { color: 'red', from: 'l', to: 'b', bend: { x: 140, y: 470 }, dash: '4 3', sw: 1.2, label: 'retry as observation', labelDy: 14 });
          return Promise.all([ctx.reveal(S.errNode, { from: 'up' }), ctx.reveal([S.e1, S.e2, S.e3], { from: 'draw', delay: 200 })]).then(function () { return ctx.beat(1); }).then(function () {
            S.msgs = ctx.code({ x: 860, y: 430, w: 680, title: 'error observations (one per failure type)', lang: 'text', size: 10.5, color: 'red', lines: [
              'unknown_action:      "query_cells" is not an action; valid: coverage.query, impact.estimate',
              'bad_parameter:       reference "S4" does not exist in State; known: S1, S2, S3, H1_buffer, ...',
              'precondition_unmet:  impact.estimate needs queried D0 locations; Study_area has 0 queried',
              'gap_contradicted:    S2_remaining: 160 of 160 already queried (obs_05); gap is closed',
              'parse_failure:       expected three parts action / parameters / gap; got 2'
            ] });
            return ctx.reveal(S.msgs, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.endRetry = endPill(ctx, 520, 560, 'END: retry_cap', '3 parse failures · human reviews trace');
            S.e4 = ctx.link(S.errNode, S.endRetry, { color: 'red', from: 'b', to: 't', dash: '4 3', sw: 1.2, label: 'cap (3)', labelDx: 40 });
            return Promise.all([ctx.reveal(S.endRetry, { from: 'up' }), ctx.reveal(S.e4, { from: 'draw' })]);
          });
        }
      },
      {
        title: 'How a run ends',
        beats: [
          {
            say: 'The model may propose to stop, but it cannot stop. A finish request goes to the completion checks. If they pass, the run ends complete. If not, the unmet requirements are written into State and rendered next round.',
            card: { tag: 'KEY IDEA', title: 'The program owns the stop', body: 'Codex ends when the model makes no tool call. Here "no more queries" is a proposal that program rules accept or reject.' },
            deep: '<p>Four vanilla checks: the boundary buffer still shows the down cell; task-relevant regions queried or an explicit reason recorded; queried locations labelled; backup analysis done. In the recorded case the first two fail at state 8 (99 of 168 frontier locations with D0; 727 unqueried rural locations), so a stop would not be accepted. Thresholds are still to be set from reference results.</p>'
          },
          {
            say: 'Loop guards end a run for reasons that are not about the task: a step cap, a query budget measured in area, a wall time cap, a retry cap, a rejection cap, or a repeated query.',
            card: { tag: 'HOW IT WORKS', title: 'Caps live in the loop, not in the verifier', body: 'Counters, not judgments. A run ended by a cap is recorded differently from a run whose checks passed.' },
            deep: '<p>Codex CLI has no turn cap; Gemini CLI caps a request at 100 rounds and a session at a configured number; TurnL stops at 24 turns or a cost budget. For the outage task the budget unit is queried area, because one query can cover a settlement or a corridor and a call count would be the wrong measure. Each cap has its own typed end reason.</p>'
          },
          {
            say: 'Every end is typed: complete, step cap, query budget, time cap, retry cap, rejection cap, repeated query, cancelled. A person reads the reason and the trace, and may resume from a step.',
            card: { tag: 'NUMBERS', title: 'Eight end reasons, zero crashes', stat: { v: '8', l: 'typed end reasons; "budget exhausted" is never reported as "complete"' } },
            deep: '<p>Gemini CLI\'s headless mode already names why a run ended through exit codes: 42 input error, 53 turn limit, 55 untrusted workspace. The same idea here makes failures countable across cases, which the handoff asks for before any diagnosis mechanism is designed.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.errNode, S.e1, S.e2, S.e3, S.e4, S.endRetry, S.msgs], 0.2, 400);
          S.cc = ctx.node({ x: 1000, y: 160, w: 260, h: 54, title: 'completion_checks', sub: 'frontier · regions · labels · backup', color: 'pink', titleSize: 13, subSize: 10.5, glow: false });
          S.c1 = ctx.link(S.loop.nodes.validate, S.cc, { color: 'pink', from: 't', to: 'l', dash: '4 3', sw: 1.2, label: 'finish request', labelDy: -10 });
          S.endOk = ctx.node({ x: 1400, y: 160, w: 190, h: 44, title: 'END: complete', sub: 'report', color: 'red', kind: 'pill', titleSize: 12.5, subSize: 10.5, glow: false });
          S.c2 = ctx.link(S.cc, S.endOk, { color: 'pink', dash: '4 3', sw: 1.2, label: 'met', labelDy: -10 });
          S.c3 = ctx.link(S.cc, S.loop.nodes.render_context, { color: 'pink', from: 'b', to: 't', bend: { x: 400, y: 200 }, dash: '4 3', sw: 1.2, label: 'unmet: requirements written into State', labelDy: -8 });
          return Promise.all([ctx.reveal([S.cc, S.endOk], { from: 'up' }), ctx.reveal([S.c1, S.c2, S.c3], { from: 'draw', delay: 200 })]).then(function () { return ctx.beat(1); }).then(function () {
            S.endCap = endPill(ctx, 1430, 300, 'END: cap hit', 'step · area budget · time · repeats');
            S.c4 = ctx.link(S.loop.nodes.loop_guards, S.endCap, { color: 'red', dash: '4 3', sw: 1.2, label: 'a cap is hit', labelDy: -10 });
            return Promise.all([ctx.reveal(S.endCap, { from: 'left' }), ctx.reveal(S.c4, { from: 'draw' })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.reasons = ctx.code({ x: 60, y: 640, w: 700, title: 'EndReason', lang: 'text', size: 11, color: 'red', lines: [
              'complete | step_cap | query_budget | time_cap | retry_cap | rejection_cap | repeated_query | cancelled',
              'recorded case: script_end  (live: query_budget or step_cap; never complete at state_08)'
            ] });
            return ctx.reveal(S.reasons, { from: 'up' });
          });
        }
      },
      {
        title: 'Who decides what',
        beats: [
          {
            say: 'The responsibility split is fixed. The program parses raw results, computes statistics and spatial relations, renders text, validates, executes, updates State and records. The model proposes the gap, the action and the parameters, and may propose to stop.',
            card: { tag: 'KEY IDEA', title: 'Program computes, model proposes', body: 'Nine program duties, three model duties. The model never reads raw data, never writes State, never ends the run.' },
            deep: '<p>This is the handoff\'s section 9 made concrete by the loop nodes. Codex CLI\'s principle is the opposite: format consistently, interpret rarely, rely on the model. That works with a strong model and an environment that answers in exit codes. Coverage data answers in records with internal field names, and the internal model is not top-tier and cannot read images, so interpretation moves into the program.</p>'
          },
          {
            say: 'Two things stay fixed in code outside the loop: the initialization phase, cell lookup and the home settlement, and the entry into the backup and load phase, which needs queried D0 locations first.',
            card: { tag: 'HOW IT WORKS', title: 'Phases are code, choices are the model\'s', body: 'Initialization and the phase boundary are fixed. Which corridor, which settlement, which part first: the model decides.' },
            deep: '<p>Codex lets the model order all the work because coding has no fixed phases. The outage task has two, and the precondition on <code>impact.estimate</code> enforces the boundary: it requires queried locations with D0 present. The handoff lists fixing this boundary as its open item 2; the loop gives it a place.</p>'
          },
          {
            say: 'A human is at the boundary, not inside the loop. Nothing needs approval mid run because every tool is a read only query. The human reads a run that ended with a typed reason and may resume it from a step.',
            card: { tag: 'TRADE-OFF', title: 'No approval gate mid-run', body: 'Codex needs one because its tools change the world. Queries do not. Mid-run human input waits until a baseline shows a failure that needs it.' },
            deep: '<p>What transfers from the product harnesses is the ordering: deterministic rules decide first, a reviewer model is optional and later, a person is the fallback when rules and model keep disagreeing. The reviewer model from the September deck is deferred until recorded failures show what it would have to catch.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.cc, S.c1, S.c2, S.c3, S.c4, S.endOk, S.endCap, S.reasons], 0.15, 400);
          S.loop.setActive(null);
          S.split = ctx.code({ x: 60, y: 430, w: 760, title: 'responsibility split (handoff §9)', lang: 'text', size: 10.5, color: 'magenta', lines: [
            'program:  parse raw results · compute counts, statistics, relations · render text',
            '          validate name, parameters, references, preconditions · execute · update State',
            '          record Step and Trace · accept or reject a stop · apply caps',
            'model:    propose the information gap · propose action and parameters · propose to stop'
          ] });
          return ctx.reveal(S.split, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.phases = D.kv(ctx, 860, 430, 680, [['phase 0 (code)', 'cell lookup · home settlement · initial State'], ['phase 1 (model chooses)', 'coverage queries over references'], ['boundary (precondition)', 'impact.estimate needs queried D0 locations'], ['phase 2 (model proposes, code computes)', 'backup selection · transfer · load']], { title: 'fixed phases vs model choices', color: 'magenta' });
            return ctx.reveal(S.phases.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.human = ctx.node({ x: 1330, y: 700, w: 300, h: 56, title: 'person', sub: 'reads typed end + trace · may resume from a Step', icon: 'user', color: 'white', titleSize: 13, subSize: 10.5, glow: false });
            S.h1 = ctx.link(S.loop.nodes.loop_guards, S.human, { color: 'white', from: 'b', to: 't', dash: '3 4', sw: 1.2, label: 'only at the end', labelDx: 40 });
            return Promise.all([ctx.reveal(S.human, { from: 'up' }), ctx.reveal(S.h1, { from: 'draw', delay: 150 })]);
          });
        }
      }
    ]
  });
})();
