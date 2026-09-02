# Handoff: Locked In — Two-Player Competitive Gym Tracker

## Overview
"Locked In" is a mobile gym-workout tracker for exactly **two users** (the app owner and his brother). Unlike general-purpose trackers, its entire product thesis is head-to-head competition: every screen answers "who is more locked in this week?" Users log resistance-training sessions manually, and the app scores them against each other on streak, consistency, volume, session length, and PRs — surfacing the comparison through charts, a weekly leaderboard, badges, and a "roast mode" that generates smack-talk copy about whoever is behind.

Scope decisions already made with the user:
- **Two users only.** No signup funnel, no social graph, no friend discovery. Two fixed accounts ("You" and "Bro") is a valid hard assumption.
- **Manual logging only for v1.** Fitbit/Google Fit auto-sync was explicitly deferred. See "Deferred: device sync" below.
- **Tone: full smack-talk / roast mode.** Copy is intentionally aggressive and teasing. This is a feature, not a placeholder.
- **Mobile app feel.** Designed at 390×844 (iPhone 14/15 logical resolution) inside a device frame.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that demonstrate intended look, layout, and behavior. They are **not production code to copy directly.**

The task is to **recreate these designs in the target codebase's existing environment**, using its established patterns, component library, navigation, and state management. If no app environment exists yet, choose the most appropriate framework for a two-user mobile fitness app (React Native / Expo is a natural fit, and matches the reference repo ecosystem) and implement the designs there.

Do not ship the HTML. Do not port the custom template syntax (`sc-for`, `sc-if`, `{{ }}` holes, `renderVals()`) — those are artifacts of the prototyping environment. Read them as "this is a list", "this is conditional", "this value is computed."

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, and icon treatment are final and intentional. Recreate the UI pixel-perfectly using the codebase's existing primitives. Exact values are in **Design Tokens** below.

Two caveats:
- All numbers in the prototype are **demo data** (14-day streak, 48.2K lb, W28–W35, etc.). They exist to make the charts legible and to show the roast copy in both directions. Replace with real computed values.
- The chart geometry in the prototype is **hand-authored SVG polylines with hardcoded point coordinates**. In production these must be computed from real data by a charting library. Match the visual result (stroke weight, colors, dashed = Bro, area fill under Your line, endpoint dots), not the literal coordinates.

## Source / Prior Art
The user vendored an open-source base for reference and exercise data: **Snouzy/workout-cool** (MIT, v1.3.2), snapshotted at `gym-tracker/` on branch `claude/gym-tracker-research-r0vfr9` of `albinjoby82-ops/MyPortfolio`. See `gym-tracker/PROVENANCE.md` in that repo. The user's plan is to move this to a dedicated repo when able — it currently lives on a side branch of their portfolio repo specifically to keep it separate.

Useful things in that base: exercise database structure, muscle-group taxonomy, equipment enumeration, and the equipment icon PNGs (which this design uses as artwork). Other public references reviewed during planning: **Liftosaur** (astashov/liftosaur — local-first, React Native + SQLite; good patterns for set/rep logging and progression) and **Kenko** (Android/Material You).

## Screens / Views

The app is a 4-tab mobile application. Tab bar is persistent and fixed at the bottom. A persistent app header sits at the top of every screen.

---

### Persistent chrome

**App header** (all screens)
- Layout: horizontal flex, `space-between`, align center. Padding `60px 18px 10px` (the 60px top clears the iOS status bar / notch — in a real app, use safe-area insets instead of a magic number). Bottom border `1px solid #2E3138`.
- Left cluster: horizontal flex, `gap: 9px`.
  - Logo mark: 22×22, `border-radius: 6px`, background cyan `#3EC9E0`. Inside it a tiny barbell glyph drawn from three dark bars (a 10×3 center bar with two 3×9 vertical end bars at `left:-3px` / `right:-3px`, all `#22262C`, `border-radius: 1px`). In production, replace with a real icon asset.
  - Wordmark: "LOCKED IN", Barlow Condensed 800, 18px, `letter-spacing: 0.5px`, `#F4F4F5`.
- Right cluster: horizontal flex, `gap: 8px`.
  - Streak pill: background `#33383F`, `border-radius: 999px`, padding `5px 11px`, flex `gap: 6px`. Contains an upward triangle (CSS border trick: 4px transparent left/right, 8px cyan `#3EC9E0` bottom) and the streak count "14" at 11px/700 `#D3D5D8`.
  - Avatar: 28×28 circle, background cyan `#3EC9E0`, containing "Y" in Barlow Condensed 800 14px, dark `#22262C`.

