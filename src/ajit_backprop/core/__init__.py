"""Domain primitives for the ajit_backprop package.

This sub-package houses foundational backpropagation primitives and other
domain logic that does not naturally belong in :mod:`ajit_backprop.models`,
:mod:`ajit_backprop.services`, :mod:`ajit_backprop.api`, or
:mod:`ajit_backprop.db`.

Per AAP §0.4.1 and §0.7.2, when JavaScript backprop logic is translated,
the canonical Python equivalent uses NumPy vectorized operations and/or
PyTorch tensors with autograd to deliver the 10x to 1000x speedup the user
requested via the "Ensure the performance is enhanced" directive.

At refactor planning time the source repository contains no JavaScript
source (only ``README.md`` exists per AAP §0.2.1), so this sub-package is
initialized as an empty scaffold. As JS source is translated under AAP
§0.5.2 conditional mappings, the corresponding Python modules will be
added under this folder and re-exported here via ``__all__``.
"""

__all__: list[str] = []
