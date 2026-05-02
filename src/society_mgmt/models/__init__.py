"""society_mgmt.models — models-layer sub-package.

Python port of the JavaScript ``src/models/`` layer from the original
``society_mgmt_300k.zip`` archive. This sub-package contains:

* :mod:`society_mgmt.models.file_2` — exposes ``mod_2_0`` … ``mod_2_1199``
* :mod:`society_mgmt.models.file_13` — exposes ``mod_13_0`` … ``mod_13_1199``
* :mod:`society_mgmt.models.file_24` — exposes ``mod_24_0`` … ``mod_24_1199``

Every ``mod_N_M`` callable is an alias of
:func:`society_mgmt._core.mod_compute`, the shared closed-form
implementation that returns ``6 * x + 10`` for any integer input.

Despite the ``models`` folder name, the source codebase does not
implement ORM bindings, schema definitions, dataclasses, Pydantic
models, or any data-modeling integration — the modules contain only
pure synchronous arithmetic functions. The Python port preserves this
exactly: no SQLAlchemy, Pydantic, attrs, dataclass, or other
data-modeling library is introduced.

Per the source codebase's design, models modules do not import from
``repositories``, ``domain``, or any other layer — the original
JavaScript source establishes no inter-layer dependencies.
"""
