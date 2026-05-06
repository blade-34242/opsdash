<template>
  <div class="wp" :class="[`wp--${variant}`, { 'wp--sel': selected }]">

    <!-- Bar chart (per day, DOW, HOD) -->
    <template v-if="variant === 'bars'">
      <div class="wp-bar" style="height:40%;opacity:.35"></div>
      <div class="wp-bar" style="height:72%;opacity:.65"></div>
      <div class="wp-bar" style="height:55%;opacity:.5"></div>
      <div class="wp-bar" style="height:95%"></div>
      <div class="wp-bar" style="height:48%;opacity:.45"></div>
      <div class="wp-bar" style="height:80%;opacity:.75"></div>
      <div class="wp-bar" style="height:30%;opacity:.3"></div>
    </template>

    <!-- Targets ring -->
    <template v-else-if="variant === 'ring'">
      <div class="wp-ring-wrap">
        <div class="wp-ring"></div>
        <span class="wp-ring-label">67%</span>
      </div>
    </template>

    <!-- Pie chart -->
    <template v-else-if="variant === 'pie'">
      <div class="wp-pie-wrap">
        <div class="wp-pie"></div>
      </div>
    </template>

    <!-- Stacked bar chart -->
    <template v-else-if="variant === 'stacked'">
      <div class="wp-bar wp-bar--a" style="height:58%"></div>
      <div class="wp-bar wp-bar--b" style="height:75%"></div>
      <div class="wp-bar wp-bar--a" style="height:44%"></div>
      <div class="wp-bar wp-bar--b" style="height:90%"></div>
      <div class="wp-bar wp-bar--a" style="height:66%"></div>
      <div class="wp-bar wp-bar--b" style="height:52%"></div>
    </template>

    <!-- Horizontal bars (balance index, category mix) -->
    <template v-else-if="variant === 'hbars'">
      <div class="wp-hbars">
        <div class="wp-hbar" style="width:78%;opacity:.85"></div>
        <div class="wp-hbar" style="width:52%;opacity:.6"></div>
        <div class="wp-hbar" style="width:65%;opacity:.7"></div>
        <div class="wp-hbar" style="width:40%;opacity:.45"></div>
      </div>
    </template>

    <!-- Heatmap grid (calendar table, category mix trend) -->
    <template v-else-if="variant === 'heatmap'">
      <div class="wp-heatmap">
        <div v-for="i in 21" :key="i" class="wp-cell" :style="{ opacity: heatOp(i) }"></div>
      </div>
    </template>

    <!-- Time-of-day bars (HOD) -->
    <template v-else-if="variant === 'hod'">
      <div class="wp-bar" style="height:20%;opacity:.2"></div>
      <div class="wp-bar" style="height:30%;opacity:.3"></div>
      <div class="wp-bar" style="height:85%;opacity:.8"></div>
      <div class="wp-bar" style="height:95%"></div>
      <div class="wp-bar" style="height:70%;opacity:.65"></div>
      <div class="wp-bar" style="height:40%;opacity:.38"></div>
      <div class="wp-bar" style="height:15%;opacity:.15"></div>
    </template>

    <!-- Time off trend — mixed green/blue bars -->
    <template v-else-if="variant === 'dayoff'">
      <div class="wp-bar wp-bar--g" style="height:45%;opacity:.5"></div>
      <div class="wp-bar" style="height:70%;opacity:.65"></div>
      <div class="wp-bar wp-bar--g" style="height:35%;opacity:.4"></div>
      <div class="wp-bar" style="height:88%"></div>
      <div class="wp-bar wp-bar--g" style="height:55%;opacity:.55"></div>
      <div class="wp-bar" style="height:60%;opacity:.6"></div>
    </template>

    <!-- Note lines -->
    <template v-else-if="variant === 'note'">
      <div class="wp-note">
        <div class="wp-noteline" style="width:88%"></div>
        <div class="wp-noteline" style="width:72%"></div>
        <div class="wp-noteline" style="width:60%"></div>
        <div class="wp-noteline" style="width:80%"></div>
      </div>
    </template>

    <!-- Deck cards -->
    <template v-else-if="variant === 'deck'">
      <div class="wp-deck">
        <div class="wp-deckcard"></div>
        <div class="wp-deckcard" style="opacity:.6"></div>
        <div class="wp-deckcard" style="opacity:.35"></div>
      </div>
    </template>

    <!-- Deck stats -->
    <template v-else-if="variant === 'deckstats'">
      <div class="wp-deckstats">
        <div class="wp-stat"></div>
        <div class="wp-stat"></div>
        <div class="wp-stat"></div>
      </div>
    </template>

    <!-- Fallback generic -->
    <template v-else>
      <div class="wp-generic"></div>
    </template>

  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  type: string
  selected?: boolean
}>()