**Tab bar** (all screens)
- Layout: horizontal flex, `justify-content: space-around`, align center. Padding `10px 8px 22px` (the 22px bottom is home-indicator clearance — use safe-area inset). Background `#282C32`, top border `1px solid #2E3138`.
- Four items, each a vertical flex, `gap: 5px`, centered, cursor pointer. Label 10px/700. Active color cyan `#3EC9E0`; inactive `#7B7F87`. Icon inherits the same color.
- Icons are drawn in CSS in the prototype — **replace all four with real icon assets** in production:
  1. **DASHBOARD** — 2×2 grid of 4 squares, 16×16 total, `gap: 2px`, `border-radius: 1px` each.
  2. **LOG** — 18×18 circle, `2px` border, with a plus inside (two 8×2 / 2×8 bars).
  3. **HISTORY** — 16×16 rounded square (`border-radius: 3px`, `2px` border) with a 3px filled bar across the top (calendar header).
  4. **BOARD** — three bottom-aligned bars 4px wide, heights 8 / 14 / 16px, `gap: 2px`, `border-radius: 1px`.
- Tapping a tab swaps the scrolling content region. The header and tab bar do not change.

**Content region**
- `flex: 1`, `overflow-y: auto`, between header and tab bar. Each screen's content is padded `14px 16px 20px` and laid out as a vertical flex with `gap: 14px` (Log uses `gap: 12px`).
- Scrollbars are hidden (`::-webkit-scrollbar` zeroed). Native mobile scroll behavior is expected.

---

### 1. Dashboard — "who's winning right now"

**Purpose:** At a glance, see the current week's head-to-head standing across every tracked metric.

**Components, top to bottom:**

**a) Roast banner** (conditional on roast mode)
- Horizontal flex, `gap: 10px`, align center. Background `rgba(122,46,32,0.35)` (a desaturated red at 35% alpha), border `1px solid rgba(168,63,44,0.5)`, `border-radius: 12px`, padding `10px 12px`.
- Trophy PNG 24×24, `object-fit: contain`.
- Text 12px/800, `letter-spacing: 0.2px`, warm red `#E8917C`.
- Copy flips on who is leading: leading → "BRO IS GETTING COOKED THIS WEEK"; trailing → "YOU'RE SLIPPING — BRO'S PULLING AHEAD".

**b) Hero versus card**
- Background `#2B2F36`, `border-radius: 20px`, padding `18px 16px`, vertical flex `gap: 14px`.
- Header row: `space-between`. Left "WEEK 35 · GOAL 5 SESSIONS", right "MON–SUN". Both 11px/700, `letter-spacing: 1.4px`, `#7B7F87`.
- Center row: `justify-content: space-around`, three columns.
  - **You column** (vertical flex, gap 8px, centered): a 74×74 SVG progress ring — track `circle r=32` stroke `#383D45` `stroke-width: 6`; progress `circle r=32` stroke cyan `#3EC9E0` `stroke-width: 6` `stroke-linecap: round` `stroke-dasharray: 201` `stroke-dashoffset: 0` (= 5/5 complete) rotated `-90deg` about center. Absolutely centered inside: count "5" in Barlow Condensed 800 24px `#8FE3F0`, and "OF 5" 9px/700 `#7B7F87`. Below the ring: "YOU" 11px/800 `letter-spacing: 1px` cyan; then the hero metric value in Barlow Condensed 800 30px `#B8ECF4`.
  - **Divider column:** "VS" Barlow Condensed 800 15px `#6B6F77`, above a 1×70 vertical rule `#2E3138`.
  - **Bro column:** identical structure, orange `#E08A4A`, ring `stroke-dashoffset: 80` (= 3/5), count "3", value `#EDBE93`.
  - Ring math: circumference at r=32 is ~201. `dashoffset = 201 × (1 − completed/goal)`. Compute this, don't hardcode.
- Footer: hero metric unit, centered, 10px/700, `letter-spacing: 1.4px`, `#7B7F87`. Reads "DAY STREAK" or "LB LIFTED THIS WEEK" depending on the selected primary metric.

**c) Timeframe segmented control**
- Horizontal flex, `gap: 8px`, three equal-width (`flex: 1`) pills: WEEK / MONTH / YEAR.
- Selected: background `#383D45`, text `#EAEBEC`, 11px/800. Unselected: background `#282C32`, text `#7B7F87`, 11px/700. Both `border-radius: 999px`, padding 7px, centered, `letter-spacing: 0.6px`.
- **Not wired in the prototype.** In production this should re-scope every chart and stat below it.

