"""mod_15 - society module: name-preserving bindings for mod_15_0..mod_15_1199.

Each original ``mod_15_K`` name is bound at import time to a thin wrapper
that delegates to :func:`society_mgmt.core.society_compute`. The wrappers
are generated in a loop to avoid ~1,200 lines of duplicated boilerplate;
each binding's ``__name__``/``__qualname__`` is set so the public name is
preserved and remains importable/callable.

This module ports the JavaScript source ``src/utils/file_15.js`` (1,200
byte-identical ``mod_15_K`` functions). The original, never-read
``const store = []`` is dropped as dead state, and the arithmetic itself
is implemented exactly once in :mod:`society_mgmt.core` (DRY).
"""

from collections.abc import Callable

from society_mgmt.core import society_compute

# Type of every generated binding: numeric in, numeric out.
_NumberFn = Callable[[int | float], int | float]


def _make_binding(name: str) -> _NumberFn:
    """Build a name-preserving wrapper delegating to ``society_compute``.

    The returned callable has its ``__name__`` and ``__qualname__`` set to
    ``name`` so the original public identifier is preserved exactly.
    """

    def binding(x: int | float) -> int | float:
        return society_compute(x)

    binding.__name__ = name
    binding.__qualname__ = name
    return binding


# Generate the full contiguous set mod_15_0 .. mod_15_1199 by construction,
# so every original name is guaranteed to exist with no gaps.
for _i in range(1200):
    _name = f"mod_15_{_i}"
    globals()[_name] = _make_binding(_name)

del _i, _name
