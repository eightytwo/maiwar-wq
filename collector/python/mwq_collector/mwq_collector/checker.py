import json
from pathlib import Path


PYTHON_FILE = "measurements_py.json"
RACKET_FILE = "measurements_rkt.json"

python_json = json.loads(Path(PYTHON_FILE).read_text())
racket_json = json.loads(Path(RACKET_FILE).read_text())
assert python_json == racket_json
