"""society_mgmt.tests_integration — structural-label package (no test behavior).

This package mirrors the original ``tests/integration`` source folder. It groups the
name-preserving modules ``file_10`` and ``file_21``, each re-exposing its original
``mod_N_K`` function names as thin bindings that delegate to
:func:`society_mgmt.core.society_compute`. The genuine pytest equivalence suite
lives in the top-level ``tests/`` package, not here.
"""
