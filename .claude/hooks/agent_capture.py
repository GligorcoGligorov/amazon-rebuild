#!/usr/bin/env python3
"""
Automatic prompt/response capture for Claude Code.

Wired in .claude/settings.json to two lifecycle events:

  UserPromptSubmit -> `agent_capture.py prompt`    writes the PROMPT entry
  Stop             -> `agent_capture.py response`  writes the RESPONSE entry

Both events receive a JSON payload on stdin. UserPromptSubmit carries the user's
text verbatim in `prompt`; Stop carries the final assistant text of the turn in
`last_assistant_message`. Neither carries thinking, tool calls, or intermediate
steps, which is exactly what we want in the log.

Subagents fire SubagentStop, not Stop, so nested agent turns never reach here.

Output: one markdown file per session in .agent-logs/, named
<YYYY-MM-DD_HH-MM-SS>_<session-id>.md using the session's start time in UTC.

Invariants this script holds to:
  - The body of a log file is append-only. Entries are never rewritten.
  - Only the frontmatter counters (total_exchanges, last_prompt_time, model)
    are updated in place, since they describe the file rather than the record.
  - The hook never blocks, never writes to stdout, and always exits 0. A broken
    logger must not be able to break a session. Failures land in
    .agent-logs/.capture-errors.log instead.

A third mode, `backfill <transcript.jsonl>`, reconstructs a session log from a
transcript after the fact. It exists for the bootstrap session that ran before
the hook was installed; entries it writes are marked so they are not mistaken
for live capture.
"""

import fcntl
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone

TOOL = "claude-code"

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.dirname(os.path.dirname(HERE))
LOG_DIR = os.path.join(PROJECT_DIR, ".agent-logs")
ERROR_LOG = os.path.join(LOG_DIR, ".capture-errors.log")
# The lock lives outside .agent-logs/ so that directory contains only the record
# itself and needs no .gitignore entry of any kind.
LOCK_FILE = os.path.join(
    tempfile.gettempdir(),
    "agent-capture-" + hashlib.sha1(PROJECT_DIR.encode()).hexdigest()[:12] + ".lock",
)

PROMPT_MARKER = re.compile(r"^\[LOG_ENTRY type=PROMPT num=(\d+) ", re.M)
RESPONSE_MARKER = re.compile(r"^\[LOG_ENTRY type=RESPONSE num=(\d+) ", re.M)


# --------------------------------------------------------------------------
# identity: who and what is being logged
# --------------------------------------------------------------------------

def _git(*args):
    try:
        out = subprocess.run(
            ["git", "-C", PROJECT_DIR, *args],
            capture_output=True, text=True, timeout=5,
        )
        return out.stdout.strip() if out.returncode == 0 else ""
    except Exception:
        return ""


def author():
    """GitHub handle, taken from the origin remote so it matches the repo owner."""
    if os.environ.get("AGENT_LOG_AUTHOR"):
        return os.environ["AGENT_LOG_AUTHOR"]
    url = _git("config", "--get", "remote.origin.url")
    m = re.search(r"github\.com[:/]([^/]+)/", url)
    if m:
        return m.group(1)
    return _git("config", "--get", "user.name") or "unknown"


def project():
    if os.environ.get("AGENT_LOG_PROJECT"):
        return os.environ["AGENT_LOG_PROJECT"]
    url = _git("config", "--get", "remote.origin.url")
    m = re.search(r"github\.com[:/][^/]+/(.+?)(?:\.git)?$", url)
    if m:
        return m.group(1)
    return os.path.basename(PROJECT_DIR)


# --------------------------------------------------------------------------
# transcript reading
# --------------------------------------------------------------------------

