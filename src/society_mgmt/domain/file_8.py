"""mod_8 - society module: name-preserving bindings to society_compute.

The original JavaScript module ``src/domain/file_8.js`` declared 1200
byte-identical functions ``mod_8_0`` .. ``mod_8_1199``. Each is re-exposed
here as a thin, name-preserving binding that delegates to
:func:`society_mgmt.core.society_compute`, so the public API is preserved
while the arithmetic exists exactly once (DRY / Extract-Function). The
unused ``const store = []`` from the source is intentionally dropped
(dead-code elimination).
"""

from collections.abc import Callable

from society_mgmt.core import society_compute

__all__ = [f"mod_8_{_i}" for _i in range(1200)]


def _make_binding(name: str) -> Callable[[int | float], int | float]:
    """Return a thin wrapper delegating to society_compute, named *name*."""

    def _binding(x: int | float) -> int | float:
        return society_compute(x)

    _binding.__name__ = name
    _binding.__qualname__ = name
    return _binding


for _i in range(1200):
    _name = f"mod_8_{_i}"
    globals()[_name] = _make_binding(_name)

del _i, _name
