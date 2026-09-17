# Engineering evolution

The current public product name is **Agent Operations Platform**. Personal AI Workspace
and PAW identify earlier project stages and retained compatibility identifiers. See
[the current architecture](architecture/AGENT_OPERATIONS_PLATFORM.md).

This public overview preserves engineering milestones without a personal operational diary.

## September 17 portfolio publication

### Continuity and benefits

The portfolio review required a sanitized public implementation whose architecture,
code evidence and capability boundaries are easy to inspect. This milestone
publishes the architecture-led entry and an optional synthetic reference workflow,
then makes its sharing metadata available to crawlers. Visitors can now follow
reasoning, authority and durable state before exploring a domain example. A staged
publication policy keeps future public milestones reviewable as development evolves.
Production platform acceptance and actual LinkedIn preview generation remain
separate from these verified website and repository results.

### Delivered and verified

- The independent clean public edition retains source, migrations, tests and
  explicitly synthetic examples. It excludes original development history and
  personal operational records. See the [sanitisation report](PUBLIC_SANITISATION_REPORT.md)
  and [positioning report](PUBLIC_REPOSITIONING_REPORT.md).
- The README now has a unified architecture cover and three reading paths. The
  architecture homepage exposes seven responsibilities and a five-stage illustrated
  operation with source/test links. The Jobs sandbox is an optional separate adapter.
- The [canonical GitHub Pages site](https://andy-junxiong.github.io/Agent-Operations-Platform/)
  publishes from verified public main. Sharing metadata, a reviewed 1200 x 630 PNG
  and Worker static HEAD responses address deficiencies found during LinkedIn use.
- Source `37dc01ede2a78042ce12f50b10a75593eaa692b7` passed
  [Verify and Pages deployment](https://github.com/Andy-JunXiong/Agent-Operations-Platform/actions/runs/35186516213).
  This includes the 522-test platform suite, public-data/history gates, synthetic
  lifecycle, Worker checks, offline Watch checks and pinned Skill packaging.
- Local and live Pages browser checks passed at 1440, 1024, 768, 390 and 320 pixels:
  component/flow navigation, correct reference destination, no horizontal overflow,
  no uncaught script errors and no homepage API/session creation. Live crawler-UA
  GET/HEAD and image bytes/type/dimensions passed. These checks do not impersonate
  actual requests from LinkedIn infrastructure or establish its cached preview.

### Maintenance and next acceptance

Follow the [milestone promotion policy](PUBLIC_DATA_POLICY.md#development-and-publication-cadence):
review selected stable changes and publish evidence-matched claims, without mirroring
private records or development history. Pages deploys through CI; the separate
Worker is deployed when its bundle changes. The public source archive reflects
committed source, not production data.

Next external acceptance is the actual LinkedIn media preview. Additional domains,
agent hosts and production usage still need their own implementation/acceptance.
The September 17 documentation closeout records these results without changing
runtime code; it reuses existing runtime evidence and checks documentation and
public content. Existing CI continues to run on push.

| Increment | Engineering evidence retained |
| --- | --- |
| Local persistence and MCP | Domain model, service/transport tests and SQLite migrations |
| Inventory and lifecycle | Duplicate protection, explicit admission, optimistic concurrency and derived tasks |
| Shared web interface | Scoped identity, authorization tests and common application services |
| Mail integration | Stable source identity, bounded reads, receipt recovery and privacy tests |
| Preparation and screening | Versioned documents, immutable assessments, stale-input detection and recovery |
| Reusable Skills | Procedure/authority separation, synthetic acceptance and reproducible packaging |
| Agent exploration | Labeled sandbox authority proposal and offline Watch evaluation materials |

Original commit history, live acceptance transcripts, personal resume/application records and deployment diaries are not included in this edition. Architecture proposals retain their own implementation caveats. New local verification is recorded in [the sanitisation report](PUBLIC_SANITISATION_REPORT.md), rather than relabeling private historical events as synthetic production proof.