def read_transcript(path):
    """Yield parsed transcript entries, skipping anything unreadable."""
    if not path or not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def session_start(transcript_path, fallback):
    """
    Session start time, used to name the log file.

    Taken from the transcript's first timestamped entry, which is stable for the
    life of the session (and across resumes), so every turn resolves to the same
    filename without needing a state file to remember it.
    """
    for entry in read_transcript(transcript_path):
        ts = entry.get("timestamp")
        if ts:
            return parse_ts(ts)
    return fallback


def is_human_prompt(entry):
    """True for a message the user actually typed, not a tool result or meta."""
    if entry.get("type") != "user" or entry.get("isSidechain"):
        return False
    if entry.get("isMeta") or "toolUseResult" in entry:
        return False
    if entry.get("turnOrigin") == "human":
        return True
    # Headless (`claude -p`) transcripts omit turnOrigin, so fall back to shape:
    # a real prompt carries text and is not a client-generated slash command.
    content = entry.get("message", {}).get("content")
    if isinstance(content, list):
        return any(b.get("type") == "text" for b in content)
    return isinstance(content, str) and not content.startswith("<command-name>")


def latest_model(transcript_path, since=None):
    """
    Exact model id of the most recent main-thread assistant message.

    isSidechain entries are subagent turns and may run a different model, so they
    are excluded — the log records the model the user was actually talking to.
    With `since`, only entries from at or after that time count, which is how the
    response path avoids reporting the previous turn's model.
    """
    model = None
    for entry in read_transcript(transcript_path):
        if entry.get("type") != "assistant" or entry.get("isSidechain"):
            continue
        m = entry.get("message", {}).get("model")
        if not m:
            continue
        if since is not None and parse_ts(entry.get("timestamp")) < since:
            continue
        model = m
    return model


def turn_start(transcript_path):
    """Timestamp of the newest human prompt, i.e. when the current turn opened."""
    start = None
    for entry in read_transcript(transcript_path):
        if is_human_prompt(entry):
            start = parse_ts(entry.get("timestamp"))
    return start


def model_for_turn(transcript_path, timeout=5.0):
    """
    Exact model id for the turn that just ended.

    Stop can fire before the client has flushed this turn's assistant entries to
    the transcript — measured at tens of milliseconds, but it is a race either
    way — so poll briefly for an entry belonging to this turn instead of
    reporting `unknown` or, worse, the previous turn's model after a switch.
    """
    deadline = time.monotonic() + timeout
    while True:
        start = turn_start(transcript_path)
        model = latest_model(transcript_path, since=start)
        if model:
            return model
        if time.monotonic() >= deadline:
            # Better a stale id than none; the timestamps show what happened.
            return latest_model(transcript_path) or "unknown"
        time.sleep(0.1)


def last_assistant_text(transcript_path):
    """Fallback for a turn that ends without text in the Stop payload."""
    text = None
    for entry in read_transcript(transcript_path):
        if entry.get("type") != "assistant" or entry.get("isSidechain"):
            continue
        blocks = entry.get("message", {}).get("content") or []
        if isinstance(blocks, str):
            text = blocks
            continue
        collected = [b.get("text", "") for b in blocks if b.get("type") == "text"]
        if any(t.strip() for t in collected):
            text = "\n".join(collected)
    return text


def resolve_prompt_model(transcript_path):
    """
    Best available model name at prompt time.

    The prompt is logged before the assistant answers, so there is no exact id
    for this turn yet. The previous turn's id is right unless the model was
    switched since, and the RESPONSE entry is always ground truth — so a switch
    still shows up, just on the response. The annotation keeps that honest
    rather than implying more precision than we have.
    """
    m = latest_model(transcript_path)
    if m:
        return m
    for path in (
        os.path.join(PROJECT_DIR, ".claude", "settings.json"),
        os.path.expanduser("~/.claude/settings.json"),
    ):
        try:
            with open(path) as fh:
                alias = json.load(fh).get("model")
            if alias:
                return f"{alias} (alias; exact id in the RESPONSE entry)"
        except Exception:
            continue
    return "unknown (exact id in the RESPONSE entry)"


