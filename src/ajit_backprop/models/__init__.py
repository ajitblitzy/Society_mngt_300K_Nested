"""Data model classes for the ajit_backprop package.

This sub-package houses pure data shapes — Pydantic ``BaseModel`` subclasses
for boundary validation (HTTP requests/responses, external API DTOs) and
``@dataclass(frozen=True, slots=True)`` value objects for internal,
immutable, memory-efficient data — consumed by :mod:`ajit_backprop.db`,
:mod:`ajit_backprop.services`, :mod:`ajit_backprop.api`, and possibly
:mod:`ajit_backprop.core`.

Per AAP §0.4.3 design pattern (Dataclass / Pydantic model for shapes):
JavaScript object literals used as data shapes become ``@dataclass``
declarations or :class:`pydantic.BaseModel` subclasses, providing
static-type discipline absent in plain JavaScript objects.

Per AAP §0.7.2 performance: hot data classes use ``__slots__`` to reduce
per-instance memory overhead. Numeric model fields (e.g., backpropagation
tensors) prefer NumPy arrays or PyTorch tensors over plain Python lists
for the 10x to 1000x speedup the user requested via the "Ensure the
performance is enhanced" directive.

Models are the MOST FOUNDATIONAL layer of the package: they have zero
side effects (no I/O, no logging, no environment-variable reads) and
depend on nothing in the package except possibly :mod:`ajit_backprop.errors`
for domain validation exceptions.

At refactor planning time the source repository contains no JavaScript
source (only ``README.md`` exists per AAP §0.2.1), so this sub-package is
initialized as an empty scaffold. As JS source is translated under AAP
§0.5.2 conditional mappings, the corresponding Python modules will be
added under this folder and re-exported here via ``__all__``.
"""

__all__: list[str] = []
