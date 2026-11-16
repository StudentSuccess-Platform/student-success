import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn } from '../helpers/auth.js'
import { BLAKE, uniqueText } from '../helpers/api.js'
import { openProfileTab, openStudentProfile, recordGroup, sectionWithHeading } from '../helpers/teacher.js'

// Record entry on Blake Rowe's profile (Carley's roster). Judson is left alone for the student specs.
// Every value is unique per run, so earlier runs in the shared database cannot make an assertion pass.
test.describe('teacher record entry', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.teacher)
    await expect(page).toHaveURL(/\/teacher\/dashboard$/)
    await openStudentProfile(page, BLAKE.name)
  })

  test('submitting empty forms shows named validation messages and saves nothing', async ({ page }) => {
    await openProfileTab(page, 'Grades')
    const grade = recordGroup(page, 'Enter a grade')
    await grade.getByRole('button', { name: 'Save grade' }).click()
    await expect(grade.getByText('Assignment is required')).toBeVisible()
    await expect(grade.getByText('Points earned is required')).toBeVisible()
    await expect(grade.getByRole('status')).toHaveCount(0)

    await openProfileTab(page, 'Attendance')
    const attendance = recordGroup(page, 'Record attendance')
    await attendance.getByRole('button', { name: 'Save attendance' }).click()
    await expect(attendance.getByText('Class is required')).toBeVisible()
    await expect(attendance.getByText('Date is required')).toBeVisible()

    await openProfileTab(page, 'Goals & Feedback')
    const goal = recordGroup(page, 'Add a goal')
    await goal.getByRole('button', { name: 'Add goal' }).click()
    await expect(goal.getByText('Goal title is required')).toBeVisible()

    const feedback = recordGroup(page, 'Write feedback')
    await feedback.getByRole('button', { name: 'Save feedback' }).click()
    await expect(feedback.getByText('Feedback is required')).toBeVisible()
  })

  test('a saved grade appears in the Grades table, and a second save replaces it', async ({ page }) => {
    await openProfileTab(page, 'Grades')
    const grade = recordGroup(page, 'Enter a grade')
    const assignment = grade.getByLabel('Assignment')
    await assignment.selectOption({ index: 1 })
    const label = (await assignment.locator('option:checked').textContent()) ?? ''
    const [className, ...titleParts] = label.split(' - ')
    const title = titleParts.join(' - ')
    expect(className && title).toBeTruthy()

    const gradesRows = sectionWithHeading(page, 'Grades').locator('tbody tr')
    const row = gradesRows.filter({ has: page.getByRole('cell', { name: title, exact: true }) })
      .filter({ has: page.getByRole('cell', { name: className, exact: true }) })

    await grade.getByLabel('Points earned').fill('41')
    await grade.getByRole('button', { name: 'Save grade' }).click()
    await expect(grade.getByRole('status')).toHaveText('Saved')
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('41 /')

    await grade.getByLabel('Assignment').selectOption({ index: 1 })
    await grade.getByLabel('Points earned').fill('47')
    await grade.getByRole('button', { name: 'Save grade' }).click()
    await expect(grade.getByRole('status')).toHaveText('Saved')
    await expect(row).toContainText('47 /')
    await expect(row).not.toContainText('41 /')
  })

  test('the edit icon and a double-click on a grade jump to the grade form for that assignment', async ({ page }) => {
    await openProfileTab(page, 'Grades')
    const gradesRows = sectionWithHeading(page, 'Grades').locator('tbody tr')
    const grade = recordGroup(page, 'Enter a grade')

    await gradesRows.first().getByRole('button', { name: /^Edit grade:/ }).click()
    await expect(grade).toBeInViewport()
    await expect(grade.getByLabel('Points earned')).toBeFocused()
    await expect(grade.getByTestId('grade-points-hint')).toContainText('Out of')

    const second = gradesRows.nth(1)
    const cells = await second.locator('td').allTextContents()
    await page.evaluate(() => window.scrollTo(0, 0))
    await second.dblclick()
    await expect(grade).toBeInViewport()
    const label = await grade.getByLabel('Assignment').locator('option:checked').textContent()
    expect(label).toBe(`${cells[0]} - ${cells[1]}`)

    // The total for the chosen assignment is enforced before anything is sent.
    await grade.getByLabel('Points earned').fill('100000')
    await grade.getByRole('button', { name: 'Save grade' }).click()
    await expect(grade.getByText(/cannot be more than/)).toBeVisible()
  })

  test('a recorded attendance day appears in the Attendance table', async ({ page }) => {
    await openProfileTab(page, 'Attendance')
    const attendance = recordGroup(page, 'Record attendance')
    const day = '2026-02-17'
    await attendance.getByLabel('Class').selectOption({ index: 1 })
    await attendance.getByLabel('Date').fill(day)
    await attendance.getByLabel('Status').selectOption('absent')
    await attendance.getByRole('button', { name: 'Save attendance' }).click()
    await expect(attendance.getByRole('status')).toHaveText('Saved')

    const rows = sectionWithHeading(page, 'Attendance').locator('tbody tr')
    await expect(rows.filter({ hasText: 'Feb 17, 2026' }).filter({ hasText: 'Absent' }).first()).toBeVisible()
  })

  test('a new goal appears under Goals and Progress, and a progress update is shown on it', async ({ page }) => {
    await openProfileTab(page, 'Goals & Feedback')
    const title = uniqueText('Goal')
    const goal = recordGroup(page, 'Add a goal')
    await goal.getByLabel('Goal title').fill(title)
    await goal.getByLabel('Description').fill('Practice two days a week')
    await goal.getByLabel('Target date').fill('2027-01-31')
    await goal.getByRole('button', { name: 'Add goal' }).click()
    await expect(goal.getByRole('status')).toHaveText('Saved')

    const goals = sectionWithHeading(page, 'Goals and Progress')
    const item = goals.locator('li').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    await expect(item).toContainText('Practice two days a week')
    await expect(item).toContainText('0% complete')

    const progress = recordGroup(page, 'Update goal progress')
    await progress.getByLabel('Goal').selectOption({ label: title })
    await progress.getByLabel('Progress (%)').fill('40')
    await progress.getByLabel('Note').fill('Solid week')
    await progress.getByRole('button', { name: 'Save goal progress' }).click()
    await expect(progress.getByRole('status')).toHaveText('Saved')

    await expect(item).toContainText('40% complete')
    await expect(item).toContainText('Latest update')
    await expect(item).toContainText('Solid week')
  })

  test('feedback is added to Teacher Feedback and can be edited there', async ({ page }) => {
    await openProfileTab(page, 'Goals & Feedback')
    const original = uniqueText('Feedback draft')
    const revised = uniqueText('Feedback revised')
    const feedback = recordGroup(page, 'Write feedback')
    await feedback.getByLabel('Class').selectOption({ index: 1 })
    await feedback.getByLabel('Feedback').fill(original)
    await feedback.getByRole('button', { name: 'Save feedback' }).click()
    await expect(feedback.getByRole('status')).toHaveText('Saved')

    const teacherFeedback = sectionWithHeading(page, 'Teacher Feedback')
    await expect(teacherFeedback.getByText(original)).toBeVisible()

    // Once the editor opens, the item's text is in a textarea, so scope to the open form instead.
    const existing = recordGroup(page, 'Existing feedback')
    await existing.locator('li').filter({ hasText: original }).getByRole('button', { name: 'Edit', exact: true }).click()
    const editor = existing.locator('form')
    await editor.getByLabel('Edit feedback').fill(revised)
    await editor.getByRole('button', { name: 'Save edited feedback' }).click()
    await expect(editor.getByRole('status')).toHaveText('Saved')

    await expect(teacherFeedback.getByText(revised)).toBeVisible()
    await expect(teacherFeedback.getByText(original)).toHaveCount(0)
  })
})
