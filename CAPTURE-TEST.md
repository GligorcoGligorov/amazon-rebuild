# Capture Test

Proof that prompt/response capture is installed, automatic, and works in sessions
other than the one that installed it.

## 1. Tool and model

| | |
|---|---|
| Tool | Claude Code `2.1.96` (VS Code extension + CLI, same binary) |
| Model (interactive) | `claude-opus-5` |
| Model (headless `claude -p`) | `claude-opus-4-6` |
| Planning vs execution | No split. One model plans and executes in the same turn. Extended thinking happens inside the turn and is deliberately **not** captured. |

The two model ids are a real difference, not a typo: the interactive session runs
Opus 5, while `claude -p` resolved the `opus` alias to `claude-opus-4-6`. The
canaries below were run headless, so they show `claude-opus-4-6`. This is exactly
the kind of switch the `model:` field exists to make visible, and it showed up on
the first run without being looked for.

## 2. Mechanism

Claude Code has a hook system — lifecycle events that run a shell command. It is
fully automatic; nothing has to be remembered or triggered by hand.

Two events carry precisely the two things the brief asks for, and nothing else:

| Event | Fires | Payload field used |
|---|---|---|
| `UserPromptSubmit` | when a prompt is submitted, before the model sees it | `prompt` — the user's text, verbatim |
| `Stop` | when the turn ends | `last_assistant_message` — the final assistant text |

This is why the log contains no thinking, no tool calls, and no intermediate
steps: those are never handed to either hook in the first place. There is nothing
to filter out. Subagents fire a separate `SubagentStop` event, so nested agent
work does not leak into the log either.

**Files changed:**

- `.claude/settings.json` — wires both events (committed to the repo, so it
  applies to anyone working in this checkout)
- `.claude/hooks/agent_capture.py` — the capture script

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "python3 \"${CLAUDE_PROJECT_DIR}/.claude/hooks/agent_capture.py\" prompt", "timeout": 15 }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "python3 \"${CLAUDE_PROJECT_DIR}/.claude/hooks/agent_capture.py\" response", "timeout": 30 }] }
    ]
  }
}
```

Properties the script holds to:

- **The body of a log file is append-only.** Entries are never rewritten or
  removed. Only the frontmatter counters (`total_exchanges`, `last_prompt_time`,
  `model`) are updated in place, because they describe the file rather than the
  record.
- **The hook can never break a session.** It never blocks, never writes to
  stdout (`UserPromptSubmit` stdout is injected into the model's context), and
  always exits 0. Failures are written to `.agent-logs/.capture-errors.log`
  instead of surfacing — that file is committed too, empty or not.
- **Concurrent sessions are safe.** Writes take an exclusive `flock`. The lock
  lives in the system temp dir, not in `.agent-logs/`, so that directory holds
  only the record and needs no `.gitignore` entry of any kind.
- **The filename is derived, not remembered.** A session's log file is named from
  the first timestamp in its transcript, so every turn in a session resolves to
  the same file with no state to keep in sync, including across `--resume`.

`.agent-logs/` is **not** in `.gitignore`. The only `.gitignore` in this repo
covers `__pycache__/` from running the hook, and says so.

## 3. Where the canaries landed

- `.agent-logs/2026-09-22_17-22-30_f1fc5c3f-dc85-4651-9d5f-84c4fc6aa508.md` — canary 1
- `.agent-logs/2026-09-22_17-23-53_ffc9f0da-4f1e-4ddc-a4f7-483502f60ee1.md` — canary 2 and 3
- `.agent-logs/2026-09-22_17-25-15_c89fc073-0518-4991-901e-4e7026dd3f84.md` — canary 4

Four separate sessions, four separate session ids. Canary 2 and 3 share a file
because 3 was a second turn in that same session — which is what proves entries
append and pair correctly rather than each turn starting a new file.

## 4. The canary entries, raw

### Canary 1 — session `f1fc5c3f`, a fresh session

This is the run that caught a bug. Pasted as written, `model: unknown` and all;
see §5.

```
[LOG_ENTRY type=PROMPT num=1 session=f1fc5c3f]
timestamp: 2026-09-22T17:22:30.535Z
model: opus (alias; exact id in the RESPONSE entry)

CAPTURE TEST — 8x assignment, Gligorco Gligorov. Reply with one short sentence confirming you received this, nothing else.


[LOG_ENTRY type=RESPONSE num=1 session=f1fc5c3f]
timestamp: 2026-09-22T17:22:33.725Z
model: unknown

Confirmed — I received the 8x assignment capture test.
```

### Canary 2 — session `ffc9f0da`, a second, unrelated session

A different session id, which is the point: the hook is installed in the repo,
not in a session.

```
[LOG_ENTRY type=PROMPT num=1 session=ffc9f0da]
timestamp: 2026-09-22T17:23:53.068Z
model: opus (alias; exact id in the RESPONSE entry)

CAPTURE TEST 2 — 8x assignment, Gligorco Gligorov. Reply with one short sentence confirming you received this, nothing else.


[LOG_ENTRY type=RESPONSE num=1 session=ffc9f0da]
timestamp: 2026-09-22T17:23:56.481Z
model: claude-opus-4-6

