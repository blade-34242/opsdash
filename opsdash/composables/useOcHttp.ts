import { computed } from 'vue'

interface RouteMap {
  load: string
  loadData: string
  persist: string
  notes: string
  notesSave: string
  presetsList: string
  presetsSave: string
  presetsLoad: string
  presetsDelete: string
  ping: string
  reportTestSend: string
}

const ROUTES: RouteMap = {
  load: '/apps/opsdash/overview/load',
  loadData: '/apps/opsdash/overview/load',
  persist: '/apps/opsdash/overview/persist',
  notes: '/apps/opsdash/overview/notes',
  notesSave: '/apps/opsdash/overview/notes',
  presetsList: '/apps/opsdash/overview/presets',
  presetsSave: '/apps/opsdash/overview/presets',
  presetsLoad: '/apps/opsdash/overview/presets',
  presetsDelete: '/apps/opsdash/overview/presets',
  ping: '/apps/opsdash/overview/ping',
  reportTestSend: '/apps/opsdash/overview/report/test-send',
}

function getRoot(): string {
  const w: any = typeof window !== 'undefined' ? window : {}
  return (w.OC && (w.OC.webroot || w.OC.getRootPath?.())) || w._oc_webroot || ''
}

export function useOcHttp() {
  const root = computed(() => getRoot())

  function route(name: keyof RouteMap, param?: string): string {
    const w: any = typeof window !== 'undefined' ? window : {}
    const base = ROUTES[name]
    if (name === 'presetsLoad' || name === 'presetsDelete') {
      const target = `${base}/${encodeURIComponent(String(param ?? ''))}`
      return w.OC && typeof w.OC.generateUrl === 'function'
        ? w.OC.generateUrl(target)
        : `${root.value}${target}`
    }
    return w.OC && typeof w.OC.generateUrl === 'function'
      ? w.OC.generateUrl(base)
      : `${root.value}${base}`
  }

  function qs(params: Record<string, any>): string {
    const u = new URLSearchParams()
    Object.entries(params || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => u.append(key, String(v)))
      } else if (value !== undefined && value !== null) {
        u.set(key, String(value))
      }
    })
    return u.toString()
  }

  async function getJson(url: string, params: Record<string, any>): Promise<any> {
    const query = qs(params)
    const target = query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url
    const res = await fetch(target, {
      method: 'GET',
      credentials: 'same-origin',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }

  async function postJson(url: string, body: Record<string, any>): Promise<any> {
    const w: any = typeof window !== 'undefined' ? window : {}
    const rt = w.OC?.requestToken || w.oc_requesttoken || ''
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (rt) headers.requesttoken = rt
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify(body || {}),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }

  async function deleteJson(url: string): Promise<any> {
    const w: any = typeof window !== 'undefined' ? window : {}
    const rt = w.OC?.requestToken || w.oc_requesttoken || ''
    const headers: Record<string, string> = {}
    if (rt) headers.requesttoken = rt
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    return text ? JSON.parse(text) : {}
  }

  return {
    route,
    getJson,
    postJson,
    deleteJson,
    root,
  }
}
