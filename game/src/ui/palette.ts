/**
 * Ojibwe TD — Natural Colour Palette
 *
 * Central source of truth for all UI colours and typography.
 * Inspired by Northern Ontario: forest greens, granite greys,
 * lake blues, marsh tones, autumn golds, and ember reds.
 *
 * Numeric 0x values  → Phaser setFillStyle / setStrokeStyle
 * CSS '#rrggbb' strings → Phaser text style color / setColor
 */

export const PAL = {
  // ── Background fills (0x, for setFillStyle / rectangle) ────────────────────
  bgDark:             0x0d1208,   // deep forest — main scene bg         (was 0x0a0a0a)
  bgPanel:            0x141f0e,   // forest floor — panels & cards       (was 0x111111)
  bgPanelDark:        0x080f08,   // very dark — upgrade panel bg        (was 0x080f08)
  bgPanelLocked:      0x0c140a,   // locked stage / disabled tile        (was 0x0d0d0d)
  bgPanelHover:       0x1c2e12,   // tile hover state                    (was 0x1a2a1a)
  bgCard:             0x0d1a0d,   // offer / strategy card               (was 0x0d1520)
  bgCardHover:        0x162a0e,   // card hover                          (was 0x182a40)
  bgBossCard:         0x141e0c,   // boss offer card button              (was 0x1a1a2a)
  bgBossCardHover:    0x1c2c12,   // boss card hover                     (was 0x2a2a3e)
  bgBossPanel:        0x121a0f,   // boss panel centred card             (was 0x111118)
  bgStartBtn:         0x163010,   // start-game button                   (was 0x005500)
  bgStartBtnHover:    0x1f4015,   // start btn hover                     (was 0x007700)
  bgStartBtnPress:    0x0f2008,   // start btn press                     (was 0x003300)
  bgEndlessBtn:       0x091a09,   // endless mode button                 (was 0x001133)
  bgEndlessBtnHover:  0x0f2810,   // endless btn hover                   (was 0x002255)
  bgMetaBtn:          0x0f1a10,   // meta/upgrades button                (was 0x111133)
  bgBtnHover:         0x333333,   // generic button hover                (neutral grey)
  bgSpeedBtn:         0x222222,   // inactive speed button               (neutral grey)
  bgSpeedBtnActive:   0x163010,   // active 1× speed button              (was 0x005500)
  bgSpeedBtnFast:     0x0a1a28,   // active 2× speed button              (was 0x004488)
  bgNextWave:         0x122010,   // next-wave HUD button                (was 0x004400)
  bgUpgradeBuy:       0x001a00,   // upgrade buy button                  (was 0x002200)
  bgUpgradeBuyHover:  0x002800,   // upgrade buy hover                   (was 0x004400)
  bgGiveUp:           0x220000,   // give-up danger button               (kept)
  bgGiveUpHover:      0x3a0000,   // give-up hover                       (was 0x440000)
  bgAbilityBtn:       0x1a1822,   // commander ability button            (was 0x222244)
  bgAbilityBtnHover:  0x262440,   // ability button hover                (was 0x333366)
  bgNextWaveHover:    0x1c341a,   // next-wave button hover              (was 0x006600)
  bgCantAfford:       0x331111,   // tower panel — can't afford hover    (was 0x331111)
  bgLockedOverlay:    0x220000,   // locked-path overlay                 (kept)
  bgLockedBtn:        0x1a0000,   // locked buy button fill              (kept)
  bgPlacementValid:   0x2a8020,   // tower placement — valid tile        (was 0x00ff00)
  bgPlacementInvalid: 0xaa2800,   // tower placement — invalid tile      (was 0xff0000)

  // ── Borders (0x, for setStrokeStyle second arg) ─────────────────────────────
  borderInactive:     0x2D5016,   // pine shadow — inactive borders      (was 0x225522/0x224422)
  borderActive:       0x4a6e28,   // marsh — selected / active           (was 0x00ff44)
  borderPanel:        0x334433,   // panel / separator lines             (was 0x334433)
  borderDanger:       0x993333,   // respec / danger warning             (was 0x884444)
  borderGiveUp:       0x993322,   // give-up button border               (was 0xcc2222)
  borderBoss:         0xb83020,   // boss panel border                   (was 0xff4422)
  borderEndless:      0x2a6040,   // endless button border               (was 0x226688)
  borderMeta:         0x2D4050,   // meta / upgrades button border       (was 0x335577)
  borderCodex:        0x336633,   // codex button border                 (kept)
  borderUpgBuy:       0x226622,   // upgrade buy button border           (kept)
  borderSpeedActive:  0x4a6e28,   // active speed button border          (was 0x00ff44)
  borderSpeedFast:    0x2a6088,   // 2× fast button border               (was 0x0088ff)
  borderNextWave:     0x4a6e28,   // next-wave button (normal)           (was 0x00ff44)
  borderNextWaveEnd:  0x4A7FA5,   // next-wave button (endless)          (was 0x44aaff)
  borderAbility:      0x4a4880,   // ability button border               (was 0x6666cc)
  borderNeutral:      0x444444,   // neutral grey — inactive borders     (kept)
  borderLocked:       0x333333,   // locked element border               (kept)
  borderBossCard:     0x445566,   // boss card inactive border           (kept)
  borderLockedBtn:    0x442222,   // locked buy button stroke            (kept)

  // ── CSS colour strings (text style / setColor) ──────────────────────────────
  accentGreen:        '#6B8F3E',  // marsh green — active elements       (was '#00ff44')
  accentBlue:         '#4A7FA5',  // lake blue — info / endless          (was '#44aaff' / '#00ff88')
  accentBlueLight:    '#88b8d4',  // lighter lake blue — hover text      (was '#88ccff')
  textPrimary:        '#a8c070',  // soft leaf — main labels             (was '#00ff44' text)
  textSecondary:      '#7a9e52',  // mid leaf — subtitles                (was '#44aa44')
  textDim:            '#4a6130',  // moss — hints / footnotes            (was '#446644')
  textMuted:          '#7a9a70',  // muted — region subtitles etc.       (was '#556655')
  textFaint:          '#556b4a',  // faint — season labels, watermarks   (was '#334433')
  textDesc:           '#778877',  // description / sub-labels            (kept)
  textLocked:         '#444444',  // locked element name                 (kept)
  textLockedDim:      '#333333',  // locked description text             (kept)
  textLockWarning:    '#664422',  // lock-cost warning (amber)           (kept; earthy)
  textCardDesc:       '#9aabb8',  // offer card description (cool grey)  (was '#99aabb')
  textNeutral:        '#aaaaaa',  // neutral grey — wave text, subtitles (kept)
  textInactive:       '#888888',  // inactive speed buttons              (kept)
  textDisabled:       '#444444',  // disabled / greyed-out elements      (kept)
  textAbility:        '#aaaaff',  // ability button label (slight purple) (kept)
  textBossCardLabel:  '#d4a840',  // boss offer card label               (was '#ffcc44')
  gold:               '#c8952a',  // autumn gold — economy               (was '#ffcc00')
  danger:             '#cc3333',  // deep crimson — lives / danger       (was '#ff4444')
  dangerWarm:         '#c05030',  // warm crimson — lives <= 10          (was '#ff6600')
  dangerLight:        '#dd5555',  // danger hover text (lighter crimson) (was '#ff6666')
  bossWarning:        '#b83020',  // dark crimson — boss announcements   (was '#ff4422')
  waveWarning:        '#c04020',  // boss wave label crimson             (was '#ff8844')

  // ── Numeric equivalents (Graphics.fillStyle / stroke) ───────────────────────
  accentGreenN:       0x6B8F3E,
  accentBlueN:        0x4A7FA5,
  goldN:              0xc8952a,
  dangerN:            0xcc3333,
  bossWarningN:       0xb83020,
  waveWarningN:       0xc04020,
  lockedPipN:         0x441111,   // locked upgrade tier pip

  // ── Rarity tier colours ──────────────────────────────────────────────────────
  rarityCommon:       '#8a8a7a',  // stone grey
  rarityUncommon:     '#6B8F3E',  // marsh green  (= accentGreen)
  rarityRare:         '#4A7FA5',  // lake blue    (= accentBlue)
  rarityEpic:         '#9a6eb0',  // swan lavender
  rarityLegendary:    '#c8952a',  // autumn gold  (= gold)
  rarityCommonN:      0x8a8a7a,
  rarityUncommonN:    0x6B8F3E,
  rarityRareN:        0x4A7FA5,
  rarityEpicN:        0x9a6eb0,
  rarityLegendaryN:   0xc8952a,

  // ── Commander role border colours (numeric, for portrait ring) ─────────────
  cmdSustain:         0x4a8848,   // Nokomis — leafy green
  cmdPrecision:       0x4a7fa5,   // Bizhiw — lake blue
  cmdBurst:           0xc0881e,   // Animikiikaa — lightning amber
  cmdDamage:          0xcc3333,   // Makoons — deep crimson
  cmdEconomy:         0xc8952a,   // Oshkaabewis — autumn gold
  cmdResilience:      0x9a6eb0,   // Waabizii — swan lavender
  cmdDefault:         0x4a6e28,   // fallback — marsh green

  // ── Typography ──────────────────────────────────────────────────────────────
  fontTitle:  'Cinzel, Georgia, serif',   // display headers (OJIBWE TD, VICTORY)
  fontBody:   '-apple-system, "Helvetica Neue", Arial, sans-serif',  // legible on mobile
} as const;

/** Map a commander role string (case-insensitive) to its PAL.cmd* border colour. */
export function roleBorderColour(role: string): number {
  switch (role.toLowerCase()) {
    case 'sustain':    return PAL.cmdSustain;
    case 'precision':  return PAL.cmdPrecision;
    case 'burst':      return PAL.cmdBurst;
    case 'damage':     return PAL.cmdDamage;
    case 'economy':    return PAL.cmdEconomy;
    case 'resilience': return PAL.cmdResilience;
    default:           return PAL.cmdDefault;
  }
}
