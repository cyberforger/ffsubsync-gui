---
name: "FFSubSync GUI"
description: "A blue-ink J-card workbench for pairing local videos and subtitles before synchronization."
colors:
  ink: "#203448"
  ink-blue: "#1e6594"
  ink-soft: "#536a7b"
  paper: "#f2eddf"
  paper-light: "#f8f5ec"
  paper-white: "#fffdf7"
  canvas: "#e8e4d9"
  rule: "#c1c3bd"
  rule-soft: "rgba(53, 75, 91, 0.15)"
  signal: "#c84c40"
  success: "#2f6d59"
typography:
  display:
    fontFamily: '"ZCOOL XiaoWei", "Microsoft YaHei", serif'
    fontSize: "clamp(32px, 3vw, 45px)"
    fontWeight: 400
    lineHeight: 1.24
    letterSpacing: "-0.018em"
  section:
    fontFamily: '"ZCOOL XiaoWei", "Microsoft YaHei", serif'
    fontSize: "21px"
    fontWeight: 400
  body:
    fontFamily: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif'
    fontSize: "11px"
    fontWeight: 400
  handwritten:
    fontFamily: '"Kalam", "Segoe UI", sans-serif'
  action:
    fontFamily: '"ZCOOL XiaoWei", "Microsoft YaHei", serif'
    fontSize: "15px"
    fontWeight: 400
rounded:
  square: "0px"
  dot: "50%"
components:
  button-primary:
    backgroundColor: "{colors.ink-blue}"
    textColor: "{colors.paper-white}"
    typography: "{typography.action}"
    rounded: "{rounded.square}"
    padding: "10px 17px"
    height: "43px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "7px 11px"
    height: "34px"
  button-cancel:
    backgroundColor: "transparent"
    textColor: "{colors.ink-blue}"
    typography: "{typography.action}"
    rounded: "{rounded.square}"
    padding: "10px 17px"
    height: "43px"
  button-icon:
    backgroundColor: "rgba(248, 245, 236, 0.78)"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    height: "34px"
    width: "34px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "4px 0"
  input-subtitle:
    backgroundColor: "rgba(248, 245, 236, 0.88)"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "5px 7px"
    height: "32px"
  input-command:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "8px 10px"
    height: "36px"
  drop-zone:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "17px 18px 16px 21px"
  pair-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
  tool-state:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "4px 10px"
    height: "30px"
---

# Design System: FFSubSync GUI

## Overview

**Creative North Star: "蓝墨 J-card · 磁带内页"**

Treat the workbench as a printed cassette inlay: warm paper, a deep navy spine, fine ruling, and short hand-marked track numbers. Ballpoint blue makes controls and confirmed pairings easy to find. The result stays calm and legible while showing enough rows for batch work; the printed metaphor supports file pairing rather than obscuring it.

Depth comes from the paper tones, ruled folds, and restrained shadows around the app shell, settings dialog, and transient notices. A faint fiber-and-ink texture sits over the inlay stock. `assets/jcard-stock-overlay.png` is a transparent seamless raster generated with OpenAI ImageGen on 2026-10-25; its prompt and provenance are recorded in `assets/README.md`.

**Key Characteristics:**
- Warm, ruled paper as the work surface, with a dark J-card spine.
- Navy text and ballpoint-blue controls keep file names, pair marks, and focus states distinct.
- Square, hairline geometry carries the structure; handwriting is reserved for short annotations and indices.
- Status is explicit in text and marks, with red for attention and green for healthy or completed work.

## Colors

The palette pairs warm inlay stock with deep blue-black text and a single ballpoint-blue interaction color; muted red and green carry status meaning.

### Primary
- **Ballpoint Blue** (`colors.ink-blue`): File-picking controls, focus rings, file glyphs, running states, and the line that confirms a unique video/subtitle pairing.
- **Deep Ballpoint Navy** (`colors.ink`): Main text, the spine, and the strongest structural rules.

