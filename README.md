# My Project Tasks Free

**Plan your day, organize projects, and keep your tasks inside Obsidian.**

My Project Tasks Free brings a visual Kanban-style board and a monthly calendar into your Obsidian vault. Track personal and work tasks without juggling separate apps. Your tasks and projects stay in local Markdown files—no account or activation required.

### At a glance

- **Visual task board:** Backlog, Today, Done, plus optional Week and Month columns.
- **Calendar planning:** view tasks by planned date or deadline; drag tasks to reschedule.
- **Project organization:** projects, color labels, priorities, checklists, and quick task entry.
- **Repeating tasks:** daily, weekly, and monthly recurrence after completion.
- **Stay organized:** search, filters, task duplication, and a manual Archive tab.
- **Six languages:** English, Русский, Español, Deutsch, Português (Brasil), and Français.

### Install in Obsidian

1. Open **Settings → Community plugins → Browse**.
2. Search for **My Project Tasks Free**.
3. Select **Install**, then **Enable**.
4. Open the task board using the ribbon icon or the command palette.

[View the community listing](https://community.obsidian.md/plugins/my-project-tasks) · [Русская документация](README_RU.md) · [Releases](https://github.com/novmi111-hash/my-project-tasks/releases) · [Report an issue](https://github.com/novmi111-hash/my-project-tasks/issues)

## Features in detail


- Backlog, Today and Done, plus optional Week and Month columns enabled independently in settings (both off by default); project colors, three priorities, descriptions and checklists.
- Monthly calendar with previous/next month and Today controls. Click a day number or empty day space to create a task; click a task to edit it.
- Switch the calendar between planned dates and deadlines. Dragging changes only the selected field. Completed tasks cannot be dragged in the calendar; restore them first. Date editing is also available through task forms and menus.
- Optional deadline under “Add a deadline”. Overdue deadlines are highlighted only on unfinished task cards. A planned date after the deadline is allowed and remains visible.
- Quick entry: type a title and press Enter (or use the adjacent button). The current project and priority filters are applied; a quick task starts without a date.
- Search title, description and checklist; filter by project and priority; sort manually, by date or priority.
- Task menu: tomorrow, in one week, choose date, duplicate and existing task actions. Tomorrow and one week are counted from today.
- Completed titles are struck through and muted. Calendar can hide completed tasks; Done history is loaded in batches of 50.
- Daily, weekly and monthly recurrence after completion, retaining completed instances.
- Six interface languages: English, Russian, Spanish, German, Brazilian Portuguese and French. Auto follows Obsidian; manual language choice persists. User content is not translated.

## Undo and duplicates

“Undo last change” reverses the last supported action in the current plugin session: creation, editing, checklist changes, moves, date changes, restoration or completion. Recurring completion undo also removes its newly created successor through Obsidian’s trash API. Undo requires affected files to remain unchanged; external edits block it. Undo is not persisted across restarts. A subsequent mutation replaces the undo slot. Deletion is not supported by this button and clears the slot; use Obsidian’s trash recovery for deleted files. Multi-file actions cannot be atomic across devices; simultaneous editing on different devices is not guaranteed safe.

Duplicates copy the title, project, dates, priority, description and checklist. Checklist completion is cleared, a new ID is assigned, and the copy is a one-off task. Enable recurrence separately if desired. Series identifiers and completion history are not copied.

## Dates and recurrence

Unfinished tasks dated today or earlier appear in Today. When enabled, Week contains future planned dates through Sunday, including dates across a month boundary. Month contains remaining future planned dates through the end of the current month. All other tasks appear in Backlog. Hiding a column does not edit task files. Moving to Today assigns today’s planned date; moving to Backlog clears it. Moving to Week assigns Sunday; moving to Month assigns the last day of this month. The column’s + button proposes the same date. On Sunday or month-end these dates may belong to Today; Week takes precedence over Month when periods overlap. Reordering within a column retains the date. Deadline is unaffected by these moves. Completion preserves planned date and records a separate completion date.

The next recurring instance is created only after completion. Its date is later than both the scheduled occurrence and completion day; missed periods are skipped. Monthly series preserve their original day across shorter months. Manually postponing an instance does not reset its series calendar. A successor’s deadline shifts by the number of calendar days between the old scheduled occurrence and the new one. The completed instance retains its original deadline.

Restoring history with an existing successor makes the restored task one-off. Deleting the active occurrence stops that series. If successor creation fails, opening the board retries recovery without duplicating an already created successor.

## Startup fix

Folder checks use physical storage when the Obsidian index is not ready, avoiding duplicate creation of existing folders. File collisions and genuine storage errors are still reported. Retry re-runs initialization after the storage problem is resolved.

## Install / update

Install through Obsidian’s Community plugins catalog or download main.js, manifest.json and styles.css from the GitHub Release assets. For manual updates disable the plugin and replace only those three files in `.obsidian/plugins/my-project-tasks/` (or your custom configuration directory). Keep `data.json` and the task/project folders. Enable the plugin and open it with the ribbon icon or command palette.

Back up your vault before upgrading, especially from 2.1.5. The plugin ID is unchanged: do not run both editions simultaneously. No bulk migration runs at startup. Old properties remain in files, including previous list and archive settings; Free does not provide customizable columns or automatic archiving; version 2.5.0 includes a dedicated tab for manually archived tasks.

## Data protection and verification

Before the first edit of a file, its original text is backed up as JSON (`originalPath`, `content`) under `MyProjectTasksBackups/Free-2.2.0/`. Unknown properties are preserved, but YAML formatting and comments may change on editing. Stale task forms cannot overwrite external edits. Project display renaming keeps the Markdown path stable. Deleting a project retains its tasks and clears their associations after confirmation.

Automatic per-file backups are not a full vault snapshot. Roll back to 2.1.5 only with a complete pre-upgrade vault snapshot and matching plugin build; its old recurrence logic is incompatible with Free’s history.

68 automated tests cover core logic and simulated Vault/DOM interactions. Native Obsidian execution, actual themes and multi-device conflicts are not certified by these tests. Translations have not been independently reviewed by native speakers. Minimum Obsidian version: 1.6.6.

## Development

Build: `node build.cjs`. Test: `node --test tests/*.test.cjs`. Sources are in `src/`. GitHub Actions verifies builds and publishes new manifest versions with the three installable assets. See LICENSE for usage and redistribution terms.

## Manual archive

Choose Archive task in the task menu. The Archive tab supports search, filters and Unarchive. Archived tasks are hidden from the board and calendar; files stay in place. Unarchive preserves completion status, planned date, deadline and recurrence. Reopen a completed task separately if needed. Archiving does not complete a task or create its next occurrence; existing successors remain active. Both actions support undo. Legacy archived: true tasks appear here too. No automatic archiving or retention settings are included.
