# Product

<!-- impeccable:product-schema 1 -->

## Platform

desktop (Windows)

## Stack

delegated: Electron + vanilla JavaScript, preserving the existing desktop file-dialog workflow with a small dependency surface.

## Users

Inferred from the existing application and confirmed batch workflow: people aligning local video files with external subtitle files, often in batches.

## Product Purpose

Pair local videos with external subtitle files and synchronize each subtitle against its video's audio through the installed `ffs` command. Success means each intended pair is clear before processing, the aligned subtitle is written safely, and the user can tell which items succeeded or failed.

## Positioning

A local desktop front end for FFSubSync's `ffs` command that turns multiple video/subtitle files into reviewable one-to-one jobs with per-item progress and results.

## Operating Context

The established product is an Electron desktop app. Users select or drop local video and subtitle files, pair them, run a batch sequentially, and review progress and completion details. FFSubSync must be installed separately and its `ffs` executable available to the app.

## Capabilities and Constraints

- Supports MP4, MKV, AVI, MOV, WMV, FLV, and WebM videos.
- Supports SRT, ASS, SSA, SUB, and VTT subtitles.
- Uses the installed `ffs` CLI for synchronization; it does not implement the alignment engine itself.
- Pairs videos and subtitles by their independent list order. Lists start in natural filename order and can be reordered with per-file controls.
- Requires equal video and subtitle counts before running the batch.
- Writes synchronized subtitles beside their videos using the exact video basename and the selected subtitle extension so media players can auto-load them.
- When that exact output path already contains a subtitle, retains the previous file as an `.original` backup before installing the synchronized output.
- Media paths are processed locally by the desktop app and CLI.
- Platform: Windows is the existing packaged target. Other desktop platforms are undecided.

## Evidence on Hand

- The previous Windows application was inspected to confirm its local batch workflow, accepted media formats, FFSubSync CLI invocation, and portable packaging target.
- The previous UI selected multiple files, checked only equal counts, processed pairs by selection order, wrote `<video basename>.<subtitle extension>` beside each video, and showed progress and execution logs.
- Only source behavior and interface requirements carry forward; old builds and machine-specific paths are not part of this repository.

## Product Principles

- Keep original video and subtitle files safe.
- Make every order-based video/subtitle pairing visible and adjustable before execution.
- Report progress and errors for each job in terms users can act on.
- Keep media processing on the user's machine.
