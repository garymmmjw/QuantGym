"""Server-side play-money Texas Hold'em room state for QuantGym Poker.

The API server keeps this module dependency-free so Render can run it with the
same Python standard-library setup as the rest of the beta API.
"""

from __future__ import annotations

import copy
import secrets
import time
from datetime import datetime, timezone


POKER_TABLE_SEATS = 10
POKER_STARTING_STACK_BB = 100
POKER_MIN_PLAYERS = 2
POKER_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
POKER_SUITS = [
    {"key": "s", "symbol": "\u2660"},
    {"key": "h", "symbol": "\u2665"},
    {"key": "d", "symbol": "\u2666"},
    {"key": "c", "symbol": "\u2663"},
]
POKER_BLIND_LEVELS = [
    {"small": 10, "big": 20},
    {"small": 15, "big": 30},
    {"small": 25, "big": 50},
    {"small": 50, "big": 100},
    {"small": 75, "big": 150},
    {"small": 100, "big": 200},
]
POKER_HAND_NAMES = [
    "High card",
    "One pair",
    "Two pair",
    "Three of a kind",
    "Straight",
    "Flush",
    "Full house",
    "Four of a kind",
    "Straight flush",
]


class PokerError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def make_id() -> str:
    return secrets.token_urlsafe(10)


def clamp_int(value, minimum: int, maximum: int) -> int:
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError):
        number = minimum
    return max(minimum, min(maximum, number))


def normalize_player_name(name: str | None) -> str:
    cleaned = " ".join(str(name or "").strip().split())[:18]
    return cleaned or "Player"


def normalize_room_code(value: str | None) -> str:
    cleaned = "".join(char for char in str(value or "").upper() if char.isalnum() or char == "-")
    return cleaned[:12]


def make_room_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "QG-" + "".join(secrets.choice(alphabet) for _ in range(5))


def poker_player_id(user_id: str) -> str:
    return f"user:{user_id}"


def default_settings(big_blind: int = 20) -> dict:
    small_blind = max(1, round(big_blind / 2))
    return {
        "roomName": "Private cash table",
        "smallBlind": small_blind,
        "bigBlind": big_blind,
        "ante": 0,
        "startingStack": big_blind * POKER_STARTING_STACK_BB,
        "maxPlayers": POKER_TABLE_SEATS,
        "decisionTimeLimit": 30,
        "allowSpectators": True,
        "spectatorChat": True,
        "autoStartNextHand": False,
        "autoIncreaseBlinds": False,
    }


def sanitize_settings(raw: dict | None, current: dict | None = None) -> dict:
    base = {**default_settings(), **(current or {})}
    incoming = raw if isinstance(raw, dict) else {}
    small_blind = max(1, round_number(incoming.get("smallBlind", base["smallBlind"])))
    big_blind = max(small_blind + 1, round_number(incoming.get("bigBlind", base["bigBlind"])))
    starting_stack = max(big_blind * 20, round_number(incoming.get("startingStack", base["startingStack"])))
    max_players = clamp_int(incoming.get("maxPlayers", base["maxPlayers"]), POKER_MIN_PLAYERS, POKER_TABLE_SEATS)
    return {
        **base,
        "roomName": str(incoming.get("roomName") or base.get("roomName") or "Private cash table").strip()[:40]
        or "Private cash table",
        "smallBlind": small_blind,
        "bigBlind": big_blind,
        "ante": max(0, round_number(incoming.get("ante", base.get("ante", 0)))),
        "startingStack": starting_stack,
        "maxPlayers": max_players,
        "decisionTimeLimit": clamp_int(incoming.get("decisionTimeLimit", base.get("decisionTimeLimit", 30)), 10, 180),
        "allowSpectators": bool(incoming.get("allowSpectators", base.get("allowSpectators", True))),
        "spectatorChat": bool(incoming.get("spectatorChat", base.get("spectatorChat", True))),
        "autoStartNextHand": bool(incoming.get("autoStartNextHand", base.get("autoStartNextHand", False))),
        "autoIncreaseBlinds": bool(incoming.get("autoIncreaseBlinds", base.get("autoIncreaseBlinds", False))),
    }


def round_number(value, fallback: int = 0) -> int:
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return fallback


def create_room_state(host_user_id: str, host_name: str, room_code: str | None = None, settings: dict | None = None) -> dict:
    base = POKER_BLIND_LEVELS[0]
    next_settings = sanitize_settings({**(settings or {}), "smallBlind": base["small"], "bigBlind": base["big"]})
    code = normalize_room_code(room_code) or make_room_code()
    state = {
        "id": make_id(),
        "mode": "private",
        "online": True,
        "roomCode": code,
        "createdAt": utc_now(),
        "updatedAt": utc_now(),
        "version": 3,
        "hostPlayerId": poker_player_id(host_user_id),
        "hostUserId": host_user_id,
        "isPaused": False,
        "settings": next_settings,
        "status": "registering",
        "seatCount": next_settings["maxPlayers"],
        "startingStack": next_settings["startingStack"],
        "players": [],
        "spectators": [],
        "dealerIndex": -1,
        "handNumber": 0,
        "handsPlayed": 0,
        "blindInterval": 3,
        "level": 0,
        "levelIncreasedAt": -1,
        "smallBlind": next_settings["smallBlind"],
        "bigBlind": next_settings["bigBlind"],
        "ante": next_settings["ante"],
        "stage": "waiting",
        "board": [],
        "deck": [],
        "pot": 0,
        "currentBet": 0,
        "minRaise": next_settings["bigBlind"],
        "actionIndex": -1,
        "handActive": False,
        "handComplete": True,
        "tournamentOver": False,
        "heroStackAtHandStart": next_settings["startingStack"],
        "showdown": None,
        "dealSerial": 0,
        "feedback": "Online private cash table created. Share the link, take seats, then start a hand.",
        "log": [],
        "currentHandLog": [],
        "handHistory": [],
        "ledger": [],
        "chat": [],
    }
    add_player(state, host_user_id, host_name, seat=0)
    add_log(state, f"Room {code} opened with {POKER_STARTING_STACK_BB}BB play-money stacks.")
    return state


