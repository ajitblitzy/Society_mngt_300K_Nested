"""mod_15 - society module (utils layer).

Name-preserving bindings ported from the original ``src/utils/file_15.js``.
Each ``mod_15_K`` (``mod_15_0`` .. ``mod_15_1199``) delegates to
:func:`society_mgmt.core.society_compute`, so the arithmetic exists exactly
once (DRY). The bindings are generated in a loop, and each one's ``__name__``
and ``__qualname__`` are set to its original name so the public surface stays
importable and callable. ``utils`` is a structural label only and holds no
utility behavior (none existed in the source).
"""

from collections.abc import Callable

from society_mgmt.core import society_compute

# Signature shared by every generated binding: a pure numeric-domain callable.
_NumberFn = Callable[[int | float], int | float]


def _make_binding(name: str) -> _NumberFn:
    """Build a name-preserving wrapper that delegates to ``society_compute``.

    The returned callable forwards its argument unchanged to the single
    canonical implementation and carries ``name`` as its ``__name__`` and
    ``__qualname__`` so the original public identity is preserved.
    """

    def binding(x: int | float) -> int | float:
        return society_compute(x)

    binding.__name__ = name
    binding.__qualname__ = name
    return binding


# Bind every original public name ``mod_15_0`` .. ``mod_15_1199`` (1,200 names,
# contiguous, no gaps) into this module's namespace.
for _i in range(1200):
    _name = f"mod_15_{_i}"
    globals()[_name] = _make_binding(_name)

del _i, _name