**d) Volume trend chart (area + line)**
- Card: `#2B2F36`, `border-radius: 16px`, padding `16px 14px 12px`, vertical flex `gap: 12px`.
- Header: left cluster = a tiny 3-bar cyan glyph (3px wide bars, heights 6/10/13px, gap 2px) + "VOLUME TREND" 12px/800 `letter-spacing: 0.6px`; right = "8 WEEKS · LB" 10px/700 `#7B7F87`.
- SVG `viewBox="0 0 320 130"`, full width, 130px tall:
  - 4 horizontal gridlines at y = 10 / 45 / 80 / 115. Top three `#2A2E34`, baseline (115) `#2E3138`, all `stroke-width: 1`.
  - **You:** filled area path (cyan `#3EC9E0` at `fill-opacity: 0.14`) closed to the baseline, plus a `polyline` stroke cyan, `stroke-width: 2.5`, round caps and joins. Endpoint marked with `circle r=4` cyan.
  - **Bro:** same construction in orange `#E08A4A`, `fill-opacity: 0.12`, and the stroke is **dashed** (`stroke-dasharray: "5 4"`). Endpoint `circle r=4` orange.
  - Dashed = Bro is a convention used consistently across every line chart in the app.
- X-axis labels below: 8 evenly spaced week labels ("W28"…"W35"), `space-between`, 9px/700 `#6B6F77`.
- Legend: horizontal flex `gap: 14px`; each entry is a 14×3 rounded color swatch + label 10px/700 `#9EA2A9` ("YOU 48.2K", "BRO 39.1K").

**e) Sessions per week (grouped bar chart)**
- Card as above, padding `16px 14px`, `gap: 14px`.
- Header: "SESSIONS PER WEEK" 12px/800; right "GOAL 5" 10px/700 `#7B7F87`.
- Plot: horizontal flex `space-between`, height 96px, bottom border `1px solid #2E3138`. Six week groups. Each group is a bottom-aligned pair of bars: 9px wide, `gap: 3px`, `border-radius: 3px 3px 0 0`, cyan (You) and orange (Bro). Bar height = `sessions × 15px` within a 76px well.
- X labels: six week labels, 9px/700 `#6B6F77`, `space-between`, padding `0 8px`.

**f) Muscle split (paired horizontal bars with equipment art)**
- Card as above, `gap: 12px`. Header "MUSCLE SPLIT · SETS THIS WEEK" 12px/800.
- One row per muscle group (CHEST, BACK, LEGS, SHOULDERS, ARMS). Row = horizontal flex, `gap: 10px`, align center:
  - Icon tile: 34×34, `border-radius: 9px`, background `#383D45`, centered; contains a 20×20 equipment PNG, `object-fit: contain`, `filter: brightness(1.3)`.
  - Right side (`flex: 1`, vertical flex `gap: 4px`): label row `space-between` 10px/700 `#9EA2A9` — muscle name on the left, "you · bro" set counts on the right. Below it two side-by-side bar tracks (`flex: 1` each, `gap: 3px`): 6px tall, `border-radius: 3px`, track `#1E2126`, fills cyan and orange, width = percentage of the max across all rows.

**g) Stat comparison rows** (5 cards, vertical flex `gap: 10px`)
- Metrics: STREAK, WORKOUTS THIS WEEK, VOLUME LIFTED, AVG SESSION, PRs THIS MONTH.
- Each card: `#2B2F36`, `border-radius: 14px`, padding `13px 14px`, vertical flex `gap: 8px`.
- Header row `space-between`, 11px/700 `#9EA2A9`: left = an 8×8 diamond (square rotated 45°, `border-radius: 2px`) tinted with the *leader's* color + the metric label; right = the lead delta ("YOU +8", "BRO +1") at 10px in the leader's color.
- Two bar rows (You then Bro): 16px letter column ("Y"/"B", 11px/800, in that player's color) → `flex: 1` track (8px tall, `border-radius: 4px`, background `#1E2126`, fill in player color, width = value/max %) → 58px right-aligned value label 12px/700.
- The leader color and delta must be **computed** per metric — note PRs THIS MONTH intentionally shows Bro ahead (4 vs 5), proving the UI handles either leader per-row.

---

### 2. Log — active workout logging

**Purpose:** Record sets during a live session with minimum taps.

**a) Session header**
- `space-between`, align center. Left: workout name "PUSH DAY A" Barlow Condensed 800 22px `line-height: 1.1`; beneath it "4 exercises · 9 sets planned" 11px `#7B7F87`, `margin-top: 3px`.
- Right: horizontal flex `gap: 8px` — elapsed-time pill (background `#33383F`, `border-radius: 999px`, padding `7px 13px`, "32:14" 13px/800 `#E5E6E8`) and a **FINISH** button (background cyan `#3EC9E0`, `border-radius: 999px`, padding `7px 14px`, 12px/800, dark text `#22262C`).

**b) Rest timer card**
- `#2B2F36`, `border-radius: 14px`, padding `12px 14px`, vertical flex `gap: 8px`.
- Row `space-between`: left = a 16×16 cyan-bordered circle with a 2×6 hand inside (clock glyph — replace with a real icon) + "REST TIMER" 11px/800 `letter-spacing: 0.6px` `#D3D5D8`; right = "0:47" Barlow Condensed 800 17px `#8FE3F0`.
- Progress bar: 6px tall, `border-radius: 3px`, track `#1E2126`, cyan fill (52% in the mock = elapsed fraction of the rest interval).
- Should count down live and ideally fire a haptic/sound at zero.