def create_player(state: dict, user_id: str, name: str, seat: int) -> dict:
    stack = max(0, round_number(state.get("startingStack"), default_settings()["startingStack"]))
    player_id = poker_player_id(user_id)
    return {
        "id": player_id,
        "userId": user_id,
        "name": normalize_player_name(name),
        "type": "human",
        "isHero": False,
        "seat": seat,
        "stack": stack,
        "buyIn": stack,
        "cashOut": 0,
        "connected": True,
        "sittingOut": False,
        "sitOutNextHand": False,
        "isHost": player_id == state.get("hostPlayerId"),
        "cards": [],
        "currentBet": 0,
        "committed": 0,
        "inHand": False,
        "folded": False,
        "allIn": False,
        "acted": False,
        "eliminated": False,
        "lastAction": "Registered",
    }


def add_player(state: dict, user_id: str, name: str, seat: int | None = None) -> dict:
    existing = find_player_by_user(state, user_id)
    if existing:
        remove_spectator(state, user_id)
        existing["connected"] = True
        if name:
            existing["name"] = normalize_player_name(name)
        return existing
    if not can_register(state):
        raise PokerError(409, "Join between hands")
    target_seat = seat if isinstance(seat, int) else next_open_seat(state)
    if target_seat is None or target_seat < 0 or target_seat >= int(state.get("seatCount") or POKER_TABLE_SEATS):
        raise PokerError(409, "No open seats")
    player = create_player(state, user_id, unique_name(state, name), target_seat)
    state["players"].append(player)
    remove_spectator(state, user_id)
    sort_players(state)
    record_ledger(state, {
        "type": "BUY_IN",
        "playerId": player["id"],
        "playerName": player["name"],
        "amount": player["buyIn"],
        "note": "Player buy-in",
    })
    add_log(state, f"{player['name']} took seat {player['seat'] + 1}.")
    return player


def unique_name(state: dict, raw_name: str | None) -> str:
    base = normalize_player_name(raw_name)
    used = {str(player.get("name") or "").lower() for player in state.get("players", [])}
    if base.lower() not in used:
        return base
    for index in range(2, 100):
        candidate = f"{base} {index}"
        if candidate.lower() not in used:
            return candidate
    return f"{base} {secrets.randbelow(900) + 100}"


def find_player_by_user(state: dict, user_id: str) -> dict | None:
    return next((player for player in state.get("players", []) if player.get("userId") == user_id), None)


def find_spectator_by_user(state: dict, user_id: str) -> dict | None:
    return next((spectator for spectator in state.get("spectators", []) if spectator.get("userId") == user_id), None)


def find_player(state: dict, player_id: str) -> dict | None:
    return next((player for player in state.get("players", []) if player.get("id") == player_id), None)


def add_spectator(state: dict, user_id: str, name: str, announce: bool = False) -> dict | None:
    if find_player_by_user(state, user_id):
        remove_spectator(state, user_id)
        return None
    if state.get("settings", {}).get("allowSpectators") is False:
        raise PokerError(403, "Spectators are not allowed at this table")
    now = utc_now()
    normalized_name = normalize_player_name(name)
    state.setdefault("spectators", [])
    spectator = find_spectator_by_user(state, user_id)
    if spectator:
        spectator["name"] = normalized_name
        spectator["connected"] = True
        spectator["lastSeenAt"] = now
        return spectator
    spectator = {
        "id": f"spectator:{user_id}",
        "userId": user_id,
        "name": unique_spectator_name(state, normalized_name),
        "connected": True,
        "joinedAt": now,
        "lastSeenAt": now,
    }
    state["spectators"].append(spectator)
    if announce:
        add_log(state, f"{spectator['name']} is watching the table.")
    return spectator


def remove_spectator(state: dict, user_id: str) -> None:
    state["spectators"] = [spectator for spectator in state.get("spectators", []) if spectator.get("userId") != user_id]


def unique_spectator_name(state: dict, raw_name: str | None) -> str:
    base = normalize_player_name(raw_name)
    used = {
        str(person.get("name") or "").lower()
        for person in [*state.get("players", []), *state.get("spectators", [])]
    }
    if base.lower() not in used:
        return base
    for index in range(2, 100):
        candidate = f"{base} {index}"
        if candidate.lower() not in used:
            return candidate
    return f"{base} {secrets.randbelow(900) + 100}"


def sort_players(state: dict) -> None:
    state["players"].sort(key=lambda player: int(player.get("seat") or 0))
    for player in state["players"]:
        player["isHost"] = player.get("id") == state.get("hostPlayerId")


def can_register(state: dict) -> bool:
    return not state.get("isPaused") and not state.get("handActive")


def next_open_seat(state: dict) -> int | None:
    occupied = {int(player.get("seat") or 0) for player in state.get("players", [])}
    for seat in range(int(state.get("seatCount") or POKER_TABLE_SEATS)):
        if seat not in occupied:
            return seat
    return None