### Secondary
- **Cinnabar Signal** (`colors.signal`): Mismatches, missing tools, failed jobs, and other attention states. Keep it out of routine interaction hovers and default action fills.

### Tertiary
- **Pressed Green** (`colors.success`): Healthy local tools, confirmed matches, and completed jobs.

### Neutral
- **Inlay Ivory** (`colors.paper`): Main ruled workspace and the paper face of the settings dialog.
- **Bright Paper** (`colors.paper-light`): Select fields, track-number slips, and lighter inset surfaces.
- **Edge White** (`colors.paper-white`): High-contrast lettering on the spine and primary action.
- **Desk Canvas** (`colors.canvas`): The muted backing visible beyond the inlay.
- **Slate Ink** (`colors.ink-soft`): Supporting copy, paths, hints, and secondary labels.
- **Pencil Rule** (`colors.rule`): Column dividers, field strokes, and light section rules.
- **Faint Rule** (`colors.rule-soft`): Subtle row boundaries that should not compete with file names.

**The State Ink Rule.** Blue means interaction or an active pairing; green means healthy or complete; red means mismatch, failure, missing tools, or another attention state. Keep routine hover feedback blue and keep the written state visible alongside its color.

## Typography

**Display Font:** ZCOOL XiaoWei with Microsoft YaHei and serif fallbacks  
**Body Font:** Segoe UI with Microsoft YaHei UI, Microsoft YaHei, and sans-serif fallbacks  
**Label/Mono Font:** Kalam with Segoe UI and sans-serif fallbacks for handwritten shorthand

**Character:** The display face gives headings a printed, literary quality, while the UI sans keeps paths, controls, and status copy compact. Kalam adds a brief ballpoint note to numbers and short labels; it does not carry instructions or long copy.

### Hierarchy
- **Display:** Regular display style for the main workbench heading; use the `typography.display` token and let it contract at narrow widths.
- **Section:** Regular display style for section headings and short settings headings.
- **Body:** UI sans for explanatory copy and supporting details; the lead paragraph is allowed a longer measure, while filenames and paths truncate cleanly.
- **Label:** UI sans for column labels, control text, counters, and status copy.
- **Handwritten:** Kalam for track numbers, brief pair annotations, and compact time or command details.
- **Action:** Display face for the main run action, matching the printed-label character without reducing control clarity.

**The Handwritten Margin Rule.** Use handwritten type as a small annotation layer; keep operational instructions and file names in the UI sans.

## Layout

The desktop surface is a full-height two-part frame: a narrow vertical spine beside a flexible inlay. The inlay keeps its own scrolling work area, with the run summary and action held at the lower edge on wide layouts. The spine contracts as space narrows; its identity stays visible while the main surface becomes vertically scrollable.

At wide widths, video and subtitle lanes sit side by side. Pair rows place the two file columns around a fixed center rail, followed by a compact state column; the rail keeps the numbered one-to-one relationship visible. Under the compact breakpoint, the source lanes stack and each pair becomes a vertical sequence with its track number and connecting line at the left. Very narrow layouts tighten the spine, masthead, and readiness summary again. The center rail's orientation changes, but its job does not.

Use thin continuous or dashed rules to group work instead of adding card gutters. Keep long paths and filenames on one line with ellipsis, retain a readable measure for introductory copy, and let the lower execution details expand only when needed.

## Elevation & Depth

The system is mostly flat, with depth supplied by layered paper tones and precise rules. A soft ambient shadow lifts the outer app frame and settings dialog; a subtler upward shadow separates the persistent run bar, and a compact shadow distinguishes transient notices. File rows and drop lanes stay flat.

### Shadow Vocabulary
- **Frame / dialog** (`--shadow`): `0 16px 38px rgba(36, 51, 62, .14)`; use for the app frame and modal settings surface.
- **Run bar**: `0 -8px 20px rgba(36, 51, 62, .06)`; a quiet upward edge where the action bar meets scrolling content.
- **Notice**: `0 8px 20px rgba(36, 51, 62, .16)`; reserve for short-lived feedback above the work surface.

