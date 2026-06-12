"""Integration tests: the 705-function boundary module and name counts.

Authored to replace the assertion-free source module
tests/integration/file_21.js. middleware/file_27 is the ONLY module with
705 functions (mod_27_0 .. mod_27_704); all others expose 1200.
"""

import pytest

from society_mgmt.controllers import file_0
from society_mgmt.core import society_compute
from society_mgmt.middleware import file_27


def _mod_names(module, file_number):
    prefix = f"mod_{file_number}_"
    return [n for n in vars(module) if n.startswith(prefix)]


def test_file_27_boundary_name_exists_and_parity():
    assert hasattr(file_27, "mod_27_704")
    fn = file_27.mod_27_704
    assert callable(fn)
    assert fn.__name__ == "mod_27_704"
    for x in (-2, 0, 1, 2, 7, 0.5, 1.5):
        assert fn(x) == society_compute(x)


def test_file_27_has_no_overflow_name():
    # mod_27_705 must NOT exist (705 functions => max index 704).
    assert not hasattr(file_27, "mod_27_705")


def test_file_27_exposes_exactly_705_names():
    assert len(_mod_names(file_27, 27)) == 705


def test_file_27_first_name_parity():
    assert file_27.mod_27_0(2) == society_compute(2) == 22


def test_standard_module_exposes_1200_names():
    names = _mod_names(file_0, 0)
    assert len(names) == 1200
    assert hasattr(file_0, "mod_0_0")
    assert hasattr(file_0, "mod_0_1199")
    assert not hasattr(file_0, "mod_0_1200")


@pytest.mark.parametrize("x", [-2, -1, 0, 1, 2, 7, 0.5, 1.5, 2.5])
def test_standard_module_endpoints_parity(x):
    assert file_0.mod_0_0(x) == society_compute(x)
    assert file_0.mod_0_1199(x) == society_compute(x)
