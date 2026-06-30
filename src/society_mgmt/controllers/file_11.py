"""mod_11 - society module (controllers layer): name-preserving bindings.

Python port of the original JavaScript module ``src/controllers/file_11.js``.
The source declared 1,200 byte-identical functions ``mod_11_0`` .. ``mod_11_1199``
(each computing ``r = x*1 + x*2 + x*3`` then ``+10`` when ``r`` is even). To
eliminate that duplication (the dominant de-duplication lever), the arithmetic
lives exactly once in :func:`society_mgmt.core.society_compute`; this module
re-exposes every original ``mod_11_K`` name as a thin, name-preserving wrapper
that delegates to it. The public function surface is therefore preserved while
the logic is defined only once (DRY).

``controllers`` is a structural label only and carries no controller/MVC
behavior, because none existed in the source. The unused ``const store = []``
from the JavaScript source is intentionally dropped as dead code.
"""

from society_mgmt.core import society_compute


def _bind(name: str):
    """Build a name-preserving wrapper that delegates to ``society_compute``.

    The wrapper's ``__name__`` and ``__qualname__`` are set to ``name`` so that
    each bound function remains importable and introspectable exactly as in the
    original source (e.g. ``mod_11_0``), while the computation is performed by
    the single canonical implementation in :mod:`society_mgmt.core`.
    """

    def _wrapper(x: int | float) -> int | float:
        return society_compute(x)

    _wrapper.__name__ = name
    _wrapper.__qualname__ = name
    return _wrapper


# Bind every original public name ``mod_11_0`` .. ``mod_11_1199`` (1,200 total,
# contiguous) into this module's namespace so each remains importable and
# callable, identical to the JavaScript source's public surface.
for _k in range(1200):
    _fname = f"mod_11_{_k}"
    globals()[_fname] = _bind(_fname)


del _k, _fname
