"""society_mgmt — Python re-implementation of the Society Management modules.

A JavaScript→Python refactor that consolidates the arithmetic shared by the
33,105 byte-identical ``mod_N_K`` functions of the original 28-file source
into a single canonical :func:`society_mgmt.core.society_compute`. The 28,305
names from the 24 production modules are re-exposed as thin, name-preserving
bindings across the nine layer sub-packages (``controllers``, ``services``,
``models``, ``routes``, ``utils``, ``middleware``, ``config``,
``repositories``, ``domain``); the four test-source modules (the remaining
4,800 functions) become the ``pytest`` equivalence suite rather than bindings.

The layer package names are retained as **structural labels only** — they
carry no MVC / service / data-access / routing / configuration / middleware
behavior, because none existed in the original source.
"""

from society_mgmt.core import society_compute

__all__ = ["society_compute"]
