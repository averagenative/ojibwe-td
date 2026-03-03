/**
 * Orchestrator token-optimization — structural tests (TASK-106).
 *
 * The quick-wins are entirely in shell scripts.  These tests read the shell
 * source as plain text and assert that the critical cost-saving patterns are
 * present, ensuring they are not accidentally removed in future edits.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

// Repo root is one directory above game/
const REPO = resolve(__dirname, '..', '..', '..', '..');

let orchestratorSrc: string;
let parallelSrc: string;
let healthCheckSrc: string;
let tokenOptDoc: string;

beforeAll(() => {
  orchestratorSrc = readFileSync(resolve(REPO, 'orchestrator.sh'), 'utf-8');
  parallelSrc = readFileSync(
    resolve(REPO, 'parallel-orchestrator.sh'),
    'utf-8',
  );
  healthCheckSrc = readFileSync(
    resolve(REPO, 'scripts', 'health-check.sh'),
    'utf-8',
  );
  tokenOptDoc = readFileSync(
    resolve(REPO, 'docs', 'token-optimization.md'),
    'utf-8',
  );
});

// ── orchestrator.sh pre_validate ────────────────────────────────────────────

describe('orchestrator.sh — pre_validate gates', () => {
  it('defines a pre_validate function', () => {
    expect(orchestratorSrc).toMatch(/^pre_validate\(\)/m);
  });

  it('runs npm run typecheck as Gate 1', () => {
    expect(orchestratorSrc).toContain('npm run typecheck');
    expect(orchestratorSrc).toContain('# Gate 1: TypeScript compilation');
  });

  it('runs npm run test as Gate 2', () => {
    expect(orchestratorSrc).toContain('npm run test');
    expect(orchestratorSrc).toContain(
      '# Gate 2: Existing test suite',
    );
  });

  it('returns 1 on typecheck failure to skip Opus', () => {
    // Slice from the function body, not the comment header
    const fnBody = orchestratorSrc.slice(
      orchestratorSrc.indexOf('pre_validate()'),
    );
    const gate1Block = fnBody.slice(
      fnBody.indexOf('Gate 1'),
      fnBody.indexOf('Gate 2'),
    );
    expect(gate1Block).toContain('return 1');
    expect(gate1Block).toMatch(/typecheck FAILED/i);
  });

  it('returns 1 on test failure to skip Opus', () => {
    const fnBody = orchestratorSrc.slice(
      orchestratorSrc.indexOf('pre_validate()'),
    );
    const gate2Block = fnBody.slice(
      fnBody.indexOf('Gate 2'),
      fnBody.indexOf('return 0'),
    );
    expect(gate2Block).toContain('return 1');
    expect(gate2Block).toMatch(/tests FAILED/i);
  });

  it('typecheck gate runs before test gate (correct ordering)', () => {
    const typecheckIdx = orchestratorSrc.indexOf('npm run typecheck');
    const testIdx = orchestratorSrc.indexOf(
      'npm run test',
      typecheckIdx + 1,
    );
    expect(typecheckIdx).toBeGreaterThan(-1);
    expect(testIdx).toBeGreaterThan(typecheckIdx);
  });
});

// ── parallel-orchestrator.sh pre_validate ───────────────────────────────────

describe('parallel-orchestrator.sh — pre_validate gates', () => {
  it('defines a pre_validate function', () => {
    expect(parallelSrc).toMatch(/^pre_validate\(\)/m);
  });

  it('runs npm run typecheck as Gate 1', () => {
    expect(parallelSrc).toContain('npm run typecheck');
    expect(parallelSrc).toContain('# Gate 1: TypeScript compilation');
  });

  it('runs npm run test as Gate 2', () => {
    expect(parallelSrc).toContain('npm run test');
    expect(parallelSrc).toContain(
      '# Gate 2: Existing test suite',
    );
  });

  it('returns 1 on typecheck failure', () => {
    const fnBody = parallelSrc.slice(
      parallelSrc.indexOf('pre_validate()'),
    );
    const gate1Block = fnBody.slice(
      fnBody.indexOf('Gate 1'),
      fnBody.indexOf('Gate 2'),
    );
    expect(gate1Block).toContain('return 1');
  });

  it('returns 1 on test failure', () => {
    const fnBody = parallelSrc.slice(
      parallelSrc.indexOf('pre_validate()'),
    );
    const gate2Block = fnBody.slice(
      fnBody.indexOf('Gate 2'),
      fnBody.indexOf('return 0'),
    );
    expect(gate2Block).toContain('return 1');
  });

  it('includes slug in log messages for parallel identification', () => {
    // parallel-orchestrator uses [$slug] prefix for all log messages
    expect(parallelSrc).toContain('[$slug] Pre-validate');
    expect(parallelSrc).toContain('[$slug] [typecheck]');
    expect(parallelSrc).toContain('[$slug] [test]');
  });

  it('typecheck gate runs before test gate (correct ordering)', () => {
    const typecheckIdx = parallelSrc.indexOf('npm run typecheck');
    const testIdx = parallelSrc.indexOf('npm run test', typecheckIdx + 1);
    expect(typecheckIdx).toBeGreaterThan(-1);
    expect(testIdx).toBeGreaterThan(typecheckIdx);
  });
});

// ── health-check.sh model downgrade ─────────────────────────────────────────

describe('health-check.sh — model downgrade', () => {
  it('uses sonnet model instead of opus', () => {
    expect(healthCheckSrc).toMatch(/^MODEL="sonnet"/m);
  });

  it('does not use opus model', () => {
    // MODEL assignment should not be opus
    expect(healthCheckSrc).not.toMatch(/^MODEL="opus"/m);
  });

  it('has a comment explaining the downgrade rationale', () => {
    const modelLine = healthCheckSrc
      .split('\n')
      .find((l) => l.startsWith('MODEL='));
    expect(modelLine).toBeDefined();
    expect(modelLine).toMatch(/[Ss]onnet/);
    expect(modelLine).toContain('#');
  });
});

// ── docs/token-optimization.md deliverable ──────────────────────────────────

describe('token-optimization.md — deliverable completeness', () => {
  it('exists and is non-empty', () => {
    expect(tokenOptDoc.length).toBeGreaterThan(100);
  });

  it('covers all seven audit areas from the task', () => {
    // Task file lists: task claiming, pre-implementation, post-impl,
    // review stage, commit/ship, health check, prompt size
    expect(tokenOptDoc).toMatch(/task claiming/i);
    expect(tokenOptDoc).toMatch(/pre-implementation/i);
    expect(tokenOptDoc).toMatch(/post-impl/i);
    expect(tokenOptDoc).toMatch(/review agent/i);
    expect(tokenOptDoc).toMatch(/commit.*ship/i);
    expect(tokenOptDoc).toMatch(/health check/i);
    expect(tokenOptDoc).toMatch(/prompt/i);
  });

  it('documents the test gate as a quick win', () => {
    expect(tokenOptDoc).toContain('npm run test');
    expect(tokenOptDoc).toMatch(/test gate/i);
  });

  it('documents the Sonnet downgrade as a quick win', () => {
    expect(tokenOptDoc).toMatch(/[Ss]onnet/);
    expect(tokenOptDoc).toMatch(/downgrade|changed/i);
  });

  it('flags follow-up tasks with IDs', () => {
    expect(tokenOptDoc).toContain('TASK-107');
    expect(tokenOptDoc).toContain('TASK-108');
    expect(tokenOptDoc).toContain('TASK-109');
  });

  it('includes a summary table', () => {
    // Markdown table indicators
    expect(tokenOptDoc).toContain('| Stage |');
    expect(tokenOptDoc).toContain('|---|');
  });
});
