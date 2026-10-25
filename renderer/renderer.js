const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'])
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.ass', '.ssa', '.sub', '.vtt'])
const appRoot = document.getElementById('app')
const settingsDialog = document.getElementById('settings-dialog')
const settingsInput = document.getElementById('ffs-command')
const environmentResults = document.getElementById('environment-results')
const toastRegion = document.getElementById('toast-region')

const state = {
  videos: [],
  subtitles: [],
  assignments: new Map(),
  manualPairs: new Map(),
  manualLocks: new Set(),
  results: new Map(),
  activeId: null,
  runActive: false,
  cancelRequested: false,
  runTotal: 0,
  runFinished: 0,
  logs: [],
  logOpen: false,
  environment: null,
  ffsCommand: 'ffs',
  toastTimer: null,
}

const iconShapes = {
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  video: [['rect', { x: 3.5, y: 5, width: 17, height: 14, rx: 1.2 }], ['path', { d: 'm8 5 2 3m5-3 2 3M8 16l2 3m5-3 2 3M9 12h.01' }]],
  subtitle: [['rect', { x: 3.5, y: 4.5, width: 17, height: 15, rx: 1.2 }], ['path', { d: 'M7 9h10M7 12h10M7 15h6' }]],
  folder: [['path', { d: 'M3.5 7.5h6l2 2h9v8.8a1.2 1.2 0 0 1-1.2 1.2H4.7a1.2 1.2 0 0 1-1.2-1.2z' }], ['path', { d: 'M3.5 10h17' }]],
  trash: [['path', { d: 'M4 7h16m-10-3h4m-8 3 .8 13h10.4L18 7m-8 4v5m4-5v5' }]],
  check: [['path', { d: 'm5 12 4.2 4L19 6.5' }]],
  play: [['path', { d: 'm8 5 11 7-11 7z', fill: 'currentColor', stroke: 'none' }]],
  settings: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8-.1 1.7 1.7 0 0 0-.9 1.5v.2h-3.6v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.1l-.2.1-1.8-3.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-.9h-.2v-3.6h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.2 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8.1 1.7 1.7 0 0 0 .9-1.5v-.2h3.6v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.1l.2-.1 1.8 3.1-.1.2a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.2v3.6h-.2a1.7 1.7 0 0 0-1.5.9Z' }]],
  close: [['path', { d: 'm6 6 12 12M18 6 6 18' }]],
  retry: [['path', { d: 'M20 7v5h-5M4.8 9a7.5 7.5 0 0 1 12.7-2L20 12M4 17v-5h5m10.2 3a7.5 7.5 0 0 1-12.7 2L4 12' }]],
  open: [['path', { d: 'M13 5h6v6m-.5-5.5L11 13m-3-6H5.5A1.5 1.5 0 0 0 4 8.5v10A1.5 1.5 0 0 0 5.5 20h10a1.5 1.5 0 0 0 1.5-1.5V16' }]],
  cassette: [['rect', { x: 3.5, y: 5, width: 17, height: 14, rx: 1.2 }], ['path', { d: 'M4 9h16m-11 7h6m-7 3 1.2-3m6.6 3L14 16' }], ['circle', { cx: 9, cy: 12.5, r: 2 }], ['circle', { cx: 15, cy: 12.5, r: 2 }]],
}

function makeIcon(name, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.classList.add('icon')
  if (className) svg.classList.add(...className.split(/\s+/).filter(Boolean))
  for (const [tag, attributes] of iconShapes[name] || iconShapes.plus) {
    const shape = document.createElementNS('http://www.w3.org/2000/svg', tag)
    for (const [attribute, value] of Object.entries(attributes)) shape.setAttribute(attribute, String(value))
    svg.append(shape)
  }
  return svg
}

function element(tag, className, content) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (content !== undefined) node.textContent = content
  return node
}

function button(label, { className = 'secondary-button', icon = null, action = null, disabled = false, ariaLabel = null } = {}) {
  const node = document.createElement('button')
  node.type = 'button'
  node.className = className
  if (icon) node.append(makeIcon(icon))
  if (label) node.append(element('span', '', label))
  if (ariaLabel) node.setAttribute('aria-label', ariaLabel)
  node.disabled = disabled
  if (action) node.addEventListener('click', action)
  return node
}

