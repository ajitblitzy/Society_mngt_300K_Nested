"""Utility helper functions for the ajit_backprop package.

This sub-package houses small, side-effect-free helper functions reused
across the package — string formatting, hash utilities (using
:mod:`hashlib` / :mod:`secrets` for cryptographic-strength operations),
time helpers, path manipulation, and type-conversion shims.

Per AAP §0.4.1 architecture position, utilities are LEAF nodes in the
dependency graph — they have NO dependencies on other ajit_backprop modules
(except possibly :mod:`ajit_backprop.errors` for raising domain exceptions
in the rare cases when utilities need to). They serve as foundational
primitives consumed by :mod:`ajit_backprop.services`,
:mod:`ajit_backprop.api`, :mod:`ajit_backprop.core`,
:mod:`ajit_backprop.models`, and :mod:`ajit_backprop.db`.

Per AAP §0.7.1 defect remediation, utility translations apply the following
rules by construction:

- **Insecure crypto remediation**: replace JS ``crypto.createHash('md5')``
  with :func:`hashlib.sha256` or :func:`hashlib.blake2b`; replace
  ``Math.random()`` for token generation with :func:`secrets.token_bytes`
  or :func:`secrets.token_urlsafe`.
- **Regex catastrophic backtracking**: pre-compile regexes at module load
  (cached via :func:`re.compile`); review patterns for non-backtracking
  alternatives.
- **Missing input validation**: utilities operating on user input either
  validate explicitly or document their preconditions.

Per AAP §0.7.2 performance, utility translations apply
:func:`functools.lru_cache` on pure functions with repeated identical
inputs and generator expressions for lazy iteration (constant memory).

Per AAP §0.1.2 language-construct mapping, JavaScript utility patterns
translate to Python equivalents: ``lodash`` helpers (``_.uniq``,
``_.flatten``) → Python builtins (``set(list)``,
:func:`itertools.chain.from_iterable`); ``crypto`` utilities →
:mod:`hashlib` / :mod:`secrets`; ``path`` utilities → :class:`pathlib.Path`;
date utilities (``date-fns``, ``moment``, ``dayjs``) → :mod:`datetime`
stdlib or :mod:`python-dateutil` / :mod:`arrow` (per AAP §0.6.2).

At refactor planning time the source repository contains no JavaScript
source (only ``README.md`` exists per AAP §0.2.1), so this sub-package is
initialized as an empty scaffold. As JS source is translated under AAP
§0.5.2 conditional mappings, the corresponding Python modules will be
added under this folder and re-exported here via ``__all__``.
"""

__all__: list[str] = []
