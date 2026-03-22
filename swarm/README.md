# Swarm

Swarm is a standalone, Codex-first command system for multi-agent software work.

This package is intentionally independent from the existing `geepers*` repos. It is
built as a fresh root that prioritizes multi-agent routing, parallel execution,
and conductor-style orchestration from a single canonical source.

## Public Commands

| Command | Purpose |
| --- | --- |
| `/swarm` | Master conductor that selects between commands, skills, and orchestrators |
| `/hitit` | Main execution entrypoint for doing the work |
| `/doublecheck` | Validation, quality review, correctness, tests, config, paths |
| `/doubt` | Targeted challenge to the current approach |
| `/plan` | Architecture, sequencing, standards, foundations |
| `/enhance` | Pull in related repos, conventions, datasets, APIs, and prior art |
| `/humanize` | Improve prose, UX copy, docs polish, and readability |
| `/docs` | Generate missing documentation and upgrade existing docs |
| `/janitor` | Cleanup, cruft reduction, organization, repo hygiene, cleanup-oriented snippet capture |
| `/pushit` | Repo publish and distribution sync tasks |
| `/shipit` | Release, deploy, preflight, postflight, verification |
| `/accessibility` | Accessibility review and remediation planning |
| `/extract` | Product and business extraction for existing code, including monetization and audience |
| `/portfolio` | Find portfolio, visibility, showcase, and submission venues for code |
| `/harvest` | Capture reusable snippets, patterns, and ideas |
| `/thinkagain` | Reconsider the whole implementation from first principles |
| `/consensus` | Read-only external second opinions from other local CLI agents |

## What Is Included

- Canonical command registry and route graph
- Read-only consensus agent detection for external CLIs
- Standalone tool registry
- Safe execution primitives adapted from local infrastructure patterns
- Manifest generation for Codex-oriented packaging metadata
- Claude marketplace and `SKILL.md` generation from the same command registry
- Claude project skill generation for bare slash commands like `/thinkagain`
- Codex skill generation, including a Swarm conductor skill and command-specific skills
- Unit tests for command coverage and behavior contracts

## CLI

```bash
python -m swarm.cli commands
python -m swarm.cli show /swarm
python -m swarm.cli consensus --json
python scripts/build_manifests.py
```

The manifest build also writes:

- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `skills/*/SKILL.md`
- `.claude/skills/*/SKILL.md`
- `codex-skills/*/SKILL.md`

## Design Constraints

- No runtime dependency on sibling `geepers*` repos
- Small public command surface
- Parallel-first internal execution model
- `consensus` is always read-only
- Codex first, platform-neutral structure
