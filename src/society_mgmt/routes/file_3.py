"""mod_3 - society module: name-preserving bindings for the routes layer.

Python port of the JavaScript module ``src/routes/file_3.js`` (delivered
inside ``society_mgmt_300k.zip``; there are no loose ``.js`` files in the
working tree). The 1200 byte-identical source functions ``mod_3_0`` ..
``mod_3_1199`` are regenerated here as thin, name-preserving wrappers that
delegate to the single canonical :func:`society_mgmt.core.society_compute`,
so the public API surface is preserved exactly while the arithmetic logic
exists in only one place (DRY / Extract-Function).

The unused source ``const store = []`` declaration is intentionally dropped
(dead-code elimination), and no module-level mutable state is introduced.
The ``routes`` label is a structural package name only: no routing, HTTP,
URL, or endpoint behavior is implemented here, because none existed in the
original JavaScript source.
"""

from collections.abc import Callable

from society_mgmt.core import society_compute

_MODULE_INDEX = 3
_FUNCTION_COUNT = 1200


def _make_binding(name: str) -> Callable[[int | float], int | float]:
    """Return a name-preserving wrapper that delegates to ``society_compute``.

    The wrapper preserves the original public function name (via ``__name__``
    and ``__qualname__``) while routing every call through the single
    canonical :func:`society_mgmt.core.society_compute`. It closes over the
    ``name`` parameter -- not the loop variable -- which keeps the factory
    safe under ruff rule ``B023``.

    Args:
        name: The original public function name to expose (e.g. ``mod_3_0``).

    Returns:
        A callable ``(x: int | float) -> int | float`` that returns the same
        value as the original ``mod_3_K`` function.
    """

    def binding(x: int | float) -> int | float:
        return society_compute(x)

    binding.__name__ = name
    binding.__qualname__ = name
    return binding


# Bind every original public name (mod_3_0 .. mod_3_1199) into the module
# namespace. range(_FUNCTION_COUNT) guarantees the exact contiguous surface
# with no omissions, gaps, or typos; each name resolves to its own wrapper.
for _i in range(_FUNCTION_COUNT):
    _name = f"mod_{_MODULE_INDEX}_{_i}"
    globals()[_name] = _make_binding(_name)


# Public surface: the full contiguous range of name-preserving callables.
__all__ = [f"mod_{_MODULE_INDEX}_{_i}" for _i in range(_FUNCTION_COUNT)]


# Drop the loop temporaries so the public namespace exposes only the 1,200
# mod_3_* callables (plus the _make_binding factory and imported helpers).
del _i, _name