function normalizeStem(file) {
  const stem = file.name.slice(0, -file.extension.length)
  return stem.normalize('NFKC').toLocaleLowerCase().replace(/[\s._-]+/g, '')
}

function pathIdentity(filePath) {
  return filePath.toLocaleLowerCase()
}

function recomputeAssignments() {
  const videoMap = new Map(state.videos.map((video) => [pathIdentity(video.path), video]))
  const subtitleMap = new Map(state.subtitles.map((subtitle) => [pathIdentity(subtitle.path), subtitle]))
  const used = new Set()
  const next = new Map()

  for (const [videoKey, subtitlePath] of state.manualPairs) {
    if (!videoMap.has(videoKey)) continue
    const subtitleKey = pathIdentity(subtitlePath)
    if (!subtitleMap.has(subtitleKey) || used.has(subtitleKey)) continue
    const video = videoMap.get(videoKey)
    next.set(video.path, subtitleMap.get(subtitleKey).path)
    used.add(subtitleKey)
  }

  const videoGroups = new Map()
  const subtitleGroups = new Map()
  for (const video of state.videos) {
    const key = normalizeStem(video)
    videoGroups.set(key, [...(videoGroups.get(key) || []), video])
  }
  for (const subtitle of state.subtitles) {
    const key = normalizeStem(subtitle)
    subtitleGroups.set(key, [...(subtitleGroups.get(key) || []), subtitle])
  }

  for (const video of state.videos) {
    if (next.has(video.path) || state.manualLocks.has(pathIdentity(video.path))) continue
    const key = normalizeStem(video)
    const videos = videoGroups.get(key) || []
    const subtitles = subtitleGroups.get(key) || []
    if (videos.length !== 1 || subtitles.length !== 1) continue
    const subtitle = subtitles[0]
    const subtitleKey = pathIdentity(subtitle.path)
    if (!used.has(subtitleKey)) {
      next.set(video.path, subtitle.path)
      used.add(subtitleKey)
    }
  }

  state.assignments = next
}

function notify(message, kind = 'info') {
  toastRegion.replaceChildren()
  const toast = element('div', `toast toast-${kind}`, message)
  toastRegion.append(toast)
  clearTimeout(state.toastTimer)
  state.toastTimer = setTimeout(() => toast.remove(), 4200)
}

function addFiles(kind, response) {
  const collection = kind === 'video' ? state.videos : state.subtitles
  const existing = new Set(collection.map((file) => pathIdentity(file.path)))
  let added = 0
  for (const file of response.accepted || []) {
    if (existing.has(pathIdentity(file.path))) continue
    collection.push(file)
    existing.add(pathIdentity(file.path))
    added += 1
  }
  if (kind === 'video') state.videos.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
  else state.subtitles.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
  recomputeAssignments()

  const rejected = response.rejected || []
  if (rejected.length) {
    const first = rejected[0]
    notify(`${rejected.length} 个文件未添加。${first.name}：${first.reason}`, 'error')
  } else if (added) {
    notify(`已添加 ${added} 个${kind === 'video' ? '视频' : '字幕'}文件。`, 'success')
  }
  render()
}

async function addWithPicker(kind) {
  try {
    addFiles(kind, await window.ffsync.chooseFiles(kind))
  } catch (error) {
    notify(error.message || '无法打开文件选择器。', 'error')
  }
}

async function addDropped(kind, files) {
  try {
    const response = await window.ffsync.addDroppedFiles(kind, files)
    if (files.length && !response.accepted.length && !response.rejected.length) {
      notify('无法读取拖入文件的本机路径，请改用“添加文件”。', 'error')
      return
    }
    addFiles(kind, response)
  } catch (error) {
    notify(error.message || '无法添加拖入的文件。', 'error')
  }
}

