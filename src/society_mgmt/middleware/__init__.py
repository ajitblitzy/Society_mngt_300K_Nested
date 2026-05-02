"""society_mgmt.middleware — middleware-layer sub-package.

Python port of the JavaScript ``src/middleware/`` layer from the original
``society_mgmt_300k.zip`` archive. This sub-package contains:

* :mod:`society_mgmt.middleware.file_5` — exposes ``mod_5_0`` … ``mod_5_1199``
  (1,200 callables)
* :mod:`society_mgmt.middleware.file_16` — exposes ``mod_16_0`` … ``mod_16_1199``
  (1,200 callables)
* :mod:`society_mgmt.middleware.file_27` — exposes ``mod_27_0`` … ``mod_27_704``
  (705 callables — smaller variant)

Every ``mod_N_M`` callable is an alias of
:func:`society_mgmt._core.mod_compute`, the shared closed-form
implementation that returns ``6 * x + 10`` for any integer input.

Despite the ``middleware`` folder name, the source codebase does not
implement middleware-chain logic, async handlers, callback chains, or
ASGI/WSGI integration — the modules contain only pure synchronous
arithmetic functions. The Python port preserves this exactly: no
Starlette, FastAPI, Flask, or other middleware framework is introduced.

Per the source codebase's design, middleware modules do not import
from ``controllers``, ``services``, or any other layer — the original
JavaScript source establishes no inter-layer dependencies.
"""
