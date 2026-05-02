"""society_mgmt.routes — routes-layer sub-package.

Python port of the JavaScript ``src/routes/`` layer from the original
``society_mgmt_300k.zip`` archive. This sub-package contains:

* :mod:`society_mgmt.routes.file_3` — exposes ``mod_3_0`` … ``mod_3_1199``
* :mod:`society_mgmt.routes.file_14` — exposes ``mod_14_0`` … ``mod_14_1199``
* :mod:`society_mgmt.routes.file_25` — exposes ``mod_25_0`` … ``mod_25_1199``

Every ``mod_N_M`` callable is an alias of
:func:`society_mgmt._core.mod_compute`, the shared closed-form
implementation that returns ``6 * x + 10`` for any integer input.

Despite the ``routes`` folder name, the source codebase does not
implement HTTP routing or any web framework integration — the modules
contain only pure synchronous arithmetic functions. The Python port
preserves this exactly: no FastAPI, Flask, Django, or other web
framework is introduced.

Per the source codebase's design, routes modules do not import from
``controllers``, ``services``, or any other layer — the original
JavaScript source establishes no inter-layer dependencies.
"""
