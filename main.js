const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { randomUUID } = require('node:crypto')

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'])
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.ass', '.ssa', '.sub', '.vtt'])

let mainWindow
let activeRun = null

function isTrustedWindow(event) {
  return BrowserWindow.fromWebContents(event.sender) === mainWindow
}

function registerHandler(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedWindow(event)) throw new Error('拒绝来自未授权窗口的请求。')
    return handler(...args)
  })
}

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

async function readSettings() {
  try {
    const parsed = JSON.parse(await fs.readFile(settingsPath(), 'utf8'))
    return { ffsCommand: typeof parsed.ffsCommand === 'string' ? parsed.ffsCommand : 'ffs' }
  } catch {
    return { ffsCommand: 'ffs' }
  }
}

function cleanCommand(value) {
  if (typeof value !== 'string') throw new Error('请填写 ffs 可执行文件路径。')
  const command = value.trim()
  if (!command || command.length > 2048 || /[\r\n\u0000]/.test(command)) {
    throw new Error('ffs 路径无效，请输入命令名或 .exe 文件路径。')
  }
  return command
}

function keepTail(current, addition, limit = 24000) {
  const next = current + addition
  return next.length > limit ? next.slice(-limit) : next
}

function runCommand(command, args, { timeoutMs = 8000, onOutput } = {}) {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    let child

    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ stdout, stderr, ...result })
    }

    const timeout = setTimeout(() => {
      timedOut = true
      child?.kill()
    }, timeoutMs)

    try {
      child = spawn(command, args, {
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (text) => {
        stdout = keepTail(stdout, text, 8000)
        onOutput?.('stdout', text)
      })
      child.stderr.on('data', (text) => {
        stderr = keepTail(stderr, text, 8000)
        onOutput?.('stderr', text)
      })
      child.once('error', (error) => finish({ code: null, signal: null, error: error.message, timedOut }))
      child.once('close', (code, signal) => finish({ code, signal, error: null, timedOut }))
    } catch (error) {
      finish({ code: null, signal: null, error: error.message, timedOut })
    }
  })
}

async function probe(command, args) {
  const result = await runCommand(command, args)
  const available = !result.error && !result.timedOut && result.code === 0
  const sample = (result.stdout || result.stderr).split(/\r?\n/).map((line) => line.trim()).find(Boolean) || ''
  return {
    command,
    available,
    detail: available ? sample : result.timedOut ? '检查超时' : result.error || sample || `退出码 ${result.code ?? '未知'}`,
  }
}

async function checkEnvironment(ffsCommand) {
  const command = cleanCommand(ffsCommand)
  const ffsVersion = await probe(command, ['--version'])
  const ffsHelp = ffsVersion.available ? null : await probe(command, ['--help'])
  const ffs = ffsVersion.available ? ffsVersion : ffsHelp || ffsVersion
  if (ffs.available && !ffsVersion.available) ffs.detail = ffs.detail || 'ffs 命令可用'

  const [ffmpeg, ffprobe] = await Promise.all([
    probe('ffmpeg', ['-version']),
    probe('ffprobe', ['-version']),
  ])

  return { ffs, ffmpeg, ffprobe }
}

function normalizeKind(kind) {
  if (kind === 'video' || kind === 'subtitle') return kind
  throw new Error('未知的文件类型。')
}