**c) Exercise cards** (one per exercise)
- Card: `#2B2F36`, `border-radius: 16px`, padding 14px, vertical flex `gap: 11px`.
- **Exercise header row** (horizontal flex, `gap: 11px`, align center):
  - Thumbnail tile: 48×48, `border-radius: 12px`, background `#383D45`, centered; 32×32 equipment PNG, `object-fit: contain`, `filter: brightness(1.3)`.
  - Middle (`flex: 1`, `min-width: 0`): exercise name 14px/700; below it a chip row (`gap: 5px`, `margin-top: 5px`) with a muscle chip and an equipment chip — background `#383D45`, `border-radius: 5px`, padding `2px 7px`, 9px/800, `letter-spacing: 0.5px`, `#B0B4BA`.
  - Sparkline: 52×26 SVG, cyan `polyline`, `stroke-width: 2`, round caps/joins — the trend of this exercise's top set over recent sessions.
- **Set table header:** horizontal flex, 9px/800, `letter-spacing: 0.5px`, `#767A82`, padding `0 4px`. Columns: SET (30px) / PREV (66px) / LB (flex 1) / REPS (flex 1) / DONE (28px, right-aligned).
- **Set rows** (vertical flex `gap: 5px`): each row is a horizontal flex, padding `7px 4px`, `border-radius: 9px`.
  - Row background encodes completion: completed → `rgba(46,116,132,0.35)` (cyan-tinted); incomplete → `rgba(48,52,58,0.6)`.
  - **SET badge:** 19×19, `border-radius: 6px`, 10px/800. Working sets → background `#383D45`, text `#B0B4BA`, numbered 1,2,3. **Warmup sets → background `#5C4A21`, text `#EBC66A`, labeled "W".**
  - **PREV:** last session's result for that set, e.g. "185 × 5" or "BW+35 × 8", 11px `#7B7F87`. This is the key progressive-overload affordance.
  - **LB / REPS:** 14px/700 values. In production these must be **editable numeric inputs** (tap to edit, numeric keypad) — the prototype renders them as static text.
  - **DONE:** a 20×20 tappable checkbox, `border-radius: 7px`, `2px` border. Unchecked → border `#5B6068`, transparent fill. Checked → border and fill cyan `#3EC9E0`. **This is wired in the prototype** — tapping toggles the set's completed state, which also repaints the row background. Completing a set should start the rest timer.
- **ADD SET row:** full-width, centered horizontal flex `gap: 6px`, padding 7px, `border-radius: 9px`, background `#303439`, plus glyph + "ADD SET" 11px/800 `letter-spacing: 0.5px` `#9EA2A9`.

**d) ADD EXERCISE row**
- `2px dashed #383E46` border, `border-radius: 16px`, padding 18px, centered flex `gap: 9px`. Plus glyph (14×14, two 4px-thick bars) + "ADD EXERCISE" 13px/800 `#7B7F87`.
- Should open an exercise picker backed by the workout-cool exercise database (searchable, filterable by muscle and equipment).

**Demo content in the prototype** (replace with real data, but note the shape): Barbell Bench Press (chest/barbell — warmup 135×8, then 185×5, 185×5, 190×4), Incline Dumbbell Press (upper chest/dumbbell — 70×8, 70×7), Weighted Dip (triceps/bodyweight — 45×8, 45×7, PREV shown as "BW+35 × 8"), Cable Fly (chest/band — 40×12).

---

### 3. History — calendar and past sessions

**Purpose:** Review consistency over time and inspect completed sessions.

**a) Month header**
- `space-between`. Left "AUGUST 2026" Barlow Condensed 800 22px. Right: two 26×26 nav buttons, `border-radius: 8px`, background `#33383F`, containing ‹ and › at 14px/700 `#B0B4BA`. Not wired — should page the month.

**b) Month summary tiles**
- Horizontal flex `gap: 8px`, three equal tiles (`flex: 1`): `#2B2F36`, `border-radius: 12px`, padding `11px 12px`.
- Each: big value Barlow Condensed 800 20px `#8FE3F0`, then a 9px/800 `letter-spacing: 0.6px` `#7B7F87` caption with `margin-top: 2px`. Values: 21 SESSIONS / 196K LB MOVED / 18H UNDER BAR.

