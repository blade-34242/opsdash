import { test, expect, Page, request as playwrightRequest } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PRIMARY_USER = process.env.PLAYWRIGHT_USER || 'admin'
const SECOND_USER = process.env.PLAYWRIGHT_SECOND_USER
const SECOND_PASS = process.env.PLAYWRIGHT_SECOND_PASS

async function seedCalendarEvent(page: Page, baseURL: string, summary: string, durationHours = 2): Promise<string | null> {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0))
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)
  const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const dtstamp = format(now)
  const dtstart = format(start)
  const dtend = format(end)
  const uid = `opsdash-e2e-${Date.now()}@local`
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Opsdash//Integration Test//EN\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${dtstamp}\nDTSTART:${dtstart}\nDTEND:${dtend}\nSUMMARY:${summary}\nEND:VEVENT\nEND:VCALENDAR\n`
  const encodedUser = encodeURIComponent(PRIMARY_USER)
  const url = `${baseURL}/remote.php/dav/calendars/${encodedUser}/personal/${encodeURIComponent(uid)}.ics`
  const response = await page.request.put(url, {
    data: ics,
    headers: { 'Content-Type': 'text/calendar' },
  })
  if (!response.ok()) {
    return null
  }
  return url
}

async function removeCalendarResource(page: Page, resourceUrl: string) {
  try {
    await page.request.delete(resourceUrl)
  } catch {
    // ignore cleanup errors
  }
}

async function dismissOnboardingIfVisible(page: Page) {
  const dialog = page.getByRole('dialog')
  const onboardingHeading = page.getByRole('heading', { name: 'Welcome to Opsdash' })
  if (await onboardingHeading.isVisible({ timeout: 1000 }).catch(() => false)) {
    const closeButton = dialog.getByRole('button', { name: 'Close onboarding' })
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click()
      await expect(onboardingHeading).toBeHidden({ timeout: 15000 })
    } else {
      await markOnboardingComplete(page)
      await page.reload({ waitUntil: 'networkidle' })
      await expect(onboardingHeading).toBeHidden({ timeout: 15000 })
    }
  }
  await dismissReleaseNotesIfVisible(page)
}

async function markOnboardingComplete(page: Page) {
  await page.evaluate(async () => {
    const token = (window as any).OC?.requestToken || (window as any).oc_requesttoken || ''
    const appVersion = String(document.getElementById('app')?.dataset?.opsdashVersion || '').replace(/^v/i, '')
    await fetch('/index.php/apps/opsdash/overview/persist', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { requesttoken: token } : {}),
      },
      body: JSON.stringify({
        onboarding: {
          completed: true,
          version: 1,
          strategy: 'total_only',
          completed_at: new Date().toISOString(),
          dashboardMode: 'standard',
          releaseNotesSeenVersion: appVersion,
        },
      }),
    })
  })
}

async function dismissReleaseNotesIfVisible(page: Page) {
  const dialog = page.getByRole('dialog')
  const releaseHeading = page.getByRole('heading', { name: /^Opsdash 0\./ })
  if (!(await releaseHeading.isVisible({ timeout: 1000 }).catch(() => false))) {
    return
  }

  const closeButton = dialog.getByRole('button', { name: 'Close release notes' })
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click()
    await expect(releaseHeading).toBeHidden({ timeout: 15000 })
    return
  }

  await page.locator('.onboarding-backdrop').click({ force: true })
  await expect(releaseHeading).toBeHidden({ timeout: 15000 })
}

async function openOnboardingWizardFromSidebar(page: Page) {
  const heading = page.getByRole('heading', { name: 'Welcome to Opsdash' })
  if (await heading.isVisible({ timeout: 1000 }).catch(() => false)) {
    return
  }

  const trigger = page.getByRole('button', { name: 'Open setup wizard' })
  await trigger.click()

  await expect(heading).toBeVisible({ timeout: 15000 })
}

async function openProfilesOverlay(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Profiles' })
  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    return
  }

  const trigger = page.getByRole('button', { name: 'Profiles and backups' })
  await trigger.click()

  await expect(dialog).toBeVisible({ timeout: 10000 })
}

