"""
Reads chess_chunks.json and posts each chunk to /api/ingest.
"""

import json
import time
from pathlib import Path
import requests

API_BASE = "http://localhost:5000"
chunks_path = Path("chess_chunks.json")

START_INDEX = 1004


def main():
    with open(chunks_path, encoding="utf-8") as f:
        chunks = json.load(f)

    remaining = chunks[START_INDEX:]
    print(f"Resuming from chunk {START_INDEX + 1}/{len(chunks)} — {len(remaining)} left to ingest.")

    succeeded = 0
    for i, chunk in enumerate(remaining, start=START_INDEX + 1):
        try:
            res = requests.post(
                f"{API_BASE}/api/ingest",
                json={"source": chunk["source"], "text": chunk["text"]},
                timeout=30,
            )
            res.raise_for_status()
            succeeded += 1
        except requests.RequestException as e:
            print(f"[{i}/{len(chunks)}] FAILED for {chunk['source']}: {e}")
            continue

        if i % 10 == 0 or i == len(chunks):
            print(f"[{i}/{len(chunks)}] ingested ({succeeded} succeeded so far)")

        time.sleep(0.2)

    print(f"\nDone. {succeeded}/{len(remaining)} chunks ingested successfully.")


if __name__ == "__main__":
    main()