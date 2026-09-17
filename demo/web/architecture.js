const repository = 'https://github.com/Andy-JunXiong/Agent-Operations-Platform/';
const components = {
  sources: { number: '01', title: 'Connected sources', kind: 'External systems retain their native records', description: 'Provider records supply context and evidence. Bounded adapters and source references connect those records to platform workflows.', responsibility: 'Preserve source identity and minimize the facts copied into the workspace.', boundary: 'Source text is untrusted input. A message or document cannot grant permission to mutate business state.', source: 'tree/main/src/gmail', test: 'blob/main/tests/integration/gmail-observation-privacy.test.ts' },
  host: { number: '02', title: 'AI host', kind: 'Reasoning and user interaction', description: 'The host interprets evidence, assembles context and proposes a supported action. ChatGPT handoff procedures describe the current host experience.', responsibility: 'Explain the proposed action and obtain the authority required by its command contract.', boundary: 'Model confidence is advisory. Additional hosts require separate identity, permissions and end-to-end acceptance.', source: 'tree/main/.agents/skills/application-lifecycle-review', test: 'blob/main/tests/integration/mcp-transport.test.ts' },
  interfaces: { number: '03', title: 'MCP / authenticated Web', kind: 'Entry points to platform services', description: 'Tool schemas and Web routes expose bounded operations. Request context resolves identity and the workspace before service access.', responsibility: 'Validate inputs and route supported commands to their application services.', boundary: 'Jobs supports MCP and Web. Platform Watch uses Web report and decision commands; it does not expose the same MCP surface.', source: 'blob/main/src/application/request-context.ts', test: 'blob/main/tests/integration/web-identity.test.ts' },
  services: { number: '04', title: 'Application services', kind: 'Domain-specific commands inside the platform', description: 'Services coordinate the implemented use cases: Jobs lifecycles and tasks, and Platform Watch reports and controlled decisions.', responsibility: 'Apply domain contracts and coordinate evidence, authority checks and persistent writes.', boundary: 'The applications have different command models. New domains need their own implementation and verification.', source: 'tree/main/src/application', test: 'blob/main/tests/integration/platform-watch-report.test.ts' },
  controls: { number: '05', title: 'Trust Kernel', kind: 'Logical controls across modules', description: 'Identity, attributable evidence, explicit authority and domain rules govern whether a requested change can be admitted.', responsibility: 'Check the command against its authority, evidence and current version before committing durable state.', boundary: 'The checks live across existing modules. There is no standalone kernel process or universal policy engine.', source: 'blob/main/docs/architecture/AGENT_OPERATIONS_PLATFORM.md#trust-kernel-mechanisms-evidence-and-limits', test: 'blob/main/tests/integration/workspace-service.test.ts' },
  state: { number: '06', title: 'Durable state', kind: 'SQLite persistence and transactional writes', description: 'The workspace stores admitted business state, tasks, source references and receipts. It gives later interactions a stable record to read.', responsibility: 'Commit related local writes atomically and preserve the command results used for supported retries.', boundary: 'Local transaction and retry guarantees do not establish exactly-once execution across external providers.', source: 'blob/main/src/persistence/database.ts', test: 'blob/main/tests/integration/idempotency.test.ts' },
  readback: { number: '07', title: 'Read back the result', kind: 'A feedback loop grounded in saved state', description: 'The caller reads the admitted result and derived tasks. A later conversation can resume from the same workspace facts.', responsibility: 'Report the stored outcome and inspect receipt progress before retrying or continuing work.', boundary: 'Persisted records are domain evidence, not an immutable external security log or proof that a scheduled job ran.', source: 'blob/main/scripts/demo-synthetic.ts', test: 'blob/main/tests/integration/database-backup.test.ts' },
};
const stages = [
  { node: 'sources', owner: 'SOURCE → PLATFORM', title: 'Capture what happened.', description: 'An external event supplies evidence. Record minimal facts and a stable source reference so a later decision can be traced to its input.', invariant: 'Recording evidence does not change the business lifecycle.' },
  { node: 'host', owner: 'AI HOST → APPLICATION SERVICE', title: 'Make the suggested action explicit.', description: 'The host interprets the evidence and proposes a supported domain action against the current record version.', invariant: 'A proposal records intent. It does not grant authority or commit the action.' },
  { node: 'controls', owner: 'USER AUTHORITY → PLATFORM CHECKS', title: 'Check whether the action may proceed.', description: 'For a command requiring confirmation, the user approves explicitly. The platform checks identity, evidence, authority, domain rules and the current version.', invariant: 'Missing authority or a stale version blocks admission.' },
  { node: 'state', owner: 'APPLICATION SERVICE → SQLITE', title: 'Commit the accepted operation.', description: 'An admitted Jobs lifecycle transition, its derived task and its receipt are committed together in a local transaction.', invariant: 'An exact command retry returns the existing result without another admission.' },
  { node: 'readback', owner: 'SAVED STATE → HOST OR WEB UI', title: 'Continue from a durable result.', description: 'Read the saved state and receipt back to the caller. Later interactions use those records to continue the workflow across conversations.', invariant: 'The workspace owns admitted business state; connected sources retain their original records.' },
];
const $ = id => document.getElementById(id);
let stage = 0;
let timer;
function selectComponent(key) {
  const item = components[key];
  for (const node of document.querySelectorAll('[data-node]')) {
    const selected = node.dataset.node === key;
    node.classList.toggle('selected', selected);
    node.setAttribute('aria-pressed', String(selected));
  }
  $('component-number').textContent = `${item.number} / 07`;
  for (const field of ['title', 'kind', 'description', 'responsibility', 'boundary']) $('component-' + field).textContent = item[field];
  $('component-source').href = repository + item.source;
  $('component-test').href = repository + item.test;
}
function showStage(index) {
  stage = index;
  const item = stages[index];
  for (const button of document.querySelectorAll('[data-flow]')) {
    const active = Number(button.dataset.flow) === index;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const field of ['owner', 'title', 'description', 'invariant']) $('flow-' + field).textContent = item[field];
  $('flow-position').textContent = `Step ${index + 1} of ${stages.length}`;
  selectComponent(item.node);
}
function stop() {
  clearInterval(timer); timer = undefined;
  $('flow-play').textContent = 'Play walkthrough ▷';
}
for (const node of document.querySelectorAll('[data-node]')) node.addEventListener('click', () => { stop(); selectComponent(node.dataset.node); });
for (const button of document.querySelectorAll('[data-flow]')) button.addEventListener('click', () => { stop(); showStage(Number(button.dataset.flow)); });
$('flow-next').addEventListener('click', () => { stop(); showStage((stage + 1) % stages.length); });
$('flow-play').addEventListener('click', () => {
  if (timer) return stop();
  showStage(0);
  $('flow-play').textContent = 'Pause walkthrough Ⅱ';
  timer = setInterval(() => {
    showStage(stage + 1);
    if (stage === stages.length - 1) stop();
  }, 3200);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