function removeVideo(filePath) {
  state.videos = state.videos.filter((file) => pathIdentity(file.path) !== pathIdentity(filePath))
  const key = pathIdentity(filePath)
  state.manualPairs.delete(key)
  state.manualLocks.delete(key)
  state.results.delete(key)
  recomputeAssignments()
  render()
}

function removeSubtitle(filePath) {
  const key = pathIdentity(filePath)
  state.subtitles = state.subtitles.filter((file) => pathIdentity(file.path) !== key)
  for (const [videoKey, subtitlePath] of state.manualPairs) {
    if (pathIdentity(subtitlePath) === key) {
      state.manualPairs.delete(videoKey)
      state.manualLocks.delete(videoKey)
      state.results.delete(videoKey)
    }
  }
  recomputeAssignments()
  render()
}

function updatePair(videoPath, subtitlePath) {
  const videoKey = pathIdentity(videoPath)
  state.manualLocks.add(videoKey)
  if (subtitlePath) state.manualPairs.set(videoKey, subtitlePath)
  else state.manualPairs.delete(videoKey)
  state.results.delete(videoKey)
  recomputeAssignments()
  render()
}

function directoryLabel(file) {
  return file.directory.split(/[\\/]/).filter(Boolean).at(-1) || file.directory
}

function outputName(video, subtitlePath) {
  const subtitle = state.subtitles.find((item) => pathIdentity(item.path) === pathIdentity(subtitlePath))
  if (!subtitle) return ''
  const stem = video.name.slice(0, -video.extension.length)
  return `${stem}${subtitle.extension}`
}

function statusFor(video, subtitlePath) {
  const videoKey = pathIdentity(video.path)
  const result = state.results.get(videoKey)
  if (state.activeVideoPath && pathIdentity(state.activeVideoPath) === videoKey) return { status: 'running' }
  if (result && pathIdentity(result.subtitlePath || state.assignments.get(video.path) || '') === pathIdentity(subtitlePath || '')) return result
  if (state.activeId && state.activeId === result?.id) return result
  if (!subtitlePath) return { status: 'waiting' }
  return { status: state.manualLocks.has(videoKey) ? 'manual' : 'matched' }
}

function subtitleOptions(video, chosenPath) {
  const select = document.createElement('select')
  select.className = 'subtitle-select'
  select.dataset.videoPath = video.path
  select.setAttribute('aria-label', `为视频“${video.name}”选择唯一字幕`)
  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = state.subtitles.length ? '选择对应字幕' : '先添加字幕文件'
  select.append(placeholder)

  for (const subtitle of state.subtitles) {
    const option = document.createElement('option')
    option.value = subtitle.path
    option.textContent = `${subtitle.name}  ·  ${directoryLabel(subtitle)}`
    const assignedToOther = [...state.assignments].some(([assignedVideo, assignedSubtitle]) =>
      pathIdentity(assignedSubtitle) === pathIdentity(subtitle.path) && pathIdentity(assignedVideo) !== pathIdentity(video.path))
    option.disabled = assignedToOther
    select.append(option)
  }
  select.value = chosenPath || ''
  select.disabled = state.runActive || state.subtitles.length === 0
  select.addEventListener('change', () => updatePair(video.path, select.value))
  return select
}

function statusLabel(status) {
  const labels = {
    matched: '自动配对', manual: '手动配对', waiting: '待选择', running: '同步中',
    success: '已完成', failed: '需要处理', cancelled: '已取消',
  }
  return labels[status] || '待处理'
}

function makeDropZone(kind) {
  const isVideo = kind === 'video'
  const zone = element('section', `drop-zone ${isVideo ? 'video-zone' : 'subtitle-zone'}`)
  zone.dataset.kind = kind
  zone.setAttribute('aria-label', isVideo ? '视频文件添加区' : '字幕文件添加区')
  const text = element('div', 'drop-copy')
  const heading = element('strong', '', isVideo ? '视频轨' : '字幕轨')
  const hint = element('span', '', `支持 ${isVideo ? 'MP4 · MKV · AVI · MOV · WMV · FLV · WEBM' : 'SRT · ASS · SSA · SUB · VTT'}`)
  text.append(heading, hint)
  zone.append(text, button(isVideo ? '添加视频' : '添加字幕', { className: 'source-button', icon: 'plus', action: () => addWithPicker(kind), disabled: state.runActive }))
  const count = isVideo ? state.videos.length : state.subtitles.length
  zone.append(element('span', 'zone-count', String(count).padStart(2, '0')))

  zone.addEventListener('dragover', (event) => {
    event.preventDefault()
    zone.classList.add('drag-over')
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  })
  zone.addEventListener('dragleave', (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove('drag-over')
  })
  zone.addEventListener('drop', (event) => {
    event.preventDefault()
    zone.classList.remove('drag-over')
    if (state.runActive) return
    addDropped(kind, event.dataTransfer?.files || [])
  })
  return zone
}

