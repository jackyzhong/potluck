#!/usr/bin/env python3
"""Resolve PROGRESS.md merge conflicts where both sides only added things.

Usage (after a `git merge` stops on docs/potluck-glow-redesign/PROGRESS.md):
    python3 scripts/resolve-progress-conflicts.py docs/potluck-glow-redesign/PROGRESS.md

See PLAN.md, "Coordinating the build", step 5.

Board hunks: per task row, keep whichever side moved it off `todo`.
Anything else (log entries): keep both, incoming side first (newest first).
Refuses if a board row was changed on both sides.
"""
import re
import sys

path = sys.argv[1]
text = open(path).read()
pattern = re.compile(r"^<<<<<<< [^\n]*\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]*\n", re.S | re.M)


def task(line):
    m = re.match(r"\| (T\d+\w*) \|", line)
    return m.group(1) if m else None


def resolve(m):
    ours, theirs = m.group(1).splitlines(), m.group(2).splitlines()
    if all(task(l) for l in ours + theirs):
        rows = {}
        order = []
        for side in (ours, theirs):
            for l in side:
                t = task(l)
                if t not in rows:
                    order.append(t)
                    rows[t] = l
                elif rows[t] != l:
                    a_todo = "| todo |" in rows[t]
                    b_todo = "| todo |" in l
                    if a_todo and not b_todo:
                        rows[t] = l
                    elif not a_todo and not b_todo:
                        sys.exit(f"both sides changed {t}")
        return "\n".join(rows[t] for t in order) + "\n"
    out = m.group(2).rstrip("\n") + "\n\n" + m.group(1)
    return out if out.endswith("\n") else out + "\n"


new, n = pattern.subn(resolve, text)
if "<<<<<<<" in new or ">>>>>>>" in new:
    sys.exit("unresolved markers remain")
open(path, "w").write(new)
print(f"resolved {n} hunks")
