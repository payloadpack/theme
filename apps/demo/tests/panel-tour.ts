import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { test } from '@playwright/test'

import {
  AUTH_FILE,
  baseURL,
  clickAndWaitForSave,
  deleteSavedAppearance,
  demoCookie,
  findShowcase,
  openAppearancePanel,
  radioInGroup,
  radioLabel,
  waitForHydration
} from './demo'

const TOUR_VIEWPORT = { height: 800, width: 1280 }
const PAUSE_PER_TOUR_STEP_MS = 1200

const TOUR_STEPS = [
  ['Palette', 'Warm'],
  ['Style', 'Studio'],
  ['Palette', 'Soft'],
  ['Style', 'Payload'],
  ['Style', 'Enhanced'],
  ['Palette', 'Neutral']
] as const

const convertVideoToGif = (videoPath: string, gifPath: string, startSeconds: number) =>
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    startSeconds.toFixed(2),
    '-i',
    videoPath,
    '-vf',
    'fps=12,scale=960:-1:flags=lanczos,split[frames][source];[source]palettegen=stats_mode=diff[palette];[frames][palette]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
    '-loop',
    '0',
    gifPath
  ])

for (const theme of ['dark', 'light']) {
  test(theme, async ({ browser }, testInfo) => {
    test.setTimeout(120_000)
    const context = await browser.newContext({
      baseURL,
      recordVideo: { dir: testInfo.outputDir, size: TOUR_VIEWPORT },
      storageState: AUTH_FILE,
      viewport: TOUR_VIEWPORT
    })
    const recordingStartedAt = Date.now()
    const page = await context.newPage()
    await deleteSavedAppearance(page.request)
    await context.addCookies([demoCookie('theme', theme)])
    await page.goto((await findShowcase(page)).path, { waitUntil: 'networkidle' })
    await waitForHydration(page)
    const tourStartSeconds = (Date.now() - recordingStartedAt) / 1000

    await page.waitForTimeout(PAUSE_PER_TOUR_STEP_MS)
    const sheet = await openAppearancePanel(page)
    for (const [radioGroupName, radioName] of TOUR_STEPS) {
      await page.waitForTimeout(PAUSE_PER_TOUR_STEP_MS)
      await clickAndWaitForSave(page, radioLabel(radioInGroup(sheet, radioGroupName, radioName)))
    }
    await page.waitForTimeout(PAUSE_PER_TOUR_STEP_MS)

    const video = page.video()
    if (!video) {
      throw new Error('The tour page has no video')
    }
    await context.close()
    convertVideoToGif(
      await video.path(),
      fileURLToPath(new URL(`../../../.github/assets/panel-tour-${theme}.gif`, import.meta.url)),
      tourStartSeconds
    )
  })
}
