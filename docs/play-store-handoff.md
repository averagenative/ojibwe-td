# Google Play Store Upload — Handoff Guide

Everything needed to publish Ojibwe TD to the Google Play Store.

---

## Step 1: Create App in Play Console

1. Go to **Google Play Console** → **Create app**
2. App name: **Ojibwe TD**
3. Default language: **English (en-US)**
4. App or game: **Game**
5. Free or paid: **Free**
6. Accept the declarations

---

## Step 2: Store Listing

### App name
```
Ojibwe TD
```

### Short description (80 chars max)
```
Tower defense inspired by Ojibwe heritage. Build, upgrade, defend across seasons.
```

### Full description
```
Ojibwe TD is a tower defense game inspired by Ojibwe heritage and the seasons of the Great Lakes. Place towers along winding paths, upgrade them through branching skill trees, and defend against waves of creatures — from swift rabbits to mighty boss bears.

FEATURES

Six Tower Types
Arrow, Rock Hurler, Frost, Poison, Thunder, and Aura towers — each with three upgrade paths. Choose your strategy every run.

Roguelike Power-Ups
After each wave, pick from combat, economy, and rare synergy offers that make every run unique. Stack bonuses and discover powerful combos.

Boss Encounters
Every fifth wave brings a boss fight. Defeat Makwa, Migizi, and other powerful spirits to earn special rewards — extra gold, lives, or balanced bonuses.

Commander Abilities
Unlock commanders with unique playstyles. Each commander changes how you approach tower placement and resource management.

Multiple Regions & Maps
Journey through Zaaga'iganing (Lake Country), Mashkiig (Wetlands), Mitigomizh (Oak Savanna), and Biboon-aki (Winter Lands) — each with multiple stages and unique terrain.

Meta Progression
Earn crystals to permanently upgrade tower stats, unlock new commanders, and purchase gear that carries across every run.

77 Achievements
Track your mastery across maps, towers, economy, combat, and more. Hidden achievements reward creative play.

Story & Lore
Mishoomis — the wise grandfather — shares Ojibwe teachings and lore between waves. Learn the stories behind the land you defend.

No Ads. No Pay-to-Win.
Completely free. No advertisements. No loot boxes. No pay-to-win mechanics.

Works on phones and tablets. Touch-optimized controls with full landscape support.

Privacy: https://ojibwetd.dcmichael.com/privacy.html
```

---

## Step 3: Upload Graphics

All files are in the `ojibwe_screenshots/` folder.

| Asset | File | Dimensions |
|-------|------|------------|
| App icon | `app-icon-512x512.png` | 512x512 |
| Feature graphic | `feature-graphic-1024x500.png` | 1024x500 |

### Phone screenshots (Pixel 7)
Upload all files from `ojibwe_screenshots/pixel7/`:
- `Screenshot_1773078138.png` — Title screen
- `Screenshot_1773078143.png` — Stage select
- `Screenshot_1773078187.png` — Gameplay (towers placed)
- `Screenshot_1773078193.png` — Power-up selection
- `Screenshot_1773078272.png` — Boss wave action
- `Screenshot_1773078274.png` — Boss reward selection

### Tablet screenshots (Medium Tablet)
Upload all files from `ojibwe_screenshots/medium_tablet/`:
- `Screenshot_1773078473.png` — Title screen
- `Screenshot_1773078481.png` — Meta upgrades
- `Screenshot_1773078487.png` — Achievements
- `Screenshot_1773078500.png` — Gameplay
- `Screenshot_1773078543.png` — Story dialogue
- `Screenshot_1773078546.png` — Boss wave
- `Screenshot_1773078552.png` — Boss reward

---

## Step 4: Closed Testing (Required for New Developer Accounts)

> **Important:** Since November 2023, Google requires new developer accounts to run a
> closed test with **at least 12 testers** for **14 consecutive days** before you can
> request production access. This is a one-time gate.

### 4a. Create a Closed Testing Track