def is_host(state: dict, user_id: str) -> bool:
    player = find_player_by_user(state, user_id)
    return bool(player and player.get("id") == state.get("hostPlayerId"))


def ensure_host(state: dict, user_id: str) -> None:
    if not is_host(state, user_id):
        raise PokerError(403, "Only the host can do that")


def apply_command(state: dict, user_id: str, command: str, payload: dict | None = None) -> dict:
    data = payload if isinstance(payload, dict) else {}
    command = str(command or "")
    if command == "takeSeat":
        add_player(state, user_id, str(data.get("name") or "Player"), seat=data.get("seat") if isinstance(data.get("seat"), int) else None)
    elif command == "leaveSeat":
        remove_player(state, user_id, str(data.get("playerId") or ""))
    elif command == "startHand":
        ensure_host(state, user_id)
        start_table_or_hand(state)
    elif command == "nextHand":
        ensure_host(state, user_id)
        start_table_or_hand(state)
    elif command == "action":
        submit_action(state, user_id, str(data.get("action") or ""), round_number(data.get("raiseTo"), 0))
    elif command == "chat":
        send_chat(state, user_id, str(data.get("message") or ""))
    elif command == "settings":
        apply_settings(state, user_id, data.get("settings") if isinstance(data.get("settings"), dict) else data)
    elif command == "sitOut":
        set_sitting_out(state, user_id, str(data.get("playerId") or ""), bool(data.get("sittingOut")))
    elif command == "adjustStack":
        adjust_stack(state, user_id, str(data.get("playerId") or ""), round_number(data.get("delta"), 0), str(data.get("note") or "Stack adjustment"))
    elif command == "pause":
        ensure_host(state, user_id)
        state["isPaused"] = True
        add_log(state, "Room paused by host.")
    elif command == "resume":
        ensure_host(state, user_id)
        state["isPaused"] = False
        add_log(state, "Room resumed by host.")
    else:
        raise PokerError(400, "Unsupported poker command")
    touch(state)
    return state


def remove_player(state: dict, requester_user_id: str, player_id: str) -> None:
    if state.get("handActive"):
        raise PokerError(409, "Leave between hands")
    requester = find_player_by_user(state, requester_user_id)
    player = find_player(state, player_id) or requester
    if not player:
        return
    if player.get("userId") != requester_user_id and not is_host(state, requester_user_id):
        raise PokerError(403, "Only the host can remove another player")
    record_ledger(state, {
        "type": "CASH_OUT",
        "playerId": player["id"],
        "playerName": player["name"],
        "amount": round_number(player.get("stack"), 0),
        "note": "Left seat",
    })
    state["players"] = [item for item in state.get("players", []) if item.get("id") != player.get("id")]
    if player.get("id") == state.get("hostPlayerId") and state["players"]:
        state["hostPlayerId"] = state["players"][0]["id"]
        state["hostUserId"] = state["players"][0].get("userId", "")
    add_log(state, f"{player.get('name', 'Player')} left the room.")
    sort_players(state)


def apply_settings(state: dict, user_id: str, raw_settings: dict | None) -> None:
    ensure_host(state, user_id)
    if state.get("handActive"):
        raise PokerError(409, "Change settings between hands")
    occupied_max = max([POKER_MIN_PLAYERS, *[int(player.get("seat") or 0) + 1 for player in state.get("players", [])]])
    next_settings = sanitize_settings(raw_settings, state.get("settings"))
    next_settings["maxPlayers"] = max(occupied_max, next_settings["maxPlayers"])
    state["settings"] = next_settings
    state["smallBlind"] = next_settings["smallBlind"]
    state["bigBlind"] = next_settings["bigBlind"]
    state["ante"] = next_settings["ante"]
    state["startingStack"] = next_settings["startingStack"]
    state["seatCount"] = next_settings["maxPlayers"]
    state["minRaise"] = next_settings["bigBlind"]
    if next_settings["allowSpectators"] is False:
        state["spectators"] = []
    add_log(state, "Table settings saved.")


def set_sitting_out(state: dict, user_id: str, player_id: str, sitting_out: bool) -> None:
    player = find_player(state, player_id) or find_player_by_user(state, user_id)
    if not player:
        return
    if player.get("userId") != user_id and not is_host(state, user_id):
        raise PokerError(403, "Only the host can manage another player")
    if state.get("handActive") and player.get("inHand") and sitting_out:
        player["sitOutNextHand"] = True
        player["lastAction"] = "Sit out next hand"
        add_log(state, f"{player['name']} will sit out next hand.")
        return
    player["sittingOut"] = bool(sitting_out)
    player["sitOutNextHand"] = False
    player["lastAction"] = "Sitting out" if player["sittingOut"] else "Ready"
    add_log(state, f"{player['name']} is {'sitting out' if player['sittingOut'] else 'back'}.")


