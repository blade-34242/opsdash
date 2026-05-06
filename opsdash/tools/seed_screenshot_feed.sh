#!/usr/bin/env bash
#
# Seed a screenshot-ready balanced demo feed directly from the app-local tools
# directory so it can be run inside a Nextcloud container.
#
# Usage:
#   BASE=http://localhost USER=admin PASS=admin bash tools/seed_screenshot_feed.sh
#

set -euo pipefail

BASE_URL=${BASE:-http://localhost}
USER=${USER:-admin}
PASS=${PASS:-admin}
WEEKS=${WEEKS:-4}

DAV_BASE="$BASE_URL/remote.php/dav/calendars/$USER"

declare -A CALENDARS=(
  ["opsdash-work"]="Opsdash · Deep Work"
  ["opsdash-meetings"]="Opsdash · Meetings"
  ["opsdash-personal"]="Opsdash · Personal"
  ["opsdash-learning"]="Opsdash · Learning"
  ["opsdash-sport"]="Opsdash · Sport"
  ["opsdash-recovery"]="Opsdash · Recovery"
)

declare -A CALENDAR_COLORS=(
  ["opsdash-work"]="#2563EB"
  ["opsdash-meetings"]="#7C3AED"
  ["opsdash-personal"]="#F97316"
  ["opsdash-learning"]="#D97706"
  ["opsdash-sport"]="#10B981"
  ["opsdash-recovery"]="#0EA5E9"
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

log() { printf '[seed_screenshot_feed] %s\n' "$*"; }

utc_ts() {
  local stamp="$1"
  date -u -d "$stamp" +%Y%m%dT%H%M%SZ
}

ensure_calendar() {
  local slug="$1"
  local name="$2"
  local color="$3"
  local url="$DAV_BASE/$slug/"
  local body='<?xml version="1.0" encoding="utf-8"?>
  <c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:set>
      <d:prop>
        <d:displayname>'"$name"'</d:displayname>
        <c:calendar-description>Seeded by seed_screenshot_feed.sh</c:calendar-description>
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
        <c:calendar-description>Seeded by seed_screenshot_feed.sh</c:calendar-description>
        <a:calendar-color>'"$color"'</a:calendar-color>
      </d:prop>
    </d:set>
  </d:propertyupdate>'
  curl -fsS -u "$USER:$PASS" -X PROPPATCH \
    -H 'Content-Type: application/xml; charset=utf-8' \
    --data-binary "$patch" \
    "$url" >/dev/null || true
}

make_event_ics() {
  local date_iso="$1"; shift
  local start="$1"; shift
  local end="$1"; shift
  local uid="$1"; shift
  local summary="$1"; shift
  cat <<ICS
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//opsdash//seed-screenshot-feed//EN
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

put_event() {
  local slug="$1"; shift
  local name="$1"; shift
  local ics_payload="$1"
  curl -fsS -u "$USER:$PASS" -X PUT \
    -H 'Content-Type: text/calendar; charset=utf-8' \
    --data-binary "$ics_payload" \
    "$DAV_BASE/$slug/$name.ics" >/dev/null
}

dow_offset() {
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

current_dow_offset() {
  case "$(date +%u)" in
    1) echo 0 ;;
    2) echo 1 ;;
    3) echo 2 ;;
    4) echo 3 ;;
    5) echo 4 ;;
    6) echo 5 ;;
    7) echo 6 ;;
    *) echo 6 ;;
  esac
}

print_story_map() {
  cat <<EOF

[seed_screenshot_feed] Screenshot/onboarding story map
[seed_screenshot_feed]   Work:
[seed_screenshot_feed]     - Opsdash · Deep Work
[seed_screenshot_feed]     - Opsdash · Meetings
[seed_screenshot_feed]   Hobby / Personal:
[seed_screenshot_feed]     - Opsdash · Personal
[seed_screenshot_feed]     - Opsdash · Learning
[seed_screenshot_feed]   Sport / Recovery:
[seed_screenshot_feed]     - Opsdash · Sport
[seed_screenshot_feed]     - Opsdash · Recovery
[seed_screenshot_feed]
[seed_screenshot_feed] Recommended onboarding mapping
[seed_screenshot_feed]   Work  -> Deep Work + Meetings
[seed_screenshot_feed]   Hobby -> Personal + Learning
[seed_screenshot_feed]   Sport -> Sport + Recovery
EOF
}

for slug in "${!CALENDARS[@]}"; do
  ensure_calendar "$slug" "${CALENDARS[$slug]}" "${CALENDAR_COLORS[$slug]}"
done

readarray -t EVENTS <<<"$EVENT_DATA"

TODAY_DOW=$(current_dow_offset)

log "Seeding the last $WEEKS week(s), including today"

for week in $(seq $((WEEKS - 1)) -1 0); do
  week_start=$(date -d "monday this week -$week week" +%Y-%m-%d)
  for entry in "${EVENTS[@]}"; do
    [[ -z "$entry" ]] && continue
    IFS='|' read -r slug dow start duration summary <<<"$entry"
    offset=$(dow_offset "$dow")
    if [[ "$week" -eq 0 && "$offset" -gt "$TODAY_DOW" ]]; then
      continue
    fi
    date_iso=$(date -d "$week_start +$offset day" +%Y-%m-%d)
    start_ts=$(date -d "$date_iso $start:00" +%s)
    end_ts=$((start_ts + duration * 60))
    end=$(date -d "@$end_ts" +%H:%M)
    uid="seed-${week}-${slug}-${dow}-${start}"
    ics=$(make_event_ics "$date_iso" "$start" "$end" "$uid" "$summary")
    put_event "$slug" "$uid" "$ics"
  done
done

log "Done."
print_story_map
log "Calendar UI: $BASE_URL/index.php/apps/calendar/"
log "Overview: $BASE_URL/index.php/apps/opsdash/overview"
