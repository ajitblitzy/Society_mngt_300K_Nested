"""Archive-vs-runtime public name-parity regression test (AAP O1 / O4).

This guard exists because the four JavaScript *test-source* modules
(``file_9``, ``file_20`` in ``tests/unit``; ``file_10``, ``file_21`` in
``tests/integration``) were once accidentally dropped from the Python
package, silently removing 4,800 public ``mod_N_K`` names and breaking the O1
contract ("preserve the public function surface; all 33,105 names remain
callable/importable").

It derives the authoritative set of public names directly from the reference
archive ``society_mgmt_300k.zip`` and asserts that *every* one of the 33,105
names is importable, callable, ``__name__``-preserving, and delegates to
:func:`society_mgmt.core.society_compute`. It also checks the reverse
direction: the binding modules expose no ``mod_N_K`` name absent from the
archive.
"""

import importlib
import re
import zipfile
from pathlib import Path

import pytest

from society_mgmt.core import society_compute

# The original archive contains exactly 33,105 ``mod_N_K`` functions spread
# across 28 JavaScript module files (27 x 1,200 + ``file_27`` x 705).
EXPECTED_TOTAL = 33105
EXPECTED_MODULE_COUNT = 28

# The reference archive sits at the repository root; this file lives at
# ``tests/integration/`` so the root is two parents up.
ARCHIVE_PATH = Path(__file__).resolve().parents[2] / "society_mgmt_300k.zip"

# Matches a JavaScript function declaration, e.g. ``function mod_9_0(x){``.
_FUNC_RE = re.compile(r"function\s+(mod_\d+_\d+)\s*\(")

# Matches a fully-qualified public binding name, e.g. ``mod_27_704``.
_NAME_RE = re.compile(r"^mod_\d+_\d+$")

# Inputs spanning negative, zero, positive, large-integer, and float domains.
_DOMAIN = (-7, -2, -1, 0, 1, 2, 7, 1000000, 0.5, 1.5, 2.5)


def _js_path_to_module(js_path: str) -> str | None:
    """Map an archive JS entry to its Python binding module dotted path.

    Returns ``None`` for entries that are not name-binding modules (the
    comment-only ``filler.js``, the license file, or any directory entry).
    """
    if not js_path.endswith(".js") or js_path.endswith("filler.js"):
        return None
    stem = js_path.rsplit("/", 1)[-1][:-3]  # "file_N"
    if js_path.startswith("src/"):
        layer = js_path.split("/")[1]
        return f"society_mgmt.{layer}.{stem}"
    if js_path.startswith("tests/unit/"):
        return f"society_mgmt.tests_unit.{stem}"
    if js_path.startswith("tests/integration/"):
        return f"society_mgmt.tests_integration.{stem}"
    return None


def _archive_module_names() -> dict[str, list[str]]:
    """Return ``{python_module: [mod_N_K, ...]}`` derived from the archive."""
    assert ARCHIVE_PATH.is_file(), f"reference archive missing: {ARCHIVE_PATH}"
    mapping: dict[str, list[str]] = {}
    with zipfile.ZipFile(ARCHIVE_PATH) as archive:
        for entry in archive.namelist():
            module = _js_path_to_module(entry)
            if module is None:
                continue
            text = archive.read(entry).decode("utf-8")
            names = _FUNC_RE.findall(text)
            if names:
                mapping[module] = names
    return mapping


# Computed once at collection time; the binding surface is static.
ARCHIVE_NAMES = _archive_module_names()

# A handful of the 4,800 previously-missing names, surfaced as readable
# parametrized cases (the exhaustive check lives in the full-sweep test).
PREVIOUSLY_MISSING = [
    ("society_mgmt.tests_unit.file_9", "mod_9_0"),
    ("society_mgmt.tests_unit.file_9", "mod_9_1199"),
    ("society_mgmt.tests_unit.file_20", "mod_20_0"),
    ("society_mgmt.tests_unit.file_20", "mod_20_1199"),
    ("society_mgmt.tests_integration.file_10", "mod_10_0"),
    ("society_mgmt.tests_integration.file_10", "mod_10_1199"),
    ("society_mgmt.tests_integration.file_21", "mod_21_0"),
    ("society_mgmt.tests_integration.file_21", "mod_21_1199"),
]


def test_archive_derived_total_is_33105():
    """The archive must yield exactly 33,105 names across 28 modules."""
    total = sum(len(names) for names in ARCHIVE_NAMES.values())
    assert total == EXPECTED_TOTAL
    assert len(ARCHIVE_NAMES) == EXPECTED_MODULE_COUNT


def test_all_binding_modules_importable():
    """Every archive-derived module must resolve to an importable package."""
    missing = []
    for module in sorted(ARCHIVE_NAMES):
        try:
            importlib.import_module(module)
        except ModuleNotFoundError:
            missing.append(module)
    assert not missing, f"binding modules not importable: {missing}"


def test_full_name_parity_present_callable_named_and_delegating():
    """Exhaustive, bidirectional public-surface parity check.

    Forward: every archive name is present, callable, ``__name__``-preserving,
    and delegates to :func:`society_compute`. Reverse: no binding module
    exposes a ``mod_N_K`` name that is absent from the archive.
    """
    verified = 0
    problems: list[str] = []
    for module_path in sorted(ARCHIVE_NAMES):
        module = importlib.import_module(module_path)
        expected = set(ARCHIVE_NAMES[module_path])
        for name in ARCHIVE_NAMES[module_path]:
            fn = getattr(module, name, None)
            if fn is None:
                problems.append(f"{module_path}.{name}: absent")
                continue
            if not callable(fn):
                problems.append(f"{module_path}.{name}: not callable")
                continue
            if fn.__name__ != name:
                problems.append(f"{module_path}.{name}: __name__={fn.__name__!r}")
                continue
            if any(fn(x) != society_compute(x) for x in _DOMAIN):
                problems.append(f"{module_path}.{name}: delegation mismatch")
                continue
            verified += 1
        actual = {
            attr
            for attr in dir(module)
            if _NAME_RE.match(attr) and callable(getattr(module, attr))
        }
        extra = actual - expected
        if extra:
            problems.append(f"{module_path}: unexpected names {sorted(extra)[:3]}")
    assert not problems, f"{len(problems)} parity problem(s): {problems[:5]}"
    assert verified == EXPECTED_TOTAL


@pytest.mark.parametrize("module_path, name", PREVIOUSLY_MISSING)
def test_previously_missing_endpoints_restored(module_path, name):
    """Spot-check representative names from the four restored test-source modules."""
    module = importlib.import_module(module_path)
    fn = getattr(module, name)
    assert callable(fn)
    assert fn.__name__ == name
    assert fn(2) == society_compute(2) == 22
