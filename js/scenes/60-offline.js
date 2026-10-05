/* L1 — Offline Evaluation. How recorded traces become metrics, error localization, recovery experiments
 * and the baseline comparison against a general coding agent. Nothing here has been run yet. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'offline',
    refs: [
      'Zhang et al., <i>Which Agent Causes Task Failures and When?</i>, ICML 2025',
      'AgentRx, <i>Failure diagnosis from execution traces</i>, arXiv 2602.02475, 2026',
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026',
      'Cognition, <i>Don\'t build multi-agents</i>, 2025'
    ],
    poster: 1,
    steps: [
      {
        title: 'From trace to metrics',
        beats: [
          {
            say: 'Offline evaluation reads the trace, not the UI. For each run it computes the cost in queried area, the missed area against a reference result, the agreement of the impact numbers with the reference, and the typed end reason.',
            card: { tag: 'KEY IDEA', title: 'Metrics in domain units', body: 'queried area · missed area · impact agreement · end reason · steps and tokens as secondary. A call count is not a metric.' },
            deep: '<p>The handoff\'s item 8: define metrics and units, including omission, result error, query cost and execution cost, and do not compare tool-call counts because one query can cover a large area. The recorded run queried 466 distinct locations in 7 queries; a different strategy could query the same area in 2 or in 20 calls.</p>'
          },
          {
            say: 'The recorded run gives the first row of such a table: four hundred sixty six locations queried, two hundred fifty two with the down cell, eight steps, about twenty three thousand rendered tokens in total, end reason script end.',
            card: { tag: 'NUMBERS', title: 'The recorded run as a row', stat: { v: '466 · 252 · 8', l: 'locations queried · D0 locations found · steps; rendered tokens about 23,000 over the run' } },
            deep: '<p>Rendered tokens are the sum of the nine context sizes, 2,167 to 3,498 each. The missed-area column is empty because the synthetic case has no reference result yet; the hidden dataset could provide one, since it holds the full coverage, and the handoff warns that evaluation data must not enter the live context.</p>'
          },
          {
            say: 'More cases are the limiting factor. One manual trace supports design discussion and cannot show generalization. Reference results, test cases and an evaluation scope are open items seven and nine of the handoff.',
            card: { tag: 'PITFALL', title: 'One case proves nothing', body: 'The design is ready to be measured; the cases are not. Reference results per case are the prerequisite for every metric but cost.' },
            deep: '<p>The baseline run on the synthetic case plus one real or controlled case is the first step. Its purpose is to record which failures actually occur, before any diagnosis or recovery mechanism is built against imagined ones.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.tr = ctx.node({ x: 240, y: 240, w: 240, h: 60, title: 'trace.json', sub: '8 Steps · 9 States · 7 + 1 observations', color: 'lime', kind: 'cyl', titleSize: 13, subSize: 10.5, glow: false });
          S.ev = ctx.node({ x: 620, y: 240, w: 260, h: 60, title: 'evaluate(trace, reference)', sub: 'program', color: 'lime', titleSize: 13, subSize: 10.5, glow: false });
          S.mx = ctx.node({ x: 1000, y: 240, w: 240, h: 60, title: 'metrics row', sub: 'domain units', color: 'lime', kind: 'pill', titleSize: 13, subSize: 10.5, glow: false });
          S.ls = [ctx.link(S.tr, S.ev, { color: 'lime', sw: 1.2 }), ctx.link(S.ev, S.mx, { color: 'lime', sw: 1.2 })];
          S.ref = ctx.node({ x: 620, y: 380, w: 260, h: 56, title: 'reference result', sub: 'offline only · never in the context', color: 'red', kind: 'ghost', titleSize: 13, subSize: 10.5, glow: false });
          S.rl = ctx.link(S.ref, S.ev, { color: 'red', from: 't', to: 'b', dash: '3 4', sw: 1.2 });
          return Promise.all([ctx.reveal([S.tr, S.ev, S.mx, S.ref], { from: 'up', stagger: 100 }), ctx.reveal(S.ls.concat([S.rl]), { from: 'draw', delay: 250 })]).then(function () { return ctx.beat(1); }).then(function () {
            var sa = D.region(8, 'Study_area'); var tok = 0; CASE.states.forEach(function (s) { tok += D.tokens(s.context_bytes); });
            S.row = D.kv(ctx, 80, 480, 720, [['queried locations (cost)', sa.queried + ' of ' + sa.total], ['D0 locations found', sa.target], ['missed area vs reference', 'no reference yet'], ['impact agreement', 'no reference yet'], ['steps / rendered tokens', CASE.steps.length + ' / ' + D.fmt(tok)], ['end reason', 'script_end']], { title: 'recorded run as a metrics row', color: 'lime' });
            return ctx.reveal(S.row.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.need = D.kv(ctx, 840, 480, 700, [['cases', 'one manual trace; one synthetic run'], ['reference results', 'none yet; the hidden synthetic dataset could serve'], ['evaluation scope', 'open item 7'], ['thresholds', 'open item 9']], { title: 'what is missing to fill the table', color: 'red' });
            return ctx.reveal(S.need.g, { from: 'up' });
          });
        }
      },
      {
        title: 'The baseline',
        beats: [
          {
            say: 'The mentor\'s question, why not put everything into Codex, is answered by a measurement. The same query functions are wrapped as an MCP server, the skill becomes AGENTS.md, and Codex CLI runs the same cases with the same budget.',
            card: { tag: 'HOW IT WORKS', title: 'Codex CLI as the baseline', body: 'Same tools, same instructions, same cases. The only difference is the harness: append-only transcript versus rendered State.' },
            deep: '<p>Codex can already do most of what the outage loop does: tools through MCP, instructions in AGENTS.md, pre-tool hooks for validation, a stop hook for completion checks, a rollout log for the trace. If the outage harness cannot show a measured difference against that, there is no contribution. If it can, the difference is attributable to rendering, program-owned stopping and fixed phases.</p>'
          },
          {
            say: 'Precondition: the internal model endpoint must be reachable from Codex and support tool calling. If it does not, the baseline becomes a minimal append only loop written in the project, which measures the same thing.',
            card: { tag: 'PITFALL', title: 'The baseline needs tool calling', body: 'Open item 1. Without it, Codex CLI cannot run the internal model, and a hand-written append-only loop stands in.' },
            deep: '<p>Codex CLI can point at a self-hosted OpenAI-compatible endpoint. A minimal append-only loop, in the style of mini-SWE-agent, is the fallback and is also a fair baseline.</p>'
          },
          {
            say: 'Three context conditions run on the same cases. A: rendered State only, as today. B: stable prefix plus rendered State plus a short step history. C: append raw observations with compaction, which is also what the Codex baseline does.',
            card: { tag: 'KEY IDEA', title: 'Conditions A, B, C', body: 'Same cases, same model, same budget. Metrics: tokens per step, missed area, query cost, agreement with the reference.' },
            deep: '<p>Attribution needs control: the handoff warns that one manual case and one different model case cannot prove a method better. The three conditions differ only in the context module; everything else in the loop is held fixed.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.tr, S.ev, S.mx, S.ref, S.ls, S.rl, S.row.g, S.need.g], 0.1, 400);
          S.cx = ctx.node({ x: 300, y: 220, w: 320, h: 64, title: 'Codex CLI', sub: 'AGENTS.md = skill · transcript · compaction', color: 'dim', kind: 'ghost', titleSize: 14, subSize: 11, glow: false });
          S.ours = ctx.node({ x: 300, y: 330, w: 320, h: 64, title: 'outage harness', sub: 'rendered State · completion checks · phases', color: 'amber', titleSize: 14, subSize: 11, glow: false });
          S.mcp = ctx.node({ x: 760, y: 275, w: 280, h: 64, title: 'MCP server', sub: 'coverage.query · impact.estimate', color: 'blue', titleSize: 14, subSize: 11, glow: false });
          S.cases = ctx.node({ x: 1160, y: 275, w: 280, h: 64, title: 'same cases, same budget', sub: 'synthetic + one controlled case', color: 'lime', kind: 'cyl', titleSize: 14, subSize: 11, glow: false });
          S.bl = [ctx.link(S.cx, S.mcp, { color: 'blue', sw: 1.2 }), ctx.link(S.ours, S.mcp, { color: 'blue', sw: 1.2, dash: '3 4', label: 'direct call or MCP', labelDy: 14 }), ctx.link(S.mcp, S.cases, { color: 'lime', sw: 1.2 })];
          return Promise.all([ctx.reveal([S.cx, S.ours, S.mcp, S.cases], { from: 'up', stagger: 100 }), ctx.reveal(S.bl, { from: 'draw', delay: 250 })]).then(function () { return ctx.beat(1); }).then(function () {
            S.pre = D.kv(ctx, 80, 440, 700, [['internal endpoint reachable from Codex', 'to check'], ['native tool calling supported', 'to check (open item 1)'], ['if not', 'minimal append-only loop in the project as baseline'], ['data', 'stays in the internal environment behind the MCP server']], { title: 'preconditions', color: 'red' });
            return ctx.reveal(S.pre.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.cond = D.kv(ctx, 840, 440, 700, [['A', 'rendered State only (today)'], ['B', 'stable prefix + rendered State + last N steps'], ['C', 'append raw observations + compaction (= Codex baseline)'], ['metrics', 'tokens per step · missed area · query cost · agreement']], { title: 'context conditions', color: 'amber' });
            return ctx.reveal(S.cond.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Localizing an error',
        beats: [
          {
            say: 'When a final result is wrong, the trace does not say which step was wrong. Three offline methods are kept. The program compares the result with the reference and finds the concrete differences, then a person reads the related steps.',
            card: { tag: 'HOW IT WORKS', title: 'Program diff, then a person', body: 'Missed regions, wrong backup, wrong load: the program names the difference; a person reads the Steps that touched it.' },
            deep: '<p>Because every fact in State carries the observation that produced it and every Step carries a before and after State, the program can find the first State in which a wrong fact appeared. It cannot always find the one wrong decision: an area that was never queried has no Step to point at.</p>'
          },
          {
            say: 'Second, the same differences and the related steps are given to a model for diagnosis. Third, one candidate decision is changed and the later steps are re run; if the result improves, the change is supported.',
            card: { tag: 'TRADE-OFF', title: 'Three methods, no guarantee', body: 'A re-run that improves supports a correction; it does not prove the original step was the only cause.' },
            deep: '<p>Zhang et al. attribute task failures to steps after the fact; AgentRx diagnoses from traces with program checks and model judgment and offers no deterministic guarantee. The handoff keeps the same caution: State and provenance help find when a wrong fact appeared, not necessarily why.</p>'
          },
          {
            say: 'All three need the Step to be a checkpoint. Re running from a modified decision means loading the State before that Step, replacing the decision, and continuing with the same data version, budget and cache policy.',
            card: { tag: 'KEY IDEA', title: 'Why the Step must hold State', body: 'Modified-step re-runs are only comparable when data version, budget and caching are held fixed. The Step extension records them.' },
            deep: '<p>This closes the loop with the State and Trace chamber: the proposed Step fields exist for these experiments. Without them a re-run would differ from the original in ways that have nothing to do with the changed decision.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.cx, S.ours, S.mcp, S.cases, S.bl, S.pre.g, S.cond.g], 0.1, 400);
          S.m = D.loop(ctx, { names: ['program diff', 'person reads Steps', 'model diagnosis', 'modified-step re-run'], subs: { 'program diff': 'result vs reference → differences', 'person reads Steps': 'the Steps that touched them', 'model diagnosis': 'same diff + trace → hypothesis', 'modified-step re-run': 'change one decision, replay' }, colors: { 'model diagnosis': 'amber', 'person reads Steps': 'white' }, x: 100, y: 230, w: 300, h: 60, gap: 60, loopBack: false });
          return ctx.reveal(S.m.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.caveat = D.kv(ctx, 80, 340, 700, [['first wrong fact', 'findable: provenance names the Step'], ['never-queried area', 'no Step to point at'], ['improved re-run', 'supports the correction; not a unique cause']], { title: 'what localization can and cannot do', color: 'red' });
            return ctx.reveal(S.caveat.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.ck = ctx.code({ x: 840, y: 340, w: 700, title: 'modified-step re-run', lang: 'text', size: 11, color: 'lime', lines: ['load Step k: state_snapshot, data_version, query_cache_ref, counters', 'replace decision k; continue the loop from render_context', 'hold fixed: data version · budget · cache policy · model', 'compare final result with the original run'] });
            return ctx.reveal(S.ck, { from: 'up' });
          });
        }
      },
      {
        title: 'Recovery',
        beats: [
          {
            say: 'Three recovery methods are kept, by the handoff\'s explicit request. Text feedback: tell the model the correction and let it adjust. Program corrected State: undo a wrong exclusion, relist a region as pending, add the evidence, re render. Resume from checkpoint: go back before the wrong decision and replay with the correction.',
            card: { tag: 'HOW IT WORKS', title: 'Three ways to recover', body: 'feedback to the model · program-corrected State · resume from a checkpoint. Compared under equal correction, data, budget and cache.' },
            deep: '<p>The three differ in who does the work: the model, the program, or the loop itself by replay. The comparison must control the correction text, the data version, the budget and the cache policy, otherwise the differences measure the setup and not the method.</p>'
          },
          {
            say: 'The human enters here, at the boundary. A run that ended with a typed reason is reviewed, a correction is written, and one of the three methods continues it. Nothing in the live loop waits for a person.',
            card: { tag: 'KEY IDEA', title: 'Human at the boundary', body: 'Review the typed end and the trace, write the correction, resume. Mid-run input is not needed for read-only tools.' },
            deep: '<p>This is where the harness comparison\'s circuit-breaker pattern lands: repeated disagreement between program checks and model ends the run and hands it to a person, instead of asking for approval inside the loop as a coding agent must.</p>'
          },
          {
            say: 'Recovery is measured like everything else: did the corrected run reach the reference with less missed area, at what extra cost in queried area and steps. Only then does a recovery method become a contribution.',
            card: { tag: 'PITFALL', title: 'Mechanisms are not contributions', body: 'Checkpoints, verifiers and recovery exist in the design as candidates. Measured improvement on real cases makes one of them a result.' },
            deep: '<p>The handoff\'s last item: decide the paper\'s contribution from measured results. LangGraph, MCP, schemas, skills or checkpoints do not form novelty on their own. The UI shows a design that is ready to be measured, which is a different claim from a design that works.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.m.g, S.caveat.g, S.ck], 0.1, 400);
          S.r1 = ctx.node({ x: 300, y: 230, w: 360, h: 64, title: '1 text feedback', sub: 'correction into the next rendering; the model adjusts', color: 'amber', titleSize: 13, subSize: 10.5, glow: false });
          S.r2 = ctx.node({ x: 300, y: 320, w: 360, h: 64, title: '2 program-corrected State', sub: 'undo exclusion · relist region · add evidence · re-render', color: 'teal', titleSize: 13, subSize: 10.5, glow: false });
          S.r3 = ctx.node({ x: 300, y: 410, w: 360, h: 64, title: '3 resume from checkpoint', sub: 'back to the Step before the error; replay with the correction', color: 'lime', titleSize: 13, subSize: 10.5, glow: false });
          return ctx.reveal([S.r1, S.r2, S.r3], { from: 'left', stagger: 120 }).then(function () { return ctx.beat(1); }).then(function () {
            S.person = ctx.node({ x: 900, y: 320, w: 300, h: 70, title: 'person', sub: 'reads typed end + trace · writes the correction', icon: 'user', color: 'white', titleSize: 13, subSize: 10.5, glow: false });
            S.pl = [ctx.link(S.person, S.r1, { color: 'white', sw: 1.1, dash: '3 4' }), ctx.link(S.person, S.r2, { color: 'white', sw: 1.1, dash: '3 4' }), ctx.link(S.person, S.r3, { color: 'white', sw: 1.1, dash: '3 4' })];
            return Promise.all([ctx.reveal(S.person, { from: 'right' }), ctx.reveal(S.pl, { from: 'draw', delay: 200 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.meas = D.kv(ctx, 80, 520, 1460, [['controlled', 'same correction text · data version · budget · cache policy · model'], ['measured', 'missed area after recovery · extra queried area · extra steps'], ['claim allowed', 'only after measured improvement on real or controlled cases']], { title: 'recovery as an experiment', color: 'lime' });
            return ctx.reveal(S.meas.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Back into the loop',
        beats: [
          {
            say: 'What offline evaluation learns goes back into three components: the fixed skill text, the completion check thresholds, and the State update rules. The offline slide of the September deck drew this loop; the trace is its input.',
            card: { tag: 'HOW IT WORKS', title: 'Evaluation tunes three things', body: 'skill · completion thresholds · update rules. Applied before the next run, recorded as a version.' },
            deep: '<p>Versioning matters for comparability: a run\'s trace should record the skill version, the threshold set and the data version it ran under. The Step extension\'s data_version field is one of these; the others belong in the run header.</p>'
          },
          {
            say: 'Experience across cases is the last candidate: past traces, steps or skills retrieved into the context by structured matching on cell class, region type and gap type, without embeddings. It stays a candidate until a baseline shows which failures it would fix.',
            card: { tag: 'STATE OF THE ART', title: 'Experience retrieval, deferred', body: 'Codex injects memory files into the prompt. Here: structured matching on case fields, added only if the observed failures call for it.' },
            deep: '<p>The synthetic preview combines a fixed skill and the state text; it does not implement retrieval. Three context conditions come first. If condition B helps, a fourth condition with retrieved experience is the natural next experiment, with the same controls.</p>'
          },
          {
            say: 'The order of work follows from this: check tool calling, check that State serializes, write the registry, add the parser and the caps, run the baseline on two cases, then set thresholds from what the runs show.',
            card: { tag: 'KEY IDEA', title: 'Six open items, in order', body: 'tool calling · serializable State · registry · parser and caps · baseline runs · thresholds. The UI will show real traces as soon as they exist.' },
            deep: '<p>Everything shown in these chambers is either implemented in the synthetic prototype, defined in the handoff, or proposed from the harness comparison, and each card says which. The case data file is generated from a recorded run; replacing the synthetic run with a real one regenerates it without touching the chambers.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.r1, S.r2, S.r3, S.person, S.pl, S.meas.g], 0.1, 400);
          S.tune = D.loop(ctx, { names: ['trace', 'evaluation', 'tuning', 'next run'], subs: { trace: 'Steps · typed end · counters', evaluation: 'metrics vs reference', tuning: 'skill · thresholds · update rules', 'next run': 'versioned components' }, colors: { trace: 'lime', evaluation: 'lime', tuning: 'pink', 'next run': 'magenta' }, x: 100, y: 230, w: 300, h: 60, gap: 60, loopBack: true, backLabel: 'apply before the next run', bend: 70 });
          return ctx.reveal(S.tune.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.exp = D.kv(ctx, 80, 400, 700, [['what', 'past traces, steps or skills matched on cell class, region type, gap type'], ['how', 'structured fields and keywords; no embeddings required'], ['when', 'after conditions A, B, C; only if recorded failures call for it'], ['today', 'the synthetic preview does not implement it']], { title: 'experience retrieval (candidate)', color: 'dim' });
            return ctx.reveal(S.exp.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.todo = ctx.code({ x: 840, y: 400, w: 700, title: 'open items, in order', lang: 'text', size: 11, color: 'lime', lines: ['1 does the internal model support native tool calling?', '2 is State fully serializable? then extend Step', '3 write the action registry for the two tools + drill-down', '4 add parser, per-failure rules, caps, typed end reason', '5 run the baseline on the synthetic case and one controlled case', '6 set completion thresholds from the reference results'] });
            return ctx.reveal(S.todo, { from: 'up' });
          });
        }
      }
    ]
  });
})();
