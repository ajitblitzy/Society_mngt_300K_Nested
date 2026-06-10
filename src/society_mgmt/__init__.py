"""society_mgmt — Python re-implementation of the Society Management modules.

A JavaScript→Python refactor that consolidates the arithmetic shared by the
33,105 byte-identical ``mod_N_K`` functions of the original 28-file source
into a single canonical :func:`society_mgmt.core.society_compute`. All 33,105
names are re-exposed as thin, name-preserving bindings so the public function
surface is preserved exactly: 28,305 across the nine production layer
sub-packages (``controllers``, ``services``, ``models``, ``routes``,
``utils``, ``middleware``, ``config``, ``repositories``, ``domain``) and the
remaining 4,800 (from the four test-source modules) across ``tests_unit`` and
``tests_integration``. Those four test-source modules are additionally
reproduced as the genuine ``pytest`` equivalence suite under the top-level
``tests/`` package.

The layer package names are retained as **structural labels only** — they
carry no MVC / service / data-access / routing / configuration / middleware
behavior, because none existed in the original source.
"""

from society_mgmt.core import society_compute

__all__ = ["society_compute"]