function makePairRow(video, index) {
  const assignedPath = state.assignments.get(video.path) || ''
  const subtitle = state.subtitles.find((item) => pathIdentity(item.path) === pathIdentity(assignedPath))
  const result = statusFor(video, assignedPath)
  const row = element('div', `pair-row state-${result.status}`)
  row.dataset.videoPath = video.path

  const videoCell = element('div', 'file-cell video-cell')
  videoCell.append(makeIcon('video', 'file-icon video-file-icon'))
  const videoText = element('div', 'file-copy')
  videoText.append(element('strong', 'file-name', video.name), element('span', 'file-directory', directoryLabel(video)))
  videoCell.append(videoText)

  const pairMark = element('div', 'pair-mark')
  pairMark.append(element('span', 'track-number', String(index + 1).padStart(2, '0')))
  const connectingLine = element('span', 'connection-line')
  connectingLine.setAttribute('aria-hidden', 'true')
  pairMark.append(connectingLine)
  pairMark.append(element('span', 'pair-word', subtitle ? (state.manualLocks.has(pathIdentity(video.path)) ? '已选择' : '同名') : '待配'))

  const subtitleCell = element('div', 'file-cell subtitle-cell')
  subtitleCell.append(makeIcon('subtitle', 'file-icon subtitle-file-icon'))
  const selectWrap = element('div', 'subtitle-choice')
  selectWrap.append(subtitleOptions(video, assignedPath))
  if (subtitle) selectWrap.append(element('span', 'file-directory', directoryLabel(subtitle)))
  else selectWrap.append(element('span', 'choice-hint', state.subtitles.length ? '选定后即可运行此任务' : '从字幕轨添加文件'))
  subtitleCell.append(selectWrap)

  const stateCell = element('div', 'row-state-cell')
  const status = element('span', `row-status status-${result.status}`)
  if (result.status === 'success') status.append(makeIcon('check'))
  status.append(element('span', '', statusLabel(result.status)))
  stateCell.append(status)
  if (result.status === 'failed') {
    const retry = button('重试', { className: 'row-action', icon: 'retry', disabled: state.runActive })
    retry.addEventListener('click', () => runBatch([video]))
    stateCell.append(retry)
  } else if (result.status === 'success' && result.outputPath) {
    const reveal = button('显示文件', { className: 'row-action', icon: 'open' })
    reveal.addEventListener('click', () => window.ffsync.showOutput(result.outputPath).catch((error) => notify(error.message, 'error')))
    stateCell.append(reveal)
  }
  if (result.message) {
    const note = element('span', `row-note note-${result.status}`, result.message)
    stateCell.append(note)
  }

  const remove = button('', { className: 'remove-file', icon: 'trash', ariaLabel: `移除视频 ${video.name}`, disabled: state.runActive, action: () => removeVideo(video.path) })
  const videoWrap = element('div', 'video-choice')
  videoWrap.append(videoCell, remove)
  row.append(videoWrap, pairMark, subtitleCell, stateCell)

  const naming = element('div', 'row-output-rule')
  const output = assignedPath ? outputName(video, assignedPath) : '配对字幕后显示'
  naming.append(element('span', 'output-label', '写入'), element('code', '', output))
  row.append(naming)
  return row
}

