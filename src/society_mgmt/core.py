"""Canonical computation for the society_mgmt package.

This module holds the single source of truth for the arithmetic that was
duplicated across 33,105 byte-identical JavaScript functions (``mod_N_K``)
in the original codebase. Every layer module re-exposes its original
function names as thin, name-preserving bindings that delegate to
:func:`society_compute`, so the public API surface is preserved while the
logic exists exactly once (DRY / Extract-Function).
"""


def society_compute(x: int | float) -> int | float:
    """Faithful port of the original ``mod_N_K(x)`` body.

    Computes ``r = x*1 + x*2 + x*3`` (i.e. ``6 * x``) and then adds ``10``
    when ``r`` is even.

    The modulo test is kept deliberately (rather than hardcoding ``+10``):
    for integer ``x`` the intermediate ``6 * x`` is always even, so ``+10``
    always applies; but for non-integer ``x`` the parity test genuinely
    governs whether ``10`` is added.

    Args:
        x: A numeric value (``int`` or ``float``). The contract is
            numeric-domain only.

    Returns:
        The computed value following the original contract.

    Examples:
        >>> society_compute(0)
        10
        >>> society_compute(1)
        16
        >>> society_compute(2)
        22
        >>> society_compute(-2)
        -2
        >>> society_compute(0.5)
        3.0
    """
    r = x * 1 + x * 2 + x * 3
    return r + 10 if r % 2 == 0 else r
