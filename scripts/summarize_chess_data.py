"""
Aggregates each player's `{player}_with_openings.csv` into per-opening stats,
then writes one natural-language summary per (player, opening) group.
"""

import json
from pathlib import Path
import pandas as pd

data_dir = Path(r"C:\Users\Nikhil Sharan\ChessOpeningAnalysis\Chess-Opening-Analysis\ChessProject\data\chess_games")
output_path = Path("chess_chunks.json")

players = ["Carlsen", "Caruana", "Erigaisi", "Firouzja", "Giri",
           "Gukesh", "Keymer", "Nakamura", "Praggnanandhaa", "Wei"]

MIN_GAMES = 5


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


def build_summary(player_name, opening_name, eco, group):
    total = len(group)
    wins = (group["outcome"] == "win").sum()
    draws = (group["outcome"] == "draw").sum()
    losses = (group["outcome"] == "loss").sum()

    white_games = (group["side"] == "White").sum()
    white_pct = round(white_games / total * 100)

    win_pct = round(wins / total * 100)
    draw_pct = round(draws / total * 100)
    loss_pct = round(losses / total * 100)

    return (
        f"{player_name} has played {opening_name} (ECO {eco}) {total} times. "
        f"Result: {win_pct}% wins, {draw_pct}% draws, {loss_pct}% losses. "
        f"Played as White {white_pct}% of the time."
    )


def main():
    chunks = []

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

        count_before = len(chunks)
        for (eco, opening_name), group in grouped:
            if len(group) < MIN_GAMES:
                continue
            text = build_summary(player, opening_name, eco, group)
            chunks.append({"source": f"{player}-{eco}", "text": text})

        print(f"{player}: {len(chunks) - count_before} opening chunks")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2)

    print(f"\nWrote {len(chunks)} chunks to {output_path}")


if __name__ == "__main__":
    main()