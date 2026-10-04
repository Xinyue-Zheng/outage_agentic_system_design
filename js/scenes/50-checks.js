/* L1 — Validation and Completion. Parsing with a retry cap, one response rule per failure, completion checks
 * that accept a stop, program-computed wrong signals, and run caps with typed end reasons. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'checks',
    refs: [
      'Kambhampati et al., <i>LLMs Can\'t Plan, But Can Help Planning in LLM-Modulo Frameworks</i>, ICML 2024',
      'Gou et al., <i>CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing</i>, ICLR 2024',
      'Li et al., <i>QuestBench: Can LLMs ask the right question to acquire information in reasoning tasks?</i>, NeurIPS 2025',
      'OpenAI, <i>Harness engineering: leveraging Codex in an agent-first world</i>, 2026'
    ],
    poster: 3,
    steps: [
      {
        title: 'Parse with a cap',
        beats: [
          {
            say: 'The model output is text in three parts. A strict parser turns it into a decision or a parse failure. A failure is written as an error observation with the required format, and the retry counter increments. At three the run ends.',
            card: { tag: 'HOW IT WORKS', title: 'Parse or explain, never guess', body: 'No fuzzy repair of the model\'s text. The error says what was expected; the model fixes it next round. Cap 3, then typed end.' },
            deep: '<p>Codex returns argument parse errors to the model as the tool output and lets the loop continue. Gemini retries an invalid stream up to four times with a nudge message. TurnL appends a corrective user message up to three times. The outage loop uses the same shape with a text format because the internal model may not support native tool calling.</p>'
          },
          {
            say: 'If the internal endpoint supports native tool calling or schema constrained output, the parser consumes structured calls instead of text. The rules after parsing do not change.',
            card: { tag: 'STATE OF THE ART', title: 'Constrained decoding is a cheap upgrade', body: 'The mentor\'s example system forces valid JSON with a grammar mask. If the endpoint offers it, use it. The cap and the error path stay.' },
            deep: '<p>This is the first open item of the design: does the internal model support native tool calling? It decides whether the text format is a choice or a necessity, and whether Codex CLI can run as the baseline at all. Either way the parser is one function with one typed result.</p>'
          },
          {
            say: 'The parsed decision keeps the raw text. If the run later fails, the trace shows exactly what the model wrote, not only what the parser understood.',
            card: { tag: 'KEY IDEA', title: 'Keep the raw text', body: 'Decision { action, parameters, information_gap, raw_text }. Offline diagnosis needs the original.' },
            deep: '<p>Gemini CLI records the model\'s thoughts and messages in its session file for the same reason. The current prototype Step has no field for model text because no model ran; the proposed extension adds it.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.flow = D.loop(ctx, { names: ['llm_call', 'parse', 'validate'], subs: { llm_call: 'text, three parts', parse: 'strict · retries ≤ 3', validate: 'registry · State' }, colors: { llm_call: 'amber', parse: 'pink', validate: 'pink' }, x: 120, y: 230, w: 260, h: 60, gap: 80, loopBack: false });
          S.fail = ctx.node({ x: 500, y: 380, w: 300, h: 56, title: 'parse_failure', sub: 'error observation + retry counter', color: 'red', kind: 'ghost', titleSize: 13, subSize: 10.5, glow: false });
          S.f1 = ctx.link(S.flow.nodes.parse, S.fail, { color: 'red', from: 'b', to: 't', dash: '4 3', sw: 1.2, label: 'does not parse', labelDx: 50 });
          S.end = ctx.node({ x: 900, y: 380, w: 220, h: 44, title: 'END: retry_cap', sub: 'after 3', color: 'red', kind: 'pill', titleSize: 12.5, subSize: 10.5, glow: false });
          S.f2 = ctx.link(S.fail, S.end, { color: 'red', dash: '4 3', sw: 1.2 });
          return Promise.all([ctx.reveal([S.flow.g, S.fail, S.end], { from: 'up' }), ctx.reveal([S.f1, S.f2], { from: 'draw', delay: 250 })]).then(function () { return ctx.beat(1); }).then(function () {
            S.alt = D.kv(ctx, 1160, 180, 380, [['text in three parts', 'today: strict parser'], ['native tool calling', 'if supported: structured call, same rules'], ['schema-constrained output', 'if offered: grammar mask, same rules'], ['open item', 'check the internal endpoint']], { title: 'input formats', color: 'pink' });
            return ctx.reveal(S.alt.g, { from: 'left' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.dec = ctx.code({ x: 80, y: 480, w: 1460, title: 'Decision', lang: 'text', size: 11, color: 'pink', lines: ['action: str · parameters: dict · information_gap: str · raw_text: str   (raw text kept for offline diagnosis)'] });
            return ctx.reveal(S.dec, { from: 'up' });
          });
        }
      },
      {
        title: 'One rule per failure',
        beats: [
          {
            say: 'Validation has five failure kinds and each has its own response. Unknown action lists the valid actions. Bad parameter names the parameter and the reason. Unmet precondition names the missing step. Contradicted gap cites the State fact. Empty reply writes a placeholder step.',
            card: { tag: 'HOW IT WORKS', title: 'Five kinds, five messages', body: 'Specific text the model can act on. Every rejection increments a counter; the cap ends the run with reason rejection_cap.' },
            deep: '<p>The handoff had the detection side: the program checks names, parameters, references and preconditions. The response side is what was missing. Without it, a rejected action either crashed the loop or vanished. TurnL shows the failure mode: its denials abort the whole run, contrary to its own design notes.</p>'
          },
          {
            say: 'The messages are written for the model, not for a log. They name the thing that was wrong and the things that would be right, so the next decision can be a correction instead of a new guess.',
            card: { tag: 'KEY IDEA', title: 'Errors the model can act on', body: 'Codex\'s own advice from its failure-mode chamber: validate, return an error the model can act on, prefer ids to free text.' },
            deep: '<p>Example for bad_parameter: "reference S4 does not exist in State; known references: S1, S2, S3, H1_buffer, H2_buffer, F1, V1, F2, S2_roadside, S2_remaining, Study_area". The model needs no other information to recover.</p>'
          },
          {
            say: 'A rejection is a program fact, not a strategy judgment. Whether the model\'s choice was wise is not decided here. That separation is what the handoff asks for and what the September deck\'s single verifier box did not have.',
            card: { tag: 'TRADE-OFF', title: 'Validity, not wisdom', body: 'A passing check means the call is well formed and allowed. It does not mean the investigation strategy is right.' },
            deep: '<p>Keeping the two apart also keeps the trace readable: a rejection line means the model proposed something the program could not run; a failed completion check means the investigation was not finished. Different fixes, different experiments.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.flow.g, S.fail, S.end, S.f1, S.f2, S.alt.g, S.dec], 0.1, 400);
          S.kinds = ctx.code({ x: 80, y: 180, w: 1460, title: 'ValidationResult.kind → error observation', lang: 'text', size: 11, color: 'pink', lines: [
            'unknown_action      "query_cells" is not an action. Valid actions: coverage.query, impact.estimate, inspect_observation, finish',
            'bad_parameter       reference "S4" does not exist in State. Known: S1, S2, S3, H1_buffer, H2_buffer, F1, V1, F2, S2_roadside, S2_remaining',
            'precondition_unmet  impact.estimate needs queried locations with D0 present; Study_area has 0 queried',
            'gap_contradicted    S2_remaining: 160 of 160 locations already queried (obs_05); the stated gap is closed',
            'empty_reply         no output received; placeholder Step written so the trace stays consistent'
          ] });
          return ctx.reveal(S.kinds, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.ex = D.kv(ctx, 80, 400, 700, [['names the wrong thing', 'the parameter, the action, the fact'], ['names the right things', 'valid actions, known references, the missing step'], ['counter', 'rejections += 1 → rejection_cap ends the run']], { title: 'written for the model', color: 'pink' });
            return ctx.reveal(S.ex.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.sep = D.kv(ctx, 820, 400, 720, [['validation (this module)', 'well-formed and allowed?'], ['completion checks (this module)', 'is the investigation finished?'], ['strategy judgment', 'the model; a reviewer later, if needed'], ['caps', 'loop control']], { title: 'what is decided where', color: 'pink' });
            return ctx.reveal(S.sep.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Completion checks',
        beats: [
          {
            say: 'When the model proposes to finish, four program checks run. Does the boundary of the queried area still show the down cell? Are the task relevant regions queried, or is a reason recorded for leaving them? Are queried locations labelled? Is the backup analysis done for the relevant cells?',
            card: { tag: 'HOW IT WORKS', title: 'Four vanilla checks', body: 'frontier · regions · labels · backup. All computed from State. Unmet requirements go back into State and into the next rendering.' },
            deep: '<p>These are the checks discussed in the handoff\'s section 12. They are not sufficiency proofs: no down cell on the boundary does not prove there is none beyond it, and passing the checks says only that the checks passed. Whether they are enough is measured against reference results, which is the stopping experiment.</p>'
          },
          {
            say: 'At state eight the first check fails: D0 is present at ninety nine of one hundred sixty eight frontier locations. The second fails too: the farmland, vineyard and forest have seven hundred twenty seven unqueried locations and no recorded reason. The run could not be accepted as complete.',
            card: { tag: 'NUMBERS', title: 'The recorded case would not stop', stat: { v: '99 / 168', l: 'frontier locations with D0 at state_08; 727 rural locations unqueried with no recorded reason' } },
            deep: '<p>This is the right answer for the recorded case: the script ended, the investigation did not. In a live run the model would receive the unmet requirements in the next rendering and either query the rural references or record an explicit reason for leaving them, which the second check accepts.</p>'
          },
          {
            say: 'Thresholds are open. How much down cell presence on the frontier is acceptable, which regions count as task relevant, and whether extra independent queries after a stop request should be run to measure the change. These come from reference results, not from design.',
            card: { tag: 'TRADE-OFF', title: 'Thresholds come from data', body: 'Early stop risk against extra query cost. The handoff lists the thresholds and reference ranges as open item 9.' },
            deep: '<p>One discussed variant: after the model requests a stop, run a few independent extra queries and compare the result change against a threshold. Budget exhaustion is never counted as sufficiency. All of this is the stopping experiment, with three conditions: model stops alone, program checks, program checks plus extra queries.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.kinds, S.ex.g, S.sep.g], 0.1, 400);
          var sa = D.region(8, 'Study_area');
          S.cc = D.kv(ctx, 80, 180, 720, [['1 frontier still shows the down cell', sa.boundary_target + ' of ' + sa.boundary + ' → unmet'], ['2 task-relevant regions queried or reason recorded', 'F1 240, V1 247, F2 240 unqueried → unmet'], ['3 queried locations labelled', '466 of 466 → met'], ['4 backup analysis for relevant cells', 'B1, B2, B3 done for 252 D0 locations → met']], { title: 'completion_checks(state_08)', color: 'pink' });
          return ctx.reveal(S.cc.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.grid = D.grid(ctx, { x: 840, y: 170, w: 700, h: 466 });
            S.grid.setClasses(CASE.states[8].classes);
            S.grid.outline(sa.boundary_ids, '#ffffff');
            S.gl = ctx.label(1190, 660, 'white outline: study-area frontier, 168 locations, D0 at 99', { color: 'pink', size: 11.5 });
            return ctx.reveal([S.grid.g, S.gl], { from: 'fade' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.thr = ctx.code({ x: 80, y: 420, w: 720, title: 'open thresholds (handoff §12, §13 item 9)', lang: 'text', size: 11, color: 'pink', lines: ['frontier: acceptable share of D0 on the boundary?', 'regions:  which references are task-relevant for this cell class?', 'extra:    run k independent queries after a stop request; accept if change < t', 'never:    budget exhausted ≠ complete'] });
            return ctx.reveal(S.thr, { from: 'up' });
          });
        }
      },
      {
        title: 'Signals the program computes',
        beats: [
          {
            say: 'A coding agent gets its wrong signal for free: a compiler error, a failing test. Coverage data gives none. So the program computes the signals: regions still unqueried, a conclusion drawn from missing data, a backup cell whose load was not checked, totals that do not add up.',
            card: { tag: 'KEY IDEA', title: 'Build the feedback the environment lacks', body: 'OpenAI\'s harness engineering post: make mistakes detectable by the program. Here that is domain work, and the most specific part of the design.' },
            deep: '<p>The harness survey\'s H6 point: open-source agents give generic feedback, lint, syntax, patch match, tests. Project-specific feedback lives in the project. For outage analysis the project is the harness, so these checks are its structural tests: cheap, deterministic, and returned as observations.</p>'
          },
          {
            say: 'Two online checks were accepted in the handoff. Does State already answer the stated gap? Can the chosen action with its parameters provide the stated information, or is it an explicit prerequisite step? Both run only when the gap can be matched to a region, a window and a fact type.',
            card: { tag: 'HOW IT WORKS', title: 'Two online checks, scoped', body: 'gap answered by State · tool fits gap. Free text that cannot be matched passes through. Low-value exploration is not an error.' },
            deep: '<p>The handoff is explicit that these are not general correctness guarantees and that a reasonable but low-yield exploration must not be flagged as an error. The checks are precise where the design makes them precise, ids for regions and fact types, and silent elsewhere.</p>'
          },
          {
            say: 'The reviewer model from the September deck is deferred. A rule decides first, a reviewer is optional behind it, a person is the fallback. Until recorded failures show what a reviewer would catch, there is nothing to build it against.',
            card: { tag: 'TRADE-OFF', title: 'Rules first, reviewer later', body: 'Codex: rules, then Guardian, then user. The outage design keeps the order and leaves the middle empty for now.' },
            deep: '<p>The handoff\'s item 6 asks for baseline runs on real or controlled cases to see which failures actually occur before complex diagnosis is packaged as a contribution. The reviewer slot stays in the design as a candidate, with LLM-Modulo and CRITIC as the references the deck already cited.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.cc.g, S.grid.g, S.gl, S.thr], 0.1, 400);
          S.sig = ctx.code({ x: 80, y: 180, w: 720, title: 'program-computed wrong signals', lang: 'text', size: 11, color: 'pink', lines: ['regions still unqueried while a conclusion names them', 'a conclusion that relies on missing records', 'a backup cell with transferred traffic but no load check', 'region counts that do not sum (overlap added twice)', 'a D0 location with no backup and no unserved entry'] });
          return ctx.reveal(S.sig, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.online = D.kv(ctx, 840, 180, 700, [['gap answered by State?', 'match region, window, fact type → gap_contradicted'], ['tool fits gap?', 'coverage.query cannot answer a load question → mismatch'], ['scope', 'only when the gap resolves to ids; free text passes'], ['not an error', 'reasonable exploration with low yield']], { title: 'two online checks (handoff §12)', color: 'pink' });
            return ctx.reveal(S.online.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.order = D.loop(ctx, { names: ['rules', 'reviewer model', 'person'], subs: { rules: 'validation · completion · caps', 'reviewer model': 'deferred: LLM-Modulo, CRITIC', person: 'reads the typed end and the trace' }, colors: { rules: 'pink', 'reviewer model': 'dim', person: 'white' }, x: 120, y: 480, w: 300, h: 60, gap: 80, loopBack: false });
            return ctx.reveal(S.order.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Caps and typed ends',
        beats: [
          {
            say: 'Caps are counters in loop control, separate from the checks here. A step cap. A query budget in area. A wall time cap. The retry and rejection caps. A repeated query threshold. Each ends the run with its own typed reason.',
            card: { tag: 'HOW IT WORKS', title: 'Six caps, six reasons', body: 'step_cap · query_budget · time_cap · retry_cap · rejection_cap · repeated_query. Never confused with complete.' },
            deep: '<p>Codex CLI has no turn cap and relies on a token budget and interrupts. Gemini CLI caps a request at 100 rounds and names the end through exit codes. TurnL stops at 24 turns or a cost budget. The outage task needs the budget in queried area, because a call count would reward many small queries and punish one large one.</p>'
          },
          {
            say: 'The repeated query threshold is two: the same action with the same parameters twice ends the run. Gemini uses five identical tool calls, but a query costs area, so the threshold is lower.',
            card: { tag: 'NUMBERS', title: 'Repeated query', stat: { v: '2', l: 'identical (action, parameters) pairs end the run; step 7 of the recorded case would have triggered it' } },
            deep: '<p>The detector hashes the action name and the parameters after validation, so an equivalent set written in a different order counts as the same query. A re-query is legal for the registry; the guard is a policy decision recorded as such.</p>'
          },
          {
            say: 'A typed end is what a person receives. Together with the counters in the trace it says why the run stopped and where to resume. Budget exhausted is reported as budget exhausted, never as complete.',
            card: { tag: 'KEY IDEA', title: 'The program names the end', body: 'Eight reasons. Failures become countable across cases, which the handoff asks for before any diagnosis mechanism is designed.' },
            deep: '<p>Gemini CLI\'s headless exit codes were the model for this: 42 input error, 53 turn limit, 55 untrusted workspace. A run that ends by cap in the outage loop keeps its trace and its last Step, so the recovery experiment can resume it after a person adds a correction.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.sig, S.online.g, S.order.g], 0.1, 400);
          S.caps = D.kv(ctx, 80, 180, 720, [['step_cap', 'steps per run (to set per case class)'], ['query_budget', 'queried grid locations or km² (to set)'], ['time_cap', 'wall-clock minutes (to set)'], ['retry_cap', '3 parse failures'], ['rejection_cap', 'to set; Codex breaks after 3 in a row'], ['repeated_query', '2 identical (action, parameters)']], { title: 'caps in loop control', color: 'red' });
          return ctx.reveal(S.caps.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.rep = ctx.code({ x: 840, y: 180, w: 700, title: 'repeated_query at step 7', lang: 'text', size: 11, color: 'red', lines: ['hash(coverage.query, {references: {S2_roadside}})  seen at step 4', 'step 7: same hash → count 2 → END: repeated_query', 'recorded run: allowed through to show deduplication'] });
            return ctx.reveal(S.rep, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.ends = ctx.code({ x: 80, y: 430, w: 1460, title: 'EndReason', lang: 'text', size: 11, color: 'red', lines: ['complete | step_cap | query_budget | time_cap | retry_cap | rejection_cap | repeated_query | cancelled', 'with the trace counters {step, retries, rejections, queried_area, elapsed_s} a person knows why and where to resume'] });
            return ctx.reveal(S.ends, { from: 'up' });
          });
        }
      }
    ]
  });
})();
