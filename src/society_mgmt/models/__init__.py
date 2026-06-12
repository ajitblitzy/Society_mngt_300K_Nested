"""society_mgmt.models — name-preserving bindings for the ``models`` layer.

This sub-package is one of the nine nominal layers carried over from the
original JavaScript source. The ``models`` name is retained as a
**structural label only** — it carries no data-model, schema, ORM, or
persistence behavior, because none existed in the source.

Its modules (``file_2``, ``file_13``, ``file_24``) re-expose their original
``mod_N_K`` function names as thin, name-preserving bindings that delegate to
:func:`society_mgmt.core.society_compute`.
"""