function makeEmptyState() {
  const empty = element('section', 'empty-inlay')
  empty.append(makeIcon('cassette', 'empty-cassette'))
  const copy = element('div', 'empty-copy')
  const title = state.subtitles.length ? '先放入一条视频，再为它选择字幕' : '把视频与字幕放进各自的轨道'
  copy.append(element('h2', '', title))
  copy.append(element('p', '', '文件留在本机。匹配关系确认后，工作台才会开始同步。'))
  empty.append(copy)
  return empty
}

function makeUnassignedSection() {
  const assigned = new Set([...state.assignments.values()].map(pathIdentity))
  const unassigned = state.subtitles.filter((subtitle) => !assigned.has(pathIdentity(subtitle.path)))
  const details = element('details', 'unassigned-details')
  details.open = state.logOpen === 'subtitles'
  const summary = element('summary', 'details-summary')
  summary.append(element('span', '', '未配字幕'), element('span', 'summary-count', `${unassigned.length} 条`))
  details.append(summary)
  details.addEventListener('toggle', () => {
    if (details.open) state.logOpen = 'subtitles'
    else if (state.logOpen === 'subtitles') state.logOpen = false
  })
  if (!unassigned.length) {
    details.append(element('p', 'details-empty', state.subtitles.length ? '所有字幕都已分配。' : '添加的字幕会显示在这里。'))
    return details
  }
  const list = element('ul', 'unassigned-list')
  for (const subtitle of unassigned) {
    const row = element('li', 'unassigned-item')
    row.append(makeIcon('subtitle', 'file-icon subtitle-file-icon'))
    const copy = element('div', 'file-copy')
    copy.append(element('strong', 'file-name', subtitle.name), element('span', 'file-directory', directoryLabel(subtitle)))
    row.append(copy, button('', { className: 'remove-file', icon: 'trash', ariaLabel: `移除字幕 ${subtitle.name}`, disabled: state.runActive, action: () => removeSubtitle(subtitle.path) }))
    list.append(row)
  }
  details.append(list)
  return details
}

function makeLogSection() {
  const details = element('details', 'log-details')
  details.open = state.logOpen === 'logs'
  const summary = element('summary', 'details-summary')
  summary.append(element('span', '', '执行记录'), element('span', 'summary-count', `${state.logs.length} 条`))
  details.append(summary)
  details.addEventListener('toggle', () => {
    if (details.open) state.logOpen = 'logs'
    else if (state.logOpen === 'logs') state.logOpen = false
  })
  const output = element('div', 'log-output')
  output.setAttribute('role', 'log')
  output.setAttribute('aria-live', 'polite')
  if (!state.logs.length) output.append(element('p', 'details-empty', '运行任务后，逐项状态和 ffs 输出会显示在这里。'))
  for (const entry of state.logs.slice(-250)) {
    const line = element('div', `log-line log-${entry.kind || 'output'}`)
    if (entry.time) line.append(element('time', 'log-time', entry.time))
    if (entry.name) line.append(element('span', 'log-file', entry.name))
    line.append(element('span', 'log-text', entry.text))
    output.append(line)
  }
  details.append(output)
  const clear = button('清空记录', { className: 'text-button', disabled: state.runActive || !state.logs.length, action: () => { state.logs = []; render() } })
  details.append(clear)
  return details
}

function cliState() {
  if (!state.environment) return { className: 'checking', label: '正在检查本机工具' }
  const requirements = [state.environment.ffs, state.environment.ffmpeg, state.environment.ffprobe]
  const good = requirements.filter((item) => item?.available).length
  if (good === requirements.length) return { className: 'healthy', label: '本机工具已就绪' }
  if (!state.environment.ffs?.available) return { className: 'missing', label: '未找到 ffs' }
  return { className: 'attention', label: `环境待补全 · ${good}/${requirements.length}` }
}

function runReadiness() {
  const count = state.videos.reduce((ready, video) => ready + (state.assignments.has(video.path) ? 1 : 0), 0)
  return { ready: count, total: state.videos.length, allReady: count > 0 && count === state.videos.length }
}

