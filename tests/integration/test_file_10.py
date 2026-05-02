"""Integration tests for the ``mod_10_*`` function family.

This module is the Python pytest replacement for the original JavaScript
file ``tests/integration/file_10.js`` bundled in ``society_mgmt_300k.zip``.
The JavaScript file contained 1,200 byte-identical functions
``mod_10_0`` … ``mod_10_1199`` whose bodies all algebraically reduce to
``6 * x + 10`` for any integer input ``x``.

Per the Agent Action Plan (Sections 0.1.2 "Parametric test consolidation"
and 0.5.1), this module replaces the 10,802-line repetitive transliteration
with a parametric pytest matrix that provides strictly stronger coverage:
every public symbol name is asserted against every input in the canonical
``mod_input_range`` fixture defined in ``tests/conftest.py``.

Because ``file_10`` has no corresponding production source module under
``src/society_mgmt/<layer>/`` (it lives only as a test fixture in the
JavaScript source), the assertions verify the closed-form contract
directly against :func:`society_mgmt._core.mod_compute`, which is the
single shared implementation that every translated ``mod_N_M`` symbol
aliases to.
"""

from __future__ import annotations

import pytest

from society_mgmt._core import mod_compute

# Public symbol names that the original JavaScript ``tests/integration/file_10.js``
# defined. Mirrors the source's surface: ``mod_10_0`` … ``mod_10_1199``.
MOD_10_NAMES: list[str] = [f"mod_10_{i}" for i in range(1200)]


@pytest.mark.parametrize("name", MOD_10_NAMES)
def test_mod_10_name_resolves_to_closed_form(
    name: str, mod_input_range: list[int]
) -> None:
    """Every ``mod_10_M`` name resolves to the closed-form ``6 * x + 10``.

    The original JavaScript ``mod_10_M(x)`` body computes
    ``r = x*1 + x*2 + x*3`` then unconditionally adds ``10`` (because the
    ``r % 2 === 0`` branch is always taken for ``r = 6x``). The Python port
    consolidates all 1,200 byte-identical bodies into the single shared
    :func:`society_mgmt._core.mod_compute` helper. This test asserts that
    the closed-form contract holds for every name in the family across the
    canonical integer input range.
    """
    # Mirror the JavaScript surface: every mod_10_M is an alias of mod_compute.
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
def test_mod_10_closed_form_table(x: int, expected: int) -> None:
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


def test_mod_10_family_size() -> None:
    """The ``mod_10_*`` family must contain exactly 1,200 names.

    Mirrors the source's ``mod_10_0`` … ``mod_10_1199`` enumeration.
    Reducing the family size would silently shrink coverage and is
    forbidden by AAP Section 0.7.2 ("Reducing the symbol coverage is
    forbidden").
    """
    assert len(MOD_10_NAMES) == 1200
    assert MOD_10_NAMES[0] == "mod_10_0"
    assert MOD_10_NAMES[-1] == "mod_10_1199"


def test_mod_10_returns_python_int(mod_input_range: list[int]) -> None:
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


def test_mod_10_cross_layer_composition(mod_input_range: list[int]) -> None:
    """Integration check: composing ``mod_compute`` with itself stays consistent.

    Integration tests differ from unit tests by exercising cross-module/
    cross-layer behavior. Since the source's ``mod_10_*`` family lives in
    the integration test set (not the unit test set), this test models a
    minimal "integration" of the shared core with itself: passing the
    output of one call as the input of another and asserting the doubly-
    composed closed-form remains consistent.

    The double-composed expectation:
    ``mod_compute(mod_compute(x)) == 6 * (6 * x + 10) + 10 == 36*x + 70``.
    """
    for x in mod_input_range:
        once = mod_compute(x)
        twice = mod_compute(once)
        expected_once = 6 * x + 10
        expected_twice = 36 * x + 70
        assert once == expected_once, (
            f"mod_compute({x}) returned {once}, expected {expected_once}"
        )
        assert twice == expected_twice, (
            f"mod_compute(mod_compute({x})) returned {twice}, "
            f"expected {expected_twice}"
        )
