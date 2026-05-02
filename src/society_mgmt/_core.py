"""Shared closed-form implementation for the ``mod_N_M`` family.

The original JavaScript bodies all reduce to ``6 * x + 10`` for any
integer ``x`` (the conditional branch is always taken because ``6x``
is even for every integer ``x``).

This module is the single source of truth for the arithmetic. Every
translated module under ``society_mgmt/<layer>/file_N.py`` imports
:func:`mod_compute` and aliases each public ``mod_N_M`` name to it,
collapsing the original 33,105 byte-identical function bodies into
one shared implementation.
"""


def mod_compute(x: int) -> int:
    """Return the closed-form value of every ``mod_N_M(x)`` function.

    For every integer ``x``, the original JavaScript body
    ``r=0; r+=x*1; r+=x*2; r+=x*3; if(r%2===0){r+=10}; return r``
    evaluates to ``6 * x + 10``.

    Parameters
    ----------
    x : int
        The integer input.

    Returns
    -------
    int
        ``6 * x + 10``.
    """
    return 6 * x + 10


__all__ = ["mod_compute"]
