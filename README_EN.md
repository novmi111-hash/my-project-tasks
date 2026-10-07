# My Project Tasks Free 2.2.1

Installable multilingual Free edition based on Free 2.2.0, with a simplified board and recurring-task history. Tasks and projects remain Markdown files in your Obsidian vault. No account, network connection, license activation or artificial task limits.

## Install / upgrade

1. First try this build in a copy of your vault. Native Obsidian execution has not been tested here; see TEST_REPORT.md.
2. Disable the previous My Project Tasks plugin. Back up your task/project folders and `.obsidian/plugins/my-project-tasks`.
3. Copy **main.js, manifest.json, styles.css** from this package's `my-project-tasks` folder to your vault's `.obsidian/plugins/my-project-tasks/`, replacing those three files. Use your custom config directory if applicable.
4. **Keep data.json** to preserve existing paths and settings. Do not copy the whole release package into the plugin directory.
5. Enable My Project Tasks Free and open it using the ribbon check icon or the command palette.
6. Select Русский, English, Español, Deutsch, Português (Brasil) or Français in plugin settings. The same plugin ID is retained; do not run both editions simultaneously.

## Language and dates

Automatic mode follows the Obsidian interface language, falling back to legacy app settings and then the device language if needed. Unsupported languages use English. Regional variants are recognized, including es-MX, de-AT, fr-CA, pt_BR and pt-PT; all Portuguese variants use the Brazilian translation in this release. Manual selection is retained after restarting.

Task/project forms, menus, commands and plugin messages are translated. User-written task titles, project names and descriptions remain untouched. Missing translation keys fall back to English.

Displayed dates use ru-RU, en-US, es-ES, de-DE, pt-BR or fr-FR. Stored dates remain YYYY-MM-DD, and date input controls follow the host system format. The existing Free-2.2.0 backup directory is retained; this language update does not migrate task files.

Translations have not been independently reviewed by native speakers. Native visual layout remains unverified; automated checks use a test DOM.

## Features

Three fixed columns: Backlog, Today, Done. Projects and colors, three priorities, planned date, Markdown description, checklists, drag-and-drop and accessible menu actions. Search includes title, description and checklist. Filter by project; sort manually, by date or priority. Today groups overdue and current tasks. Done displays newest completion dates first and loads history in batches of 50. Daily, weekly and monthly repeats are free. No calendar, custom columns, separate archive or deadline editor; existing values are retained.

Moving to Today sets today's date; moving from another column to Backlog clears the occurrence date. Reordering within a column keeps dates unchanged. Completion retains the planned date and sets a separate completion date. Restore keeps the planned date; dragging out of Done applies the target column's rules.

Repeating tasks create one next occurrence after completion, retaining the completed instance. The next date is later than both the scheduled occurrence and the completion day. Missed periods are skipped. Monthly series retain the original day (31 January → last day of February → 31 March). Manual postponement does not reset the series calendar. Restoring a completed occurrence with an existing successor makes the restored task one-off. Clearing the current date retains the series; finishing that task uses the retained schedule. Deleting the active occurrence stops that series, while deleting history does not remove the active task.

## Data protection

No bulk migration at startup. Before the first edit of each file, its original contents are saved as JSON under `MyProjectTasksBackups/Free-2.2.0/`, using `originalPath` and `content`. Unknown property values are preserved, but YAML formatting and YAML comments may change; backups preserve the original text. Stale modal edits are rejected rather than overwriting external changes.

Project display renaming keeps the Markdown path stable. Deleting a project clears task associations after confirmation and retains the tasks. Deletion uses Obsidian's trash preference. The legacy archive flag does not imply completion. Auto-archiving is disabled in Free.

To roll back, restore a complete pre-upgrade vault snapshot and the previous plugin build together. Running 2.1.5 on the new recurring history is unsafe because its old logic can advance completed recurring tasks. Per-file automatic backups are not a complete vault snapshot.

## Verification limits

The manifest API baseline is Obsidian 1.6.6. Native desktop/mobile execution, actual theme rendering and multi-device synchronization conflicts have not been validated here. Tests cover core logic and simulated Vault/DOM interactions; they are not proof of native performance. Single-process duplicate completion is protected; concurrent completion on different devices is not guaranteed to merge into one successor.

Source is in `src/`; build with `node build.cjs`. Run tests with `node --test tests/*.test.cjs` (Node.js 18+). No extra npm packages are needed for those tests. The package has not been published to the Obsidian catalog or a sales website.
