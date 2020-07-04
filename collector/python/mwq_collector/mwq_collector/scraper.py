import logging
import re
from typing import Dict
from typing import List

import requests
from bs4 import BeautifulSoup


BCC_URL = 'https://www.brisbane.qld.gov.au/clean-and-green/natural-environment-and-water/water/water-quality-monitoring/'
DATA_URL = 'https://www.eightytwo.net/maiwar-wq/data/measurements.json'


def _find_report_links() -> List[str]:
    """Find all links in the web page that reference Excel documents.

    :return: A list of links to Excel documents.
    """
    with requests.Session() as session:
        session.headers[
            'user-agent'
        ] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36"
        response = session.get(BCC_URL)
        soup = BeautifulSoup(response.text, 'html.parser')

    return [
        link.get('href') for link in soup.find_all('a', href=re.compile(r"\.xlsx$"))
    ]


def _find_current_report(reports: List[str]) -> str:
    """Find the most recent report given a list of links to Excel documents.

    The most recent document is determined by file size, the file with the largest
    size being the most recent.

    :param reports: A list of links to Excel documents.
    :return: A link to the most recent Excel document.
    """
    report_sizes: Dict(int, str) = {}

    for report_url in reports:
        r = requests.head(report_url)
        report_sizes[r.headers['Content-Length']] = report_url

    return report_sizes[max(report_sizes.keys())]


def _download_file(file_url: str) -> bytes:
    """Download a file.

    :param file_url: The URL for the file to be downloaded.
    :return: The contents of the file.
    """
    r = requests.get(file_url)
    return r.content


def get_latest_spreadsheet() -> bytes:
    """Get the latest measurements spreadsheet.

    :return: The latest spreadsheet.
    """
    links = _find_report_links()

    if not links:
        logging.error("No spreadsheet links were found.")
        exit()

    current = _find_current_report(links)

    if not current:
        logging.error(
            "Spreadsheet links were found but none were selected for processing."
        )

    return _download_file(current)


if __name__ == '__main__':
    with open('/tmp/mwq_measurements.xlsx', 'wb') as f:
        f.write(get_latest_spreadsheet())
