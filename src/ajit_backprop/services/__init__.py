"""Service-layer (business logic) classes and functions for the ajit_backprop package.

This sub-package houses the business-logic / service layer per AAP §0.4.3
design pattern (Service Layer): "JavaScript 'controller-with-everything'
files are split into thin API handlers (:mod:`ajit_backprop.api`) and
service classes (:mod:`ajit_backprop.services`)."

Architectural position (per the assigned folder requirements):

1. :mod:`ajit_backprop.models` — pure data shapes (consumed by services)
2. :mod:`ajit_backprop.db` — repositories / persistence (consumed by services)
3. **:mod:`ajit_backprop.services`** ← this sub-package — pure business logic
4. :mod:`ajit_backprop.api` — consumes services (services do NOT depend on api)
5. :mod:`ajit_backprop.core` — consumed by services
6. :mod:`ajit_backprop.utils` — consumed by services

Per AAP §0.7.3 cross-cutting concerns:

- **Dependency injection** — services receive injected dependencies
  (DB engines, HTTP clients, repositories) via constructors; no
  module-scope singletons. This makes services trivially testable.
- **Logging** — modules use ``logger = logging.getLogger(__name__)``;
  NEVER ``print()`` (per AAP §0.7.3, §0.8.4).
- **Error taxonomy** — services raise exceptions from
  :mod:`ajit_backprop.errors` (e.g., :class:`ServiceError`,
  :class:`ValidationError`, :class:`NotFoundError`).
- **Configuration** — services receive settings via
  :func:`ajit_backprop.config.load_settings`, NEVER reading
  ``os.environ`` directly.

Per AAP §0.7.1 defect remediation, service translations apply:

- **Race conditions in async code** — translate JS ``Promise.all`` with
  shared mutable state to ``asyncio.gather`` with explicit
  :class:`asyncio.Lock` protection or immutable data passing.
- **Unhandled Promise rejection** — every translated coroutine wraps
  its work in ``try``/``except`` with deliberate handling.
- **Off-by-one errors** — Python ``for x in iterable:`` removes the
  JS ``<= length`` mistake by construction.
- **Implicit type coercion** — service inputs validated via Pydantic
  models at boundaries.

Per AAP §0.7.2 performance, service translations apply:

- **NumPy vectorization** for backprop-relevant numeric services
  (per AAP §0.6.2: ``numpy~=2.2.0``).
- **PyTorch tensors** for autograd / GPU-accelerated services
  (per AAP §0.6.2: ``torch~=2.5.0``).
- :func:`functools.lru_cache` on pure functions with repeated
  identical inputs.
- :func:`asyncio.gather` for concurrent I/O (replaces sequential JS
  ``.then()`` chains).

Per AAP §0.1.2 language-construct mapping, JavaScript service patterns
translate to Python equivalents: ``async function`` / ``Promise`` →
``async def`` / ``asyncio.Future``; ``class UserService { ... }`` →
``class UserService: ...`` (preserve public API names per AAP §0.8.3);
arrow functions ``(x) => x*2`` → ``lambda x: x*2`` or ``def``
(``def`` preferred for non-trivial bodies).

At refactor planning time the source repository contains no JavaScript
source (only ``README.md`` exists per AAP §0.2.1), so this sub-package is
initialized as an empty scaffold. As JS source is translated under AAP
§0.5.2 conditional mappings, the corresponding Python modules will be
added under this folder and re-exported here via ``__all__``.
"""

__all__: list[str] = []
