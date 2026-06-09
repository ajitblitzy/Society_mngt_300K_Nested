"""society_mgmt.controllers — layer sub-package (structural label only).

This package carries NO controller / MVC / request-handling behavior; the
name is retained purely for structural fidelity with the original
JavaScript source. Each ``file_*`` module re-exposes its original
``mod_N_K`` function names as thin, name-preserving bindings that delegate
to :func:`society_mgmt.core.society_compute`.
"""
