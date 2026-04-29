"""Exception hierarchy for the ``ajit_backprop`` package.

This module is the single, canonical home of every project-specific exception
class raised across the ``ajit_backprop`` codebase. It is the most foundational
module in the package — it has **zero** internal dependencies — and is therefore
safe to import from any other module without risk of circular imports.

Design rationale (per AAP §0.7.3 cross-cutting concern "Error taxonomy")
-----------------------------------------------------------------------

The user's directive in the Agent Action Plan is:

    "define a single ``src/ajit_backprop/errors.py`` with the project's
    exception hierarchy (``AjitBackpropError`` base, with subclasses);
    translated ``throw new Error(...)`` calls become
    ``raise <SpecificError>(...)``."

All custom exceptions inherit from :class:`AjitBackpropError`. This convention
enables consumers to catch any project-specific error with a single
``except AjitBackpropError:`` clause while still allowing specific subclasses
to be caught for fine-grained handling::

    from ajit_backprop.errors import AjitBackpropError, ConfigError

    try:
        load_settings()
    except ConfigError as exc:
        # Specific recovery path for misconfiguration.
        log.error("Configuration invalid: %s", exc)
        raise SystemExit(1) from exc
    except AjitBackpropError as exc:
        # Catch-all for any other project error.
        log.exception("Unexpected project error: %s", exc)
        raise

JavaScript-to-Python translation rule (per AAP §0.1.2 / §0.7.3)
----------------------------------------------------------------

Translated JavaScript ``throw new Error("...")`` calls map to
``raise <SpecificError>(...)`` in Python — **never** to bare ``RuntimeError``,
``ValueError``, or ``Exception``. The specific subclass is selected based on
the semantic meaning of the original ``throw`` site. For example:

* ``throw new Error("DB_HOST is required")``
  → :class:`raise ConfigError("DB_HOST is required") <ConfigError>`
* ``throw new Error("User not found")``
  → :class:`raise NotFoundError("User not found") <NotFoundError>`
* ``throw new Error("Invalid credentials")``
  → :class:`raise AuthenticationError("Invalid credentials") <AuthenticationError>`

Exception chaining (per Python convention; AAP §0.7.1 defect remediation)
-------------------------------------------------------------------------

When wrapping an exception raised by a third-party library (for example,
:exc:`pydantic.ValidationError` or a SQLAlchemy ``DBAPIError``), use the
``raise … from exc`` form to preserve the original traceback for debugging::

    try:
        Settings()  # pydantic-settings parse
    except PydanticValidationError as exc:
        raise ConfigError("Invalid configuration") from exc

Use ``raise … from None`` to deliberately suppress the original cause when the
inner exception leaks sensitive data (e.g., a database driver echoing a
password in its message). This module does not mandate either form — it only
documents the convention so that calling code is consistent.

Public surface
--------------

The :data:`__all__` tuple at the bottom of this module enumerates every
exception class exported by ``from ajit_backprop.errors import *`` and is the
authoritative list of project errors. The hierarchy is intentionally flat
(one inheritance level deep) to keep ``except`` clauses simple and to avoid
the maintainability cost of deep multi-level taxonomies.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Base exception
# ---------------------------------------------------------------------------


class AjitBackpropError(Exception):
    """Base exception for all errors raised by the ``ajit_backprop`` package.

    Every project-specific exception in this module inherits — directly or
    transitively — from this class. Library consumers can therefore use
    ``except AjitBackpropError:`` as a single catch-all for any error
    originating in the project, while still being free to catch a specific
    subclass for finer-grained handling.

    This class deliberately does not override :meth:`object.__init__`; the
    built-in :class:`Exception` constructor already accepts arbitrary
    positional arguments, so subclasses may be raised with any message or
    contextual payload (``raise ConfigError("missing DB_HOST")`` or
    ``raise DatabaseError("constraint violation", details)``).
    """


# ---------------------------------------------------------------------------
# Configuration / startup errors
# ---------------------------------------------------------------------------


class ConfigError(AjitBackpropError):
    """Raised when configuration is missing or invalid.

    Typical raise sites (per AAP §0.7.3 cross-cutting concern "Configuration
    loading"):

    * Required environment variables (``DB_HOST``, ``API_KEY`` for staging)
      are unset or empty when the application starts.
    * A ``.env`` value cannot be parsed into the expected type by
      :class:`pydantic_settings.BaseSettings`.
    * A configuration file (e.g. ``alembic.ini``) references a file that
      cannot be found on disk.

    When wrapping a :exc:`pydantic.ValidationError` or similar third-party
    exception, prefer the chained-raise form to preserve the original
    traceback::

        try:
            Settings()
        except PydanticValidationError as exc:
            raise ConfigError("Invalid configuration") from exc
    """


# ---------------------------------------------------------------------------
# Domain validation errors
# ---------------------------------------------------------------------------


class ValidationError(AjitBackpropError):
    """Raised when input data fails domain validation.

    This exception is for **custom domain rules** enforced by the service
    layer (for example, "a transfer amount must be positive" or "a user's
    email must not be already registered"). It is intentionally distinct
    from :exc:`pydantic.ValidationError`, which is raised by pydantic for
    *schema* mismatches at the API boundary.

    Because the name shadows :exc:`pydantic.ValidationError` within the
    package namespace, callers should always use a qualified import to
    disambiguate::

        from ajit_backprop.errors import ValidationError  # domain rule
        from pydantic import ValidationError as PydanticValidationError

    or the equivalent module-level alias.
    """


# ---------------------------------------------------------------------------
# Persistence errors
# ---------------------------------------------------------------------------


class DatabaseError(AjitBackpropError):
    """Raised when a database operation fails.

    Wraps :exc:`sqlalchemy.exc.SQLAlchemyError` (or any of its subclasses)
    at the repository / unit-of-work boundary so that the rest of the
    application interacts only with project-defined exceptions::

        try:
            session.commit()
        except SQLAlchemyError as exc:
            raise DatabaseError("Failed to commit transaction") from exc

    Distinct from :exc:`sqlalchemy.exc.DatabaseError`. The two classes share
    a name but live in different namespaces; project code MUST raise this
    class, not the SQLAlchemy one.
    """


class NotFoundError(AjitBackpropError):
    """Raised when a requested resource cannot be found.

    Used by repository ``get_by_id`` / ``get_by_key`` style methods to
    signal that the requested row, document, or remote object does not
    exist. Translated from JavaScript code that throws ``Error("Not Found")``
    or returns ``null`` and lets a downstream layer raise — the Python
    equivalent always raises explicitly so the error is visible to typed
    callers and to test assertions::

        record = repo.get_by_id(user_id)
        if record is None:
            raise NotFoundError(f"User {user_id} not found")
    """


# ---------------------------------------------------------------------------
# Authentication / authorization errors
# ---------------------------------------------------------------------------


class AuthenticationError(AjitBackpropError):
    """Raised when authentication fails.

    Typical raise sites:

    * The ``API_KEY`` header is missing or does not match the configured
      value (see AAP §0.7.3 staging-deployment requirement and §0.8.3
      ``API_KEY`` handling).
    * A password verification (e.g. via :mod:`bcrypt`) returns ``False``.
    * A JWT signature verification fails.

    The exception **must not** echo the offending credential value in its
    message — doing so would write secret material to logs and violates
    AAP §0.7.1 defect category "Logging sensitive data". Prefer messages
    such as ``"Invalid credentials"`` over ``f"Invalid API key: {key}"``.
    """


class AuthorizationError(AjitBackpropError):
    """Raised when the authenticated principal lacks permission.

    Distinct from :class:`AuthenticationError` — *who you are* is known
    and verified, but *what you're trying to do* is denied. HTTP
    handlers typically map this to a ``403 Forbidden`` response, while
    :class:`AuthenticationError` maps to ``401 Unauthorized``.
    """


# ---------------------------------------------------------------------------
# Service-layer errors
# ---------------------------------------------------------------------------


class ServiceError(AjitBackpropError):
    """Raised when a service-layer operation fails for non-domain reasons.

    Used as the catch-all for service failures that are not specifically
    a configuration error, a validation error, a database error, a
    not-found error, or an external-service error. Examples:

    * A required internal precondition is not satisfied (and is not a
      domain-level validation failure).
    * A best-effort cleanup step fails after the primary operation has
      already succeeded.
    * An unexpected branch is reached that should be unreachable but is
      defensively handled.
    """


class ExternalServiceError(AjitBackpropError):
    """Raised when an external service call fails.

    Translated from JavaScript code that handles ``axios``, ``fetch``, or
    ``got`` errors — in the Python implementation, HTTP failures from
    :mod:`httpx` / :mod:`requests` (or RPC failures from any third-party
    SDK) are wrapped in this exception at the boundary so that consumers
    see a single project-defined error type rather than dozens of
    transport-specific ones::

        try:
            response = httpx_client.get(url)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ExternalServiceError(
                f"Upstream call to {url!s} failed"
            ) from exc

    This exception is also the appropriate translation target for the
    :mod:`tenacity` retry-decorator final-failure case (per AAP §0.6.2
    listing of ``tenacity`` for retry handling).
    """


# ---------------------------------------------------------------------------
# Public export surface
# ---------------------------------------------------------------------------
# The ``__all__`` declaration is the authoritative list of names exported
# from this module by ``from ajit_backprop.errors import *``. It also
# documents the project's complete error taxonomy at a glance and is the
# anchor that ``ruff``'s ``F401`` per-file-ignore is configured against in
# ``pyproject.toml`` for ``__init__.py`` re-exports.

__all__: list[str] = [
    "AjitBackpropError",
    "AuthenticationError",
    "AuthorizationError",
    "ConfigError",
    "DatabaseError",
    "ExternalServiceError",
    "NotFoundError",
    "ServiceError",
    "ValidationError",
]
