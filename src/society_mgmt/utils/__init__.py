"""society_mgmt.utils — utils-layer sub-package.

Python port of the JavaScript ``src/utils/`` layer from the original
``society_mgmt_300k.zip`` archive. This sub-package contains:

* :mod:`society_mgmt.utils.file_4` — exposes ``mod_4_0`` … ``mod_4_1199``
* :mod:`society_mgmt.utils.file_15` — exposes ``mod_15_0`` … ``mod_15_1199``
* :mod:`society_mgmt.utils.file_26` — exposes ``mod_26_0`` … ``mod_26_1199``
* :mod:`society_mgmt.utils.filler` — comment-only placeholder module
  preserved verbatim from the original ``src/utils/filler.js``.

Every ``mod_N_M`` callable in the functional modules is an alias of
:func:`society_mgmt._core.mod_compute`, the shared closed-form
implementation that returns ``6 * x + 10`` for any integer input.
"""
