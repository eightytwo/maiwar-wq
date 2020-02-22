import json


PYTHON_FILE = "measurements_py.json"
RACKET_FILE = "measurements_rkt.json"


with open(PYTHON_FILE) as f:
    python_json = json.loads(f.read())


with open(RACKET_FILE) as f:
    racket_json = json.loads(f.read())


assert python_json == racket_json
