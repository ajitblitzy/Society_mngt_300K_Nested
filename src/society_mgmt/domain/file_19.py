"""mod_19 - society module: name-preserving bindings to society_compute.

The original JavaScript module ``src/domain/file_19.js`` declared 1200
byte-identical functions ``mod_19_0`` .. ``mod_19_1199``. Each is re-exposed
here as a thin, name-preserving binding that delegates to
:func:`society_mgmt.core.society_compute`, so the public API is preserved
while the arithmetic exists exactly once (DRY / Extract-Function). The
unused ``const store = []`` from the source is intentionally dropped
(dead-code elimination).
"""

from society_mgmt.core import society_compute


def _make_binding(name: str):
    """Return a thin wrapper delegating to society_compute, named *name*."""

    def _binding(x: int | float) -> int | float:
        return society_compute(x)

    _binding.__name__ = name
    _binding.__qualname__ = name
    return _binding


for _i in range(1200):
    _name = f"mod_19_{_i}"
    globals()[_name] = _make_binding(_name)

del _i, _name
