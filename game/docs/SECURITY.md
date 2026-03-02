# Security Audit — Ojibwe TD

> Audit performed: 2026-03-02
> Task: TASK-064 Security & Code Vulnerability Audit
> Scope: client-side browser game (Phaser 3 + TypeScript, Vite build, no backend)

---

## Executive Summary

No critical or high-severity vulnerabilities found.  The game has a small attack
surface: it is fully client-side, has no backend or user accounts, and exposes no
network endpoints.  The findings below are primarily defensive hardening measures
appropriate for a future distribution scenario (CDN, web store, app store wrapper).

---

## 1. Dependency Audit

### npm audit

```
npm audit
```

**Result: 0 vulnerabilities** (0 info / 0 low / 0 moderate / 0 high / 0 critical)

### Outdated dependencies

```
npx npm-check-updates
```

**Result: All dependencies match the latest package versions.**

### Dependency inventory (production only)

| Package | Version | Role |
|---------|---------|------|
| `phaser` | ^3.90.0 | Game engine |

Dev dependencies (not shipped in production bundle): `typescript`, `vite`,
`vitest`, `eslint`, `@types/node`, `jsdom`, `@vitest/coverage-v8`,
`@typescript-eslint/*`.

**Assessment:** No unnecessary production dependencies.  Attack surface is
minimal — Phaser ships as a single compiled bundle with no dynamic `require()`.

### CVE check

- **Phaser 3.90.x**: No known CVEs at audit date.
- **Vite 7.x / Vitest 4.x**: No known CVEs at audit date.
- **Transitive dependencies**: `npm audit` found 0 vulnerabilities across all
  236 total dependencies.

---

## 2. Client-Side Security

### 2a. localStorage tampering

**Risk:** Players can open browser DevTools → Application → LocalStorage and
manually edit the `ojibwe-td-save` key to set currency to an arbitrarily large
value, pre-unlock everything, or inflate audio settings.

**Mitigations implemented (`src/meta/SaveManager.ts`):**

1. **Schema validation & sanitization** (`_sanitize()` method):
   - `currency` clamped to `[0, MAX_CURRENCY]` (999 999) and floored to integer.
   - `unlocks` filtered to string-typed elements only.
   - `audioMaster / audioSfx / audioMusic` clamped to `[0, 1]`.
   - `audioMuted` coerced to boolean.
   - `stageMoons` values validated to be integers in `[1, 5]`.
   - `endlessRecords` values validated to be non-negative integers.

2. **Checksum / tamper detection** (`_computeChecksum()` method):
   - A djb2 hash is computed over the serialised data fields (excluding the
     `_checksum` field itself) and stored as `_checksum` in the localStorage
     JSON on every save.
   - On load, if `_checksum` is present, the hash is recomputed and compared.
     A mismatch sets `SaveManager.lastWarning` which callers can surface to the
     player ("Save data appears to have been modified outside the game.").
   - **Not crypto-grade** — a determined player can recompute the checksum.
     The intent is casual cheat detection and to make unintended edits visible,
     not to enforce game integrity.
   - Saves from older versions that lack `_checksum` load without warning
     (backward-compatible).

**Residual risk (accepted — single-player game):**
Cheating only harms the cheater's own experience.  Server-side enforcement is not
warranted.  If leaderboards are added in future the server must not trust any
client-supplied save data (see Section 6).

### 2b. Input sanitization

**Finding:** No user-supplied text is rendered anywhere in the game.

- Player names, custom labels, chat input: **none exist**.
- All game text comes from static TypeScript constants, JSON data files loaded at
  startup, or numeric values formatted via template literals.
- Phaser text objects (`scene.add.text()`) render to Canvas/WebGL, not to the
  DOM, so XSS via Canvas text is not possible.

**Assessment:** No injection surface.  No action required.  If player names or
user-generated content are added in future, all values must be sanitized (strip
HTML tags, limit length) before display.

### 2c. Console access

