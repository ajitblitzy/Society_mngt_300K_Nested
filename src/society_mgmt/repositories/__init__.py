"""society_mgmt.repositories — `repositories` layer package.

Structural label only: this package groups the modules ported from the
original ``src/repositories`` JavaScript folder. It carries no data-access,
persistence, or Repository-pattern behavior — none existed in the source.
Each module re-exposes its original ``mod_N_K`` function names as
name-preserving bindings delegating to
:func:`society_mgmt.core.society_compute`.
"""