const VARIANTS: Record<string, string> = {
  time_summary_overview: 'bars',
  time_summary_lookback: 'bars',
  time_summary_compact:  'bars',
  targets_v2:            'ring',
  balance_index:         'hbars',
  dayoff_trend:          'dayoff',
  category_mix_trend:    'heatmap',
  chart_per_day:         'bars',
  chart_dow:             'bars',
  chart_hod:             'hod',
  chart_pie:             'pie',
  chart_stacked:         'stacked',
  calendar_table:        'heatmap',
  deck_cards:            'deck',
  deck_stats:            'deckstats',
  note_snippet:          'note',
  note_editor:           'note',
}

const variant = VARIANTS[props.type] ?? 'generic'

function heatOp(i: number) {
  const vals = [0.15,0.42,0.12,0.65,0.28,0.38,0.10,0.50,0.22,0.75,0.18,0.48,0.15,0.55,0.30,0.70,0.45,0.25,0.60,0.35,0.80]
  return vals[(i - 1) % vals.length]
}
</script>

<style scoped>
.wp {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 5px 5px 0;
  box-sizing: border-box;
}

/* Bars */
.wp-bar {
  border-radius: 2px 2px 0 0;
  flex: 1;
  background: var(--brand, #2563eb);
}
.wp-bar--a { background: var(--brand, #2563eb); }
.wp-bar--b { background: color-mix(in oklab, var(--brand, #2563eb), #7c3aed 55%); }
.wp-bar--g { background: #16a34a; }

/* Ring */
.wp--ring { align-items: center; justify-content: center; }
.wp-ring-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
.wp-ring {
  width: 32px; height: 32px; border-radius: 50%;
  border: 5px solid color-mix(in oklab, var(--brand, #2563eb), transparent 75%);
  border-top-color: var(--brand, #2563eb);
  border-right-color: var(--brand, #2563eb);
}
.wp-ring-label {
  position: absolute;
  font-size: 8px; font-weight: 900;
  color: var(--brand, #2563eb);
}

/* Pie */
.wp--pie { align-items: center; justify-content: center; }
.wp-pie-wrap { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.wp-pie {
  width: 30px; height: 30px; border-radius: 50%;
  background: conic-gradient(
    var(--brand, #2563eb) 0deg 200deg,
    color-mix(in oklab, var(--brand, #2563eb), transparent 55%) 200deg 290deg,
    color-mix(in oklab, var(--brand, #2563eb), transparent 75%) 290deg 360deg
  );
}

/* Hbars */
.wp--hbars { align-items: center; padding: 4px 5px; }
.wp-hbars { display: flex; flex-direction: column; gap: 4px; width: 100%; }
.wp-hbar { height: 5px; border-radius: 2px; background: var(--brand, #2563eb); }

/* Heatmap */
.wp--heatmap { align-items: stretch; padding: 4px; }
.wp-heatmap {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  width: 100%; height: 100%;
}
.wp-cell { border-radius: 2px; background: var(--brand, #2563eb); }

/* Dayoff — mixed bars, align bottom */
.wp--dayoff { align-items: flex-end; }

/* HOD */
.wp--hod { align-items: flex-end; }

/* Note */
.wp--note { align-items: center; padding: 4px 5px; }
.wp-note { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.wp-noteline { height: 4px; border-radius: 2px; background: var(--brand, #2563eb); opacity: .5; }

/* Deck cards */
.wp--deck { flex-direction: column; align-items: stretch; padding: 4px 5px; gap: 3px; }
.wp-deck { display: flex; flex-direction: column; gap: 3px; width: 100%; }
.wp-deckcard {
  height: 10px; border-radius: 3px;
  background: var(--brand, #2563eb);
  opacity: .6;
}

/* Deck stats */
.wp--deckstats { align-items: center; justify-content: space-around; padding: 6px 5px; }
.wp-deckstats { display: flex; gap: 4px; align-items: flex-end; width: 100%; justify-content: space-around; }
.wp-stat {
  width: 16px; height: 16px; border-radius: 4px;
  background: var(--brand, #2563eb); opacity: .55;
}
.wp-stat:nth-child(2) { height: 22px; opacity: .8; }

/* Generic */
.wp--generic { align-items: center; justify-content: center; }
.wp-generic {
  width: 70%; height: 12px; border-radius: 4px;
  background: color-mix(in oklab, var(--brand, #2563eb), transparent 70%);
}

/* Selected tint on all previews */
.wp--sel .wp-bar,
.wp--sel .wp-hbar,
.wp--sel .wp-cell,
.wp--sel .wp-noteline,
.wp--sel .wp-deckcard,
.wp--sel .wp-stat { filter: brightness(1.1); }
</style>