def adjust_stack(state: dict, user_id: str, player_id: str, delta: int, note: str) -> None:
    player = find_player(state, player_id) or find_player_by_user(state, user_id)
    if not player or not delta:
        return
    is_self_rebuy = player.get("userId") == user_id and delta > 0 and note == "Rebuy"
    if not is_self_rebuy and not is_host(state, user_id):
        raise PokerError(403, "Only the host can adjust stacks")
    if state.get("handActive"):
        raise PokerError(409, "Adjust stacks between hands")
    if delta > 0:
        player["stack"] = round_number(player.get("stack"), 0) + delta
        player["buyIn"] = round_number(player.get("buyIn"), 0) + delta
        player["sittingOut"] = False
    else:
        removed = min(round_number(player.get("stack"), 0), abs(delta))
        player["stack"] = round_number(player.get("stack"), 0) - removed
        player["cashOut"] = round_number(player.get("cashOut"), 0) + removed
    record_ledger(state, {
        "type": "BUY_IN" if delta > 0 else "CASH_OUT",
        "playerId": player["id"],
        "playerName": player["name"],
        "amount": delta,
        "note": note,
    })
    add_log(state, f"{player['name']} stack adjusted {'+' if delta > 0 else ''}{delta}.")


def send_chat(state: dict, user_id: str, message: str) -> None:
    text = str(message or "").strip()[:360]
    if not text:
        return
    player = find_player_by_user(state, user_id)
    spectator = find_spectator_by_user(state, user_id)
    if not player and state.get("settings", {}).get("spectatorChat") is False:
        raise PokerError(403, "Spectator chat is disabled")
    state["chat"] = [
        *state.get("chat", []),
        {
            "id": make_id(),
            "author": player.get("name") if player else spectator.get("name") if spectator else "Spectator",
            "message": text,
            "createdAt": utc_now(),
        },
    ][-160:]


def start_table_or_hand(state: dict) -> None:
    if state.get("isPaused"):
        raise PokerError(409, "Resume the room before starting a hand")
    if state.get("handActive") and not state.get("handComplete"):
        raise PokerError(409, "Hand already running")
    if len(active_players(state)) < POKER_MIN_PLAYERS:
        raise PokerError(409, "Need at least two active seated players")
    if state.get("status") != "running":
        state["status"] = "running"
        add_log(state, "Cash table started.")
    start_next_hand(state)


def start_next_hand(state: dict) -> None:
    sort_players(state)
    maybe_increase_blinds(state)
    for player in state.get("players", []):
        if player.get("sitOutNextHand"):
            player["sittingOut"] = True
            player["sitOutNextHand"] = False
        player["eliminated"] = False
        player["cards"] = []
        player["currentBet"] = 0
        player["committed"] = 0
        player["inHand"] = not player.get("sittingOut") and round_number(player.get("stack"), 0) > 0
        player["folded"] = False
        player["allIn"] = False
        player["acted"] = False
        player["lastAction"] = "Sitting out" if player.get("sittingOut") else "In hand" if player["stack"] > 0 else "Needs buy-in"
    if len(active_players(state)) < POKER_MIN_PLAYERS:
        state["handActive"] = False
        state["handComplete"] = True
        state["stage"] = "waiting"
        add_log(state, "Need at least two active seated players to deal.")
        return
    state["handNumber"] = round_number(state.get("handNumber"), 0) + 1
    state["dealSerial"] = round_number(state.get("dealSerial"), 0) + 1
    state["currentHandLog"] = []
    state["stage"] = "preflop"
    state["board"] = []
    state["deck"] = shuffle_deck(create_deck())
    state["pot"] = 0
    state["currentBet"] = 0
    state["minRaise"] = state["bigBlind"]
    state["showdown"] = None
    state["handActive"] = True
    state["handComplete"] = False
    state["dealerIndex"] = next_seat_with_stack(state, round_number(state.get("dealerIndex"), -1))
    deal_hole_cards(state)
    blinds = blind_seats(state)
    post_blind(state, blinds["small"], state["smallBlind"], "small blind")
    post_blind(state, blinds["big"], state["bigBlind"], "big blind")
    state["actionIndex"] = next_action_seat(state, blinds["big"])
    add_log(state, f"Hand #{state['handNumber']}: blinds {state['smallBlind']}/{state['bigBlind']}.")
    continue_hand(state)


def submit_action(state: dict, user_id: str, action: str, raise_to: int = 0) -> None:
    if state.get("isPaused") or state.get("handComplete"):
        return
    player = current_player(state)
    if not player or player.get("userId") != user_id:
        raise PokerError(403, "It is not your turn")
    perform_action(state, round_number(state.get("actionIndex"), -1), action, raise_to)
    continue_hand(state)


def continue_hand(state: dict) -> None:
    guard = 0
    while state.get("handActive") and not state.get("handComplete") and not state.get("isPaused") and guard < 80:
        guard += 1
        contenders = poker_contenders(state)
        if len(contenders) <= 1:
            award_pot(state, contenders[0] if contenders else None, "Everyone else folded.")
            break
        eligible = eligible_players(state)
        if not eligible:
            run_board_to_showdown(state)
            break
        if betting_round_complete(state):
            advance_street(state)
            continue
        if not is_action_seat(state, round_number(state.get("actionIndex"), -1)):
            state["actionIndex"] = next_action_seat(state, round_number(state.get("actionIndex"), -1))
            continue
        player = current_player(state)
        if not player or player.get("type") == "human":
            break
    if guard >= 80:
        state["feedback"] = "Poker engine paused after too many automatic actions. Start a new hand."
        state["handComplete"] = True
        state["handActive"] = False