**The Pressed Paper Rule.** Keep ordinary rows and controls flat. Use shadow only to separate the app frame, modal, fixed run bar, or transient notice from adjacent content.

## Shapes

The form language is square and printed: hard corners, one-pixel borders, underlined lanes, and lightly dashed separators. Circular geometry is limited to small status or identity dots; the scrollbar thumb is the incidental rounded exception. File and task groups are defined by rules and alignment rather than rounded cards. Line icons are fine-stroked and compact.

## Components

### Buttons
- **Character:** Buttons read like inked controls on paper, with square edges and a clear color change on hover.
- **Primary:** The run action uses ballpoint-blue fill, a dark outline, display lettering, and a generous target. Its disabled state turns to quiet gray; its active state presses down slightly.
- **Secondary:** File selection and related actions use a transparent face, blue border, and blue label; hover fills the face with blue and reverses the text to white.
- **Stop:** During processing, the cancel action uses a square blue outline and a faint blue hover wash, staying distinct from the filled start action.
- **Icon:** Settings and close controls sit in a square paper tile with a pencil-rule border; hover sharpens the blue edge.
- **Quiet:** Inline actions remain unboxed and blue, gaining an underline on hover.
- **Focus:** Keyboard focus uses a clearly offset blue outline.

### Inputs / Fields
- **Subtitle selector:** A full-width, square native select on a light paper inset; hovering shifts its border to blue. Its disabled state remains visibly muted.
- **Command field:** A square text field with a pencil-rule border and bright-paper fill. Keep its focus ring consistent with other controls.

### Drop Zones
- **Style:** Video and subtitle lanes are balanced, label-led regions with a dashed lower rule and a compact outlined chooser.
- **Drag state:** A blue-tinted paper wash and blue lower rule mark the active drop target.
- **Responsive behavior:** The two lanes sit in parallel on wide screens and stack into separate rows when space is constrained.

### Pair Rows
- **Structure:** One video and one subtitle flank a numbered center track. A thin connection line lengthens and turns blue for a unique match; manual assignment preserves the same mark, and failure turns it red.
- **File treatment:** Use a small blue file glyph, a strong filename, and a quieter directory line. Truncate paths rather than allowing one item to distort the row.
- **State:** Keep the status word and any actionable retry or reveal control in the trailing state area. On narrow screens, turn the center connection vertical beside the stacked file choices.

### Tool State
- **Style:** The local-tool check is a compact outlined-free label with a small colored dot. Hover adds a fine border and a pale paper wash.
- **State:** Green identifies a ready environment, blue identifies a check in progress, and red marks a missing or incomplete tool state; retain the status text.

### Settings Dialog
- **Surface:** Use the same paper, navy rule, square outline, and display heading as the workbench.
- **Contents:** Keep fields and environment checks as ruled rows; use the same primary, secondary, and quiet button treatments as the main surface.

## Do's and Don'ts

### Do:
- **Do** use the paper, navy, and ballpoint-blue roles from the frontmatter rather than introducing a new brand accent.
- **Do** keep each video/subtitle relationship explicit through a numbered center rail and a visible state label.
- **Do** pair status color with text or a shape so meaning remains clear without color alone.
- **Do** keep the fiber overlay subtle enough that file names, paths, and controls remain easy to read.
- **Do** preserve square controls and ruled dividers when adding related desktop surfaces.
- **Do** honor reduced-motion preferences; the interface already reduces transitions and status animations when requested.

### Don't:
- **Don't** turn ruled rows, fields, or buttons into rounded cards.
- **Don't** use failure red on routine interaction hovers, default action fills, or as decoration; reserve it for mismatch, failure, missing-tool, and other attention states.
- **Don't** replace the center pairing mark with color alone or remove its numbered sequence.
- **Don't** spread handwritten type across paragraphs or long operational instructions.
- **Don't** increase paper texture contrast until it competes with text or fine rules.
