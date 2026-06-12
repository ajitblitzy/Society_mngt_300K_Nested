"""Unit tests: literal JS oracle + documented parity boundaries.

Authored to replace the assertion-free source module tests/unit/file_20.js.
"""

import pytest

from society_mgmt.core import society_compute

SAFE_INT = 2**53  # IEEE-754 safe-integer boundary (Number.MAX_SAFE_INTEGER).

DOMAIN = [-1000, -7, -2, -1, 0, 1, 2, 7, 1000, 1000000, 0.5, 1.5, 2.5, -0.5]


def _js_oracle(x):
    """Literal transliteration of the original JS mod_N_K body."""
    r = 0
    r += x * 1
    r += x * 2
    r += x * 3
    if r % 2 == 0:
        r += 10
    return r


@pytest.mark.parametrize("x", DOMAIN)
def test_oracle_matches_society_compute(x):
    assert society_compute(x) == _js_oracle(x)


@pytest.mark.parametrize(
    "x, expected",
    [(0.5, 3.0), (1.5, 9.0), (2.5, 15.0)],
)
def test_non_integer_modulo_governs_result(x, expected):
    # For these floats 6x is odd, so +10 is NOT applied.
    assert society_compute(x) == expected


def test_safe_integer_domain_is_exact():
    # Within the IEEE-754 safe domain results match; Python int stays exact.
    assert society_compute(SAFE_INT) == 6 * SAFE_INT + 10


def test_python_int_exact_beyond_safe_domain():
    # Documented divergence: Python int is exact above 2**53 (JS would not be).
    big = SAFE_INT + 1
    assert society_compute(big) == 6 * big + 10


def test_string_coercion_not_replicated():
    # Numeric-domain contract only: JS "5"*1 -> 5 is intentionally NOT replicated.
    with pytest.raises(TypeError):
        society_compute("5")