**Finding:** Players can access the Phaser game instance via `window.__game`
(set in `main.ts`) and call public methods on game objects.

**Assessment (accepted — single-player game):**
Providing console access does not affect other players, cannot damage a server,
and is consistent with the open spirit of browser games.  Many popular browser
games expose their state intentionally.

**Decision:** No obfuscation or anti-tampering is implemented.  This decision is
documented here.  Re-evaluate if multiplayer or leaderboard features are added.

---

## 3. Build & Supply Chain

### 3a. Source maps in production

**Finding (fixed):** The previous `vite.config.ts` did not explicitly set
`build.sourcemap`.  Vite defaults to `false` for production builds, but the
intent was ambiguous.

**Fix applied:** `build.sourcemap: false` is now explicit in `vite.config.ts`.

### 3b. .env files

**Finding (fixed):** The `.gitignore` did not include `.env` or `.env.*`
patterns.  No `.env` files exist in the repository, but the omission was a gap.

**Fix applied:** Added `.env`, `.env.*`, `!.env.example` to `game/.gitignore`.

### 3c. Secrets and credentials

**Scan command:**
```bash
grep -rn "password\|secret\|api.key\|token" src/ --include="*.ts"
git log --all -p | grep -i "password\|secret\|api.key\|token"
```

**Result:** No secrets, API keys, tokens, or credentials found in source code
or git history.

### 3d. Build output hygiene

Vite's production build (`npm run build`) automatically:
- Excludes all `devDependencies` from the output bundle.
- Excludes `src/**/*.test.ts` (Vitest test files are dev-only).
- Tree-shakes unused code.
- Outputs to `dist/` (gitignored).

**Assessment:** Clean.

### 3e. vite.config.ts security review

| Setting | Value | Assessment |
|---------|-------|------------|
| `server.allowedHosts` | `true` | Dev-only server. Acceptable for WSL/LAN dev. |
| `server.host` | `'0.0.0.0'` | Listens on all interfaces — dev only. |
| `build.sourcemap` | `false` (explicit) | ✅ Source not exposed in prod. |
| `build.target` | `'es2022'` | Modern target, small polyfill surface. |
| `publicDir` | `'public'` | Static assets — no secrets should be placed here. |

---

## 4. Code Quality / Vulnerability Patterns

### 4a. Dangerous APIs: eval / Function() / innerHTML

**Scan:**
```bash
grep -rn "eval(\|new Function\|innerHTML" src/ --include="*.ts"
```

**Result:** None found.  The game renders all text via Phaser Canvas/WebGL APIs,
never via DOM innerHTML.

### 4b. Unsafe type casts (`as unknown as`, `as any`)

All occurrences are in one of two categories:

1. **Test files only** — casting mock objects to full Phaser types in Vitest
   unit tests.  These never run in production.  Example:
   ```typescript
   return scene as unknown as Phaser.Scene;  // test helper
   ```

2. **Phaser internal type bridging** — casting game objects to
   `Phaser.GameObjects.Components.Visible` to call `.setVisible()` on items
   stored in a heterogeneous container array.  This is the idiomatic Phaser
   pattern for mixed object lists; Phaser guarantees the method exists.
   Example:
   ```typescript
   (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(v);
   ```

**Assessment:** No runtime-unsafe casts in production paths.

### 4c. Prototype pollution

**Scan:**
```bash
grep -rn "Object\.assign\|__proto__\|\[.*__proto__" src/ --include="*.ts"
```

**Result:** No `Object.assign` with untrusted keys, no `__proto__` manipulation.
All object merges use the spread operator (`{ ...a, ...b }`) with typed
interfaces, which is not susceptible to prototype pollution via the `__proto__`
key (TypeScript rejects it at compile time; V8/SpiderMonkey handle it safely).

### 4d. ReDoS (regular expression denial of service)

**Scan:** No complex regular expressions found in the game source.  The only
regex usage is simple patterns in build scripts, not in game hot-paths.

