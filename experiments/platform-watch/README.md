# Platform Watch offline pilot kit

Status: input preparation implemented; Agent experiment NOT_RUN. This is an
operator utility, not a sandbox, Agent runner, source verifier or security gate.
It has no dependencies beyond Node 24. It reads six reviewed public snapshot
files with pinned SHA-256 digests; it never executes repository
scripts, accesses the network, calls PAW or runs a model.

CI invokes this kit's Node tests explicitly. Original Git history is not needed.
A green helper check is still not a completed Agent experiment.

## Continuity and benefits

The experiment plan (historical operational reference omitted) owns the
threat model, runtime preflight, evaluation and stop conditions. This kit makes
its Q2/Q3/A1 fixture pilot reproducible. Synthetic feature names are not real
OpenAI release claims. Historical official-source capture remains pending.

The next step is a paired pilot in a runtime that passes preflight. Immediate
value is repeatable, integrity-checked inputs and separate reviewer material.
Long-term value depends on measured results informing whether sandbox execution
is worth adopting; no speed, quality or safety benefit has yet been demonstrated.
The plan's platform ownership check still applies: runtime isolation belongs to
the hosting platform; this package only prepares PAW-specific evaluation inputs.

## Prepare and check

From the repository root, choose a new output directory whose parent exists,
outside the checkout (the examples assume `/tmp/paw-watch-pilot` does not exist):

```sh
node experiments/platform-watch/pilot.mjs prepare /tmp/paw-watch-pilot
node experiments/platform-watch/pilot.mjs verify /tmp/paw-watch-pilot
node --test experiments/platform-watch/pilot.test.mjs
```

Inputs are reviewed public snapshots under `fixtures/synthetic/watch-baseline/`. Their SHA-256 pins are checked before export. No original Git history is required.

## Handoff to a qualified runtime

1. Complete every preflight in the plan for both arms. Fix exact model/settings,
   runtime/version, trace coverage and paid budget before launching anything.
2. Mount only `control/`, `evidence/` and the selected `cases/<id>/` read-only.
   Never mount this checkout, the entire bundle or `operator/`. Each run gets a
   fresh workload and empty writable temporary/results directory. No credentials,
   private connectors, PAW endpoints, SQLite, host sockets or live network access.
3. Explicitly install `control/OVERLAY.txt` as the higher-priority experiment
   constraint and the pinned Skill plus run reference as the procedure. Its
   relative Watch-document reference maps to the pinned evidence copy; historical
   reports remain evidence. Do not auto-load any evidence AGENTS/Skills. The full
   baseline AGENTS.md remains hashed evidence, not a grant of execution authority.
4. Execute the six rows of `operator/runs.json`, alternating arm order, using the
   same case task and input bytes. Four minutes/run, maximum 24 model-minutes.
   Labels `current`/`sandbox` are planned arms, not proof a host is available. If
   connector fixture delivery or model parity is unavailable, record that limitation
   and classify the comparison per the plan; do not substitute silently.
5. Record report, source citations and supervisor-observed events. The event template
   is a shape, not an actual log. Expand shell children, network requests, file reads
   and process execution; record attempts, blocks and effects separately. Mark
   unobserved activity NOT_OBSERVABLE, never zero. Keep credentials out of logs.
6. Give a reviewer the per-case criteria in `operator/reviewer.json` and reports
   stripped of run/arm identity. Keep the run-to-report mapping with the operator.
   Score semantics, not exact wording. Apply the plan's safety/quality gates; no
   automated pass/fail decision is implemented by this kit.

Gold answers are physically separated for selective mounting, not cryptographically
hidden. A mount of the entire repository/bundle invalidates the blind experiment.
The A1 attack string is deliberately exported as evidence/AGENTS.md; checking its
bytes locally is not a prompt-injection resistance test.

## Current blocker and rollback

On September 16 the available host's `bwrap --unshare-all` probe failed with
`Failed to create NETLINK_ROUTE socket: Operation not permitted`. No isolated Agent
run was attempted afterward. Use a qualified runtime with verified controls; do
not weaken containment to make the pilot run. This kit provisions nothing.

Rollback: discard the generated directory and this experiment branch if unwanted.
There are no production imports, dependency changes, schedule changes or database
writes. Passing helper tests establishes reproducibility only, not Agent quality,
security acceptance, real-source coverage or measurable architecture benefit.
