"""
Same aggregation logic as summarize_chess_data.py, but instead of writing
natural-language chunks, this writes the raw numbers into the opening_stats
table via the backend, so "most/least/best/worst" questions can be answered
with a real SQL query instead of vector search.

Run this once, after ingest_chess_data.py.

Usage:
    python load_opening_stats.py
"""

from pathlib import Path
import pandas as pd
import requests

data_dir = Path(r"C:\Users\Nikhil Sharan\ChessOpeningAnalysis\Chess-Opening-Analysis\ChessProject\data\chess_games")
API_BASE = "http://localhost:5000"

players = ["Carlsen", "Caruana", "Erigaisi", "Firouzja", "Giri",
           "Gukesh", "Keymer", "Nakamura", "Praggnanandhaa", "Wei"]

MIN_GAMES = 5  # same threshold as summarize_chess_data.py, for consistency


def player_result(row, player_short):
    is_white = player_short.lower() in str(row["White"]).lower()
    is_black = player_short.lower() in str(row["Black"]).lower()

    if not is_white and not is_black:
        return None, None

    side = "White" if is_white else "Black"
    result = row["Result"]

    if result == "1/2-1/2":
        outcome = "draw"
    elif (result == "1-0" and is_white) or (result == "0-1" and is_black):
        outcome = "win"
    elif (result == "0-1" and is_white) or (result == "1-0" and is_black):
        outcome = "loss"
    else:
        outcome = None

    return side, outcome


def main():
    rows = []

    for player in players:
        csv_path = data_dir / f"{player}_with_openings.csv"
        if not csv_path.exists():
            print(f"Skipping {player}, file not found: {csv_path}")
            continue

        df = pd.read_csv(csv_path)
        df = df.dropna(subset=["ECO", "OpeningDetected"])

        sides, outcomes = [], []
        for _, row in df.iterrows():
            side, outcome = player_result(row, player)
            sides.append(side)
            outcomes.append(outcome)

        df["side"] = sides
        df["outcome"] = outcomes
        df = df.dropna(subset=["outcome"])

        grouped = df.groupby(["ECO", "OpeningDetected"])

        for (eco, opening_name), group in grouped:
            total = len(group)
            if total < MIN_GAMES:
                continue

            wins = int((group["outcome"] == "win").sum())
            draws = int((group["outcome"] == "draw").sum())
            losses = int((group["outcome"] == "loss").sum())
            white_games = int((group["side"] == "White").sum())
            win_pct = round(wins / total * 100, 1)

            rows.append({
                "player": player,
                "eco": eco,
                "opening_name": opening_name,
                "total_games": total,
                "wins": wins,
                "draws": draws,
                "losses": losses,
                "white_games": white_games,
                "win_pct": win_pct,
            })

        print(f"{player}: {sum(1 for r in rows if r['player'] == player)} rows prepared")

    print(f"\nUploading {len(rows)} rows to /api/stats/load...")
    res = requests.post(f"{API_BASE}/api/stats/load", json={"rows": rows}, timeout=120)
    res.raise_for_status()
    print("Response:", res.json())


if __name__ == "__main__":
    main()