"""mod_27 - society module (name-preserving bindings).

Ports ``src/middleware/file_27.js`` -- the only smaller module in the
project. Every original function name ``mod_27_0`` .. ``mod_27_704`` is
re-exposed as a thin, name-preserving binding that delegates to the
canonical :func:`society_mgmt.core.society_compute`, so the public API
surface is preserved while the arithmetic lives in exactly one place (DRY).
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
    """Bind ``mod_27_0`` .. ``mod_27_704`` (705 names) into the namespace."""
    namespace = globals()
    for index in range(705):
        name = f"mod_27_{index}"
        namespace[name] = _make_binding(name)


_install_bindings()
