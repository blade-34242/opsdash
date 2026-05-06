#!/usr/bin/env bash
#
# Seed a realistic demo dataset for Opsdash with multiple calendars and mixed events.
#
# Usage:
#   BASE=http://localhost:8088 USER=admin PASS=admin ./tools/seed_opsdash_demo.sh
#
set -euo pipefail

BASE_URL=${BASE:-http://localhost:8088}
USER=${USER:-admin}
PASS=${PASS:-admin}
WEEKS=${WEEKS:-4} # number of consecutive weeks starting from current week

DAV_BASE="$BASE_URL/remote.php/dav/calendars/$USER"

declare -A CALENDARS=(
  ["opsdash-work"]="Opsdash · Deep Work"
  ["opsdash-meetings"]="Opsdash · Meetings"
  ["opsdash-personal"]="Opsdash · Personal"
  ["opsdash-recovery"]="Opsdash · Recovery"
  ["opsdash-sport"]="Opsdash · Sport"
  ["opsdash-learning"]="Opsdash · Learning"
)

declare -A CALENDAR_COLORS=(
  ["opsdash-work"]="#2563EB"
  ["opsdash-meetings"]="#7C3AED"
  ["opsdash-personal"]="#F97316"
  ["opsdash-recovery"]="#0EA5E9"
  ["opsdash-sport"]="#10B981"
  ["opsdash-learning"]="#D97706"
)

EVENT_DATA=$(cat <<'EOF'
opsdash-work|Mon|09:00|150|API implementation block
opsdash-work|Mon|14:00|120|Release hardening sprint
opsdash-meetings|Mon|11:30|60|Product standup
opsdash-meetings|Mon|16:30|45|Customer feedback sync
opsdash-personal|Mon|18:30|90|Family dinner
opsdash-sport|Mon|20:30|60|Strength training

opsdash-work|Tue|08:30|180|Architecture decision workshop
opsdash-meetings|Tue|12:00|60|Partner call: migration plan
opsdash-work|Tue|15:00|120|Code review + refactor
opsdash-learning|Tue|19:30|75|Technical writing meetup

opsdash-work|Wed|09:00|180|Deep work sprint
opsdash-meetings|Wed|13:00|90|Cross-team planning
opsdash-recovery|Wed|17:30|60|Reset walk
opsdash-personal|Wed|19:00|120|Dinner with friends

opsdash-work|Thu|08:30|150|Feature polish loop
opsdash-meetings|Thu|11:00|45|Mentoring 1:1
opsdash-work|Thu|14:00|150|Integration + regression checks
opsdash-recovery|Thu|18:30|60|Mobility session

opsdash-work|Fri|09:00|120|Weekly wrap-up docs
opsdash-meetings|Fri|11:30|60|Sprint demo + retrospective
opsdash-personal|Fri|16:30|90|Family time
opsdash-sport|Fri|19:00|75|Swim interval training

opsdash-personal|Sat|10:00|180|Hike and nature break
opsdash-sport|Sat|16:30|90|Trail run
opsdash-recovery|Sat|19:30|60|Stretch + foam roll

opsdash-personal|Sun|09:30|150|Brunch and weekly planning
opsdash-learning|Sun|14:00|120|Course: observability fundamentals
opsdash-recovery|Sun|18:00|90|Quiet evening reset
EOF
)

log(){ printf '[seed_opsdash_demo] %s\n' "$*"; }

print_story_map(){
  cat <<EOF

[seed_opsdash_demo] Screenshot/onboarding story map
[seed_opsdash_demo]   Work:
[seed_opsdash_demo]     - Opsdash · Deep Work
[seed_opsdash_demo]     - Opsdash · Meetings
[seed_opsdash_demo]   Hobby / Personal:
[seed_opsdash_demo]     - Opsdash · Personal
[seed_opsdash_demo]     - Opsdash · Learning
[seed_opsdash_demo]   Sport / Recovery:
[seed_opsdash_demo]     - Opsdash · Sport
[seed_opsdash_demo]     - Opsdash · Recovery
[seed_opsdash_demo]
[seed_opsdash_demo] Calendar contents
[seed_opsdash_demo]   Opsdash · Deep Work  -> long focus blocks, implementation, polish work
[seed_opsdash_demo]   Opsdash · Meetings   -> standups, syncs, retros, customer calls
[seed_opsdash_demo]   Opsdash · Personal   -> dinners, weekend planning, family time
[seed_opsdash_demo]   Opsdash · Learning   -> courses, writing, meetups
[seed_opsdash_demo]   Opsdash · Sport      -> strength, swim, trail run
[seed_opsdash_demo]   Opsdash · Recovery   -> reset walks, mobility, quiet evening recovery
[seed_opsdash_demo]
[seed_opsdash_demo] Recommended onboarding mapping
[seed_opsdash_demo]   Work  -> Deep Work + Meetings
[seed_opsdash_demo]   Hobby -> Personal + Learning
[seed_opsdash_demo]   Sport -> Sport + Recovery
[seed_opsdash_demo]
[seed_opsdash_demo] Recommended screenshot presets
[seed_opsdash_demo]   Single-goal light     -> Work only
[seed_opsdash_demo]   Calendar goals dark   -> Work + Hobby + Sport
[seed_opsdash_demo]   Category goals light  -> Work + Hobby + Sport with the mapping above
[seed_opsdash_demo]   Onboarding dark       -> same seeded set, before completing setup
EOF
}

utc_ts(){
  local s="$1"
  if [[ "$s" =~ ^([0-9]{4})-([0-9]{2})-([0-9]{2})[[:space:]]+(.*)$ ]]; then
    s="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]} ${BASH_REMATCH[4]}"
  fi
  date -u -d "$s" +%Y%m%dT%H%M%SZ
}

ensure_calendar(){
  local slug="$1"
  local name="$2"
  local color="$3"
  local url="$DAV_BASE/$slug/"
  local body='<?xml version="1.0" encoding="utf-8"?>
  <c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:set>
      <d:prop>
        <d:displayname>'"$name"'</d:displayname>
        <c:calendar-description>Seeded by seed_opsdash_demo.sh</c:calendar-description>
      </d:prop>
    </d:set>
  </c:mkcalendar>'
  curl -fsS -u "$USER:$PASS" -X MKCALENDAR \
    -H 'Content-Type: application/xml; charset=utf-8' \
    --data-binary "$body" \
    "$url" >/dev/null || true

  local patch='<?xml version="1.0" encoding="utf-8"?>
  <d:propertyupdate xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/">
    <d:set>
      <d:prop>
        <d:displayname>'"$name"'</d:displayname>
        <c:calendar-description>Seeded by seed_opsdash_demo.sh</c:calendar-description>
        <a:calendar-color>'"$color"'</a:calendar-color>
      </d:prop>
    </d:set>
  </d:propertyupdate>'
  curl -fsS -u "$USER:$PASS" -X PROPPATCH \
    -H 'Content-Type: application/xml; charset=utf-8' \
    --data-binary "$patch" \
    "$url" >/dev/null || true
}

make_event_ics(){
  local date_iso="$1"; shift
  local start="$1"; shift
  local end="$1"; shift
  local uid="$1"; shift
  local summary="$1"; shift
  cat <<ICS
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//opsdash//seed-demo//EN
BEGIN:VEVENT
UID:$uid@opsdash-seed
DTSTAMP:$(date -u +%Y%m%dT%H%M%SZ)
DTSTART:$(utc_ts "$date_iso $start:00")
DTEND:$(utc_ts "$date_iso $end:00")
SUMMARY:$summary
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
ICS
}

put_event(){
  local slug="$1"; shift
  local name="$1"; shift
  local ics="$1"; shift
  curl -fsS -u "$USER:$PASS" -X PUT \
    -H 'Content-Type: text/calendar; charset=utf-8' \
    --data-binary "$ics" \
    "$DAV_BASE/$slug/$name.ics" >/dev/null
}

dow_offset(){
  case "$1" in
    Mon) echo 0 ;;
    Tue) echo 1 ;;
    Wed) echo 2 ;;
    Thu) echo 3 ;;
    Fri) echo 4 ;;
    Sat) echo 5 ;;
    Sun) echo 6 ;;
    *) log "Unknown day $1" >&2; exit 1 ;;
  esac
}

