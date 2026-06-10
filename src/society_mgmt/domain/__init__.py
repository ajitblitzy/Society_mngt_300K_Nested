"""society_mgmt.domain — structural-label-only layer package.

This package carries no domain-model or business-rule behavior; none
existed in the original JavaScript source, where the ``domain`` folder
held only byte-identical arithmetic functions. The name is retained
solely as a structural label.

Its submodules (:mod:`file_8`, :mod:`file_19`) re-expose their original
``mod_N_K`` function names as thin, name-preserving bindings that delegate
to :func:`society_mgmt.core.society_compute`.
"""
