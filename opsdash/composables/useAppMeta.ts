import { computed, ref, type ComputedRef } from 'vue'

interface AppMetaOptions {
  pingUrl: () => string
  getJson: (url: string, params: Record<string, unknown>) => Promise<any>
  pkgVersion?: string
  root: ComputedRef<string>
}

function readDataAttr(name: string): string {
  const el = typeof document !== 'undefined' ? document.getElementById('app') : null
  if (!el || !(el as any).dataset) return ''
  const dataset: any = (el as any).dataset
  return dataset ? String(dataset[name] ?? '') : ''
}

export function useAppMeta(options: AppMetaOptions) {
  const iconIdx = ref(0)
  const iconCandidates = computed(() => {
    const candidates: string[] = []
    const w: any = typeof window !== 'undefined' ? window : {}
    try {
      if (w.OC?.imagePath) {
        const generated = w.OC.imagePath('opsdash', 'app.svg')
        if (generated) candidates.push(generated)
      }
    } catch {}
    const base = options.root.value
    candidates.push(`${base}/apps/opsdash/img/app.svg`)
    candidates.push(`${base}/apps-extra/opsdash/img/app.svg`)
    candidates.push(`${base}/apps-writable/opsdash/img/app.svg`)
    return candidates
  })

  const iconSrc = computed(() => iconCandidates.value[Math.min(iconIdx.value, iconCandidates.value.length - 1)] || '')
  function onIconError() {
    if (iconIdx.value + 1 < iconCandidates.value.length) iconIdx.value++
  }

  const appVersion = ref<string>(readDataAttr('opsdashVersion') || (options.pkgVersion ? String(options.pkgVersion) : ''))

  async function ensureMeta() {
    if (appVersion.value) return
    try {
      const res = await options.getJson(options.pingUrl(), {})
      if (!appVersion.value && typeof res?.version === 'string') appVersion.value = res.version
    } catch {}
  }

  ensureMeta()

  return {
    iconSrc,
    onIconError,
    appVersion,
  }
}
