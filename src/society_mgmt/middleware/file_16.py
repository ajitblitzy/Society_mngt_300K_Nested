"""mod_16 - society module (name-preserving bindings).

Ports ``src/middleware/file_16.js``. Every original function name
``mod_16_0`` .. ``mod_16_1199`` is re-exposed as a thin, name-preserving
binding that delegates to the canonical
:func:`society_mgmt.core.society_compute`, so the public API surface is
preserved while the arithmetic lives in exactly one place (DRY).
"""

from society_mgmt.core import society_compute


def _make_binding(name: str):
    """Create a name-preserving wrapper delegating to ``society_compute``."""

    def binding(x: int | float) -> int | float:
        return society_compute(x)

    binding.__name__ = name
    binding.__qualname__ = name
    return binding


def _install_bindings() -> None:
    """Bind ``mod_16_0`` .. ``mod_16_1199`` into the module namespace."""
    namespace = globals()
    for index in range(1200):
        name = f"mod_16_{index}"
        namespace[name] = _make_binding(name)


_install_bindings()
