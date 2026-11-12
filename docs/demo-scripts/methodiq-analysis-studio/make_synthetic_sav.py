"""Create a deterministic fictional SPSS survey for the Analysis Studio demo."""

from pathlib import Path
import sys

import numpy as np
import pandas as pd
import pyreadstat


target = Path(sys.argv[1])
target.parent.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(42)
group = np.repeat([1, 2, 3], 40)
satisfaction = 55 + group * 4 + rng.normal(0, 5, len(group))
loyalty = satisfaction * 0.65 + rng.normal(0, 7, len(group))
purchase = (loyalty > np.median(loyalty)).astype(int)
frame = pd.DataFrame({
    "group": group,
    "satisfaction": satisfaction,
    "loyalty": loyalty,
    "purchase": purchase,
})
pyreadstat.write_sav(
    frame,
    str(target),
    file_label="Synthetic survey demo only",
    column_labels={
        "group": "연령 집단",
        "satisfaction": "만족도",
        "loyalty": "충성도",
        "purchase": "구매 여부",
    },
    variable_value_labels={
        "group": {1: "20대", 2: "30대", 3: "40대"},
        "purchase": {0: "비구매", 1: "구매"},
    },
)
print(target)
