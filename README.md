# FFSubSync GUI

FFSubSync GUI is a local Windows desktop companion for pairing videos with external subtitles and synchronizing each pair with the installed FFSubSync `ffs` command.

## What it does

- Add multiple video and subtitle files with the native file picker or by dropping them onto their labeled tracks.
- Pair the first video with the first subtitle, then continue by list order. Both lists start in natural filename order and each file can be moved up or down independently.
- Require equal video and subtitle counts before a batch can start; the workbench shows the count mismatch.
- Run jobs sequentially and show the actual `ffs` output, per-file result, and recovery action.
- Save the result beside the video with the video's exact basename and the selected subtitle extension. If that output already exists, retain it as `<video name>.original.<subtitle extension>` before replacing it.
- Keep media files and processing on the local machine.

## Requirements

- Windows 10 or newer.
- FFSubSync installed and its `ffs` command available on `PATH`, or the path to `ffs.exe` configured in the app.
- `ffmpeg` and `ffprobe` available on `PATH` for video-based synchronization.

See the official [FFSubSync installation guide](https://ffsubsync.readthedocs.io/en/latest/installation.html) and [usage guide](https://ffsubsync.readthedocs.io/en/latest/usage.html).

## Run from source

Install [Node.js 24](https://nodejs.org/) or newer, then run:

```powershell
npm ci
npm start
```

## Build the portable app

```powershell
npm run build
```

The Windows x64 portable executable is written to `dist/`.

## Previous version analysis

See [docs/feature-analysis.md](docs/feature-analysis.md) for the previous app's workflow, limitations, and the decisions behind this reimplementation.