async function ensureFreshOpsdashCss(page: Page) {
  await page.evaluate(async () => {
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find((link) => link.getAttribute('href')?.includes('/apps-extra/opsdash/css/style.css'))
    if (!existing) return
    const href = `${existing.getAttribute('href')?.split('?')[0]}?fresh=${Date.now()}`
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    await new Promise<void>((resolve, reject) => {
      link.onload = () => resolve()
      link.onerror = () => reject(new Error('failed to load fresh stylesheet'))
      document.head.appendChild(link)
    })
  })
}

async function resolveNcRoute(page: Page, route: string): Promise<string> {
  return await page.evaluate((rawRoute) => {
    const normalized = rawRoute.startsWith('/') ? rawRoute : `/${rawRoute}`
    const win = window as any

    if (typeof win?.OC?.generateUrl === 'function') {
      try {
        return win.OC.generateUrl(normalized)
      } catch {
        // Fallback below for environments where generateUrl is not fully initialized.
      }
    }

    const root = String((win.OC && (win.OC.webroot || win.OC.getRootPath?.())) || win._oc_webroot || '').replace(/\/$/, '')
    if (!root) {
      return `/index.php${normalized}`
    }
    if (root.endsWith('/index.php')) {
      return `${root}${normalized}`
    }
    return `${root}/index.php${normalized}`
  }, route)
}

async function loginUser(page: Page, baseURL: string, username: string, password: string) {
  await page.goto(baseURL + '/index.php/logout').catch(() => {})
  await page.goto(baseURL + '/index.php/login?clear=1')
  const userInput = page.locator('input#user')
  const passwordInput = page.locator('input#password')
  const ensureAttached = async () => {
    try {
      await page.waitForSelector('input#user', { state: 'attached', timeout: 15000 })
      await page.waitForSelector('input#password', { state: 'attached', timeout: 15000 })
      return true
    } catch {
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      await page.reload().catch(() => {})
      try {
        await page.waitForSelector('input#user', { state: 'attached', timeout: 10000 })
        await page.waitForSelector('input#password', { state: 'attached', timeout: 10000 })
        return true
      } catch {
        return false
      }
    }
  }
  if (!(await ensureAttached())) {
    throw new Error('Login form did not become available')
  }
  const visible = await userInput.isVisible({ timeout: 2000 }).catch(() => false)
  if (visible) {
    await userInput.fill(username)
    await passwordInput.fill(password)
  } else {
    const filled = await page.evaluate(([u, p]) => {
      const userEl = document.querySelector<HTMLInputElement>('input#user')
      const passEl = document.querySelector<HTMLInputElement>('input#password')
      if (!userEl || !passEl) {
        return false
      }
      userEl.value = u
      passEl.value = p
      return true
    }, [username, password])
    if (!filled) {
      throw new Error('Login inputs not found in DOM')
    }
  }
  await Promise.all([
    page.waitForNavigation({ url: /index.php\/(apps|login)/ }),
    page.click('button[type="submit"]'),
  ])
}


async function persistSelection(page: Page, calendars: string[]) {
  await page.evaluate(async (selected) => {
    const token = (window as any).OC?.requestToken || (window as any).oc_requesttoken || ''
    await fetch('/index.php/apps/opsdash/overview/persist', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { requesttoken: token } : {}),
      },
      body: JSON.stringify({ cals: selected }),
    })
  }, calendars)
}

test('Operational Dashboard loads without console errors', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissReleaseNotesIfVisible(page)
  await expect(page.locator('.opsdash')).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Dashboard tabs' })).toBeVisible()

  // ensure no opsdash Vue errors surfaced
  const hasOpsdashError = consoleErrors.some(line => line.includes('[opsdash] Vue error'))
  expect(hasOpsdashError, `Console errors encountered: ${consoleErrors.join('\n')}`).toBeFalsy()
})

