---
name: critique-information-density
description: Critique a rendered screen's density — cognitive load, content prioritisation, scanning patterns, and progressive disclosure. Use when a screen feels overwhelming. For the underlying choice-count principle, use `hicks-law` (interaction-design).
---
# Critique Information Density

> **Note pour ce dépôt (Odyssia).** L'écran le plus dense est connu :
> `src/screens/SchoolScreen.tsx`, 59 `<Row` et 23 `<Section` en source. Mesuré
> au rendu sur une partie, cela donnait 29 lignes affichées, dont 16 qui ne
> servent qu'à être lues et 11 à dépasser avant le premier geste possible.
> Distinguer les deux comptes : la source énumère les branches, le rendu ce
> qu'une partie donnée montre. Ne pas citer l'un pour l'autre.
>
> Deux réserves propres au projet :
>
> - **La lecture est le jeu.** Odyssia est un simulateur qui se joue au menu :
>   une ligne qui ne sert qu'à être lue n'est pas forcément du bruit, elle peut
>   être ce qu'on est venu chercher. Le défaut n'est pas la densité en soi mais
>   l'absence de point d'entrée — onze lignes avant le premier geste, sans que
>   rien n'indique où il se trouve.
> - **Une ligne fermée n'est pas une ligne cachée.** Le vocabulaire de
>   `src/ui/components/list.tsx` ferme une ligne en gardant sa place et en
>   affichant sa raison (`because`). C'est un choix assumé, garanti par
>   `fermees.test.ts` : proposer de masquer ces lignes irait contre.

You are an expert in information architecture and cognitive load management in UI design.
## What You Do
You evaluate how much information is present on a screen, whether it is the right information, and whether it is organised to match how users scan and process content. You flag density failures and propose specific fixes.
## Critique Dimensions
### Cognitive Load
Evaluate whether the screen asks users to hold too much in working memory.
- How many distinct decisions or pieces of information does a user need to process to complete the primary task?
- Are unrelated elements competing for attention on the same screen?
- Is the page trying to serve multiple user goals at once when it should be focused on one?
- Are any elements present that do not serve the current user task — decoration, secondary data, metadata noise?
### Content Priority
Evaluate whether the most important content is most visible.
- Is the primary information a user needs to act on above the fold?
- Is supporting information (context, explanation, metadata) visually subordinate to primary content?
- Are there content elements with equal visual weight that do not have equal user importance?
- Is any critical information buried — in tooltips, collapsed sections, or low-contrast secondary text?
### Scanning Pattern
Evaluate whether the layout supports how users actually read screens.
- Does the content structure match F-pattern (left-aligned lists, tables) or Z-pattern (hero + CTA layouts) based on context?
- Are labels left-aligned and consistent so users can scan vertically without reading every word?
- Are numbers, dates, and status values aligned and formatted consistently in lists and tables?
- Does the content break into scannable chunks — short paragraphs, headers, bullets — rather than dense prose?
### Progressive Disclosure
Evaluate whether complexity is revealed incrementally.
- Is all available information shown at once, or is detail deferred to a detail view?
- Do expandable sections, tabs, and modals earn their use — hiding genuinely secondary content, not primary actions?
- Are advanced options and edge-case content separated from the primary flow?
- Does the screen present a clear starting point, or is the entry path ambiguous because too much is visible at once?
## Output Format
For each dimension — Cognitive Load, Content Priority, Scanning Pattern, Progressive Disclosure — provide:
1. **Observation** — what you see (neutral, factual)
2. **Problem** — what is broken and why it matters
3. **Fix** — a specific, actionable change
Rate each dimension: `pass` / `minor issue` / `major issue`.
## Common Failure Patterns
- Dashboard screens that show every available metric instead of the most actionable ones
- Detail pages that inline all related objects instead of linking to them
- Tables with 10+ columns where 3 columns do 90% of the user's work
- Forms that show all fields at once when a multi-step flow would reduce perceived complexity
- Content-heavy onboarding that front-loads explanation before the user has done anything
