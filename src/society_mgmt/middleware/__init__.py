"""middleware layer package for :mod:`society_mgmt`.

This package name is a **structural label only**: it carries no
request-pipeline / middleware behavior (none existed in the original
JavaScript source). It groups the name-preserving bindings ported from
``src/middleware/file_5.js``, ``src/middleware/file_16.js``, and
``src/middleware/file_27.js`` (modules ``file_5``, ``file_16``, ``file_27``),
each of which re-exposes its original ``mod_N_K`` functions as thin wrappers
delegating to :func:`society_mgmt.core.society_compute`.
"""
