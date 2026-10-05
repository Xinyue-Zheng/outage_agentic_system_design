/* L1 — Context Builder. Why the model input is rendered from State, how it is built, and what stays out. */
(function () {
  var D = window.OutageDraw;

  var SECTIONS = [
    ['Task', 'cell, outage time, objective'],
    ['Known geography', 'objects and relations'],
    ['Investigation progress', 'per reference: queried, unqueried'],
    ['Coverage observations', 'counts per class, boundary'],
    ['Impact and backup', 'once computed'],
    ['Remaining unknowns', 'what is still not known'],
    ['Available actions', 'what the model may choose now'],
    ['Evidence provenance', 'which observation produced what']
  ];

  Atlas.register({
    id: 'context',
    refs: [
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026',
      'Anthropic, <i>Building effective agents</i>, 2024'
    ],
    poster: 2,
    steps: [
      {
        title: 'Why render from State',
        beats: [
          {
            say: 'The model never reads a coverage record. The program reads them, computes counts and relations, and writes sentences. The model reads the sentences.',
            card: { tag: 'KEY IDEA', title: 'The program interprets, the model reads', body: 'Coverage records are JSON with hundreds of rows per query. Counting and comparing them is program work. The model gets facts, not rows.' },
            deep: '<p>Two reasons fix this choice. The model in use is not a top-tier model and cannot read maps. And a general model has never seen the internal field names or the conventions that encode missing versus empty. The program knows the meaning of its own tools, so it can compute what the model would otherwise have to guess.</p>'
          },
          {
            say: 'Because the text is rendered from State, its size depends on how much is known, not on how many steps have run. Nothing is appended, so nothing has to be compressed later.',
            card: { tag: 'KEY IDEA', title: 'Bounded by knowledge, not by history', body: 'Ten steps or a hundred, the context describes the same State. There is no transcript to grow and no compaction to lose facts in.' },
            deep: '<p>An append-only transcript would carry every raw result forever and would need a summarization pass when it grows too large. Here the summary is the State itself, kept by the program, and the model reads a fresh view of it every step.</p>'
          },
          {
            say: 'Rendering also makes experiments possible. The same State can be rendered in different ways, and the model\'s decisions compared, which is the main research variable of this project.',
            card: { tag: 'WHY IT MATTERS', title: 'One State, several renderings', body: 'Same facts, different text: with or without recent steps, more or less detail per region. Decisions can be compared on equal evidence.' },
            deep: '<p>This is what a transcript cannot offer: the model\'s input would always include every earlier message, so two conditions could never share the same evidence and differ only in presentation.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.rows = ctx.group();
          S.recs = ctx.node({ x: 250, y: 300, w: 300, h: 70, title: 'coverage records', sub: 'JSON rows, one per location', color: 'blue', kind: 'cyl', titleSize: 14, subSize: 11, glow: false, parent: S.rows });
          S.prog = ctx.node({ x: 700, y: 300, w: 300, h: 70, title: 'program', sub: 'parse · count · compute relations', color: 'magenta', titleSize: 14, subSize: 11, glow: false, parent: S.rows });
          S.txt = ctx.node({ x: 1150, y: 300, w: 300, h: 70, title: 'rendered context', sub: 'sentences with numbers', color: 'amber', titleSize: 14, subSize: 11, glow: false, parent: S.rows });
          ctx.link(S.recs, S.prog, { color: 'dim', parent: S.rows });
          ctx.link(S.prog, S.txt, { color: 'dim', parent: S.rows });
          return ctx.reveal(S.rows, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.state = ctx.node({ x: 700, y: 470, w: 300, h: 70, title: 'State', sub: 'what is known so far', color: 'teal', kind: 'cyl', titleSize: 14, subSize: 11, glow: false });
            S.l3 = ctx.link(S.prog, S.state, { color: 'teal' });
            S.l4 = ctx.link(S.state, S.txt, { color: 'amber', label: 'rendered every step', bend: { x: 1000, y: 470 } });
            return ctx.reveal([S.state, S.l3, S.l4], { from: 'fade' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.alt = D.kv(ctx, 420, 600, 560, [['condition A', 'rendered State only'], ['condition B', 'stable prefix, rendered State, recent steps'], ['compared on', 'the same State, the same model, the same budget']], { title: 'one State, several renderings', color: 'amber' });
            return ctx.reveal(S.alt.g, { from: 'up' });
          });
        }
      },
      {
        title: 'How the context is built',
        beats: [
          {
            say: 'The context has fixed sections. A program template fills each one from State: the task, the geography, progress per reference, coverage counts, impact once computed, unknowns, available actions, and provenance.',
            card: { tag: 'HOW IT WORKS', title: 'Eight sections, one template', body: 'Every section is a view of State. The template decides the order and the wording; the numbers come from the region summaries.' },
            deep: '<p>The template is plain program code without any model call. Each section reads one part of State: progress reads the queried and unqueried sets per reference, coverage reads the class counts and the boundary, unknowns reads the unknowns list, available actions reads the tool registry filtered by the current phase.</p>'
          },
          {
            say: 'The sections fall into two parts. A stable prefix that does not change during a run: the skill, the task, the geography, the relations and the action list. And a variable part that changes every step.',
            card: { tag: 'KEY IDEA', title: 'Stable prefix, variable part', body: 'The prefix is written once and can be cached by the model service. The variable part is rendered again each step: progress, coverage, unknowns, recent steps.' },
            deep: '<p>Splitting the context this way keeps the cost of re-rendering low and makes the input easy to read: the model finds the same things in the same place every step, and only the part that reports evidence changes.</p>'
          },
          {
            say: 'Feedback enters the same text. A rejected action, an unmet completion check or a parse error is written into State and appears as a line in the variable part on the next step.',
            card: { tag: 'HOW IT WORKS', title: 'Errors are rendered, not appended', body: 'The model is never handed a separate error message. It sees a sentence in the next context that says what was rejected and why.' },
            deep: '<p>This keeps one channel between program and model. Whatever the program wants the model to know, it writes into State, and the rendering carries it. The Decision Core chamber lists the failure types that produce such lines.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['rows', 'state', 'l3', 'l4'].forEach(function (k) { if (S[k]) ctx.fade(S[k], 0.2, 300); });
          if (S.alt) ctx.fade(S.alt.g, 0.2, 300);
          S.secs = ctx.group();
          S.secNodes = SECTIONS.map(function (s, i) {
            return ctx.node({ x: 260, y: 170 + i * 58, w: 380, h: 46, title: s[0], sub: s[1], color: i < 2 || i === 6 ? 'cyan' : 'amber', titleSize: 12.5, subSize: 10.5, glow: false, parent: S.secs });
          });
          return ctx.reveal(S.secNodes, { from: 'left', stagger: 60 }).then(function () { return ctx.beat(1); }).then(function () {
            S.prefix = ctx.rect(60, 140, 400, 118, { rx: 10, fill: 'none', stroke: 'cyan', sw: 1.4, dash: '6 4' });
            S.prefixL = ctx.text(470, 160, 'stable prefix: skill, task, geography, relations, action list', { size: 11.5, color: 'cyan' });
            S.vary = ctx.rect(60, 266, 400, 352, { rx: 10, fill: 'none', stroke: 'amber', sw: 1.4, dash: '6 4' });
            S.varyL = ctx.text(470, 290, 'variable part: rendered again every step', { size: 11.5, color: 'amber' });
            return ctx.reveal([S.prefix, S.prefixL, S.vary, S.varyL], { from: 'fade' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.fb = D.kv(ctx, 760, 330, 700, [['rejected action', 'a line in the next context: which check failed and why'], ['unmet completion check', 'the unmet requirements, listed'], ['parse failure', 'the error and the required format']], { title: 'feedback travels through State', color: 'red', lh: 24 });
            return ctx.reveal(S.fb.g, { from: 'up' });
          });
        }
      },
      {
        title: 'What stays out',
        beats: [
          {
            say: 'Raw records stay on disk. The context names the observation that produced each fact, and a drill-down action lets the model ask for the rows of one observation when the summary is not enough.',
            card: { tag: 'HOW IT WORKS', title: 'Provenance in, rows out', body: 'Every fact line can be traced to an observation id. The rows themselves are available on request, bounded in size, never by default.' },
            deep: '<p>The drill-down action is a registry entry like any other: it takes an observation id, returns a bounded number of rows, and is validated like a query. In the recorded run it was never needed.</p>'
          },
          {
            say: 'Maps are for people. The model cannot read images, so nothing in the context refers to a map or an image path as evidence.',
            card: { tag: 'PITFALL', title: 'No image paths as facts', body: 'The maps in this UI and in the trace are human artifacts. The model\'s evidence is text computed from State, always.' },
            deep: '<p>The template has no access to the map files. A future rendering that mentions a map would have to be added deliberately and would contradict the design.</p>'
          },
          {
            say: 'One question is open: whether the context should include the last few steps, so the model can see its own recent actions. That is the difference between two experiment conditions, and it is not decided.',
            card: { tag: 'TRADE-OFF', title: 'Recent steps in or out', body: 'In: the model can notice a repeated query itself. Out: the input stays smaller and purely about State. Decided by experiment, not by argument.' },
            deep: '<p>Condition A renders State only. Condition B adds the last few steps as action, stated gap and one-line outcome. The recorded run shows why it matters: a repeated query is visible today only in the provenance list.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          if (S.fb) ctx.fade(S.fb.g, 0.2, 300);
          S.out = D.kv(ctx, 760, 170, 700, [['raw records', 'on disk, named by observation id'], ['drill-down action', 'bounded rows of one observation, on request'], ['maps and images', 'for people only; never cited as evidence']], { title: 'what the model does not get', color: 'blue', lh: 24 });
          return ctx.reveal(S.out.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            return ctx.pulse(S.out.g, { color: 'blue', times: 1, dur: 700 });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.open = D.kv(ctx, 760, 330, 700, [['condition A', 'State only'], ['condition B', 'State plus the last few steps'], ['decided by', 'the context experiment on the same cases']], { title: 'open: recent steps in the context', color: 'amber' });
            return ctx.reveal(S.open.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