def perform_action(state: dict, player_index: int, action: str, raise_to: int = 0) -> None:
    players = state.get("players", [])
    if player_index < 0 or player_index >= len(players):
        return
    player = players[player_index]
    if not player.get("inHand") or player.get("folded") or player.get("allIn"):
        return
    to_call = get_to_call(state, player)
    if action == "fold":
        player["folded"] = True
        player["acted"] = True
        player["lastAction"] = "Fold"
        add_log(state, f"{player['name']} folds.")
        state["actionIndex"] = next_action_seat(state, player_index)
        return
    if action == "allin":
        raise_to = round_number(player.get("currentBet"), 0) + round_number(player.get("stack"), 0)
        action = "raise" if raise_to > round_number(state.get("currentBet"), 0) else "call"
    if action == "raise":
        previous_bet = round_number(state.get("currentBet"), 0)
        max_total = round_number(player.get("currentBet"), 0) + round_number(player.get("stack"), 0)
        min_total = minimum_raise_to(state, player)
        if max_total <= previous_bet and previous_bet > 0:
            action = "call"
        else:
            target_total = min(max_total, max(min_total, round_number(raise_to, min_total)))
            paid = commit_chips(player, target_total - round_number(player.get("currentBet"), 0))
            if target_total > previous_bet:
                raise_size = target_total - previous_bet
                state["currentBet"] = target_total
                is_full_raise = raise_size >= (state["bigBlind"] if previous_bet <= 0 else state["minRaise"])
                if is_full_raise:
                    state["minRaise"] = max(state["bigBlind"], raise_size)
                for other in players:
                    if (
                        other.get("inHand")
                        and not other.get("folded")
                        and not other.get("allIn")
                        and other.get("id") != player.get("id")
                        and round_number(other.get("currentBet"), 0) < state["currentBet"]
                    ):
                        other["acted"] = False
            player["acted"] = True
            player["lastAction"] = (
                f"All-in {player['currentBet']}"
                if player.get("allIn")
                else f"Raise to {player['currentBet']}" if previous_bet else f"Bet {player['currentBet']}"
            )
            state["pot"] = round_number(state.get("pot"), 0) + paid
            verb = "is all-in for" if player.get("allIn") else "raises to" if previous_bet else "bets"
            add_log(state, f"{player['name']} {verb} {player['currentBet']}.")
            state["actionIndex"] = next_action_seat(state, player_index)
            return
    paid = commit_chips(player, to_call)
    state["pot"] = round_number(state.get("pot"), 0) + paid
    player["acted"] = True
    player["lastAction"] = f"Call {paid}" if to_call else "Check"
    add_log(state, f"{player['name']} calls {paid}{' and is all-in' if player.get('allIn') else ''}." if to_call else f"{player['name']} checks.")
    state["actionIndex"] = next_action_seat(state, player_index)


def commit_chips(player: dict, amount: int) -> int:
    paid = min(max(0, round_number(amount, 0)), round_number(player.get("stack"), 0))
    player["stack"] = round_number(player.get("stack"), 0) - paid
    player["currentBet"] = round_number(player.get("currentBet"), 0) + paid
    player["committed"] = round_number(player.get("committed"), 0) + paid
    if player["stack"] <= 0:
        player["stack"] = 0
        player["allIn"] = True
    return paid


def active_players(state: dict) -> list[dict]:
    return [player for player in state.get("players", []) if not player.get("sittingOut") and round_number(player.get("stack"), 0) > 0]


def poker_contenders(state: dict) -> list[dict]:
    return [player for player in state.get("players", []) if player.get("inHand") and not player.get("folded")]


def eligible_players(state: dict) -> list[dict]:
    return [
        player
        for player in state.get("players", [])
        if player.get("inHand") and not player.get("folded") and not player.get("allIn") and round_number(player.get("stack"), 0) > 0
    ]


def betting_round_complete(state: dict) -> bool:
    eligible = eligible_players(state)
    return not eligible or all(player.get("acted") and round_number(player.get("currentBet"), 0) == round_number(state.get("currentBet"), 0) for player in eligible)


def get_to_call(state: dict, player: dict) -> int:
    return max(0, round_number(state.get("currentBet"), 0) - round_number(player.get("currentBet"), 0))


def minimum_raise_to(state: dict, player: dict) -> int:
    current_bet = round_number(state.get("currentBet"), 0)
    if current_bet <= 0:
        return min(round_number(player.get("stack"), 0), round_number(state.get("bigBlind"), 1))
    return min(round_number(player.get("currentBet"), 0) + round_number(player.get("stack"), 0), current_bet + round_number(state.get("minRaise"), 1))


def current_player(state: dict) -> dict | None:
    index = round_number(state.get("actionIndex"), -1)
    players = state.get("players", [])
    if index < 0 or index >= len(players):
        return None
    return players[index]


def blind_seats(state: dict) -> dict:
    if len(active_players(state)) == 2:
        return {"small": state["dealerIndex"], "big": next_seat_with_stack(state, state["dealerIndex"])}
    small = next_seat_with_stack(state, state["dealerIndex"])
    return {"small": small, "big": next_seat_with_stack(state, small)}


def next_seat_with_stack(state: dict, from_index: int) -> int:
    players = state.get("players", [])
    if not players:
        return 0
    for step in range(1, len(players) + 1):
        index = (from_index + step + len(players)) % len(players)
        player = players[index]
        if not player.get("sittingOut") and round_number(player.get("stack"), 0) > 0:
            return index
    return 0


def next_action_seat(state: dict, from_index: int) -> int:
    players = state.get("players", [])
    if not players:
        return -1
    for step in range(1, len(players) + 1):
        index = (from_index + step + len(players)) % len(players)
        if is_action_seat(state, index):
            return index
    return -1


def is_action_seat(state: dict, index: int) -> bool:
    players = state.get("players", [])
    if index < 0 or index >= len(players):
        return False
    player = players[index]
    return bool(player.get("inHand") and not player.get("folded") and not player.get("allIn") and round_number(player.get("stack"), 0) > 0)