1. Go to **Testing** → **Closed testing** → **Create track**
2. Track name: `Beta Testers`
3. When prompted, **opt into Play App Signing** (recommended — Google manages the signing key, so if the upload key is ever lost, the app can still be updated)
4. **Create new release**
5. Upload `app-release.aab`
6. Release name: `1.0-beta`
7. Release notes:
```
Beta release of Ojibwe TD — a tower defense game inspired by Ojibwe heritage.
Please report any bugs or feedback!
```

### 4b. Add Testers

1. Go to the track's **Testers** tab
2. **Create email list** → name it `Beta Testers`
3. Add at least **12 email addresses** (Google accounts) — friends, family, community
4. Copy the **opt-in URL** and send it to all testers
5. Each tester must:
   - Click the opt-in link and accept
   - Install the app from the Play Store link provided
   - **Keep it installed for at least 14 days**

### 4c. Monitor & Wait

1. Go to **Testing** → **Closed testing** → your track
2. Check the **Testers** tab to see how many have opted in
3. After 14 days with 12+ active testers, you can request production access
4. Go to **Publishing overview** — the production option should become available

### 4d. Tips for Recruiting Testers
- Ask testers to actually play a few rounds and provide feedback
- Remind testers not to uninstall during the 14-day period
- You can add more than 12 to account for drop-offs
- Internal testing (up to 100 testers) does NOT count toward this requirement

---

## Step 5: Upload to Production

Once closed testing is complete and production access is granted:

1. Go to **Release** → **Production**
2. **Create new release**
3. Upload `app-release.aab` (or promote from closed testing)
4. Release name: `1.0`
5. Release notes:
```
Initial release of Ojibwe TD — a tower defense game inspired by Ojibwe heritage.

- 6 tower types with branching upgrade paths
- 4 regions with multiple maps
- Boss encounters every 5th wave
- Roguelike power-up system
- Meta progression with crystals and gear
- 77 achievements
- Commander system with unique abilities
- No ads, no pay-to-win
```

---

## Step 6: Content Rating

Go to **Policy** → **App content** → **Content rating**

Start the questionnaire and answer:
- **Category**: Game (casual)
- Violence: **No** (abstract/stylized, no blood/gore)
- Sexual content: **No**
- Language: **No** profanity
- Controlled substances: **No**
- In-app purchases: **No**
- Ads: **No**
- User-generated content: **No**
- Account creation required: **No**
- Personal data collected: **No**

This should result in an **Everyone** rating.

---

## Step 7: Other Required Sections

### Privacy Policy
```
https://ojibwetd.dcmichael.com/privacy.html
```

### Contact details
- Email: (your contact email for the listing)

### Category
- **Games** → **Strategy**

### Tags
```
tower defense, strategy, indigenous, native american, ojibwe, roguelike, td game, offline
```

### Pricing & Distribution
- Price: **Free**
- Countries: **All countries** (or your preference)
- Contains ads: **No**
- In-app purchases: **No**

---

## Step 8: Review & Publish

Once all sections show green checkmarks:
1. Go to **Publishing overview**
2. Click **Send for review**
3. Google review typically takes 1-3 days for new apps

---

## Files Checklist

```
ojibwe_screenshots/
├── app-icon-512x512.png          ← Play Store icon
├── feature-graphic-1024x500.png  ← Play Store header banner
├── pixel7/                       ← Phone screenshots (upload all)
│   ├── Screenshot_1773078138.png
│   ├── Screenshot_1773078143.png
│   ├── Screenshot_1773078187.png
│   ├── Screenshot_1773078193.png
│   ├── Screenshot_1773078272.png
│   └── Screenshot_1773078274.png
└── medium_tablet/                ← Tablet screenshots (upload all)
    ├── Screenshot_1773078473.png
    ├── Screenshot_1773078481.png
    ├── Screenshot_1773078487.png
    ├── Screenshot_1773078500.png
    ├── Screenshot_1773078543.png
    ├── Screenshot_1773078546.png
    └── Screenshot_1773078552.png

app-release.aab                   ← The signed app bundle
```