**c) Calendar heatmap**
- Card `#2B2F36`, `border-radius: 16px`, padding 14px.
- Weekday header: 7-column grid, `gap: 4px`, labels S M T W T F S, centered, 9px/800 `#6B6F77`, `margin-bottom: 7px`.
- Day grid: 7-column grid, `gap: 4px`, 35 cells (leading blanks for month offset, then 1–31, then trailing blanks). Each cell: 36px tall, `border-radius: 8px`, vertical flex centered `gap: 3px` — day number 10px/700 `#BCBFC4`, and below it up to two 5px dots (cyan for You, orange for Bro) in a horizontal flex `gap: 2px`.
- **Cell background encodes density:** both trained → `#41464E`; one trained → `#33383F`; neither → transparent.
- Legend below (`margin-top: 12px`, `gap: 16px`): 8px dot + "YOU · 21 DAYS" / "BRO · 10 DAYS", 10px/700 `#94989F`.

**d) Bodyweight trend chart**
- Card as elsewhere, `gap: 12px`. Header "BODYWEIGHT TREND" 12px/800.
- SVG `viewBox="0 0 320 96"`, 96px tall. Gridlines at y = 20 / 55 / 90 (baseline `#2E3138`, others `#2A2E34`). Two `polyline`s, `stroke-width: 2.5`, round caps/joins: cyan solid (You, trending up) and orange dashed `5 4` (Bro, flat). **No area fill on this chart** — line-only, which distinguishes it from the volume chart.
- X labels: WK1…WK6, NOW — 9px/700 `#6B6F77`.

**e) Recent sessions list**
- Section label "RECENT SESSIONS" 11px/800 `letter-spacing: 1.2px` `#7B7F87`; list vertical flex `gap: 8px`.
- Each row: `#2B2F36`, `border-radius: 14px`, padding 12px, horizontal flex `gap: 11px`, align center.
  - Icon tile 42×42, `border-radius: 11px`, background `#383D45`, with a 26×26 equipment PNG (`brightness(1.3)`) chosen to match the session type.
  - Body (`flex: 1`, `min-width: 0`, vertical flex `gap: 3px`): title row `space-between` — workout name 13px/700, and the owner tag ("YOU"/"BRO") 10px/800 in that player's color. Then a meta line "AUG 29 · 54 MIN · 12,400 LB" 10px `#7B7F87`. Then, when roast mode is on, a roast tag 10px `#D18A72`, `margin-top: 1px`.
- Demo rows show the tone: "New PR on bench — 190 × 4", "Skipped legs. Again.", "6th day in a row", "\"Rest day\" #2 this week", "Kettlebell finisher survived". Roast tags should be **generated from the session's actual data** (a skipped muscle group, a short session, a broken streak, a new PR), not stored strings.

---

### 4. Board — leaderboard and season standing

**Purpose:** The scoreboard. Who is winning the week, and the season.

**a) Header**
- Horizontal flex `gap: 12px`, align center. Trophy PNG 42×42. Right: "WEEKLY LEADERBOARD" Barlow Condensed 800 22px `line-height: 1.1`, and "Season 1 · Week 35 of 52" 11px `#7B7F87`, `margin-top: 2px`.

**b) Rank cards** (2 cards, ordered by points)
- Card `#2B2F36`, `border-radius: 16px`, padding `15px 14px`, vertical flex `gap: 12px`, plus a `1px` border: the **leader** gets a colored border in their own hue (`rgba(...,0.6)` — cyan if You lead, orange if Bro leads); second place gets `transparent`.
- Top row (horizontal flex `gap: 11px`, align center):
  - Rank badge: 34×34 circle in that player's color, containing "#1"/"#2" Barlow Condensed 800 14px in dark `#22262C`.
  - Middle (`flex: 1`): name 15px/700; record line "6 wins · 2 losses this season" 10px `#7B7F87`, `margin-top: 2px`.
  - Right, right-aligned: points Barlow Condensed 800 26px `line-height: 1` in the player's color, and "POINTS" 9px/800 `letter-spacing: 0.6px` `#7B7F87`.
- Breakdown rows (vertical flex `gap: 6px`): 78px label column 9px/800 `letter-spacing: 0.4px` `#7B7F87` (STREAK / VOLUME / CONSISTENCY / PRs HIT) → `flex: 1` track 6px tall `border-radius: 3px` background `#1E2126` with a fill in the player's color → 24px right-aligned value 11px/700.
- Weekly points in the mock: 245 vs 198. **The points formula is not defined yet** — see Open Questions.

**c) Season points race (cumulative line chart)**
- Card, `gap: 12px`. Header `space-between`: "SEASON POINTS RACE" 12px/800; "CUMULATIVE" 10px/700 `#7B7F87`.
- SVG `viewBox="0 0 320 110"`, 110px tall. Gridlines y = 15 / 55 / 98 (baseline `#2E3138`). You: cyan area fill `fill-opacity: 0.13` + solid cyan `polyline` `stroke-width: 2.5`; Bro: orange dashed `polyline` (no fill). Endpoint `circle r=4` on each. Both curves are monotonically increasing (cumulative), with You pulling away.
- X labels W28…W35, 9px/700 `#6B6F77`.