def create_deck() -> list[dict]:
    return [
        {
            "rank": rank,
            "value": index + 2,
            "suit": suit["key"],
            "suitSymbol": suit["symbol"],
            "id": f"{rank}{suit['key']}",
        }
        for suit in POKER_SUITS
        for index, rank in enumerate(POKER_RANKS)
    ]


def shuffle_deck(deck: list[dict]) -> list[dict]:
    cards = deck[:]
    for index in range(len(cards) - 1, 0, -1):
        swap_index = secrets.randbelow(index + 1)
        cards[index], cards[swap_index] = cards[swap_index], cards[index]
    return cards


def draw_card(state: dict) -> dict | None:
    return state["deck"].pop() if state.get("deck") else None


def deal_hole_cards(state: dict) -> None:
    for _ in range(2):
        for player in state.get("players", []):
            if player.get("inHand"):
                card = draw_card(state)
                if card:
                    player["cards"].append(card)


def post_blind(state: dict, player_index: int, amount: int, label: str) -> None:
    players = state.get("players", [])
    if player_index < 0 or player_index >= len(players):
        return
    player = players[player_index]
    paid = commit_chips(player, amount)
    player["acted"] = False
    player["lastAction"] = f"{label} {paid}"
    state["currentBet"] = max(round_number(state.get("currentBet"), 0), round_number(player.get("currentBet"), 0))
    state["pot"] = round_number(state.get("pot"), 0) + paid
    add_log(state, f"{player['name']} posts {label} {paid}.")


def reset_street_bets(state: dict) -> None:
    state["currentBet"] = 0
    state["minRaise"] = state["bigBlind"]
    for player in state.get("players", []):
        player["currentBet"] = 0
        player["acted"] = False


def maybe_increase_blinds(state: dict) -> None:
    if not state.get("settings", {}).get("autoIncreaseBlinds"):
        return
    hands_played = round_number(state.get("handsPlayed"), 0)
    if hands_played > 0 and hands_played % round_number(state.get("blindInterval"), 3) == 0 and state.get("levelIncreasedAt") != hands_played:
        state["level"] = min(len(POKER_BLIND_LEVELS) - 1, round_number(state.get("level"), 0) + 1)
        state["levelIncreasedAt"] = hands_played
        level = POKER_BLIND_LEVELS[state["level"]]
        state["smallBlind"] = level["small"]
        state["bigBlind"] = level["big"]
        state["minRaise"] = level["big"]
        add_log(state, f"Blinds increase to {state['smallBlind']}/{state['bigBlind']}.")


def advance_street(state: dict) -> None:
    if state.get("stage") == "river":
        showdown(state)
        return
    state["stage"] = "flop" if state.get("stage") == "preflop" else "turn" if state.get("stage") == "flop" else "river"
    state["dealSerial"] = round_number(state.get("dealSerial"), 0) + 1
    cards_to_deal = 3 if state["stage"] == "flop" else 1
    for _ in range(cards_to_deal):
        card = draw_card(state)
        if card:
            state["board"].append(card)
    reset_street_bets(state)
    state["actionIndex"] = next_action_seat(state, round_number(state.get("dealerIndex"), -1))
    add_log(state, f"{stage_label(state['stage'])}: {' '.join(card_label(card) for card in state['board'])}.")


def run_board_to_showdown(state: dict) -> None:
    while state.get("stage") != "river":
        advance_street(state)
    showdown(state)


def showdown(state: dict) -> None:
    contenders = poker_contenders(state)
    results = [{"player": player, "hand": evaluate_hand([*player.get("cards", []), *state.get("board", [])])} for player in contenders]
    results.sort(key=lambda item: hand_sort_key(item["hand"]), reverse=True)
    pots = build_pots(state.get("players", []))
    award_lines = []
    winner_ids = set()
    for index, pot in enumerate(pots):
        eligible = [result for result in results if result["player"].get("id") in pot["eligibleIds"]]
        eligible.sort(key=lambda item: hand_sort_key(item["hand"]), reverse=True)
        best = eligible[0]["hand"] if eligible else None
        winners = [result for result in eligible if best and compare_hands(result["hand"], best) == 0]
        if not winners or pot["amount"] <= 0:
            continue
        share = pot["amount"] // len(winners)
        remainder = pot["amount"] - share * len(winners)
        for result in winners:
            result["player"]["stack"] = round_number(result["player"].get("stack"), 0) + share + (1 if remainder > 0 else 0)
            if remainder > 0:
                remainder -= 1
            winner_ids.add(result["player"]["id"])
        label = "main pot" if index == 0 else f"side pot {index}"
        award_lines.append(f"{', '.join(result['player']['name'] for result in winners)} wins {pot['amount']} {label}")
    top = results[0]["hand"] if results else None
    best_name = f"{top['name']} ({' '.join(card_label(card) for card in top['cards'])})" if top else "best hand"
    state["showdown"] = {"winners": list(winner_ids), "results": results, "pots": pots}
    finish_hand(state, f"{'. '.join(award_lines)} with {best_name}.")


def build_pots(players: list[dict]) -> list[dict]:
    levels = sorted({round_number(player.get("committed"), 0) for player in players if round_number(player.get("committed"), 0) > 0})
    previous = 0
    pots = []
    for level in levels:
        contributors = [player for player in players if round_number(player.get("committed"), 0) >= level]
        amount = (level - previous) * len(contributors)
        previous = level
        eligible_ids = [player["id"] for player in contributors if player.get("inHand") and not player.get("folded")]
        if amount > 0 and eligible_ids:
            pots.append({"amount": amount, "eligibleIds": eligible_ids})
    return pots