# --------------------------------------------------------------------------
# time
# --------------------------------------------------------------------------

def parse_ts(value):
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


# --------------------------------------------------------------------------
# log file
# --------------------------------------------------------------------------

def log_path(started, session_id):
    return os.path.join(
        LOG_DIR, f"{started.strftime('%Y-%m-%d_%H-%M-%S')}_{session_id}.md"
    )


def new_file(session_id, started, model, now):
    short = session_id[:8]
    front = {
        "session_id": session_id,
        "date": started.strftime("%Y-%m-%d"),
        "author": author(),
        "model": model,
        "tool": TOOL,
        "project": project(),
        "total_exchanges": 0,
        "first_prompt_time": iso(now),
        "last_prompt_time": iso(now),
    }
    lines = ["---"]
    lines += [f"{k}: {v}" for k, v in front.items()]
    lines += [
        "---",
        "",
        f"# Session Log - {started.strftime('%Y-%m-%d')}",
        "",
        f"Session: `{short}` | Project: `{project()}` | Author: `{author()}`",
        "",
        "---",
        "",
        "",
    ]
    return "\n".join(lines)


def set_front(text, **updates):
    """Rewrite frontmatter keys in place. The body is never touched."""
    if not text.startswith("---\n"):
        return text
    end = text.find("\n---\n", 4)
    if end == -1:
        return text
    head, body = text[4:end], text[end + 5:]
    out = []
    for line in head.split("\n"):
        key = line.split(":", 1)[0].strip()
        if key in updates:
            out.append(f"{key}: {updates.pop(key)}")
        else:
            out.append(line)
    for key, value in updates.items():
        out.append(f"{key}: {value}")
    return "---\n" + "\n".join(out) + "\n---\n" + body


def newest_entry_time(started, session_id):
    """Timestamp of the last entry already in this session's log, if any."""
    if not started:
        return None
    path = log_path(started, session_id)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        stamps = re.findall(r"^timestamp: (\S+)$", fh.read(), re.M)
    return parse_ts(stamps[-1]) if stamps else None


def entry(kind, num, session_id, ts, model, content, note=None):
    header = f"[LOG_ENTRY type={kind} num={num} session={session_id[:8]}]"
    meta = [f"timestamp: {ts}", f"model: {model}"]
    if note:
        meta.append(f"note: {note}")
    return "\n".join([header, *meta, "", content.rstrip("\n"), "", "", ""])


def append(session_id, transcript_path, kind, content, ts, model, note=None):
    os.makedirs(LOG_DIR, exist_ok=True)
    started = session_start(transcript_path, ts)
    path = log_path(started, session_id)

    with open(LOCK_FILE, "a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            if os.path.exists(path):
                with open(path, encoding="utf-8") as fh:
                    text = fh.read()
            else:
                text = new_file(session_id, started, model, ts)

            prompts = [int(n) for n in PROMPT_MARKER.findall(text)]
            responses = [int(n) for n in RESPONSE_MARKER.findall(text)]

            if kind == "PROMPT":
                num = max(prompts + responses, default=0) + 1
            else:
                # Pair with the prompt that opened this turn, i.e. the newest one
                # still waiting for a response. A response with no prompt behind
                # it (the prompt hook failed, or the session was resumed
                # mid-turn) takes a fresh number rather than silently attaching
                # itself to someone else's turn.
                open_prompts = [n for n in prompts if n not in responses]
                num = (max(open_prompts) if open_prompts
                       else max(prompts + responses, default=0) + 1)

            text += entry(kind, num, session_id, iso(ts), model, content, note)

            updates = {"total_exchanges": len(PROMPT_MARKER.findall(text))}
            if kind == "PROMPT":
                updates["last_prompt_time"] = iso(ts)
            else:
                updates["model"] = model
            text = set_front(text, **updates)

            tmp = path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                fh.write(text)
            os.replace(tmp, path)
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)
    return path


