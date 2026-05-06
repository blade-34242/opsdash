# Screenshot Feeds

This file defines the screenshot-ready seed stories for Opsdash. Use it when the goal is marketplace or README assets, not generic QA data.

## Balanced Demo

Source script:

- [../tools/seed_opsdash_demo.sh](/home/thewestboi/Documents/dev/opsdash-workspace/opsdash-app/tools/seed_opsdash_demo.sh)

Goal:

- believable mixed calendar data for overview screenshots
- deterministic onboarding mapping
- enough contrast between work, hobby, and sport/recovery for category widgets

Calendars created by the script:

- `Opsdash · Deep Work`
- `Opsdash · Meetings`
- `Opsdash · Personal`
- `Opsdash · Learning`
- `Opsdash · Sport`
- `Opsdash · Recovery`

What each calendar means:

- `Opsdash · Deep Work`: long focus blocks, implementation, release hardening, polish work
- `Opsdash · Meetings`: standups, syncs, retros, customer calls
- `Opsdash · Personal`: family time, dinners, weekend planning
- `Opsdash · Learning`: meetups, courses, technical writing
- `Opsdash · Sport`: strength, swimming, trail runs
- `Opsdash · Recovery`: walks, mobility, quiet reset sessions

Recommended onboarding mapping:

- `Work` -> `Opsdash · Deep Work` + `Opsdash · Meetings`
- `Hobby` -> `Opsdash · Personal` + `Opsdash · Learning`
- `Sport` -> `Opsdash · Sport` + `Opsdash · Recovery`

Recommended screenshot variants:

- `Single-goal light`: select only the `Work` pair
- `Calendar goals dark`: select all six calendars
- `Category goals light`: select all six calendars and use the category mapping above
- `Onboarding dark`: use the same feed before completing onboarding

## Notes

- Prefer this feed over ad-hoc manual calendar creation when capturing README or marketplace assets.
- The script now prints the same story map after seeding so the terminal output matches this file.
- Keep still images at `1920x1080`.