test('Offset navigation keeps day-off trend visible', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)

  const prevButton = page.locator('button[title="Previous"]')
  if (await prevButton.isVisible().catch(() => false)) {
    await prevButton.click()
    await prevButton.click()
  }

  const trend = page.locator('.dayoff-card').first()
  if ((await trend.count()) === 0) {
    test.skip(true, 'Day-off trend card not present in current layout')
    return
  }
  await expect(trend).toBeVisible({ timeout: 15000 })
  const tiles = page.locator('.dayoff-tile')
  expect(await tiles.count()).toBeGreaterThan(1)
})

test('Onboarding wizard can be re-run from sidebar', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)

  await openOnboardingWizardFromSidebar(page)

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Welcome to Opsdash' })).toBeVisible()

  await dialog.getByRole('button', { name: 'Close onboarding' }).click()
  await expect(dialog).toBeHidden()
})

test('Only the widget configuration row floats below the Nextcloud header in edit mode', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)
  await ensureFreshOpsdashCss(page)

  await page.getByRole('button', { name: 'Edit layout' }).click()

  const appMain = page.locator('.app-main')
  const floatingRow = page.locator('.itb-row')
  const topBar = page.locator('.app-bar')
  const tabStrip = page.locator('.tab-strip')
  const editActionsRow = page.locator('.bar-row--edit-actions')

  await expect(floatingRow).not.toHaveClass(/itb-row--floating/)

  await appMain.evaluate((el) => {
    ;(el as HTMLElement).scrollTop = 500
    el.dispatchEvent(new Event('scroll'))
  })

  await expect(floatingRow).toHaveClass(/itb-row--floating/)
  await expect(topBar).not.toHaveClass(/app-bar--floating/)

  const metrics = await page.evaluate(() => {
    const row = document.querySelector('.itb-row') as HTMLElement | null
    const header = (document.querySelector('#header') || document.querySelector('header')) as HTMLElement | null
    const appBar = document.querySelector('.app-bar') as HTMLElement | null
    const tabs = document.querySelector('.tab-strip') as HTMLElement | null
    const editActions = document.querySelector('.bar-row--edit-actions') as HTMLElement | null
    if (!row || !header || !appBar || !tabs || !editActions) return null
    const rowStyle = getComputedStyle(row)
    const tabsStyle = getComputedStyle(tabs)
    const editActionsStyle = getComputedStyle(editActions)
    return {
      rowTop: row.getBoundingClientRect().top,
      headerBottom: header.getBoundingClientRect().bottom,
      rowPosition: rowStyle.position,
      appBarPosition: getComputedStyle(appBar).position,
      tabsPosition: tabsStyle.position,
      editActionsPosition: editActionsStyle.position,
    }
  })

  expect(metrics).not.toBeNull()
  expect(metrics?.rowPosition).toBe('fixed')
  expect(metrics?.appBarPosition).not.toBe('fixed')
  expect(metrics?.tabsPosition).not.toBe('fixed')
  expect(metrics?.editActionsPosition).not.toBe('fixed')
  expect(metrics!.rowTop).toBeGreaterThanOrEqual(metrics!.headerBottom + 8)
  await expect(tabStrip).toBeVisible()
  await expect(editActionsRow).toBeVisible()
})

test('Config preset can be saved via UI', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  const presetName = `E2E Preset ${Date.now()}`

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)
  await openProfilesOverlay(page)

  await page.getByLabel('Profile name').fill(presetName)
  const saveButton = page.getByRole('button', { name: 'Save current configuration' })
  await expect(saveButton).toBeEnabled()
  await page.getByRole('button', { name: 'Save current configuration' }).click()
  await expect(page.getByText(`Profile "${presetName}" saved`)).toBeVisible({ timeout: 15000 })
  const presetRow = page.locator('.preset-item').filter({ hasText: presetName })
  await expect(presetRow).toBeVisible({ timeout: 15000 })

  page.once('dialog', (dialog) => dialog.accept())
  await presetRow.getByRole('button', { name: 'Delete' }).click()
  await expect(presetRow).toBeHidden({ timeout: 15000 })
})

