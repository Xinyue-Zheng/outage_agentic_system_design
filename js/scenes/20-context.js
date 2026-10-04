/* L1 — Context Builder. The model input is rendered from State by a program template at every step:
 * why the design does this, the sections, measured sizes from the recorded run, the two-part layout,
 * and what the model must not see. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;
  var SECTIONS = ['Task:', 'Known geography:', 'Investigation progress:', 'Coverage observations:', 'Impact and backup analysis:', 'Remaining unknowns:', 'Available geographic references:', 'Evidence provenance:'];

  function sectionSizes(stateIdx) {
    var lines = CASE.states[stateIdx].context.split('\n'), sizes = {}, cur = null;
    lines.forEach(function (l) {
      if (SECTIONS.indexOf(l) >= 0) cur = l;
      if (cur) sizes[cur] = (sizes[cur] || 0) + l.length + 1;
    });
    return SECTIONS.map(function (s) { return [s.replace(':', ''), Math.round((sizes[s] || 0) / 4)]; });
  }

  Atlas.register({
    id: 'context',
    refs: [
      'Guo et al., <i>From Question Answering to Task Completion: A Survey on Agent System and Harness Design</i>, arXiv 2606.20683, 2026',
      'Anthropic, <i>Effective harnesses for long-running agents</i>, 2025'
    ],
    poster: 2,
    steps: [
      {
        title: 'Render from State',
        beats: [
          {
            say: 'The model never reads raw query results. At every step the program renders the current State into text, and that text is the whole model input. The facts live in State; the model sees a projection of them.',
            card: { tag: 'KEY IDEA', title: 'A fresh rendering every step', body: 'render_context(State) → text. No transcript, no raw records. What the model knows at step 5 is exactly what the program wrote from State 4.' },
            deep: '<p>The function is a program template. It walks the State: task, geography and relations, one progress block per reference, one coverage block per reference with frontier counts, the impact block if present, the unknowns, the references with their query geometry, and the provenance list. Every number is computed from State; none is written into the template. The same State always renders the same text.</p>'
          },
          {
            say: 'Three reasons drive this choice. The model cannot count or aggregate hundreds of records reliably. The input must stay bounded no matter how many steps run. And the program must control exactly what the model sees, so that context experiments are controlled.',
            card: { tag: 'WHY IT MATTERS', title: 'Three reasons to render', body: 'reliable counting · bounded input · controlled experiments. A fourth: the internal model cannot read maps, so every spatial fact has to be text.' },
            deep: '<p>Coverage records use internal field names and encode distinctions such as missing versus no coverage by convention. Left to the model, "222 of 276 locations" would have to be counted from rows every step. The program knows the meaning of its two tools, so it computes the counts once, deterministically, and the counts are testable. The rendering also keeps the input proportional to what is known, not to how long the run has been going.</p>'
          },
          {
            say: 'The input to the model is the fixed investigation skill followed by the rendering. The skill is about twenty seven hundred bytes and does not change. It states evidence rules, spatial interpretation, the tools, and what State and history mean.',
            card: { tag: 'NUMBERS', title: 'Skill plus rendering', stat: { v: '2.7 KB + 8.7 to 14 KB', l: 'fixed skill text, then the rendering of states 00 to 08' } },
            deep: '<p>The skill is general: it describes how to read evidence and use tools, not this case. It contains no hidden answers, no future results and no action sequence. The rendering carries the case. Together they are the whole prompt.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.stateN = ctx.node({ x: 300, y: 250, w: 220, h: 64, title: 'State', sub: 'facts + provenance', color: 'teal', kind: 'cyl', titleSize: 14, subSize: 11, glow: false });
          S.fn = ctx.node({ x: 620, y: 250, w: 260, h: 64, title: 'render_context', sub: 'program template · deterministic', color: 'amber', titleSize: 14, subSize: 11, glow: false });
          S.txt = ctx.node({ x: 940, y: 250, w: 220, h: 64, title: 'text', sub: '2.2k to 3.5k tokens', color: 'amber', kind: 'pill', titleSize: 14, subSize: 11, glow: false });
          S.mdl = ctx.node({ x: 1260, y: 250, w: 220, h: 64, title: 'model', sub: 'reads text only', color: 'amber', titleSize: 14, subSize: 11, glow: false });
          S.k1 = ctx.link(S.stateN, S.fn, { color: 'amber', sw: 1.2 });
          S.k2 = ctx.link(S.fn, S.txt, { color: 'amber', sw: 1.2 });
          S.k3 = ctx.link(S.txt, S.mdl, { color: 'amber', sw: 1.2 });
          return Promise.all([ctx.reveal([S.stateN, S.fn, S.txt, S.mdl], { from: 'up', stagger: 100 }), ctx.reveal([S.k1, S.k2, S.k3], { from: 'draw', delay: 250 })]).then(function () { return ctx.beat(1); }).then(function () {
            S.why = D.kv(ctx, 100, 360, 1400, [['reliable counting', 'the program computes 222 of 276 once; the model is not asked to count rows'], ['bounded input', 'size follows what is known, not how many steps ran'], ['controlled experiments', 'the program decides exactly what the model sees'], ['no images', 'the internal model cannot read maps; every spatial fact becomes text']], { title: 'why render', color: 'amber' });
            return ctx.reveal(S.why.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.skill = ctx.code({ x: 100, y: 540, w: 1400, title: 'model input = fixed skill (2.7 KB, unchanged) + rendering (state_NN.txt)', lang: 'text', size: 10.5, color: 'amber', maxLines: 6, lines: CASE.fixed_skill.split('\n').slice(0, 6) });
            return ctx.reveal(S.skill, { from: 'up' });
          });
        }
      },
      {
        title: 'The sections',
        beats: [
          {
            say: 'The rendering has eight sections in a fixed order. Task. Known geography. Investigation progress. Coverage observations. Impact and backup analysis. Remaining unknowns. Available references. Evidence provenance.',
            card: { tag: 'HOW IT WORKS', title: 'Eight sections, fixed order', body: 'The order never changes between steps; only the content of progress, coverage, impact, unknowns and provenance moves.' },
            deep: '<p>A fixed order means the model always finds the same kind of fact in the same place, and it means the unchanging sections at the front can be cached by the model provider if the endpoint supports prompt caching.</p>'
          },
          {
            say: 'At state four the progress and coverage sections together are the largest part. Geography and references are the next largest, and they are almost identical to state zero.',
            card: { tag: 'NUMBERS', title: 'Where the tokens go at state_04', stat: { v: '2,895', u: 'tokens', l: 'split over eight sections; bars show the estimate per section' } },
            deep: '<p>The bars are measured from the rendered file: characters per section divided by four. Progress and coverage grow with the number of touched references. Geography, references and the task text are constant. Unknowns shrink as references close. Provenance grows by one line per observation.</p>'
          },
          {
            say: 'Each coverage block reports the same facts: how many queried locations have the down cell, its RSRP range, the frontier facing the unqueried interior, and whether the interior and the missing records remain unknown.',
            card: { tag: 'KEY IDEA', title: 'Facts the program computed', body: 'Counts, ranges and frontier sentences. No row of the 17 KB observation appears. The model reads conclusions it can act on.' },
            deep: '<p>The S2 block at state 4 reads: D0 is present at 20 of the 40 queried locations; its RSRP ranges from minus 111 to minus 104 dBm; along the query boundary facing the unqueried interior, D0 is present at 4 of 8 boundary locations (8 valid, 0 missing); coverage in the unqueried interior remains unknown. Four sentences carry what the model needs for the next decision.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.stateN, S.fn, S.txt, S.mdl, S.k1, S.k2, S.k3, S.why.g, S.skill], 0.12, 400);
          var sizes = sectionSizes(4);
          S.secList = ctx.code({ x: 80, y: 170, w: 520, title: 'sections of state_04.txt', lang: 'text', size: 11, color: 'amber', lines: sizes.map(function (s, i) { return (i + 1) + '. ' + s[0]; }) });
          return ctx.reveal(S.secList, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            var max = Math.max.apply(null, sizes.map(function (s) { return s[1]; }));
            S.bars = ctx.bars(680, 200, 860, 240, sizes.map(function (s) { return s[1] / max; }), { color: 'amber', labels: sizes.map(function (s) { return s[1] + ' tok'; }), gap: 14 });
            S.barLbls = ctx.group();
            sizes.forEach(function (s, i) {
              var bw = (860 - 14 * 7) / 8;
              ctx.text(680 + i * (bw + 14) + bw / 2, 460, s[0].split(' ')[0], { size: 10.5, color: 'dim', anchor: 'middle', parent: S.barLbls });
            });
            return ctx.reveal([S.bars, S.barLbls], { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            var lines = CASE.states[4].context.split('\n'), out = [];
            for (var i = 0; i < lines.length; i++) if (lines[i].indexOf('- S2:') === 0) { for (var j = i; j < i + 5 && j < lines.length; j++) out.push(lines[j].trim()); break; }
            S.s2block = ctx.code({ x: 80, y: 540, w: 1460, title: 'coverage block for S2 at state_04', lang: 'text', size: 11, color: 'amber', lines: out });
            return ctx.reveal(S.s2block, { from: 'up' });
          });
        }
      },
      {
        title: 'Size over the run',
        beats: [
          {
            say: 'Across the nine states the rendering stays between about twenty two hundred and thirty five hundred tokens. It grows when a new reference gets content, not when a step runs.',
            card: { tag: 'NUMBERS', title: 'Bounded by what is known', stat: { v: '2,167 → 3,498', u: 'tokens', l: 'rendered context from state_00 to state_08' } },
            deep: '<p>Measured on the recorded files, characters divided by four. The step from state 07 to state 08 adds the impact section with its eight limitations, which is the largest single increase. The step from state 03 to state 04 shrinks the text, because unknowns were resolved.</p>'
          },
          {
            say: 'Had the raw results been given to the model instead, the input would have grown to about fifty eight thousand tokens by step seven, before any model text. That is the sum of the observation files, which the rendering never includes.',
            card: { tag: 'NUMBERS', title: 'Fifteen to twenty times smaller', stat: { v: '≈ 58,000', u: 'tokens', l: 'cumulative raw observations obs_01 to obs_07; versus 3,041 rendered' } },
            deep: '<p>Observation sizes: 12, 29, 87, 17, 57, 13 and 17 KB. Each would have to be re-read by the model on every later step, and the model would have to find the overlap between the H2 corridor and S2 by itself. The program finds it once and writes one line.</p>'
          },
          {
            say: 'Not every token is new information. About forty three percent of the text at state eight is identical to state zero: geography, the relation sentences, and the reference descriptions.',
            card: { tag: 'TRADE-OFF', title: 'Static text the model re-reads', body: '43 percent of state_08.txt is unchanged from state_00.txt. A weaker model attends to it every step.' },
            deep: '<p>Measured by lines identical between the two files: 5,897 of 13,810 bytes. The twelve "Study_area contains X" relations carry the same evidence sentence twelve times, and the reference descriptions repeat counts already given in progress. This is the motivation for the two-part layout in the next step.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.secList, S.bars, S.barLbls, S.s2block], 0.12, 400);
          var toks = CASE.states.map(function (s) { return D.tokens(s.context_bytes); });
          var raw = [0]; var cum = 0;
          CASE.steps.forEach(function (s) { cum += s.observation ? s.observation.bytes : 0; raw.push(Math.round(cum / 4)); });
          S.plot = ctx.plot(120, 200, 900, 330, toks.map(function (t, i) { return [i, t]; }), { xDomain: [0, 8], yDomain: [0, 60000], color: 'amber', sw: 2.5, xLabel: 'state', yLabel: 'tokens', axes: true });
          S.plotLbl = ctx.label(560, 560, 'rendered context: 2,167 to 3,498 tokens', { color: 'amber', size: 12 });
          return ctx.reveal([S.plot, S.plotLbl], { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            var pts = raw.map(function (t, i) { return S.plot.toPx(i, t); });
            S.rawLine = ctx.poly(pts.map(function (p) { return [p.x, p.y]; }), { fill: 'none', stroke: 'red', sw: 2.5, closed: false });
            S.rawLbl = ctx.label(600, 240, 'raw results given to the model: ≈ 58,000 tokens by step 7', { color: 'red', size: 12 });
            return ctx.reveal([S.rawLine, S.rawLbl], { from: 'draw' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.staticKv = D.kv(ctx, 1080, 200, 460, [['state_08.txt', '13,810 bytes'], ['identical to state_00.txt', '5,897 bytes (43 %)'], ['relations "Study_area contains X"', '12 lines, same evidence text'], ['reference descriptions', 'repeat progress counts']], { title: 'static share of the rendering', color: 'amber' });
            return ctx.reveal(S.staticKv.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Stable prefix, variable part',
        beats: [
          {
            say: 'The proposed layout splits the rendering in two. A stable prefix holds the skill, the task, the geography, the relations and the action schemas. A variable part holds progress, coverage, unknowns and the recent steps.',
            card: { tag: 'HOW IT WORKS', title: 'Stable first, volatile last', body: 'The prefix changes only when the task changes, so a provider that caches prompt prefixes reuses it across steps. The loop itself does not change.' },
            deep: '<p>Only the order of sections and the place where the static text lives change. The prefix can be cached by the model provider; the variable part is small. The static 43 percent stops costing attention on every step because it sits in one block the model has seen before.</p>'
          },
          {
            say: 'The variable part gains one thing the current rendering lacks: a short history of the last few steps, each as action, stated gap and a one line outcome. Step seven\'s repeated query would then be visible to the model.',
            card: { tag: 'KEY IDEA', title: 'A short step history', body: 'Last N steps: action, gap, outcome. A few hundred tokens. Lets the model see its own repetition and the reasons it gave.' },
            deep: '<p>Today only the provenance list shows two S2_roadside observations. Whether the history helps or hurts a weaker model is an experiment: condition B, prefix plus State plus history, against condition A, the current rendering, on the same cases with the same model and budget.</p>'
          },
          {
            say: 'The allowed actions for the current phase are listed in the variable part, and a drill down action lets the model ask for the rows of one observation, bounded in size, when a summary is not enough.',
            card: { tag: 'HOW IT WORKS', title: 'Summaries by default, rows on request', body: 'The provenance list names <code>obs_04</code>; the model may ask for its rows, capped at a number of rows.' },
            deep: '<p>The drill-down action returns a bounded table, for example the records of one reference with status, cell list and RSRP, capped at 50 rows. It keeps the default input small while removing the objection that the model cannot see detail. The action registry declares it like any other action, with a cost of zero queried area.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.plot, S.plotLbl, S.rawLine, S.rawLbl, S.staticKv.g], 0.1, 400);
          S.pre = ctx.code({ x: 80, y: 180, w: 700, title: 'stable prefix (cacheable, changes only with the task)', lang: 'text', size: 11, color: 'teal', lines: ['fixed investigation skill', 'task: down cell, outage time, objective', 'known geography and spatial relations', 'available references and their query geometry', 'action schemas for this task'] });
          S.varp = ctx.code({ x: 820, y: 180, w: 700, title: 'variable part (re-rendered every step)', lang: 'text', size: 11, color: 'amber', lines: ['investigation progress per reference', 'coverage observations with frontier counts', 'impact and backup analysis (when present)', 'remaining unknowns', 'evidence provenance'] });
          return ctx.reveal([S.pre, S.varp], { from: 'up', stagger: 150 }).then(function () { return ctx.beat(1); }).then(function () {
            S.hist = ctx.code({ x: 820, y: 420, w: 700, title: 'proposed: recent steps (last 3)', lang: 'text', size: 10.5, color: 'amber', lines: [
              'step 5  coverage.query S2_remaining  gap: does D0 reach the S2 interior?    → 30 of 160 with D0; 9 missing',
              'step 6  coverage.query S3            gap: is any S3 location covered by D0? → 0 of 48 with D0',
              'step 7  coverage.query S2_roadside   gap: confirm roadside result            → identical to step 4 (repeat)'
            ] });
            return ctx.reveal(S.hist, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.acts = ctx.code({ x: 80, y: 420, w: 700, title: 'proposed: allowed actions in this phase', lang: 'text', size: 10.5, color: 'amber', lines: [
              'coverage.query(references: set of reference ids, max 4)        cost: locations in the set',
              'inspect_observation(observation_id, max_rows)                 cost: 0 locations',
              'impact.estimate(scope, min_rsrp_dbm, min_rsrq_db)             precondition: queried D0 locations',
              'finish(reason)                                                 → completion checks'
            ] });
            return ctx.reveal(S.acts, { from: 'up' });
          });
        }
      },
      {
        title: 'What the model must not see',
        beats: [
          {
            say: 'Three things stay out of the model input. Raw observation rows, which the program has already turned into counts. Maps, which are for people. And the meta line in the prototype that says the text is a preview, which must go before a real call.',
            card: { tag: 'PITFALL', title: 'Three exclusions', body: 'No raw JSON, no image paths, no "this is a preview" line. The current files still carry that last line.' },
            deep: '<p>The prototype\'s rendering ends with: "This text is a deterministic context preview, not a request sent to a model. Maps are for human inspection and are not model evidence." The first sentence is correct for the synthetic demo and wrong for a live run. It is a one-line change, listed in the open items.</p>'
          },
          {
            say: 'The ground truth used for evaluation never enters the context. The program may know the reference result offline; the rendering for a live decision must not.',
            card: { tag: 'PITFALL', title: 'Evaluation data stays offline', body: 'Reference results, hidden coverage, and anything derived from them are evaluation inputs, not context.' },
            deep: '<p>The prototype enforces a version of this already: the State update function receives only executed query results and never the dataset\'s hidden record table. The same boundary holds for the context: it is rendered from State, and State holds only what queries returned.</p>'
          },
          {
            say: 'The rule behind all three exclusions is the same: the model receives facts the program has established, in the form the program chose, and nothing else. That is what makes the model input testable and the experiments controlled.',
            card: { tag: 'WHY IT MATTERS', title: 'One rule behind the exclusions', body: 'Facts established by the program, rendered by the program. Nothing enters the input by accident.' },
            deep: '<p>Because the input is a pure function of State, a test can assert that the rendered text agrees with State, and an experiment can change one part of the rendering while holding everything else fixed. Neither is possible when raw results and earlier model text flow into the input unfiltered.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ctx.fade([S.pre, S.varp, S.hist, S.acts], 0.1, 400);
          var lines = CASE.states[4].context.split('\n');
          S.meta = ctx.code({ x: 80, y: 180, w: 1460, title: 'last lines of state_04.txt (the first sentence must be removed before a live call)', lang: 'text', size: 11, color: 'red', lines: lines.slice(-4).filter(function (l) { return l.trim(); }).map(function (l) { return l.trim(); }) });
          return ctx.reveal(S.meta, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.excl = D.kv(ctx, 80, 330, 700, [['raw observation rows', 'on disk, linked by provenance; rows on request only'], ['maps (SVG)', 'for people; never a path in the context'], ['reference results, hidden dataset', 'offline evaluation only'], ['meta line "context preview"', 'remove before a live call']], { title: 'never in the model input', color: 'red' });
            return ctx.reveal(S.excl.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.rule = ctx.code({ x: 820, y: 330, w: 720, title: 'the rule', lang: 'text', size: 11, color: 'amber', lines: [
              'model input = f(State)',
              '  → a test can check that the text agrees with State',
              '  → an experiment can change one part and hold the rest fixed',
              '  → nothing enters the input by accident'
            ] });
            return ctx.reveal(S.rule, { from: 'up' });
          });
        }
      }
    ]
  });
})();
