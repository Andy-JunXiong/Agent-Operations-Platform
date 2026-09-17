const $ = id => document.getElementById(id);
let state, busy = false;
const titles = {
  READY: 'Your sandbox is ready.', OBSERVE: 'Evidence recorded. No lifecycle change.',
  PROPOSE: 'Proposal recorded. Your approval is still required.', ADMIT: 'Approved and committed.',
  REPLAYED: 'Safe retry: the original receipt was returned.', AUTHORITY_REQUIRED: 'Safeguard held: approval is required.',
  VERSION_CONFLICT: 'Safeguard held: stale write rejected.', RESET: 'Fresh start. Your sandbox has been reset.',
};

function render() {
  if (!state) return;
  const phase = state.receipt ? 3 : state.proposal ? 2 : state.observed ? 1 : 0;
  for (let i = 0; i < 3; i++) {
    $(`step-${i}`).className = `step ${i < phase ? 'done' : i === phase ? 'current' : ''}`;
    $(`step-${i}`).querySelector('span').textContent = i < phase ? '✓' : String(i + 1);
  }
  $('evidence-status').textContent = state.observed ? '✓ Recorded' : 'Not yet recorded';
  $('action-phase').textContent = ['01 / OBSERVE', '02 / PROPOSE', '03 / APPROVE', '✓ / COMMITTED'][phase];
  $('action-symbol').textContent = ['◎', '◇', '⌁', '✓'][phase];
  $('action-title').textContent = ['Connect the evidence.', 'Reason, then propose.', 'You hold the authority.', 'One action. One receipt.'][phase];
  $('action-copy').textContent = [
    'Record the synthetic reply in your isolated workspace. The application stays in its current state.',
    'The reply supports a lifecycle transition. Record a preset agent proposal, without changing the application.',
    'Review the proposed transition below. Only your explicit confirmation can admit this state change.',
    'The state, follow-up task and receipt were committed together. Now try a retry or stale write in the safeguards lab.',
  ][phase];
  $('proposal-preview').hidden = phase < 2 || phase === 3;
  $('approval-label').hidden = phase !== 2;
  $('primary').textContent = busy ? 'Processing…' : ['Record observation →', 'Create proposal →', 'Approve & execute →', 'Explore the safeguards ↓'][phase];
  $('primary').disabled = busy || (phase === 2 && !$('approval').checked);
  $('action-footnote').textContent = phase === 3 ? 'Refresh the page: your admitted state will still be here.' : 'Changes are stored in your own temporary session.';
  $('lifecycle').textContent = state.lifecycle;
  $('version').textContent = String(state.version).padStart(2, '0');
  $('admissions').textContent = state.receipt ? '1' : '0';
  $('tasks').textContent = state.task ? '1' : '0';
  $('task-title').textContent = state.task?.title || 'No follow-up task yet';
  $('task-detail').textContent = state.task ? `${state.task.priority} priority · created from transition` : 'Created only after approval';
  $('task-box').classList.toggle('active', !!state.task);
  $('reset').disabled = busy;
  $('test-authority').disabled = busy || !state.proposal;
  $('test-retry').disabled = busy || !state.receipt;
  $('test-stale').disabled = busy || !state.receipt;
  $('event-count').textContent = `${state.audit.length} events`;
  const audit = $('audit'); audit.replaceChildren();
  if (!state.audit.length) {
    const li = document.createElement('li'); li.className = 'audit-empty'; li.textContent = 'Your trace will appear here as you move through the workflow.'; audit.append(li);
  }
  state.audit.forEach((event, index) => {
    const li = document.createElement('li');
    for (const [className, content] of [
      ['audit-number', String(index + 1).padStart(2, '0')], ['audit-type', event.type],
      ['audit-detail', event.detail], ['audit-time', new Date(event.at).toLocaleTimeString('en-GB')],
    ]) { const span = document.createElement('span'); span.className = className; span.textContent = content; li.append(span); }
    audit.append(li);
  });
}

async function request(path, command) {
  if (busy) return;
  busy = true; render();
  try {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Request': '1' }, body: JSON.stringify(command || {}) });
    const data = await response.json();
    if (data.state) state = data.state;
    const expectedBlock = ['AUTHORITY_REQUIRED', 'VERSION_CONFLICT'].includes(data.code);
    $('result').className = `result-banner ${expectedBlock ? 'blocked' : !response.ok ? 'error' : ''}`;
    $('result-title').textContent = titles[data.code] || 'Sandbox response';
    $('result-copy').textContent = data.message;
    $('result-code').textContent = `HTTP ${response.status} · ${data.code}`;
    $('receipt-json').textContent = JSON.stringify(data, null, 2);
    for (const [code, id] of [['AUTHORITY_REQUIRED', 'authority-badge'], ['REPLAYED', 'retry-badge'], ['VERSION_CONFLICT', 'stale-badge']]) {
      if (data.code === code) { $(id).textContent = '✓ VERIFIED'; $(id).classList.add('passed'); }
    }
    if (!response.ok && !expectedBlock && !data.state) {
      state = undefined;
      $('primary').textContent = 'Reload sandbox';
      $('primary').disabled = false;
    }
  } catch {
    $('result').className = 'result-banner error';
    $('result-title').textContent = 'The server could not be reached.';
    $('result-copy').textContent = 'If an action was interrupted, reload to read the saved state before trying again.';
    $('result-code').textContent = 'CONNECTION_ERROR';
    if (!state) { $('primary').textContent = 'Reconnect to sandbox'; $('primary').disabled = false; }
  } finally { busy = false; render(); }
}

const admit = (confirmed, alternate = false, retry = false) => ({
  action: 'admit', confirmed,
  proposalId: alternate ? state.proposal.alternativeId : state.proposal.id,
  expectedVersion: 1,
  idempotencyKey: retry ? state.receipt.idempotencyKey : crypto.randomUUID(),
});
$('approval').addEventListener('change', render);
$('primary').addEventListener('click', () => {
  if (!state) return request('/api/session');
  if (state.receipt) {
    $('engineering-details').open = true;
    return $('safeguards').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  const command = state.proposal ? admit($('approval').checked) : { action: state.observed ? 'propose' : 'observe' };
  return request('/api/action', command);
});
$('reset').addEventListener('click', () => {
  $('approval').checked = false;
  for (const [id, text] of [['authority-badge', 'AUTHORITY'], ['retry-badge', 'IDEMPOTENCY'], ['stale-badge', 'CONCURRENCY']]) { $(id).textContent = text; $(id).classList.remove('passed'); }
  return request('/api/action', { action: 'reset' });
});
$('test-authority').addEventListener('click', () => request('/api/action', admit(false)));
$('test-retry').addEventListener('click', () => request('/api/action', admit(true, false, true)));
$('test-stale').addEventListener('click', () => request('/api/action', admit(true, true)));
request('/api/session');