test('Config import applies theme preference', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  const importEnvelope = {
    version: 1,
    generated: new Date().toISOString(),
    payload: {
      cals: ['personal'],
      groups: { personal: 0 },
      targets_week: { personal: 12 },
      targets_month: { personal: 48 },
      targets_config: {
        totalHours: 12,
        categories: [],
        pace: { includeWeekendTotal: true, mode: 'days_only', thresholds: { onTrack: -2, atRisk: -10 } },
        forecast: { methodPrimary: 'linear', momentumLastNDays: 2, padding: 1.5 },
        ui: { showTotalDelta: true, showNeedPerDay: true, showCategoryBlocks: true },
        allDayHours: 8,
        timeSummary: {},
        activityCard: { showWeekendShare: true },
        balance: { categories: [], useCategoryMapping: true, thresholds: { noticeAbove: 0.15, noticeBelow: 0.15, warnAbove: 0.30, warnBelow: 0.30, warnIndex: 0.6 }, relations: { displayMode: 'ratio' }, trend: { lookbackWeeks: 1 }, dayparts: { enabled: false }, ui: { showNotes: false } },
      },
      theme_preference: 'light',
      onboarding: { completed: true, version: 1, strategy: 'total_only' },
    },
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)
  await openProfilesOverlay(page)

  importEnvelope.payload.theme_preference = 'dark'
  const fileInput = page.locator('.profiles-overlay input[type="file"][accept="application/json"]')
  await fileInput.setInputFiles({ name: 'opsdash-config.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(importEnvelope)) })

  await expect(page.locator('.opsdash')).toHaveClass(/opsdash-theme-dark/, { timeout: 15000 })
})

test('Config export downloads current envelope', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)
  await openProfilesOverlay(page)

  const tempFile = path.join(os.tmpdir(), `opsdash-export-${Date.now()}.json`)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export configuration' }).click(),
  ])

  await download.saveAs(tempFile)
  const raw = await fs.readFile(tempFile, 'utf-8')
  await fs.unlink(tempFile)

  const envelope = JSON.parse(raw)
  expect(envelope).toHaveProperty('payload')
  expect(Array.isArray(envelope.payload?.cals)).toBe(true)
  expect(Array.isArray(envelope.payload.cals)).toBe(true)
  expect(envelope.payload).toHaveProperty('targets_config')
})

test('Activity day-off trend widget renders on overview', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)

  const trendSection = page.locator('.dayoff-card').first()
  if ((await trendSection.count()) === 0) {
    test.skip(true, 'Day-off trend not available for this dataset')
    return
  }
  await expect(trendSection).toBeVisible()
  await expect(page.locator('.dayoff-tile').first()).toBeVisible()
})

test('Dashboard handles seeded calendar events without load failures', async ({ page, baseURL }) => {
  if (!baseURL) {
    test.skip()
    return
  }

  const seededSummary = `E2E Focus Block ${Date.now()}`
  await page.goto(baseURL + '/index.php/apps/opsdash/overview')
  await dismissOnboardingIfVisible(page)
  await persistSelection(page, ['personal'])
  const loadUrl = await resolveNcRoute(page, '/apps/opsdash/overview/load?range=week&offset=0&dbg=1')

  const resourceUrl = await seedCalendarEvent(page, baseURL, seededSummary, 30)
  if (!resourceUrl) {
    test.skip(true, 'Calendar DAV seeding unavailable in current environment')
    return
  }

  try {
    const seededResource = await page.request.get(resourceUrl)
    expect(seededResource.ok()).toBeTruthy()

    await page.getByRole('button', { name: 'Refresh' }).first().click()
    await expect.poll(async () => {
      const response = await page.request.get(loadUrl)
      if (!response.ok()) {
        return false
      }
      const payload = await response.json().catch(() => null)
      if (!payload || typeof payload !== 'object') {
        return false
      }
      return !Object.prototype.hasOwnProperty.call(payload, 'error')
    }, { timeout: 30000 }).toBe(true)
  } finally {
    await removeCalendarResource(page, resourceUrl)
  }
})