function makeHeader() {
  const header = element('header', 'masthead')
  const identity = element('div', 'identity-lockup')
  identity.append(element('span', 'record-dot', ''))
  identity.append(element('span', 'brand-name', 'FFSubSync'))
  identity.append(element('span', 'brand-divider', '/'))
  identity.append(element('span', 'brand-descriptor', '本机字幕校准台'))
  header.append(identity)

  const environment = cliState()
  const toolButton = button(environment.label, {
    className: `tool-state tool-${environment.className}`,
    action: openSettings,
    ariaLabel: `查看本机运行环境。${environment.label}`,
  })
  const stateDot = element('span', 'tool-dot', '')
  toolButton.prepend(stateDot)
  header.append(toolButton)
  header.append(button('', { className: 'settings-button', icon: 'settings', action: openSettings, ariaLabel: '设置' }))
  return header
}

function makeIntro() {
  const intro = element('section', 'workbench-intro')
  const title = element('div', 'intro-copy')
  title.append(element('h1', '', '字幕对齐工作台'))
  title.append(element('p', '', '让每段画面与正确的对白并排落在轨道上。确认配对，再交给 ffs 同步。'))
  intro.append(title)

  const readiness = runReadiness()
  const count = element('div', 'readiness')
  const label = element('span', 'readiness-label', '已配对 · 可运行')
  const value = element('div', 'readiness-value')
  value.append(element('strong', 'ready-number', String(readiness.ready).padStart(2, '0')))
  value.append(element('span', 'ready-divider', '/'))
  value.append(element('span', 'ready-total', String(readiness.total).padStart(2, '0')))
  count.append(label, value, element('span', 'readiness-note', readiness.total ? `尚有 ${readiness.total - readiness.ready} 项待确认` : '等待添加任务'))
  intro.append(count)
  return intro
}

function makeTrackHeader() {
  const header = element('div', 'pair-header')
  header.append(element('span', 'column-label', '视频'))
  header.append(element('span', 'middle-label', '配对轨'))
  header.append(element('span', 'column-label', '字幕'))
  header.append(element('span', 'state-label', '任务状态'))
  return header
}

function makeRunBar() {
  const footer = element('footer', 'run-bar')
  const outputCopy = element('div', 'output-rule')
  outputCopy.append(makeIcon('folder', 'output-icon'))
  const outputText = element('div', 'output-copy')
  outputText.append(element('strong', '', '输出到视频所在文件夹'))
  outputText.append(element('span', '', '视频同名 · 字幕格式不变 · 旧文件保留为 .original'))
  outputCopy.append(outputText)
  footer.append(outputCopy)

  const progress = element('div', 'batch-progress')
  const completed = state.runFinished
  const total = state.runTotal
  progress.append(element('strong', '', state.runActive ? `正在处理 ${completed + (state.activeId ? 1 : 0)} / ${total}` : total ? `本批完成 ${completed} / ${total}` : '逐项串行处理'))
  progress.append(element('span', '', state.cancelRequested ? '正在安全停止当前任务…' : '每项结果都会保留在执行记录中'))
  footer.append(progress)

  const readiness = runReadiness()
  const runButton = state.runActive
    ? button('停止同步', { className: 'cancel-button', icon: 'close', action: async () => { state.cancelRequested = true; render(); await window.ffsync.cancelSync() } })
    : button('开始同步', {
        className: 'run-button',
        icon: 'play',
        disabled: !readiness.allReady || !state.environment?.ffs?.available || !state.environment?.ffmpeg?.available || !state.environment?.ffprobe?.available,
        action: () => runBatch(),
      })
  footer.append(runButton)
  return footer
}

