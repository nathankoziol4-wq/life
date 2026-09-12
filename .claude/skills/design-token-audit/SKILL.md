---
name: design-token-audit
description: Audit token usage across a product for coverage, drift, and hard-coded values. Use when tokens exist and you suspect they are being bypassed. For defining tokens in the first place, use `design-token` (design-systems).
---
# Design Token Audit

> **Note pour ce dépôt (Odyssia).** L'audit a déjà une cible chiffrée, et elle
> se dégrade. `src/ui/theme/tokens.css` définit **177 variables** en trois
> familles (matière, sens, mesure), écrites pour supprimer les valeurs en dur.
> Or `grep -o 'style={{' src --include='*.tsx'` en compte **617 dans 62
> fichiers** — contre 575 au moment du rapport de design. L'adoption recule.
>
> Deux précautions avant de produire un rapport ici :
>
> - **Compter n'est pas juger.** Tous les `style={{}}` ne sont pas des valeurs
>   en dur : certains portent une valeur calculée à l'exécution — une largeur
>   de jauge, une position de mini-jeu — qu'aucun jeton ne peut exprimer.
>   L'inventaire doit les séparer avant d'annoncer un pourcentage, sinon le
>   chiffre est faux dans le sens qui arrange.
> - **Rien ne l'empêche de remonter.** Il n'existe aucune règle de lint ni
>   aucun test qui plafonne ce nombre, et c'est précisément pourquoi il a
>   augmenté sans que personne le voie. Un audit qui se contente de lister
>   sera périmé à la semaine suivante ; le livrable utile est un garde-fou qui
>   tienne le compte, sur le modèle de `contraste.test.ts` et de
>   `fermees.test.ts`.

You are an expert in auditing design token adoption and consistency across products.
## What You Do
You audit how design tokens are used (or not used) in a product, identifying inconsistencies, gaps, and hard-coded values.
## Audit Scope
### Token Coverage
- What percentage of visual properties use tokens?
- Which properties are commonly hard-coded?
- Are the right tier of tokens used (global vs semantic vs component)?
### Token Consistency
- Are the same tokens used for the same purposes?
- Are there redundant tokens (different names, same value)?
- Are deprecated tokens still in use?
### Token Gaps
- Are there visual values that should be tokens but are not?
- Are there use cases not covered by the existing token set?
- Do custom values suggest missing token scale steps?
## Audit Process
1. **Inventory** — Extract all visual values from code/design files
2. **Categorize** — Group by type (color, spacing, typography, etc.)
3. **Map** — Match values to existing tokens
4. **Flag** — Identify hard-coded values, mismatches, and gaps
5. **Prioritize** — Rank issues by frequency and impact
6. **Recommend** — Suggest new tokens, migrations, and cleanup
## Audit Report Format
- Executive summary (token adoption percentage, key findings)
- Detailed findings by category
- Hard-coded value inventory with suggested token replacements
- Recommended new tokens
- Migration plan and priority
## Best Practices
- Audit both design files and code
- Automate detection where possible (lint rules)
- Focus on high-impact categories first (color, spacing)
- Track adoption over time
- Make the audit results actionable, not just informational
