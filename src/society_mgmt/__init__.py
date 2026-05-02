"""society_mgmt — Python port of the Ajit-backprop-test JavaScript codebase.

This package replaces the JavaScript implementation that was previously
archived in ``society_mgmt_300k.zip`` at the repository root. The original
zip is preserved as a historical reference and is not modified.

The public surface is a flat collection of ``mod_N_M(x) -> int`` functions
distributed across nine architectural layer sub-packages:

* :mod:`society_mgmt.config`
* :mod:`society_mgmt.controllers`
* :mod:`society_mgmt.domain`
* :mod:`society_mgmt.middleware`
* :mod:`society_mgmt.models`
* :mod:`society_mgmt.repositories`
* :mod:`society_mgmt.routes`
* :mod:`society_mgmt.services`
* :mod:`society_mgmt.utils`

Every ``mod_N_M`` function is an alias of the shared closed-form
implementation :func:`society_mgmt._core.mod_compute`, which returns
``6 * x + 10`` for any integer input ``x``.
"""

__version__ = "0.1.0"

__all__ = ["__version__"]
