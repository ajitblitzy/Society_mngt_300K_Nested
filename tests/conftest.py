"""Shared pytest fixtures for the society_mgmt test suite.

This conftest.py is auto-discovered by pytest from the ``tests/`` root, so
the fixtures defined below are available to every test module under
``tests/unit/`` and ``tests/integration/`` without any explicit import.

The single canonical fixture, :func:`mod_input_range`, supplies the
representative integer input space used to verify that every translated
``mod_N_M(x)`` function in the ``society_mgmt`` package returns the
closed-form value ``6 * x + 10``.
"""

from __future__ import annotations

import pytest


# Canonical integer input range for parametric mod_N_M(x) tests.
# Includes negative, zero, small-positive, and large-positive integers to
# exercise the closed-form equivalence ``mod_N_M(x) == 6 * x + 10`` across
# a representative slice of the integer domain.
MOD_INPUT_RANGE: list[int] = [
    -1000,
    -100,
    -10,
    -1,
    0,
    1,
    10,
    100,
    1000,
]


@pytest.fixture(scope="session")
def mod_input_range() -> list[int]:
    """Return the canonical integer input range for ``mod_N_M(x)`` tests.

    Returns
    -------
    list[int]
        A list of integer inputs that span negative, zero, and positive
        values, used by every parametric test in the suite to assert
        ``mod_N_M(x) == 6 * x + 10``.
    """
    return list(MOD_INPUT_RANGE)


def expected_mod_value(x: int) -> int:
    """Closed-form expectation for every ``mod_N_M(x)`` function.

    The original JavaScript body of every ``mod_N_M(x)`` reduces to
    ``6 * x + 10`` for any integer ``x`` (the conditional branch is
    always taken because ``6x`` is even for every integer ``x``).
    Tests can call this helper directly to assert behavioral
    equivalence with the centralized closed-form value.

    Parameters
    ----------
    x : int
        The integer input value supplied to a ``mod_N_M`` function.

    Returns
    -------
    int
        The closed-form expectation ``6 * x + 10``.
    """
    return 6 * x + 10
