"""HTTP/CLI API layer for the ajit_backprop package.

This sub-package houses the OUTERMOST layer of the package's layered
architecture — thin HTTP/CLI request handlers that validate input,
dispatch to the service layer, and shape responses. Per AAP §0.4.3
design pattern (Service Layer): "JavaScript 'controller-with-everything'
files are split into thin API handlers (:mod:`ajit_backprop.api`) and
service classes (:mod:`ajit_backprop.services`)."

Architectural position (per the assigned folder requirements — this is
the OUTERMOST layer):

1. :mod:`ajit_backprop.models` — pure data shapes (consumed by api)
2. :mod:`ajit_backprop.db` — repositories / persistence (NOT directly
   accessed by api; accessed only via :mod:`ajit_backprop.services`)
3. :mod:`ajit_backprop.services` — business logic (consumed by api)
4. **:mod:`ajit_backprop.api`** ← this sub-package — HTTP/CLI handlers
5. :mod:`ajit_backprop.core` — may be consumed by api
6. :mod:`ajit_backprop.utils` — may be consumed by api

API handlers depend on: services, models. API handlers do NOT directly
access the database — all DB access goes through services and
repositories per AAP §0.4.3 (Repository pattern + Service layer).

Per AAP §0.4.3 design pattern (Context managers for resources): API
handlers MUST use ``with`` / ``async with`` blocks for any short-lived
resources (e.g., HTTP client sessions, file uploads), preventing the
resource-leak class of bug.

Per AAP §0.7.3 cross-cutting concerns:

- **Configuration** — handlers receive settings via dependency
  injection from :func:`ajit_backprop.config.load_settings`; NEVER
  read ``os.environ`` directly.
- **Logging** — handlers use ``logger = logging.getLogger(__name__)``;
  NEVER ``print()`` (per AAP §0.7.3, §0.8.4).
- **Error taxonomy** — handlers raise / propagate exceptions from
  :mod:`ajit_backprop.errors`; FastAPI exception handlers map
  :class:`AjitBackpropError` subclasses to appropriate HTTP status
  codes (e.g., :class:`NotFoundError` → 404,
  :class:`AuthenticationError` → 401,
  :class:`AuthorizationError` → 403,
  :class:`ValidationError` → 422,
  :class:`AjitBackpropError` (catch-all) → 500).
- **Data validation boundary** — every external input (HTTP body,
  CLI arg, query param, path param, header) passes through a
  Pydantic model at the boundary; internal code can assume validated
  types. This is the canonical translation of JS frameworks like
  ``joi``, ``yup``, ``zod``, or ``class-validator`` per AAP §0.6.2.

Per AAP §0.7.1 defect remediation, API translations apply:

- **Prototype pollution** — JS pattern ``Object.assign(obj, untrusted)``
  is replaced with explicit field-by-field assignment to a Pydantic
  model; unknown fields are rejected via
  ``model_config = {"extra": "forbid"}``.
- **Missing input validation** — every endpoint wraps its body /
  query / path parameters with Pydantic models; FastAPI validates at
  the boundary and returns 422 on failure automatically.
- **SQL injection** — handlers NEVER construct SQL strings; all DB
  access goes through service / repository methods that use
  SQLAlchemy parameterized queries.
- **Hard-coded secrets** — handlers receive secrets via injected
  Settings; secrets are NEVER inlined in source.
- **Logging sensitive data** — request bodies and headers (which may
  contain credentials) MUST NOT be logged at INFO level; if logging
  is required for debugging, use redaction filters per AAP §0.7.1.

Per AAP §0.7.2 performance, API translations apply:

- **Async I/O** — handlers are ``async def`` where they call I/O-bound
  services; FastAPI's async support enables concurrent request
  handling without blocking. Replaces sequential JS ``.then()`` chains
  with concurrent ``asyncio.gather`` calls.
- **Connection pooling** — DB sessions and HTTP clients (``httpx``)
  are pooled at startup; handlers receive injected instances rather
  than constructing new connections per request.
- **JSON serialization** — when performance-critical, use
  ``orjson`` (per AAP §0.6.2: ``orjson~=3.10.0``) via FastAPI's
  ``ORJSONResponse``; 2x to 5x faster than stdlib ``json``.

Per AAP §0.6.2 dependency mapping, JavaScript HTTP frameworks
translate to Python equivalents: ``express`` / ``koa`` / ``fastify`` /
``hapi`` → ``fastapi`` (with ``uvicorn[standard]`` ASGI server);
``axios`` / ``node-fetch`` / ``got`` → ``httpx`` (sync + async,
HTTP/2 capable); ``express.Router()`` → FastAPI ``APIRouter``;
JS middleware ``app.use(...)`` → FastAPI dependency injection
(``Depends(...)``) and ``app.add_middleware``.

Per AAP §0.1.2 language-construct mapping, JavaScript handler patterns
translate to Python equivalents:
``app.get('/users/:id', async (req, res) => { ... })`` →
``@router.get("/users/{id}")`` plus ``async def get_user(id: int) -> User``;
``req.body`` / ``req.query`` / ``req.params`` → Pydantic body models
and FastAPI ``Query(...)`` / ``Path(...)`` dependencies; ``res.json(data)``
→ ``return data`` (FastAPI handles serialization).

At refactor planning time the source repository contains no JavaScript
source (only ``README.md`` exists per AAP §0.2.1), so this sub-package
is initialized as an empty scaffold. As JS source is translated under
AAP §0.5.2 conditional mappings, the corresponding Python modules will
be added under this folder and re-exported here via ``__all__``.
"""

__all__: list[str] = []