**d) Weekly win record strip**
- Card, `gap: 11px`. Header "WEEKLY WIN RECORD" 12px/800.
- Horizontal flex `gap: 5px`, 8 equal cells (`flex: 1`). Each cell: a 30px-tall block, `border-radius: 7px`, centered letter Barlow Condensed 800 14px — "Y" weeks use background `#2C5866` / text `#8FE3F0`; "B" weeks use background `#5B3A22` / text `#EDB183`. Beneath each, the week label 8px/700 `#6B6F77`.
- Summary line below: "You lead the season 6–2" 11px/700 `#94989F`.
- The pattern and summary must derive from real weekly results.

**e) Badges**
- Card, `gap: 11px`. Header "BADGES EARNED" 12px/800.
- Wrapping horizontal flex `gap: 8px` of pills: background `#383D45`, `border-radius: 999px`, padding `6px 12px 6px 7px`, horizontal flex `gap: 7px`, align center. Each pill = a 20px circle in the earner's color with a single initial (Barlow Condensed 800 11px, dark text) + the badge label 10px/800 `letter-spacing: 0.3px` `#C8CACE`.
- Demo badges: 14-DAY STREAK (You), 50K CLUB (You), 5 PRs IN A MONTH (Bro), NEVER SKIPS LEGS (You), EARLY BIRD ×10 (Bro). The circle color indicates who earned it — a real implementation needs a badge definition table with unlock criteria.

**f) Roast quote** (conditional on roast mode)
- Background `rgba(122,46,32,0.3)`, border `1px solid rgba(168,63,44,0.5)`, `border-radius: 14px`, padding `13px 14px`, 12px italic `#E8917C`.
- Flips with standing: leading → "\"Better luck next week, bro.\" — You, definitely not gloating"; trailing → "\"It's not about the points.\" — You, down 47 points".

## Interactions & Behavior

**Wired in the prototype:**
- **Tab navigation** — tapping any of the 4 tab items swaps the content region and recolors the active icon/label to cyan. No transition animation in the mock; a standard platform tab transition is fine.
- **Set completion toggle** — tapping a set's DONE checkbox flips `completed`. This drives two visual changes: the checkbox fills cyan, and the row background shifts to the cyan-tinted state. State is local and immediate (optimistic).

**Specified but not wired — implement these:**
- **Timeframe segmented control** (WEEK/MONTH/YEAR) should re-scope the dashboard's charts and stats.
- **Month pagination** (‹ ›) on History.
- **FINISH** on Log should end the session, compute volume/duration/PRs, write the session record, award points and any badges, and route to a summary.
- **ADD SET / ADD EXERCISE** should append rows; ADD EXERCISE opens a searchable exercise picker.
- **LB and REPS fields** must become editable numeric inputs with a numeric keypad.
- **Rest timer** should count down live from the configured interval, auto-start on set completion, and alert at zero.
- **Session rows** on History should open a session detail view.
- **Pull-to-refresh** on Dashboard and Board to re-pull the other player's data.

**Suggested behavior not in the mock:** completing a set that beats the PREV value should visibly celebrate (PR flash on the row), since PRs feed the points system.

**Responsive:** designed for a single mobile width (390px). Layout is entirely flex/grid with percentage bar fills, so it adapts to 360–430px without change. Charts use `viewBox` + `width: 100%`, so they scale. If a tablet or web target matters, the single column should become a two-column dashboard — not designed yet.

## State Management

**Navigation:** `screen: 'dashboard' | 'log' | 'history' | 'leaderboard'`.

**Active session (Log):** an ordered list of exercises, each `{ name, muscle, equipment, iconKey, sets: [...] }`; each set `{ label ('W' or index), prevWeight, prevReps, weight, reps, completed, isWarmup }`. Plus session-level `startedAt`, elapsed time, and rest-timer state `{ running, remaining, interval }`. The prototype mutates sets immutably (map/spread) — keep that discipline. Persist in-progress sessions locally so a crash or backgrounding doesn't lose a workout.

**Display prefs (props in the prototype, settings in production):**
- `primaryMetric: 'streak' | 'volume'` — which metric fills the hero card and its unit label.
- `roastMode: boolean` — shows/hides the roast banner, per-session roast tags, and the roast quote.
- `leaderIsYou: boolean` — **prototype-only demo affordance** to preview both standings. In production this is derived from real points, never a setting.

**Derived values (computed, never stored):** every percentage bar width, ring `stroke-dashoffset`, per-metric leader and delta, leaderboard ordering and border color, roast copy selection, calendar cell density background, muscle-split max normalization.

**Data requirements:** both users' sessions must be readable by both — this is inherently a shared-backend app (or a synced local-first store). A local-only design cannot satisfy the head-to-head premise. Needed per user: session log with sets, bodyweight entries, weekly point totals, badge unlocks, and streak state. Weekly rollups should be computed server-side or cached, since every screen reads them.

