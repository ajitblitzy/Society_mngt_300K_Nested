"""society_mgmt.config — Config layer of the society_mgmt package.

This sub-package hosts the Python ports of the JavaScript modules that
previously lived under ``src/config/`` inside ``society_mgmt_300k.zip``:

* :mod:`society_mgmt.config.file_6`  — exposes ``mod_6_0`` … ``mod_6_1199``
* :mod:`society_mgmt.config.file_17` — exposes ``mod_17_0`` … ``mod_17_1199``

Every public ``mod_N_M`` function is an alias of the shared closed-form
implementation :func:`society_mgmt._core.mod_compute`, which returns
``6 * x + 10`` for any integer input ``x``.

This sub-package init is intentionally minimal: it does not eagerly import
the per-file modules. Consumers import the specific module they need, e.g.::

    from society_mgmt.config.file_6 import mod_6_42

Python's standard import machinery resolves the request lazily, so the
2,400 ``mod_*`` symbols in this layer are never loaded unless explicitly
requested.

Per the source codebase's design, config modules do not import from
``controllers``, ``services``, ``repositories``, or any other layer — the
original JavaScript source establishes no inter-layer dependencies.
"""

__all__: list[str] = []