def award_pot(state: dict, winner: dict | None, reason: str = "") -> None:
    if winner:
        winner["stack"] = round_number(winner.get("stack"), 0) + round_number(state.get("pot"), 0)
    finish_hand(state, f"{winner.get('name') if winner else 'Nobody'} wins {state.get('pot', 0)}. {reason}".strip())


def finish_hand(state: dict, message: str) -> None:
    state["feedback"] = message
    state["handComplete"] = True
    state["handActive"] = False
    if state.get("showdown"):
        state["stage"] = "showdown"
    state["actionIndex"] = -1
    state["handsPlayed"] = round_number(state.get("handsPlayed"), 0) + 1
    for player in state.get("players", []):
        player["eliminated"] = False
        if round_number(player.get("stack"), 0) <= 0:
            player["lastAction"] = "Needs buy-in"
    add_log(state, message)
    archive_hand(state, message)


def evaluate_hand(cards: list[dict]) -> dict:
    sorted_cards = sorted([card for card in cards if card], key=lambda card: card["value"], reverse=True)
    groups: dict[int, list[dict]] = {}
    for card in sorted_cards:
        groups.setdefault(int(card["value"]), []).append(card)
    groups_by_count = sorted(
        [{"value": value, "cards": value_cards, "count": len(value_cards)} for value, value_cards in groups.items()],
        key=lambda group: (-group["count"], -group["value"]),
    )
    flush_cards = None
    for suit in POKER_SUITS:
        suited = [card for card in sorted_cards if card["suit"] == suit["key"]]
        if len(suited) >= 5:
            flush_cards = suited
            break
    straight_high = find_straight_high(list(groups.keys()))
    straight_flush_high = find_straight_high(list({card["value"] for card in flush_cards})) if flush_cards else 0
    if straight_flush_high:
        return build_eval(8, [straight_flush_high], straight_cards(sorted_cards, straight_flush_high, flush_cards[0]["suit"] if flush_cards else ""))
    quads = next((group for group in groups_by_count if group["count"] == 4), None)
    if quads:
        kicker = next((card for card in sorted_cards if card["value"] != quads["value"]), None)
        return build_eval(7, [quads["value"], kicker["value"] if kicker else 0], [*quads["cards"], *([kicker] if kicker else [])])
    trips = [group for group in groups_by_count if group["count"] >= 3]
    pairs = [group for group in groups_by_count if group["count"] >= 2 and group["value"] != (trips[0]["value"] if trips else None)]
    if trips and (pairs or len(trips) > 1):
        pair_group = pairs[0] if pairs else trips[1]
        return build_eval(6, [trips[0]["value"], pair_group["value"]], [*trips[0]["cards"][:3], *pair_group["cards"][:2]])
    if flush_cards:
        return build_eval(5, [card["value"] for card in flush_cards[:5]], flush_cards[:5])
    if straight_high:
        return build_eval(4, [straight_high], straight_cards(sorted_cards, straight_high))
    if trips:
        kickers = [card for card in sorted_cards if card["value"] != trips[0]["value"]][:2]
        return build_eval(3, [trips[0]["value"], *[card["value"] for card in kickers]], [*trips[0]["cards"][:3], *kickers])
    made_pairs = [group for group in groups_by_count if group["count"] >= 2]
    if len(made_pairs) >= 2:
        top_pairs = made_pairs[:2]
        kicker = next((card for card in sorted_cards if all(pair["value"] != card["value"] for pair in top_pairs)), None)
        return build_eval(2, [top_pairs[0]["value"], top_pairs[1]["value"], kicker["value"] if kicker else 0], [*top_pairs[0]["cards"][:2], *top_pairs[1]["cards"][:2], *([kicker] if kicker else [])])
    if len(made_pairs) == 1:
        kickers = [card for card in sorted_cards if card["value"] != made_pairs[0]["value"]][:3]
        return build_eval(1, [made_pairs[0]["value"], *[card["value"] for card in kickers]], [*made_pairs[0]["cards"][:2], *kickers])
    return build_eval(0, [card["value"] for card in sorted_cards[:5]], sorted_cards[:5])


def build_eval(rank: int, tiebreakers: list[int], cards: list[dict]) -> dict:
    return {"rank": rank, "name": POKER_HAND_NAMES[rank] if 0 <= rank < len(POKER_HAND_NAMES) else "Hand", "tiebreakers": tiebreakers, "cards": [card for card in cards if card][:5]}


def hand_sort_key(hand: dict) -> tuple:
    return (hand.get("rank", 0), *hand.get("tiebreakers", []))


def compare_hands(left: dict, right: dict) -> int:
    left_values = [left.get("rank", 0), *left.get("tiebreakers", [])]
    right_values = [right.get("rank", 0), *right.get("tiebreakers", [])]
    for index in range(max(len(left_values), len(right_values))):
        diff = (left_values[index] if index < len(left_values) else 0) - (right_values[index] if index < len(right_values) else 0)
        if diff:
            return diff
    return 0


def find_straight_high(values: list[int]) -> int:
    unique = sorted(set(values), reverse=True)
    if 14 in unique:
        unique.append(1)
    for index in range(0, max(0, len(unique) - 4)):
        run = unique[index : index + 5]
        if len(run) == 5 and all(run[position] == run[position - 1] - 1 for position in range(1, 5)):
            return 5 if run[0] == 1 else run[0]
    return 0


