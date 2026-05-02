"""society_mgmt.controllers — Controllers layer of the society_mgmt package.

This sub-package hosts the Python ports of the JavaScript modules that
previously lived under ``src/controllers/`` inside ``society_mgmt_300k.zip``:

* :mod:`society_mgmt.controllers.file_0`   — exposes ``mod_0_0`` … ``mod_0_1199``
* :mod:`society_mgmt.controllers.file_11`  — exposes ``mod_11_0`` … ``mod_11_1199``
* :mod:`society_mgmt.controllers.file_22`  — exposes ``mod_22_0`` … ``mod_22_1199``

Every public ``mod_N_M`` function is an alias of the shared closed-form
implementation :func:`society_mgmt._core.mod_compute`, which returns
``6 * x + 10`` for any integer input ``x``.

This sub-package init is intentionally minimal: it does not eagerly import
the per-file modules. Consumers import the specific module they need, e.g.::

    from society_mgmt.controllers.file_0 import mod_0_42

Python's standard import machinery resolves the request lazily, so the
3,600 ``mod_*`` symbols in this layer are never loaded unless explicitly
requested.
"""

__all__: list[str] = []
