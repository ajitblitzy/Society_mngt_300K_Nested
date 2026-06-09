"""utils layer package for society_mgmt (structural label only).

This package groups the name-preserving binding modules ``file_4``,
``file_15`` and ``file_26``. Each module re-exposes its original
``mod_N_K`` function names as thin wrappers that delegate to the single
canonical :func:`society_mgmt.core.society_compute`.

The ``utils`` label is structural only: it carries no behavior. The
original ``filler.js`` padding is intentionally not migrated.
"""
