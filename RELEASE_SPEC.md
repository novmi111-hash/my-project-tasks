# Free 2.5.0

The functional specification and boundaries are documented in README.md and README_RU.md. This version adds independently optional Week and Month columns to 2.3.0 and fixes initialization when the physical folders exist before the vault index is ready. Periods are based on planned dates, with Week taking precedence over Month. Both columns default to hidden; recurrence remains completion-driven.

2.5.0 adds manual archive/unarchive and a filtered Archive tab. State is retained without moving files. No automatic archival is implemented.
