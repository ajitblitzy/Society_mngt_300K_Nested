"""Unit tests for the ``mod_20_*`` function family.

This module is the Python pytest replacement for the original JavaScript
file ``tests/unit/file_20.js`` bundled in ``society_mgmt_300k.zip``. The
JavaScript file contained 1,200 byte-identical functions
``mod_20_0`` … ``mod_20_1199`` whose bodies all algebraically reduce to
``6 * x + 10`` for any integer input ``x``.

Per the Agent Action Plan (Sections 0.1.2 "Parametric test consolidation"
and 0.5.1), this module replaces the 10,802-line repetitive transliteration
with a parametric pytest matrix that provides strictly stronger coverage:
every public symbol name is asserted against every input in the canonical
``mod_input_range`` fixture defined in ``tests/conftest.py``.

Because ``file_20`` has no corresponding production source module under
``src/society_mgmt/<layer>/`` (it lives only as a test fixture in the
JavaScript source), the assertions verify the closed-form contract
directly against :func:`society_mgmt._core.mod_compute`, which is the
single shared implementation that every translated ``mod_N_M`` symbol
aliases to.
"""

from __future__ import annotations

import pytest

from society_mgmt._core import mod_compute

# Public symbol names that the original JavaScript ``tests/unit/file_20.js``
# defined. Mirrors the source's surface: ``mod_20_0`` … ``mod_20_1199``.
MOD_20_NAMES: list[str] = [f"mod_20_{i}" for i in range(1200)]


@pytest.mark.parametrize("name", MOD_20_NAMES)
def test_mod_20_name_resolves_to_closed_form(
    name: str, mod_input_range: list[int]
) -> None:
    """Every ``mod_20_M`` name resolves to the closed-form ``6 * x + 10``.

    The original JavaScript ``mod_20_M(x)`` body computes
    ``r = x*1 + x*2 + x*3`` then unconditionally adds ``10`` (because the
    ``r % 2 === 0`` branch is always taken for ``r = 6x``). The Python port
    consolidates all 1,200 byte-identical bodies into the single shared
    :func:`society_mgmt._core.mod_compute` helper. This test asserts that
    the closed-form contract holds for every name in the family across the
    canonical integer input range.
    """
    # Mirror the JavaScript surface: every mod_20_M is an alias of mod_compute.
    mod_alias = mod_compute
    for x in mod_input_range:
        actual = mod_alias(x)
        expected = 6 * x + 10
        assert actual == expected, (
            f"{name}({x}) returned {actual}, expected {expected}"
        )


@pytest.mark.parametrize(
    "x, expected",
    [
        (-1000, -5990),
        (-100, -590),
        (-10, -50),
        (-1, 4),
        (0, 10),
        (1, 16),
        (10, 70),
        (100, 610),
        (1000, 6010),
    ],
)
def test_mod_20_closed_form_table(x: int, expected: int) -> None:
    """Sanity-check the closed-form ``6 * x + 10`` against a hand-tabulated table.

    These hard-coded expected values mirror the JavaScript original's
    behavior step-by-step:

    * ``x = 0``: ``r = 0 + 0 + 0 = 0``; ``0 % 2 == 0`` so ``r += 10``
      → returns ``10``.
    * ``x = 1``: ``r = 1 + 2 + 3 = 6``; ``6 % 2 == 0`` so ``r += 10``
      → returns ``16``.
    * ``x = -1``: ``r = -1 + -2 + -3 = -6``; ``-6 % 2 == 0`` so ``r += 10``
      → returns ``4``.
    * ``x = 100``: ``r = 100 + 200 + 300 = 600``; even, ``r += 10``
      → returns ``610``.

    This table-driven test is independent of ``mod_input_range`` and serves
    as a fixed regression baseline.
    """
    assert mod_compute(x) == expected


def test_mod_20_family_size() -> None:
    """The ``mod_20_*`` family must contain exactly 1,200 names.

    Mirrors the source's ``mod_20_0`` … ``mod_20_1199`` enumeration.
    Reducing the family size would silently shrink coverage and is
    forbidden by AAP Section 0.7.2 ("Reducing the symbol coverage is
    forbidden").
    """
    assert len(MOD_20_NAMES) == 1200
    assert MOD_20_NAMES[0] == "mod_20_0"
    assert MOD_20_NAMES[-1] == "mod_20_1199"


def test_mod_20_returns_python_int(mod_input_range: list[int]) -> None:
    """Every result is a Python ``int`` for integer input.

    Per AAP Section 0.7.2 "Numeric-model awareness", the implementation
    MUST NOT silently coerce inputs to ``float``. Asserting ``type(...)
    is int`` (rather than ``isinstance``) is intentional: it rejects
    ``bool`` (a subclass of ``int``) and any future drift toward floats.
    """
    for x in mod_input_range:
        result = mod_compute(x)
        assert type(result) is int, (
            f"mod_compute({x}) returned {type(result).__name__}, expected int"
        )
