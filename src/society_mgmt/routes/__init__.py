"""society_mgmt.routes — ``routes`` layer sub-package.

Structural label only: this package performs **no** routing/HTTP/endpoint
behavior (none existed in the original JavaScript source — AAP §0.6.5). It
groups the name-preserving binding modules :mod:`~society_mgmt.routes.file_3`,
:mod:`~society_mgmt.routes.file_14` and :mod:`~society_mgmt.routes.file_25`,
each of which re-exposes its original ``mod_N_K`` functions as thin wrappers
that delegate to :func:`society_mgmt.core.society_compute`.
"""
