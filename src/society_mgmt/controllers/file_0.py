"""mod_0 - society module: name-preserving bindings for mod_0_0..mod_0_1199."""

from society_mgmt.core import society_compute


def _bind(name: str):
    """Create a name-preserving wrapper that delegates to society_compute."""

    def _wrapper(x: int | float) -> int | float:
        return society_compute(x)

    _wrapper.__name__ = name
    _wrapper.__qualname__ = name
    return _wrapper


for _k in range(1200):
    _fname = f"mod_0_{_k}"
    globals()[_fname] = _bind(_fname)


del _k, _fname
