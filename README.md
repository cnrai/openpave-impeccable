# openpave-impeccable

20 design skills for AI agents, powered by [pbakaus/impeccable](https://github.com/pbakaus/impeccable).

Wraps the Impeccable SKILL.md agent skills as an executable OpenPAVE skill so they appear in the **slash command menu** and can be invoked explicitly.

## Install

```bash
pave install cnrai/openpave-impeccable
```

The SKILL.md files are auto-downloaded from GitHub on first use. If you already have them via `pave run skills add pbakaus/impeccable`, they're reused.

## Usage

Type `/design` in the PAVE chat input to see all 20 commands in the slash popup:

```
/design polish the hero section
/design audit the checkout flow
/design animate the card transitions
/design bolder make the CTA more striking
/design frontend-design a pricing page
/design teach
```

## Commands

| Command | What it does |
|---------|-------------|
| `polish` | Final quality pass -- alignment, spacing, consistency |
| `audit` | Comprehensive quality report (a11y, perf, theming, responsive) |
| `animate` | Add purposeful animations and micro-interactions |
| `adapt` | Make responsive for a specific target (mobile, tablet, etc.) |
| `arrange` | Improve layout and spatial relationships |
| `bolder` | Amplify safe/boring designs |
| `clarify` | Fix unclear copy and messaging |
| `colorize` | Improve color usage and palette |
| `critique` | Honest design review with feedback |
| `delight` | Add moments of joy |
| `distill` | Simplify, remove excess |
| `extract` | Extract reusable components |
| `frontend-design` | Build new UI from scratch with high design quality |
| `harden` | Improve resilience and edge cases |
| `normalize` | Align with design system conventions |
| `onboard` | Add onboarding UX |
| `optimize` | Performance optimization |
| `overdrive` | Push design to the extreme |
| `typeset` | Improve typography |
| `teach` | One-time project setup -- gathers design context |

## How it works

1. **`skill.yaml`** registers 20 commands under the `design` skill name in `skills.lock.json` -- the slash popup reads this
2. **`index.js`** loads the corresponding SKILL.md from `~/.pave/agent-skills/pbakaus--impeccable/`
3. The SKILL.md content (+ reference files) is returned as the tool result
4. The AI reads the instructions and follows them for the current task

This means the full Impeccable instruction set is preserved -- the executable wrapper just makes it discoverable.

## Recommended workflow

1. Run `/design teach` once per project to establish design context
2. Use any command: `/design audit`, `/design polish`, etc.

## Credits

Design skills by [Paul Bakaus](https://github.com/pbakaus/impeccable). Apache 2.0 / MIT.

## License

MIT License - Copyright (c) 2025 C&R Wise AI Limited
