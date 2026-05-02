"""society_mgmt.domain — domain-layer sub-package.

Python port of the JavaScript ``src/domain/`` layer from the original
``society_mgmt_300k.zip`` archive. This sub-package contains:

* :mod:`society_mgmt.domain.file_8` — exposes ``mod_8_0`` … ``mod_8_1199``
* :mod:`society_mgmt.domain.file_19` — exposes ``mod_19_0`` … ``mod_19_1199``

Every ``mod_N_M`` callable is an alias of
:func:`society_mgmt._core.mod_compute`, the shared closed-form
implementation that returns ``6 * x + 10`` for any integer input.

Despite the ``domain`` folder name, the source codebase does not
implement domain entity classes, DDD aggregates, value objects,
repository interfaces, Pydantic schemas, or any domain-modeling
integration — the modules contain only pure synchronous arithmetic
functions. The Python port preserves this exactly: no SQLAlchemy,
Pydantic, attrs, dataclass, or other data-modeling library is
introduced.

Per the source codebase's design, domain modules do not import from
``repositories``, ``models``, ``services``, or any other layer — the
original JavaScript source establishes no inter-layer dependencies.
"""