## Deferred: device sync
The user asked about auto-logging steps/activity from a Fitbit (Google-owned) device. **Intentionally excluded from v1** and no UI was designed for it. When it comes back:
- Fitbit's Web API requires OAuth 2.0 with a server-side token exchange and refresh — it cannot be done from a static/client-only frontend. A backend service is required.
- Plan for: an OAuth connect flow, encrypted token storage, refresh handling, a periodic or webhook-driven sync job, and a per-user "last synced" state with reconnect/error handling.
- Steps and active minutes were both listed by the user as competition metrics, so the points formula should be designed with a slot for device-sourced metrics even before sync exists.

## Design Tokens

**Colors** (the design was authored in oklch; hex equivalents given for implementation — prefer these hex values)
| Role | Hex | oklch (as authored) |
|---|---|---|
| App background / deep well | `#1E2126` | `oklch(0.13 0.012 258)` |
| Screen background | `#22262C` | `oklch(0.16 0.014 258)` |
| Tab bar / recessed surface | `#282C32` | `oklch(0.19 0.015 258)` |
| Card surface | `#2B2F36` | `oklch(0.21 0.016 258)` |
| Card surface (raised / chip) | `#383D45` | `oklch(0.26 0.018 258)` |
| Pill / control surface | `#33383F` | `oklch(0.24 0.02 258)` |
| Hairline border | `#2E3138` | `oklch(0.28 0.018 258)` |
| Gridline (subtle) | `#2A2E34` | `oklch(0.24 0.016 258)` |
| Text primary | `#F4F4F5` | `oklch(0.96 0.004 258)` |
| Text secondary | `#B0B4BA` | `oklch(0.7 0.01 258)` |
| Text tertiary | `#9EA2A9` | `oklch(0.65 0.01 258)` |
| Text muted | `#7B7F87` | `oklch(0.55 0.012 258)` |
| Text faint | `#6B6F77` | `oklch(0.45–0.5 0.01 258)` |
| **You / primary accent (cyan)** | `#3EC9E0` | `oklch(0.78 0.15 200)` |
| You accent light (numerals) | `#8FE3F0` | `oklch(0.88 0.1 200)` |
| You accent pale (hero value) | `#B8ECF4` | `oklch(0.9 0.06 200)` |
| **Bro / secondary accent (orange)** | `#E08A4A` | `oklch(0.74 0.16 45)` |
| Bro accent light | `#EDBE93` | `oklch(0.86 0.08–0.1 45)` |
| Roast surface | `rgba(122,46,32,0.3–0.35)` | `oklch(0.28 0.07 25 / 0.3–0.35)` |
| Roast border | `rgba(168,63,44,0.5)` | `oklch(0.4 0.1 25 / 0.5)` |
| Roast text | `#E8917C` | `oklch(0.82–0.84 0.14 25)` |
| Warmup badge bg / text | `#5C4A21` / `#EBC66A` | `oklch(0.33 0.06 85)` / `oklch(0.88 0.12 85)` |
| Win cell (You) bg / text | `#2C5866` / `#8FE3F0` | `oklch(0.34 0.07 200)` / `oklch(0.88 0.11 200)` |
| Win cell (Bro) bg / text | `#5B3A22` / `#EDB183` | `oklch(0.33 0.07 45)` / `oklch(0.87 0.11 45)` |
| Completed set row | `rgba(46,116,132,0.35)` | `oklch(0.28 0.035 200 / 0.35)` |
| Incomplete set row | `rgba(48,52,58,0.6)` | `oklch(0.24 0.018 258 / 0.6)` |
| Unchecked checkbox border | `#5B6068` | `oklch(0.4 0.02 258)` |

**Color rule:** cyan is *always* You, orange is *always* Bro — across bars, rings, lines, dots, badges, and rank cards. On line charts, You is a solid stroke and Bro is dashed `5 4`. Never break either convention. Dark text on accent fills is `#22262C`, never pure black.

**Typography**
- **Display:** Barlow Condensed (Google Fonts), weights 600/700/800. Used for all numerals, screen titles, the wordmark, and rank/badge initials. Always 800 in this design.
- **UI:** system sans (Helvetica/Arial in the prototype — use the platform default: SF Pro on iOS, Roboto on Android).
- Scale (px / weight): 34/800 & 22/800 & 21/800 (Barlow, page + screen titles) · 30/800 & 26/800 & 24/800 & 20/800 & 17/800 (Barlow, metric numerals) · 15/700 & 14/700 & 13/700 (body, names/values) · 12/800 (section headers, `letter-spacing: 0.6px`) · 12 regular (roast quote, italic) · 11/700–800 (labels, captions) · 10/700–800 (meta, legends) · 9/800 (chips, axis labels, micro-captions) · 8/700 (week labels under win cells).
- Letter-spacing is used deliberately on uppercase labels: 0.2–0.6px on short labels, 1–1.4px on tracked-out captions ("WEEK 35 · GOAL 5 SESSIONS"), 4px on the display eyebrow.
- Nearly all label text is uppercase. Exercise names, workout names, and roast copy are mixed case.
- **Minimum body size is 9px** — acceptable only for uppercase tracked micro-labels on a mobile screen. Do not shrink further.

