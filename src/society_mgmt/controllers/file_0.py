"""mod_0 - society module: name-preserving bindings for mod_0_0..mod_0_1199.

Python port of the original ``src/controllers/file_0.js``. The 1,200
byte-identical ``mod_0_K`` functions from the source module are re-exposed
here as thin, name-preserving bindings that all delegate to
:func:`society_mgmt.core.society_compute`, so the arithmetic lives in exactly
one place (DRY / Extract-Function -- the dominant de-duplication lever).

The ``controllers`` package name is a structural label only and carries no
controller / MVC behavior; none existed in the source. The unused
``const store = []`` from the source module is intentionally dropped as dead
state.
"""

from society_mgmt.core import society_compute


def _bind(name: str):
    """Create a name-preserving wrapper that delegates to society_compute."""

    def _wrapper(x: int | float) -> int | float:
        return society_compute(x)

    _wrapper.__name__ = name
    _wrapper.__qualname__ = name
    return _wrapper


for _k in range(1200):
    _fname = f"mod_0_{_k}"
    globals()[_fname] = _bind(_fname)


del _k, _fname