# --------------------------------------------------------------------------
# modes
# --------------------------------------------------------------------------

def on_prompt(payload):
    text = payload.get("prompt")
    if not text or not text.strip():
        return
    transcript = payload.get("transcript_path", "")
    append(
        payload.get("session_id", "unknown"),
        transcript,
        "PROMPT",
        text,
        datetime.now(timezone.utc),
        resolve_prompt_model(transcript),
    )


def on_response(payload):
    transcript = payload.get("transcript_path", "")
    text = payload.get("last_assistant_message")
    note = None
    if not text or not text.strip():
        text = last_assistant_text(transcript)
        note = "recovered from transcript; turn ended without text in the Stop payload"
    if not text or not text.strip():
        text = "(no final assistant text for this turn)"
        note = "turn produced no final text"
    append(
        payload.get("session_id", "unknown"),
        transcript,
        "RESPONSE",
        text,
        datetime.now(timezone.utc),
        model_for_turn(transcript),
        note,
    )


def on_backfill(transcript_path):
    """
    Rebuild a log from a transcript for a session that ran before the hook
    existed. Prompts are the entries the client marks turnOrigin=human; the
    response is the last assistant text before the next such prompt.
    """
    entries = list(read_transcript(transcript_path))
    session_id = next(
        (e["sessionId"] for e in entries if e.get("sessionId")),
        os.path.basename(transcript_path).replace(".jsonl", ""),
    )
    note = "backfilled from session transcript; hook was installed mid-session"

    turns, current = [], None
    for e in entries:
        if e.get("isSidechain"):
            continue
        if is_human_prompt(e):
            content = e.get("message", {}).get("content")
            if isinstance(content, list):
                content = "\n".join(
                    b.get("text", "") for b in content if b.get("type") == "text"
                )
            if not content or not str(content).strip():
                continue
            current = {"prompt": str(content), "pts": parse_ts(e.get("timestamp")),
                       "model": None, "response": None, "rts": None}
            turns.append(current)
        elif e.get("type") == "assistant" and current is not None:
            msg = e.get("message", {})
            blocks = msg.get("content") or []
            if isinstance(blocks, str):
                blocks = [{"type": "text", "text": blocks}]
            text = "\n".join(b.get("text", "") for b in blocks if b.get("type") == "text")
            current["model"] = msg.get("model") or current["model"]
            if text.strip():
                current["response"] = text
                current["rts"] = parse_ts(e.get("timestamp"))

    # Re-running backfill on a still-open session must top the log up, not
    # duplicate it, so skip anything at or before the newest entry already
    # written. Append-only holds either way.
    cutoff = newest_entry_time(session_start(transcript_path, None), session_id)
    if cutoff:
        turns = [t for t in turns if t["pts"] > cutoff]

    for turn in turns:
        model = turn["model"] or "unknown"
        append(session_id, transcript_path, "PROMPT", turn["prompt"], turn["pts"], model, note)
        if turn["response"]:
            append(session_id, transcript_path, "RESPONSE", turn["response"],
                   turn["rts"] or turn["pts"], model, note)

    print(f"backfilled {len(turns)} exchange(s) from {transcript_path}")


# --------------------------------------------------------------------------

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "backfill":
        on_backfill(sys.argv[2])
        return
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
    if mode == "prompt":
        on_prompt(payload)
    elif mode == "response":
        on_response(payload)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # A logger must never take a session down with it, and must never print
        # to stdout — UserPromptSubmit stdout is injected into the context.
        try:
            import traceback
            os.makedirs(LOG_DIR, exist_ok=True)
            with open(ERROR_LOG, "a", encoding="utf-8") as fh:
                fh.write(f"\n=== {datetime.now(timezone.utc).isoformat()} argv={sys.argv[1:]}\n")
                fh.write(traceback.format_exc())
        except Exception:
            pass
    sys.exit(0)
