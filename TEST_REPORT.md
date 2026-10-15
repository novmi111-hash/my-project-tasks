# Free 2.3.0 verification — 2026-10-15

55 automated tests passed. Includes existing lifecycle, recurrence, localization and data preservation coverage plus calendar rendering/drop handlers, independent deadline changes, exact-file undo, recurring successor rollback, conflict detection, trash-failure rollback, quick entry, duplicate isolation and priority filters. Tests use in-memory Vault and DOM doubles, not a native Obsidian installation. See TEST-RESULTS.txt for this run.

Native desktop/mobile execution and multi-device concurrent editing remain unverified. Undo is session-only and excludes deletion.

Visual browser verification was attempted but blocked by unavailable Chromium and a failed browser download in this environment. CSS and mock-DOM checks do not verify actual Obsidian theme rendering.