def straight_cards(cards: list[dict], high: int, suit: str = "") -> list[dict]:
    values = [5, 4, 3, 2, 14] if high == 5 else [high, high - 1, high - 2, high - 3, high - 4]
    chosen = []
    for value in values:
        card = next((item for item in cards if item["value"] == value and (not suit or item["suit"] == suit)), None)
        if card:
            chosen.append(card)
    return chosen


def card_label(card: dict) -> str:
    return f"{card.get('rank')}{card.get('suitSymbol')}"


def stage_label(stage: str) -> str:
    return {"waiting": "Waiting", "preflop": "Preflop", "flop": "Flop", "turn": "Turn", "river": "River", "showdown": "Showdown"}.get(stage, "Hand")


def add_log(state: dict, line: str) -> None:
    if not line:
        return
    state["log"] = [*state.get("log", []), line][-24:]
    if state.get("handActive") or state.get("handNumber"):
        state["currentHandLog"] = [
            *state.get("currentHandLog", []),
            {"at": utc_now(), "stage": state.get("stage", "waiting"), "line": line},
        ][-120:]
    state["feedback"] = line


def record_ledger(state: dict, entry: dict) -> None:
    state["ledger"] = [
        *state.get("ledger", []),
        {
            "id": make_id(),
            "createdAt": utc_now(),
            "type": entry.get("type") or "ADJUSTMENT",
            "playerId": entry.get("playerId") or "",
            "playerName": entry.get("playerName") or "",
            "amount": round_number(entry.get("amount"), 0),
            "note": entry.get("note") or "",
        },
    ][-200:]


def archive_hand(state: dict, message: str) -> None:
    if not state.get("handNumber"):
        return
    hand_id = f"{state.get('id')}:{state.get('handNumber')}"
    if state.get("archivedHandId") == hand_id:
        return
    state["archivedHandId"] = hand_id
    entry = {
        "id": hand_id,
        "handNumber": state.get("handNumber"),
        "createdAt": utc_now(),
        "blinds": f"{state.get('smallBlind')}/{state.get('bigBlind')}",
        "stage": state.get("stage"),
        "buttonSeat": (state["players"][state["dealerIndex"]]["seat"] + 1) if isinstance(state.get("dealerIndex"), int) and 0 <= state["dealerIndex"] < len(state.get("players", [])) else None,
        "board": [card_label(card) for card in state.get("board", [])],
        "pot": state.get("pot", 0),
        "result": message,
        "actions": list(state.get("currentHandLog", [])),
        "showdown": state.get("showdown"),
    }
    state["handHistory"] = [entry, *state.get("handHistory", [])][:80]


def touch(state: dict) -> None:
    state["updatedAt"] = utc_now()


def room_summary(state: dict) -> dict:
    return {
        "roomCode": state.get("roomCode"),
        "roomName": state.get("settings", {}).get("roomName", "Private cash table"),
        "status": "paused" if state.get("isPaused") else "running" if state.get("status") == "running" else "open",
        "players": len(state.get("players", [])),
        "spectators": len(state.get("spectators", [])),
        "seats": state.get("seatCount", POKER_TABLE_SEATS),
        "activePlayers": len(active_players(state)),
        "handNumber": state.get("handNumber", 0),
        "updatedAt": state.get("updatedAt"),
    }


def redact_state(state: dict, viewer_user_id: str | None) -> dict:
    safe = copy.deepcopy(state)
    safe["deck"] = []
    viewer_player = next((player for player in safe.get("players", []) if viewer_user_id and player.get("userId") == viewer_user_id), None)
    viewer_spectator = next((spectator for spectator in safe.get("spectators", []) if viewer_user_id and spectator.get("userId") == viewer_user_id), None)
    viewer_role = "player" if viewer_player else "spectator" if viewer_spectator else "guest"
    if viewer_player and viewer_player.get("isHost"):
        viewer_role = "host"
    safe["viewerRole"] = viewer_role
    safe["viewer"] = {
        "userId": viewer_user_id or "",
        "role": viewer_role,
        "name": (viewer_player or viewer_spectator or {}).get("name") or "",
    }
    reveal_all = bool(safe.get("handComplete") or safe.get("stage") == "showdown")
    for player in safe.get("players", []):
        is_viewer = bool(viewer_user_id and player.get("userId") == viewer_user_id)
        player["isHero"] = is_viewer
        player["cardsVisible"] = is_viewer or reveal_all
        if not player["cardsVisible"]:
            player["cards"] = []
    for spectator in safe.get("spectators", []):
        spectator["isHero"] = bool(viewer_user_id and spectator.get("userId") == viewer_user_id)
    if safe.get("showdown") and reveal_all:
        safe["showdown"] = redact_showdown(safe["showdown"])
    elif safe.get("showdown"):
        safe["showdown"] = None
    return safe


def redact_showdown(showdown_payload: dict) -> dict:
    payload = copy.deepcopy(showdown_payload)
    for result in payload.get("results", []):
        player = result.get("player")
        if isinstance(player, dict):
            player["cardsVisible"] = True
    return payload


def mark_disconnected(state: dict, user_id: str) -> None:
    player = find_player_by_user(state, user_id)
    if player:
        player["connected"] = False
    spectator = find_spectator_by_user(state, user_id)
    if spectator:
        spectator["connected"] = False
    touch(state)