async function seedDeckData(page: Page, baseURL: string): Promise<boolean> {
  const password = process.env.PLAYWRIGHT_PASS || 'admin'
  const authHeader = 'Basic ' + Buffer.from(`${PRIMARY_USER}:${password}`).toString('base64')
  const deckFetch = (path: string, init: Parameters<Page['request']['fetch']>[1] = {}) => {
    return page.request.fetch(`${baseURL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'OCS-APIREQUEST': 'true',
        Authorization: authHeader,
        ...(init.headers || {}),
      },
    })
  }
  try {
    const board = await ensureBoard(deckFetch)
    if (!board) return false
    const stacks = await ensureStacks(deckFetch, board.id)
    if (!stacks) return false
    await Promise.all([
      ensureCard(deckFetch, board.id, stacks.inbox, 'Prep Opsdash Deck sync', 1),
      ensureCard(deckFetch, board.id, stacks.progress, 'Publish Ops report cards', 3),
      ensureCard(deckFetch, board.id, stacks.done, 'Archive completed Ops tasks', -1, true),
    ])
    return true
  } catch (error) {
    console.warn('[deck seed failed]', error)
    return false
  }
}

async function ensureBoard(
  fetcher: (path: string, init?: Parameters<Page['request']['fetch']>[1]) => Promise<Response>,
) {
  const title = 'Opsdash Deck QA'
  const res = await fetcher('/ocs/v2.php/apps/deck/api/v1/boards')
  if (!res.ok) return null
  const payload = await res.json().catch(() => null)
  const boards = payload?.ocs?.data ?? []
  let board = boards.find((b: any) => b?.title === title)
  if (!board) {
    const create = await fetcher('/ocs/v2.php/apps/deck/api/v1/boards', {
      method: 'POST',
      data: { title, color: '#2563EB' },
    })
    if (!create.ok) return null
    const created = await create.json().catch(() => null)
    board = created?.ocs?.data ?? null
  }
  return board
}

async function ensureStacks(
  fetcher: (path: string, init?: Parameters<Page['request']['fetch']>[1]) => Promise<Response>,
  boardId: number,
) {
  const stackRes = await fetcher(`/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks`)
  if (!stackRes.ok) return null
  const stackPayload = await stackRes.json().catch(() => null)
  let stacks = stackPayload?.ocs?.data ?? []
  const getOrCreate = async (title: string, order: number) => {
    let stack = stacks.find((s: any) => s?.title === title)
    if (stack) return stack
    const create = await fetcher(`/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks`, {
      method: 'POST',
      data: { title, order },
    })
    if (!create.ok) return null
    const json = await create.json().catch(() => null)
    stack = json?.ocs?.data ?? null
    stacks = [...stacks, stack].filter(Boolean)
    return stack
  }
  const inbox = await getOrCreate('Inbox', 10)
  const progress = await getOrCreate('In Progress', 20)
  const done = await getOrCreate('Done', 30)
  if (!inbox || !progress || !done) return null
  return { inbox, progress, done }
}

async function ensureCard(
  fetcher: (path: string, init?: Parameters<Page['request']['fetch']>[1]) => Promise<Response>,
  boardId: number,
  stack: any,
  title: string,
  daysFromNow: number,
  archived = false,
) {
  const due = new Date()
  due.setDate(due.getDate() + daysFromNow)
  const create = await fetcher(
    `/ocs/v2.php/apps/deck/api/v1/boards/${boardId}/stacks/${stack.id}/cards`,
    {
      method: 'POST',
      data: {
        title,
        order: Date.now(),
        type: 'plain',
        duedate: Math.floor(due.getTime() / 1000),
        description: 'Seeded by Opsdash e2e',
      },
    },
  )
  if (!create.ok) return
  if (archived) {
    const cardJson = await create.json().catch(() => null)
    const cardId = cardJson?.ocs?.data?.id
    if (cardId) {
      await fetcher(`/ocs/v2.php/apps/deck/api/v1/cards/${cardId}/archive`, { method: 'POST' })
    }
  }
}
