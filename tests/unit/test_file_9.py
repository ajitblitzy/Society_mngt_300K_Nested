"""Unit tests: closed-form parity for society_compute.

Authored to replace the assertion-free source module tests/unit/file_9.js.
Contract: r = x*1 + x*2 + x*3 (== 6x); add 10 when r is even.
"""

import pytest

from society_mgmt import society_compute as top_level_compute
from society_mgmt.core import society_compute

# Verified expected values (JS oracle == Python), AAP Sec 0.6.2.
EXPECTED = [
    (0, 10),
    (1, 16),
    (2, 22),
    (-1, 4),
    (-2, -2),
    (7, 52),
    (1000000, 6000010),
    (0.5, 3.0),
    (1.5, 9.0),
    (2.5, 15.0),
]


def _closed_form(x):
    """Reference closed form: 6x, plus 10 when 6x is even."""
    r = 6 * x
    return r + 10 if r % 2 == 0 else r


@pytest.mark.parametrize("x, expected", EXPECTED)
def test_expected_value_table(x, expected):
    assert society_compute(x) == expected


@pytest.mark.parametrize("x, expected", EXPECTED)
def test_matches_closed_form(x, expected):
    assert society_compute(x) == _closed_form(x)


@pytest.mark.parametrize("x", range(-50, 51))
def test_integer_domain_is_six_x_plus_ten(x):
    # For every integer x, 6x is even, so the result is always 6x + 10.
    assert society_compute(x) == 6 * x + 10


def test_integer_input_returns_int():
    result = society_compute(2)
    assert result == 22
    assert isinstance(result, int)


def test_float_input_returns_float():
    result = society_compute(0.5)
    assert result == 3.0
    assert isinstance(result, float)


def test_top_level_reexport_is_same_callable():
    assert top_level_compute is society_compute
