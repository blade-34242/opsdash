#!/usr/bin/env bash
#
# Seed a realistic 10-day Opsdash dataset ending today.
# Creates two calendars (business + private) and uploads varied events for the
# last 10 calendar days so the dashboard shows a believable recent history.
#
# Usage:
#   BASE=http://localhost:8093 USER=admin PASS=admin ./tools/seed_last_10_days.sh
#
# Notes:
# - Re-running overwrites the same UIDs for the same date/slot, so the seed is stable.
# - Times are written in UTC to match the other CalDAV seed helpers in this repo.
#

set -euo pipefail

BASE_URL=${BASE:-http://localhost:8093}
USER=${USER:-admin}
PASS=${PASS:-admin}
DAYS=${DAYS:-10}

DAV_BASE="$BASE_URL/remote.php/dav/calendars/$USER"

declare -A CALENDARS=(
  ["opsdash-business"]="Opsdash · Business"
  ["opsdash-private"]="Opsdash · Private"
)

log() { printf '[seed_last_10_days] %s\n' "$*"; }

utc_ts() {
  local stamp="$1"
  date -u -d "$stamp" +%Y%m%dT%H%M%SZ
}

ensure_calendar() {
  local slug="$1"
  local name="$2"
  local url="$DAV_BASE/$slug/"
  local body='<?xml version="1.0" encoding="utf-8"?>
  <c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:set>
      <d:prop>
        <d:displayname>'"$name"'</d:displayname>
        <c:calendar-description>Seeded by seed_last_10_days.sh</c:calendar-description>
      </d:prop>
    </d:set>
  </c:mkcalendar>'
  curl -fsS -u "$USER:$PASS" -X MKCALENDAR \
    -H 'Content-Type: application/xml; charset=utf-8' \
    --data-binary "$body" \
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
PRODID:-//opsdash//seed-last-10-days//EN
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

add_block() {
  local slug="$1"
  local date_iso="$2"
  local start="$3"
  local minutes="$4"
  local title="$5"
  local key="$6"

  local start_epoch
  start_epoch=$(date -d "$date_iso $start:00" +%s)
  local end_epoch=$((start_epoch + minutes * 60))
  local end_time
  end_time=$(date -d "@$end_epoch" +%H:%M)
  local uid="${date_iso//-/}-${slug}-${key}"

  local ics
  ics=$(make_event_ics "$date_iso" "$start" "$end_time" "$uid" "$title")
  put_event "$slug" "$uid" "$ics"
}

seed_day() {
  local offset="$1"
  local date_iso="$2"

  case "$offset" in
    9)
      add_block opsdash-business "$date_iso" "08:45" 45  "Inbox zero and weekly priorities" "biz-priorities"
      add_block opsdash-business "$date_iso" "10:00" 150 "Quarterly planning deck" "biz-planning"
      add_block opsdash-business "$date_iso" "14:30" 90  "Client kickoff preparation" "biz-kickoff-prep"
      add_block opsdash-private  "$date_iso" "18:30" 75  "Groceries and meal prep" "priv-groceries"
      ;;
    8)
      add_block opsdash-business "$date_iso" "09:15" 180 "Architecture review and decisions" "biz-architecture"
      add_block opsdash-business "$date_iso" "13:30" 60  "Vendor sync call" "biz-vendor-sync"
      add_block opsdash-private  "$date_iso" "19:30" 90  "Cinema night" "priv-cinema"
      ;;
    7)
      add_block opsdash-business "$date_iso" "08:30" 120 "Deep work: reporting backend" "biz-reporting"
      add_block opsdash-business "$date_iso" "11:00" 45  "Product standup" "biz-standup"
      add_block opsdash-business "$date_iso" "15:00" 120 "Bug triage and QA follow-up" "biz-bug-triage"
      add_block opsdash-private  "$date_iso" "17:45" 60  "Gym session" "priv-gym"
      add_block opsdash-private  "$date_iso" "20:00" 75  "Family dinner" "priv-family-dinner"
      ;;
    6)
      add_block opsdash-business "$date_iso" "09:00" 90  "Sprint review prep" "biz-review-prep"
      add_block opsdash-business "$date_iso" "11:00" 90  "Sprint review and retro" "biz-retro"
      add_block opsdash-private  "$date_iso" "15:30" 120 "Long walk and cafe break" "priv-walk"
      add_block opsdash-private  "$date_iso" "19:00" 120 "Friends dinner" "priv-friends-dinner"
      ;;
    5)
      add_block opsdash-private  "$date_iso" "10:30" 150 "Family brunch" "priv-brunch"
      add_block opsdash-private  "$date_iso" "16:00" 90  "Park with the kids" "priv-park"
      add_block opsdash-private  "$date_iso" "20:00" 60  "Quiet reading hour" "priv-reading"
      ;;
    4)
      add_block opsdash-business "$date_iso" "16:30" 45  "Weekly prep and notes review" "biz-weekly-prep"
      add_block opsdash-private  "$date_iso" "09:30" 120 "Slow morning and home reset" "priv-home-reset"
      add_block opsdash-private  "$date_iso" "14:00" 105 "Visit parents" "priv-parents"
      add_block opsdash-private  "$date_iso" "19:30" 60  "Plan the coming week" "priv-week-plan"
      ;;
    3)
      add_block opsdash-business "$date_iso" "08:30" 150 "Implementation sprint: dashboard widgets" "biz-widgets"
      add_block opsdash-business "$date_iso" "11:45" 45  "Team coordination sync" "biz-team-sync"
      add_block opsdash-business "$date_iso" "14:00" 105 "Customer issue follow-up" "biz-customer-followup"
      add_block opsdash-private  "$date_iso" "18:30" 60  "Run by the river" "priv-run"
      ;;
    2)
      add_block opsdash-business "$date_iso" "09:00" 120 "Budget and roadmap check-in" "biz-budget"
      add_block opsdash-business "$date_iso" "13:00" 150 "Focus block: metrics cleanup" "biz-metrics"
      add_block opsdash-private  "$date_iso" "17:30" 45  "Doctor appointment" "priv-doctor"
      add_block opsdash-private  "$date_iso" "20:00" 90  "Cook at home" "priv-cooking"
      ;;
    1)
      add_block opsdash-business "$date_iso" "08:45" 60  "Leadership standup" "biz-leadership"
      add_block opsdash-business "$date_iso" "10:15" 180 "Proposal writing block" "biz-proposal"
      add_block opsdash-business "$date_iso" "15:00" 75  "Hiring interview" "biz-interview"
      add_block opsdash-private  "$date_iso" "19:00" 120 "Board games evening" "priv-boardgames"
      ;;
    0)
      add_block opsdash-business "$date_iso" "09:30" 90  "Weekly KPI review" "biz-kpi-review"
      add_block opsdash-business "$date_iso" "11:30" 60  "Client checkpoint call" "biz-client-call"
      add_block opsdash-business "$date_iso" "14:00" 120 "Feature polish and release checklist" "biz-release-checklist"
      add_block opsdash-private  "$date_iso" "18:15" 75  "Shopping and errands" "priv-errands"
      add_block opsdash-private  "$date_iso" "20:15" 60  "Read and unwind" "priv-unwind"
      ;;
    *)
      log "unsupported day offset: $offset" >&2
      exit 1
      ;;
  esac
}

main() {
  local slug
  for slug in "${!CALENDARS[@]}"; do
    ensure_calendar "$slug" "${CALENDARS[$slug]}"
  done

  log "Seeding the last $DAYS day(s), ending today"

  local offset
  for offset in $(seq $((DAYS - 1)) -1 0); do
    local date_iso
    date_iso=$(date -d "-${offset} day" +%Y-%m-%d)
    seed_day "$offset" "$date_iso"
  done

  log "Done."
  log "Calendar UI: $BASE_URL/index.php/apps/calendar/"
  log "Opsdash week: $BASE_URL/index.php/apps/opsdash/overview/load?range=week&offset=0"
  log "Opsdash month: $BASE_URL/index.php/apps/opsdash/overview/load?range=month&offset=0"
}

main "$@"
