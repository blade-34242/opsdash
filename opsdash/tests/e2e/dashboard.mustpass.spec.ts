import { expect, test, type Page } from '@playwright/test'

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

test('must-pass: overview shell renders', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/index.php/apps/opsdash/overview`)
  await dismissOnboardingIfVisible(page)

  await expect(page.locator('.opsdash')).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Dashboard tabs' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh' }).first()).toBeVisible()
})

test('must-pass: profiles overlay opens and closes', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/index.php/apps/opsdash/overview`)
  await dismissOnboardingIfVisible(page)

  await page.getByRole('button', { name: 'Profiles and backups' }).click()
  const profilesDialog = page.getByRole('dialog', { name: 'Profiles' })
  await expect(profilesDialog).toBeVisible()
  await profilesDialog.getByRole('button', { name: 'Close' }).click()
  await expect(profilesDialog).toBeHidden()
})

test('must-pass: keyboard shortcuts overlay opens and closes', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/index.php/apps/opsdash/overview`)
  await dismissOnboardingIfVisible(page)

  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
  const shortcutsDialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' })
  await expect(shortcutsDialog.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeVisible()
  await shortcutsDialog.getByRole('button', { name: 'Close shortcuts overlay' }).click()
  await expect(shortcutsDialog).toBeHidden()
})