Confirmed — I received the CAPTURE TEST 2 message for the 8x assignment, Gligorco Gligorov.
```

### Canary 3 — session `ffc9f0da`, second turn in that same session

Both canaries above were single-turn, which would not have proved that a second
exchange appends to the same file and pairs as `num=2`. This one does.

```
[LOG_ENTRY type=PROMPT num=2 session=ffc9f0da]
timestamp: 2026-09-22T17:24:11.435Z
model: claude-opus-4-6

CAPTURE TEST 3 — second turn in the same session. Reply with one short sentence.


[LOG_ENTRY type=RESPONSE num=2 session=ffc9f0da]
timestamp: 2026-09-22T17:24:14.049Z
model: claude-opus-4-6

Confirmed — I received CAPTURE TEST 3, second turn in the same session.
```

### Canary 4 — session `c89fc073`, re-verification after the last change

Run after relocating the lock file, to confirm that change broke nothing. The
model had no idea what the prompt meant. Left in, because a log that only records
the responses that went well is not a log.

```
[LOG_ENTRY type=PROMPT num=1 session=c89fc073]
timestamp: 2026-09-22T17:25:15.449Z
model: opus (alias; exact id in the RESPONSE entry)

CAPTURE TEST 4 — final verification after moving the lock file. One short sentence please.


[LOG_ENTRY type=RESPONSE num=1 session=c89fc073]
timestamp: 2026-09-22T17:25:18.415Z
model: claude-opus-4-6

I don't have context about a "CAPTURE TEST 4" or a lock file move — could you clarify what you're referring to?
```

## 5. What did not work first

**A `model: unknown` race, visible in canary 1.** The `Stop` payload does not
carry the model id, so the script read it from the session transcript. Canary 1
came back `model: unknown`. The assistant entry was in the transcript by the time
I looked — timestamped 67 ms *before* the hook ran — so the id was there in
principle. `Stop` fires before the client has finished flushing the turn's
assistant entry to disk, and the hook won the race. Fixed by polling briefly
(up to 5 s, 100 ms apart) for an assistant entry belonging to *this* turn,
identified by comparing against the timestamp of the newest human prompt. Without
the "this turn" part the poll would have silently reported the *previous* turn's
model, which is worse than `unknown` — it would hide exactly the mid-build switch
the field exists to expose. Canaries 2–4 resolve correctly. Canary 1 is left in
the log as it was written.

**Orphan responses collided with prompt numbers.** Found during offline testing,
when a deliberately malformed payload made the prompt hook fail and the response
arrived with no prompt ahead of it. The numbering fell back to
`max(responses) if responses else 0 + 1`, where Python's precedence binds the
`+ 1` to the `0` alone, so a second orphan reused a live number. Responses now
pair with the newest prompt that has no response yet, and a genuine orphan takes
a fresh number instead of attaching itself to someone else's turn. That same
failed run also confirmed the error path: the session was unaffected and the
traceback went to `.agent-logs/.capture-errors.log`.

**`turnOrigin` is not present in headless transcripts.** Telling a real prompt
apart from a tool result initially relied on `turnOrigin == "human"`, which the
interactive client sets and `claude -p` omits. Now there is a fallback on message
shape: not a tool result, not client meta, not a slash command.

**The lock file was initially written to `.agent-logs/.lock`.** Harmless, but it
put a non-record file in a directory that ships as the record, and the only ways
to deal with it were to commit noise or add a `.gitignore` line mentioning
`.agent-logs` — which is the one thing the brief rules out, and which would make
a reviewer stop and check. Moved to the system temp dir, keyed by a hash of the
project path.

**One thing deliberately not solved.** A `PROMPT` entry is written before the
model answers, so no exact model id exists for it yet. Rather than guess, it
records the previous turn's id, or the configured alias annotated as such
(`opus (alias; exact id in the RESPONSE entry)`) when there is no previous turn.
The `RESPONSE` entry is always ground truth. A mid-session model switch therefore
shows up on the response first — visible either way, and honest about which of
the two numbers is measured and which is inferred.

## 6. Session logged before the hook existed

The session that set all this up ran before there was a hook to capture it, so
its own prompt and response would have been missing from the record. The script
has a `backfill` mode that reconstructs a log from a session transcript:

```
python3 .claude/hooks/agent_capture.py backfill ~/.claude/projects/<project-slug>/<session-id>.jsonl
```

Those entries are tagged `note: backfilled from session transcript; hook was
installed mid-session`, so they are distinguishable from live capture and nothing
is passed off as something it isn't. Backfill skips exchanges already present, so
re-running it tops a log up rather than duplicating it. It was used once, for
`c607a0bf` — the setup session, in
`.agent-logs/2026-09-22_16-53-09_c607a0bf-7989-4756-b40a-bab918bd8ec4.md`.

## 7. One operational note

Claude Code reads hook configuration at session start. The session that created
`.claude/settings.json` is therefore still running without the hook loaded; any
session started after it has capture active, which is why the canaries were run
as separate sessions. Restart before building, and the rest is automatic.
