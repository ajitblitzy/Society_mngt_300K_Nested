"""society_mgmt — Python re-implementation of the Society Management modules.

A JavaScript→Python refactor that consolidates 33,105 byte-identical
functions (``mod_N_K``) into a single canonical
:func:`society_mgmt.core.society_compute`, re-exposed under every original
name across the nine layer sub-packages (``controllers``, ``services``,
``models``, ``routes``, ``utils``, ``middleware``, ``config``,
``repositories``, ``domain``).

The layer package names are retained as **structural labels only** — they
carry no MVC / service / data-access / routing / configuration / middleware
behavior, because none existed in the original source.
"""

from society_mgmt.core import society_compute

__all__ = ["society_compute"]
