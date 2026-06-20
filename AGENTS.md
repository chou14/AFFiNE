# ELV Integration (elv-integration branch)

This branch integrates AFFiNE with the ELV (Embodied Learning Volition) exoskeleton — a human-factors learning system that adds spaced repetition, mastery tracking, and learner state awareness to your knowledge base.

## Integration Vision

AFFiNE blocks become **learning-aware**:

### 1. Mastery Badge (per document/block)
Each AFFiNE document or block displays a mastery score computed by `elv-core`:
- `[insufficient]` → `[emerging]` → `[developing]` → `[proficient]` → `[mastered]`
- Computed from five evidence sources: review recall, Feynman notes, reproductions, transfers, time stability

### 2. Review Schedule (sidebar widget)
- Due review items from FSRS spaced repetition appear in AFFiNE sidebar
- Click to jump directly to the associated document
- Grade inline (again/hard/good/easy) without leaving AFFiNE

### 3. Learner State Widget
- Daily state report: sleep hours, energy, focus, available minutes
- Replaces standalone ELV TUI State panel
- Feeds into attention control policy (warnings for social media overload, low energy, etc.)

### 4. Learning Event Log
- Opening/editing/exporting documents in AFFiNE auto-records LearningEvents
- xAPI-style events: `verb=read_pass2, object=ka-fsrs, duration=30min`
- Full audit trail of learning behaviors in `vault/lrs/learning_events.jsonl`

## elv-core Dependency

- Source: `../EmbodiedLearningVolition/src/elv_core/`
- Install: `pip install -e ../EmbodiedLearningVolition`
- Dependencies: PyYAML>=6.0, optional: fsrs>=0.5
- Python >= 3.11 required

## Integration Path

### Short-term (Phase 1): Local HTTP bridge
AFFiNE registers `ELVService` plus command-palette commands and calls `elv-core` through a local HTTP bridge:
```
AFFiNE command → ELVService → http://127.0.0.1:8765 → python -m elv_core.api serve
```
Implemented first commands:
- `affine:elv-health` checks bridge availability.
- `affine:elv-record-learning-event` appends an AFFiNE learning event to the configured ELV vault.

Configure the bridge in the browser console or app shell:
```
localStorage.setItem('elv.bridge.url', 'http://127.0.0.1:8765')
localStorage.setItem('elv.vault', '/absolute/path/to/vault')
```

### Medium-term (Phase 2): AFFiNE plugin
Register an AFFiNE plugin that embeds ELV widgets:
- Sidebar: ReviewQueue, LearnerState
- Block toolbar: MasteryBadge
- Command palette: "Record Learning Event", "Report State"

### Long-term (Phase 3): Native integration
- WASM compilation of elv-core algorithms for in-browser execution
- Or Rust reimplementation of FSRS/mastery/control-policy for native AFFiNE blocksuite integration

## Architecture

```
AFFiNE (TypeScript/Rust)
  └─ ELV Plugin / Sidebar / Block Widgets
       └─ HTTP/WebSocket → elv-core Python process
            ├── FSRSAdapter: spaced repetition scheduling
            ├── estimate_mastery(): five-evidence mastery score
            ├── LearnerState: daily energy/focus/readiness
            ├── ControlPolicy: attention budget rules
            ├── WorkloadBalancer: review queue management
            └── LearningEventStore: xAPI-style event log
```

## Related Repos

- ELV Core: `../EmbodiedLearningVolition/` (this repo's `src/elv_core/`)
- Codex Integration: `../codex/` (elv-integration branch)