async function inspectFiles(kind, inputPaths) {
  normalizeKind(kind)
  if (!Array.isArray(inputPaths)) throw new Error('没有收到有效的文件列表。')
  const validExtensions = kind === 'video' ? VIDEO_EXTENSIONS : SUBTITLE_EXTENSIONS
  const accepted = []
  const rejected = []
  const seen = new Set()

  for (const rawPath of inputPaths) {
    if (typeof rawPath !== 'string' || !path.isAbsolute(rawPath)) {
      rejected.push({ name: String(rawPath || '未知文件'), reason: '路径无效。' })
      continue
    }
    const fullPath = path.resolve(rawPath)
    const identity = process.platform === 'win32' ? fullPath.toLowerCase() : fullPath
    if (seen.has(identity)) continue
    seen.add(identity)

    const extension = path.extname(fullPath).toLowerCase()
    if (!validExtensions.has(extension)) {
      rejected.push({ name: path.basename(fullPath), reason: `不支持 ${extension || '无扩展名'} 格式。` })
      continue
    }
    try {
      const stats = await fs.stat(fullPath)
      if (!stats.isFile()) throw new Error('不是普通文件。')
      accepted.push({
        path: fullPath,
        name: path.basename(fullPath),
        extension,
        directory: path.dirname(fullPath),
        size: stats.size,
      })
    } catch (error) {
      rejected.push({ name: path.basename(fullPath), reason: `无法读取文件：${error.message}` })
    }
  }
  return { accepted, rejected }
}

async function chooseFiles(kind) {
  normalizeKind(kind)
  const extensions = [...(kind === 'video' ? VIDEO_EXTENSIONS : SUBTITLE_EXTENSIONS)].map((ext) => ext.slice(1))
  const result = await dialog.showOpenDialog(mainWindow, {
    title: kind === 'video' ? '选择视频文件' : '选择字幕文件',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: kind === 'video' ? '视频文件' : '字幕文件', extensions }, { name: '所有文件', extensions: ['*'] }],
  })
  if (result.canceled) return { accepted: [], rejected: [] }
  return inspectFiles(kind, result.filePaths)
}

function emitSync(type, details = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('sync:event', { type, ...details })
}

function outputPathFor(videoPath, subtitlePath) {
  const video = path.parse(videoPath)
  const subtitleExtension = path.extname(subtitlePath).toLowerCase()
  return path.join(video.dir, `${video.name}${subtitleExtension}`)
}

function outputBackupPath(targetPath, sequence = 1) {
  const target = path.parse(targetPath)
  const marker = sequence === 1 ? 'original' : `original-${sequence}`
  return path.join(target.dir, `${target.name}.${marker}${target.ext}`)
}

async function findBackupPath(targetPath) {
  for (let sequence = 1; sequence < 10000; sequence += 1) {
    const candidate = outputBackupPath(targetPath, sequence)
    try {
      await fs.lstat(candidate)
    } catch (error) {
      if (error.code === 'ENOENT') return candidate
      throw error
    }
  }
  throw new Error('无法为现有字幕创建安全备份。')
}

async function validateJobs(rawJobs) {
  if (!Array.isArray(rawJobs) || rawJobs.length === 0) throw new Error('没有可同步的配对任务。')
  if (rawJobs.length > 500) throw new Error('单批最多同步 500 条，请拆分批次后重试。')

  const jobs = []
  const seenVideos = new Set()
  const seenSubtitles = new Set()
  const seenOutputs = new Set()

  for (const rawJob of rawJobs) {
    const rawVideoPath = typeof rawJob?.videoPath === 'string' ? rawJob.videoPath : ''
    const rawSubtitlePath = typeof rawJob?.subtitlePath === 'string' ? rawJob.subtitlePath : ''
    if (!rawVideoPath || !rawSubtitlePath || !path.isAbsolute(rawVideoPath) || !path.isAbsolute(rawSubtitlePath)) {
      throw new Error('任务包含无效文件路径，请重新添加文件。')
    }
    const videoPath = path.resolve(rawVideoPath)
    const subtitlePath = path.resolve(rawSubtitlePath)
    const videoIdentity = process.platform === 'win32' ? videoPath.toLowerCase() : videoPath
    const subtitleIdentity = process.platform === 'win32' ? subtitlePath.toLowerCase() : subtitlePath
    if (videoIdentity === subtitleIdentity) throw new Error('同一个文件不能同时作为视频和字幕。')
    if (seenVideos.has(videoIdentity)) throw new Error('同一条视频不能在一批中重复同步。')
    if (seenSubtitles.has(subtitleIdentity)) throw new Error('每条字幕只能分配给一条视频，请检查配对。')
    seenVideos.add(videoIdentity)
    seenSubtitles.add(subtitleIdentity)

    const videoExtension = path.extname(videoPath).toLowerCase()
    const subtitleExtension = path.extname(subtitlePath).toLowerCase()
    if (!VIDEO_EXTENSIONS.has(videoExtension)) throw new Error(`视频格式不支持：${path.basename(videoPath)}`)
    if (!SUBTITLE_EXTENSIONS.has(subtitleExtension)) throw new Error(`字幕格式不支持：${path.basename(subtitlePath)}`)

    const [videoStats, subtitleStats] = await Promise.all([fs.stat(videoPath), fs.stat(subtitlePath)])
    if (!videoStats.isFile() || !subtitleStats.isFile()) throw new Error('配对中有文件已不再是普通文件，请重新选择。')

    const outputPath = outputPathFor(videoPath, subtitlePath)
    const outputIdentity = process.platform === 'win32' ? outputPath.toLowerCase() : outputPath
    if (seenOutputs.has(outputIdentity)) throw new Error(`多个任务会写入同一路径：${path.basename(outputPath)}`)
    seenOutputs.add(outputIdentity)
    jobs.push({
      id: typeof rawJob.id === 'string' ? rawJob.id.slice(0, 100) : randomUUID(),
      videoPath,
      subtitlePath,
      outputPath,
      name: path.basename(videoPath),
    })
  }
  return jobs
}