for slug in "${!CALENDARS[@]}"; do
  ensure_calendar "$slug" "${CALENDARS[$slug]}" "${CALENDAR_COLORS[$slug]}"
done

readarray -t EVENTS <<<"$EVENT_DATA"

log "Seeding $WEEKS week(s) starting from current week"

for week in $(seq 0 $((WEEKS-1))); do
  week_start=$(date -d "monday this week +$week week" +%Y-%m-%d)
  for entry in "${EVENTS[@]}"; do
    [[ -z "$entry" ]] && continue
    IFS='|' read -r slug dow start duration summary <<<"$entry"
    [[ -z "$slug" ]] && continue
    offset=$(dow_offset "$dow")
    date_iso=$(date -d "$week_start +$offset day" +%Y-%m-%d)
    start_ts=$(date -d "$date_iso $start:00" +%s)
    end_ts=$(( start_ts + duration*60 ))
    end=$(date -d "@$end_ts" +%H:%M)
    uid="seed-${week}-${slug}-${dow}-${start}"
    ics=$(make_event_ics "$date_iso" "$start" "$end" "$uid" "$summary")
    put_event "$slug" "$uid" "$ics"
  done
done

log "Done."
print_story_map
log "Calendar UI: $BASE_URL/index.php/apps/calendar/"
log "Dashboard API week: $BASE_URL/index.php/apps/opsdash/config_dashboard/load?range=week&offset=0"
log "Dashboard API month: $BASE_URL/index.php/apps/opsdash/config_dashboard/load?range=month&offset=0"
