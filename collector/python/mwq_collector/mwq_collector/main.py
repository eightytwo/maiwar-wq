import configparser
import json
import logging
import subprocess
from os.path import expanduser
from typing import Dict

import requests
from .collector import transform
from .scraper import get_latest_spreadsheet


CURRENT_DATA_URL = 'https://eightytwo.net/maiwar-wq/data/measurements.json'


def _read_config() -> Dict:
    """Read the configuration file for the program.

    :return: A dictionary representing the program's configuration.
    """
    config = configparser.ConfigParser()
    config.read(expanduser("~/.config/maiwar_wq/config.ini"))

    if not config.has_section('deploy'):
        logging.error(
            "No configuration file found or the file is missing the 'deploy' section"
        )
        exit(1)

    deploy_options = dict(config.items('deploy'))

    if 'measurements_file' not in deploy_options:
        logging.error("Configuration file is missing settings")
        exit(1)

    return deploy_options


def _get_check_measurements() -> Dict:
    """Check if new measurements are available and if so, download them.

    :return: A dictionary containing the new measurements.
    """
    spreadsheet: bytes = get_latest_spreadsheet()
    new_measurements: Dict = transform(spreadsheet)

    if not new_measurements:
        logging.error("Error reading new measurements data")
        exit(1)

    existing_measurements = requests.get(CURRENT_DATA_URL).json()

    if not existing_measurements:
        logging.error("Error reading existing measurements data")
        exit(1)

    if new_measurements == existing_measurements:
        logging.info("No new measurements available")
        exit()

    return new_measurements


def run():
    config = _read_config()

    new_measurements = _get_check_measurements()
    logging.info("New measurements are available")

    with open(config['measurements_file'], 'w') as f:
        f.write(json.dumps(new_measurements, sort_keys=True))

    # For now just create a notification that new measurements have been downloaded
    subprocess.call(
        [
            'notify-send',
            'Maiwar WQ',
            'New measurements are available.\nUpdate the last modified and deploy.'
        ]
    )


if __name__ == '__main__':
    run()
