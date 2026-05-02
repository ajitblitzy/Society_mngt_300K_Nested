"""society_mgmt.services — services-layer sub-package.

Python port of the JavaScript ``src/services/`` layer from the original
``society_mgmt_300k.zip`` archive. This sub-package contains:

* :mod:`society_mgmt.services.file_1` — exposes ``mod_1_0`` … ``mod_1_1199``
* :mod:`society_mgmt.services.file_12` — exposes ``mod_12_0`` … ``mod_12_1199``
* :mod:`society_mgmt.services.file_23` — exposes ``mod_23_0`` … ``mod_23_1199``

Every ``mod_N_M`` callable is an alias of
:func:`society_mgmt._core.mod_compute`, the shared closed-form
implementation that returns ``6 * x + 10`` for any integer input.

Per the source codebase's design, services modules do not import from
``repositories``, ``models``, or any other layer — the original JavaScript
source establishes no inter-layer dependencies.
"""
