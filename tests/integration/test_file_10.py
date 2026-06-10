"""Integration tests: name-binding parity across all nine layers.

Authored to replace the assertion-free source module
tests/integration/file_10.js. Proves that the preserved public names
delegate to society_compute, sampling one module per nominal layer.
"""

import pytest

from society_mgmt.config import file_6
from society_mgmt.controllers import file_0
from society_mgmt.core import society_compute
from society_mgmt.domain import file_8
from society_mgmt.middleware import file_5
from society_mgmt.models import file_2
from society_mgmt.repositories import file_7
from society_mgmt.routes import file_3
from society_mgmt.services import file_1
from society_mgmt.utils import file_4

# (module, attribute_name) sampled across every layer.
SAMPLED_NAMES = [
    (file_0, "mod_0_0"),
    (file_1, "mod_1_0"),
    (file_2, "mod_2_0"),
    (file_3, "mod_3_0"),
    (file_4, "mod_4_0"),
    (file_5, "mod_5_0"),
    (file_6, "mod_6_0"),
    (file_7, "mod_7_0"),
    (file_8, "mod_8_0"),
]

DOMAIN = [-7, -2, -1, 0, 1, 2, 7, 1000000, 0.5, 1.5, 2.5]


@pytest.mark.parametrize("module, name", SAMPLED_NAMES)
def test_sampled_name_exists_and_is_callable(module, name):
    fn = getattr(module, name)
    assert callable(fn)


@pytest.mark.parametrize("module, name", SAMPLED_NAMES)
def test_sampled_name_preserves_dunder_name(module, name):
    fn = getattr(module, name)
    assert fn.__name__ == name


@pytest.mark.parametrize("module, name", SAMPLED_NAMES)
@pytest.mark.parametrize("x", DOMAIN)
def test_sampled_name_parity_with_core(module, name, x):
    fn = getattr(module, name)
    assert fn(x) == society_compute(x)


def test_known_value_through_binding():
    # Mirrors the README usage example: file_0.mod_0_0(2) == 22.
    assert file_0.mod_0_0(2) == 22