**Assessment:** No ReDoS risk.

### 4e. Error handling — information leakage

All `catch` blocks in production code either:
- Silently swallow the error and reset to a default state (e.g., `SaveManager._load()`), or
- Set a user-facing warning string (`this.lastWarning = '...'`) with a generic message.

No caught errors expose stack traces, file paths, or system information to the UI.

**Assessment:** Clean.

---

## 5. Content Security

### 5a. CSP headers (recommended)

The game currently has no `Content-Security-Policy` header.  When serving from a
web server or CDN, the following CSP is recommended:

```
Content-Security-Policy:
  default-src 'self';
  script-src  'self';
  style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src    'self' https://fonts.gstatic.com;
  img-src     'self' data:;
  connect-src 'none';
  frame-src   'none';
  object-src  'none';
```

Notes:
- `'unsafe-inline'` for `style-src` is required by Phaser's dynamic Canvas
  styling.  Can be tightened with a nonce if the build pipeline is updated.
- `connect-src 'none'` blocks all XHR/fetch — correct for a fully offline game.

For an Electron / Capacitor wrapper, set the CSP in the shell's manifest instead.

### 5b. External resource loads

| Resource | URL | Protocol | Assessment |
|----------|-----|----------|------------|
| Google Fonts CSS | `https://fonts.googleapis.com/...` | HTTPS | ✅ |
| Google Fonts preconnect | `https://fonts.gstatic.com` | HTTPS | ✅ |
| Game assets | `/assets/...` (relative) | Same-origin | ✅ |

No mixed content (HTTP resources loaded from an HTTPS page).

### 5c. Subresource Integrity (SRI)

The Google Fonts `<link>` tag does not include an `integrity` attribute.  Google
Fonts rotates its CDN URLs frequently, making static SRI hashes impractical.
This is an accepted industry trade-off for hosted font services.

---

## 6. Future-Proofing

### If leaderboards are added

- **Never trust client-submitted scores.**  Validate all values server-side:
  - Score must be within physically possible bounds per map/wave count.
  - Rate-limit submission per player account.
  - Sign scores with a per-session HMAC keyed by a server secret.
- Store only the final score, not the full game replay, unless you intend to
  validate the replay server-side.
- Use HTTPS (TLS 1.2+) for all leaderboard API calls.

### If multiplayer is added

- Authenticate every player action with a server-issued JWT / session token.
- Validate all game state transitions server-side (authoritative server model).
- Implement anti-cheat via statistical anomaly detection on action timings.
- Sanitize all player-supplied text (names, chat) against XSS and injection.
- Use WebSocket over TLS (`wss://`).
- Rate-limit all player action messages.

### If in-app purchases (IAP) are added

- **Mobile (iOS / Android):** Validate receipts server-side against Apple/Google
  receipt validation APIs.  Never grant entitlements based on client-only signals.
- **Web:** Integrate a payment provider (Stripe, etc.) with server-side webhook
  confirmation before granting access.
- Store currency grants atomically with idempotency keys to prevent duplicate
  credit on network retries.

---

## 7. Guards Checklist

| Check | Result |
|-------|--------|
| `npm audit` 0 critical/high | ✅ 0 vulnerabilities |
| `npm run typecheck` clean | ✅ |
| `npm run test` passes | ✅ |
| No `eval()` / `Function()` / `innerHTML` in game code | ✅ |
| No secrets in source or git history | ✅ |
| Source maps disabled in production | ✅ (explicit `sourcemap: false`) |
| `.env` files gitignored | ✅ |
| localStorage data validated on load | ✅ (`SaveManager._sanitize()`) |
| Tamper detection checksum | ✅ (djb2, casual cheat detection) |
| External resources use HTTPS | ✅ (Google Fonts) |
| No prototype pollution patterns | ✅ |
| No ReDoS-susceptible regex | ✅ |
| Error handling does not leak sensitive info | ✅ |