**Spacing:** 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22px. Content padding `14px 16px 20px`; card padding `12–18px` (commonly `16px 14px`); section gap 14px; intra-card gap 8–14px; list gap 5–10px.

**Border radius:** 1–3px (micro glyph bars, bar-track fills) · 5px (small chip) · 6–7px (set badge, checkbox, win cell) · 8–9px (nav button, calendar cell, set row, icon tile 34px) · 11–12px (icon tile 42–48px, roast banner, summary tile) · 14px (stat card, session row, roast quote) · 16px (chart and exercise cards) · 20px (hero card) · 999px (pills, avatars, rank badges).

**Bars & strokes:** bar-track heights 6px (compact) and 8px (stat rows); grouped bar width 9px; chart stroke `2.5` (sparkline `2`); ring stroke 6px; dashed pattern `5 4`; area `fill-opacity` 0.12–0.14; endpoint dot `r=4`.

**No shadows anywhere.** Depth comes entirely from surface-lightness steps. Keep it that way — added shadows will read as a different app.

## Assets

**Equipment / session artwork** — 8 PNGs from the vendored workout-cool base (MIT), included in this bundle under `assets/equipment/`: `barbell.png`, `dumbbell.png`, `kettlebell.png`, `band.png`, `plate.png`, `bench.png`, `bodyweight.png`, `pull-up-bar.png`. Also `assets/trophy.png`.
- These are lavender-toned line illustrations on transparent backgrounds. The design applies `filter: brightness(1.3)` to lift them on the dark surfaces. **Recommended improvement:** recolor the set to the app's palette (or ship a tinted variant) rather than relying on a brightness filter.
- Mapping used: chest/press → barbell · arms/isolation → dumbbell · shoulders → kettlebell · legs → plate · back/pull → pull-up-bar · bodyweight movements → bodyweight · cable/band work → band.

**Icons drawn in CSS/SVG in the prototype — all should be replaced with real icon assets:** the 4 tab-bar icons, the logo barbell mark, the streak triangle, the rest-timer clock, the plus glyphs, the 3-bar chart glyph, the stat-row diamond, and the ‹ › chevrons. Any standard icon set (Lucide, Phosphor, SF Symbols, Material Symbols) covers all of them; keep the stroke-ish, geometric character.

**Fonts:** Barlow Condensed via Google Fonts (`@400..800`); bundle it as a local font in a native app.

## Open Questions for the user
1. **Points formula.** The leaderboard shows 245 vs 198 with a STREAK / VOLUME / CONSISTENCY / PRs HIT breakdown, but the weights and caps are invented. How should each metric convert to points, and is there a per-metric cap so one huge session can't win a week outright?
2. **Season length and reset.** "Season 1 · Week 35 of 52" implies a year-long season. What resets weekly vs seasonally, and what happens when a season ends?
3. **Badge definitions.** Five badges are shown; real unlock criteria are needed.
4. **Bodyweight entry.** History charts bodyweight, but no screen captures it. Where does that input live?
5. **Roast copy source.** Should roast lines be a curated pool keyed to triggers (skipped muscle group, broken streak, short session, being behind), or generated? Curated is more reliable and easier to keep funny.
6. **Fairness / handicap.** Two brothers may differ in size and experience, making raw volume lopsided. Should volume be bodyweight-relative, or scored as improvement-over-baseline rather than absolute?
7. **Cheating.** With two users and bragging rights at stake, is any verification wanted (photo, device corroboration, edit windows/locks after a session closes)?

## Files
In this bundle:
- `Locked In v2.dc.html` — **the primary reference.** All four screens, the deeper layouts, charts, equipment artwork, and icons described above.
- `Locked In.dc.html` — the earlier, simpler first-pass mock. Useful only as history; **v2 supersedes it.**
- `ios-frame.jsx` — the iPhone device-frame wrapper used to present the mock. Presentation scaffolding only; not part of the app.
- `support.js` — runtime for the prototyping environment. **Not app code — ignore entirely.**
- `assets/` — the equipment PNGs and trophy art.
- `github.md` — records the source repo, branch, and which repo files each screen was built from.

Both `.dc.html` files open directly in a browser. They use a custom template syntax (`sc-for`, `sc-if`, `{{ }}`, `renderVals()`); read them for structure and exact values, not as code to port.