function runFfs(job, run) {
  return new Promise((resolve) => {
    const configPromise = readSettings()
    configPromise.then(({ ffsCommand }) => {
      const parsedCommand = cleanCommand(ffsCommand)
      const output = `${job.outputPath.slice(0, -path.extname(job.outputPath).length)}.ffsubsync-${randomUUID().slice(0, 10)}${path.extname(job.outputPath)}`
      run.tempPath = output
      let stdout = ''
      let stderr = ''
      let settled = false
      let child

      const finish = (result) => {
        if (settled) return
        settled = true
        run.process = null
        resolve({ ...result, stdout, stderr, tempPath: output })
      }

      try {
        child = spawn(parsedCommand, [job.videoPath, '-i', job.subtitlePath, '-o', output], {
          cwd: path.dirname(job.videoPath),
          windowsHide: true,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        run.process = child
        child.stdout.setEncoding('utf8')
        child.stderr.setEncoding('utf8')
        child.stdout.on('data', (text) => {
          stdout = keepTail(stdout, text)
          emitSync('output', { id: job.id, name: job.name, stream: 'stdout', text })
        })
        child.stderr.on('data', (text) => {
          stderr = keepTail(stderr, text)
          emitSync('output', { id: job.id, name: job.name, stream: 'stderr', text })
        })
        child.once('error', (error) => finish({ code: null, signal: null, error: error.message }))
        child.once('close', (code, signal) => finish({ code, signal, error: null }))
      } catch (error) {
        finish({ code: null, signal: null, error: error.message })
      }
    }).catch((error) => resolve({ code: null, signal: null, error: error.message, stdout: '', stderr: '', tempPath: null }))
  })
}

async function removeTemp(tempPath) {
  if (!tempPath) return
  await fs.unlink(tempPath).catch((error) => {
    if (error.code !== 'ENOENT') throw error
  })
}

async function installOutput(job, tempPath) {
  const stats = await fs.stat(tempPath).catch(() => null)
  if (!stats?.isFile() || stats.size === 0) throw new Error('ffs 已结束，但没有生成有效的字幕文件。')

  let backupPath = null
  try {
    const existing = await fs.lstat(job.outputPath)
    if (existing.isDirectory()) throw new Error('输出位置已有同名文件夹，无法安全写入。')
    backupPath = await findBackupPath(job.outputPath)
    await fs.rename(job.outputPath, backupPath)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  try {
    await fs.rename(tempPath, job.outputPath)
  } catch (error) {
    if (backupPath) await fs.rename(backupPath, job.outputPath).catch(() => {})
    throw error
  }
  return { outputPath: job.outputPath, backupPath }
}

async function runJobs(rawJobs) {
  if (activeRun) throw new Error('已有批次正在运行。')
  const jobs = await validateJobs(rawJobs)
  const run = { cancelled: false, process: null, tempPath: null }
  activeRun = run
  const results = []
  emitSync('batch-start', { total: jobs.length })

  try {
    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index]
      if (run.cancelled) {
        results.push({ id: job.id, videoPath: job.videoPath, status: 'cancelled', message: '批次已取消。' })
        emitSync('item-result', results[results.length - 1])
        continue
      }

      emitSync('item-start', { id: job.id, name: job.name, videoPath: job.videoPath, index, total: jobs.length })
      const commandResult = await runFfs(job, run)
      let result

      if (run.cancelled || commandResult.signal) {
        await removeTemp(commandResult.tempPath).catch(() => {})
        result = { id: job.id, videoPath: job.videoPath, status: 'cancelled', message: '同步已取消，临时文件已清理。' }
      } else if (commandResult.error || commandResult.code !== 0) {
        await removeTemp(commandResult.tempPath).catch(() => {})
        const detail = commandResult.error || (commandResult.stderr || commandResult.stdout).trim() || `ffs 退出码：${commandResult.code}`
        result = { id: job.id, videoPath: job.videoPath, status: 'failed', message: detail, log: detail }
      } else {
        try {
          const installed = await installOutput(job, commandResult.tempPath)
          result = {
            id: job.id,
            videoPath: job.videoPath,
            status: 'success',
            outputPath: installed.outputPath,
            backupPath: installed.backupPath,
            message: installed.backupPath ? `同步完成。原有文件已保留为 ${path.basename(installed.backupPath)}` : '同步完成。',
          }
        } catch (error) {
          await removeTemp(commandResult.tempPath).catch(() => {})
          result = { id: job.id, videoPath: job.videoPath, status: 'failed', message: `无法安装输出字幕：${error.message}`, log: error.message }
        }
      }

      results.push(result)
      emitSync('item-result', result)
    }
    const summary = {
      total: results.length,
      success: results.filter((item) => item.status === 'success').length,
      failed: results.filter((item) => item.status === 'failed').length,
      cancelled: results.filter((item) => item.status === 'cancelled').length,
    }
    emitSync('batch-finish', summary)
    return { results, summary }
  } finally {
    if (run.tempPath) await removeTemp(run.tempPath).catch(() => {})
    activeRun = null
  }
}

function openWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1040,
    minHeight: 720,
    backgroundColor: '#E8E4D9',
    title: 'FFSubSync · 字幕对齐工作台',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#F2EDDF', symbolColor: '#203448', height: 40 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'https://ffsubsync.readthedocs.io/en/latest/installation.html' || url === 'https://ffsubsync.readthedocs.io/en/latest/usage.html') {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

registerHandler('files:choose', chooseFiles)
registerHandler('files:add', inspectFiles)
registerHandler('settings:get', readSettings)
registerHandler('settings:save', async (raw) => {
  const settings = { ffsCommand: cleanCommand(raw?.ffsCommand) }
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true })
  await fs.writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
  return settings
})
registerHandler('settings:choose-ffs', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择 ffs.exe',
    properties: ['openFile'],
    filters: [{ name: 'Windows 可执行文件', extensions: ['exe'] }],
  })
  return result.canceled ? null : result.filePaths[0]
})
registerHandler('environment:check', checkEnvironment)
registerHandler('sync:run', runJobs)
registerHandler('sync:cancel', () => {
  if (!activeRun) return false
  activeRun.cancelled = true
  activeRun.process?.kill()
  return true
})
registerHandler('output:show', async (rawPath) => {
  if (typeof rawPath !== 'string' || !path.isAbsolute(rawPath)) throw new Error('输出路径无效。')
  const fullPath = path.resolve(rawPath)
  if (path.dirname(fullPath) === fullPath) throw new Error('输出路径无效。')
  shell.showItemInFolder(fullPath)
})

app.whenReady().then(openWindow)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) openWindow()
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