function render() {
  recomputeAssignments()
  const activeElement = document.activeElement
  const focusPath = activeElement?.dataset?.focusPath || null
  const activeSelectVideo = activeElement?.dataset?.videoPath || null
  const stage = element('div', 'stage')
  stage.append(makeHeader())

  const scroll = element('div', 'page-scroll')
  scroll.append(makeIntro())
  const sourceLanes = element('section', 'source-lanes')
  sourceLanes.append(makeDropZone('video'), makeDropZone('subtitle'))
  scroll.append(sourceLanes)

  const trackSection = element('section', 'track-section')
  const trackTitle = element('div', 'track-title-line')
  trackTitle.append(element('h2', '', '配对内页'), element('span', 'track-caption', '一条视频 · 一条字幕 · 唯一对应'))
  if (state.videos.length || state.subtitles.length) {
    trackTitle.append(button('清空列表', { className: 'text-button clear-button', disabled: state.runActive, action: () => {
      state.videos = []
      state.subtitles = []
      state.assignments.clear()
      state.manualPairs.clear()
      state.manualLocks.clear()
      state.results.clear()
      render()
    } }))
  }
  trackSection.append(trackTitle)
  if (state.videos.length) {
    trackSection.append(makeTrackHeader())
    const rows = element('div', 'pair-rows')
    state.videos.forEach((video, index) => rows.append(makePairRow(video, index)))
    trackSection.append(rows)
  } else {
    trackSection.append(makeEmptyState())
  }
  scroll.append(trackSection, makeUnassignedSection(), makeLogSection())
  stage.append(scroll, makeRunBar())
  appRoot.replaceChildren(stage)

  if (focusPath) appRoot.querySelector(`[data-focus-path="${CSS.escape(focusPath)}"]`)?.focus()
  if (activeSelectVideo) appRoot.querySelector(`[data-video-path="${CSS.escape(activeSelectVideo)}"] select`)?.focus()
}

async function runBatch(videos = state.videos) {
  if (state.runActive) return
  const jobs = videos.map((video) => ({
    id: crypto.randomUUID(),
    videoPath: video.path,
    subtitlePath: state.assignments.get(video.path),
  })).filter((job) => job.subtitlePath)
  if (!jobs.length) return

  state.runActive = true
  state.cancelRequested = false
  state.runTotal = jobs.length
  state.runFinished = 0
  state.activeId = null
  state.activeVideoPath = null
  for (const job of jobs) state.results.set(pathIdentity(job.videoPath), { id: job.id, subtitlePath: job.subtitlePath, status: 'queued' })
  render()
  addLog('system', `开始同步 ${jobs.length} 项。`, 'batch')
  try {
    await window.ffsync.runSync(jobs)
  } catch (error) {
    state.runActive = false
    state.activeId = null
    state.activeVideoPath = null
    addLog('error', error.message || '批次未能启动。', 'error')
    notify(error.message || '批次未能启动。', 'error')
  }
  render()
}

function addLog(text, kind = 'output', name = '') {
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date())
  state.logs.push({ time, text: String(text), kind, name })
  if (state.logs.length > 600) state.logs.splice(0, state.logs.length - 600)
  if (state.logOpen === 'logs') {
    const log = appRoot.querySelector('.log-output')
    if (log) {
      if (log.querySelector('.details-empty')) log.replaceChildren()
      const line = element('div', `log-line log-${kind}`)
      line.append(element('time', 'log-time', time))
      if (name) line.append(element('span', 'log-file', name))
      line.append(element('span', 'log-text', String(text)))
      log.append(line)
      log.scrollTop = log.scrollHeight
    }
  }
}

function onSyncEvent(event) {
  switch (event.type) {
    case 'batch-start':
      state.runActive = true
      state.runTotal = event.total
      state.runFinished = 0
      render()
      break
    case 'item-start': {
      state.activeId = event.id
      state.activeVideoPath = event.videoPath || null
      const video = state.videos.find((item) => pathIdentity(item.path) === pathIdentity(state.activeVideoPath || ''))
      if (video) state.results.set(pathIdentity(video.path), { id: event.id, subtitlePath: state.assignments.get(video.path), status: 'running' })
      addLog('开始同步', 'system', event.name)
      render()
      break
    }
    case 'output':
      addLog(event.text, event.stream === 'stderr' ? 'stderr' : 'output', event.name)
      break
    case 'item-result': {
      const videoKey = pathIdentity(event.videoPath)
      const result = { ...event, subtitlePath: state.assignments.get(event.videoPath) || state.results.get(videoKey)?.subtitlePath }
      state.results.set(videoKey, result)
      if (event.status === 'success') addLog(event.message || '同步完成。', 'success', state.videos.find((item) => pathIdentity(item.path) === videoKey)?.name)
      else addLog(event.message || '任务未完成。', event.status === 'failed' ? 'error' : 'system', state.videos.find((item) => pathIdentity(item.path) === videoKey)?.name)
      state.runFinished += 1
      state.activeId = null
      state.activeVideoPath = null
      render()
      break
    }
    case 'batch-finish':
      state.runActive = false
      state.cancelRequested = false
      state.activeId = null
      state.activeVideoPath = null
      state.runFinished = event.success + event.failed + event.cancelled
      addLog(`批次结束：完成 ${event.success}，失败 ${event.failed}，取消 ${event.cancelled}。`, 'system')
      notify(event.failed ? `批次结束：${event.success} 项完成，${event.failed} 项需要处理。` : `批次结束：${event.success} 项完成。`, event.failed ? 'error' : 'success')
      render()
      break
  }
}

