"""society_mgmt — Python re-implementation of the Society Management modules.

A JavaScript→Python refactor that consolidates the arithmetic body —
duplicated across the 33,105 byte-identical ``mod_N_K`` functions in the
original source archive — into a single canonical
:func:`society_mgmt.core.society_compute`. The 24 production source modules
are re-exposed under every original name across the nine layer sub-packages
(``controllers``, ``services``, ``models``, ``routes``, ``utils``,
``middleware``, ``config``, ``repositories``, ``domain``), preserving a public
binding surface of 28,305 names. The four JavaScript *test-source* modules
(``file_9``, ``file_20``, ``file_10``, ``file_21``) are migrated to genuine
``pytest`` equivalence tests under the top-level ``tests/`` tree rather than
to importable binding modules.

The layer package names are retained as **structural labels only** — they
carry no MVC / service / data-access / routing / configuration / middleware
behavior, because none existed in the original source.
"""

from society_mgmt.core import society_compute

__all__ = ["society_compute"]