function showEnvironment(environment, target = environmentResults) {
  target.replaceChildren()
  const items = [
    ['FFSubSync · ffs', environment?.ffs],
    ['FFmpeg', environment?.ffmpeg],
    ['FFprobe', environment?.ffprobe],
  ]
  for (const [label, result] of items) {
    const row = element('div', `environment-row ${result?.available ? 'environment-good' : 'environment-missing'}`)
    const marker = element('span', 'environment-marker', '')
    row.append(marker, element('strong', '', label), element('span', 'environment-detail', result?.available ? '可用' : result?.detail || '未找到'))
    target.append(row)
  }
}

async function checkTools(command = settingsInput.value.trim() || state.ffsCommand) {
  environmentResults.replaceChildren(element('p', 'details-empty', '正在检查 ffs、ffmpeg 和 ffprobe…'))
  try {
    const environment = await window.ffsync.checkEnvironment(command)
    state.environment = environment
    showEnvironment(environment)
    render()
    return environment
  } catch (error) {
    environmentResults.replaceChildren(element('p', 'environment-error', error.message || '无法读取运行环境。'))
    throw error
  }
}

async function openSettings() {
  try {
    const settings = await window.ffsync.getSettings()
    settingsInput.value = settings.ffsCommand || 'ffs'
    settingsDialog.showModal()
    await checkTools(settingsInput.value)
  } catch (error) {
    notify(error.message || '无法读取设置。', 'error')
  }
}

document.getElementById('choose-ffs').addEventListener('click', async () => {
  try {
    const command = await window.ffsync.chooseFfs()
    if (command) settingsInput.value = command
  } catch (error) {
    notify(error.message || '无法选择 ffs.exe。', 'error')
  }
})

document.getElementById('check-environment').addEventListener('click', () => checkTools().catch(() => {}))
document.getElementById('save-settings').addEventListener('click', async () => {
  try {
    const settings = await window.ffsync.saveSettings({ ffsCommand: settingsInput.value.trim() || 'ffs' })
    state.ffsCommand = settings.ffsCommand
    state.environment = await window.ffsync.checkEnvironment(state.ffsCommand)
    showEnvironment(state.environment)
    render()
    notify('设置已保存。', 'success')
  } catch (error) {
    notify(error.message || '设置未能保存。', 'error')
  }
})

const closeSettingsButton = document.querySelector('.close-settings')
closeSettingsButton.append(makeIcon('close'))
closeSettingsButton.addEventListener('click', () => settingsDialog.close())
settingsDialog.addEventListener('click', (event) => {
  if (event.target === settingsDialog) settingsDialog.close()
})

window.ffsync.onSyncEvent(onSyncEvent)
window.addEventListener('dragover', (event) => event.preventDefault())
window.addEventListener('drop', (event) => event.preventDefault())

render()
window.ffsync.getSettings().then((settings) => {
  state.ffsCommand = settings.ffsCommand || 'ffs'
  return window.ffsync.checkEnvironment(state.ffsCommand)
}).then((environment) => {
  state.environment = environment
  render()
}).catch((error) => {
  state.environment = { ffs: { available: false, detail: error.message }, ffmpeg: { available: false }, ffprobe: { available: false } }
  render()
})

