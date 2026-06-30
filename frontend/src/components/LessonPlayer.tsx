import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  Check,
  Loader2,
} from 'lucide-react'
import type HlsJs from 'hls.js'
import { cn } from '@/lib/utils'

export interface LessonPlayerProps {
  source: 'r2' | 'hls'
  url: string
  /** Resume position in seconds. */
  startAt?: number
  /** Called periodically (~10s) with the current position in seconds. */
  onProgress?: (sec: number) => void
  /** Called when playback reaches the end. */
  onEnded?: () => void
}

const SPEEDS = [0.5, 1, 1.5, 2] as const

/** Seconds -> m:ss (or h:mm:ss for long videos). */
function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0
  const total = Math.floor(s)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

const btn =
  'grid h-9 w-9 shrink-0 place-items-center rounded-full text-white outline-none transition-colors hover:bg-white/15 focus-visible:bg-white/20'

/**
 * Custom video player (one <video> driven by HLS.js for encrypted streams, or a
 * direct MP4). Native controls are replaced by a branded overlay so the chrome
 * matches the app: scrubber with buffered progress, time, volume, a settings
 * menu (speed + quality), PiP and fullscreen, plus keyboard shortcuts.
 */
function NativeVideoPlayer({
  url,
  isHls = false,
  startAt = 0,
  onProgress,
  onEnded,
}: Omit<LessonPlayerProps, 'source'> & { isHls?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLVideoElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const lastSaved = useRef(0)
  const lastVol = useRef(1)
  const hlsRef = useRef<HlsJs | null>(null)
  const draggingRef = useRef(false)
  const hideTimer = useRef<number | null>(null)

  const [rate, setRate] = useState(1)
  const [levels, setLevels] = useState<{ height: number; index: number }[]>([])
  const [level, setLevel] = useState(-1) // -1 = Auto (adaptive)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  // Attach hls.js for encrypted-HLS streams (lazy-loaded; native HLS on Safari
  // is the fallback). Dynamic import keeps hls.js out of the main bundle.
  useEffect(() => {
    if (!ref.current || !isHls) return
    let cancelled = false
    let hls: HlsJs | undefined
    void import('hls.js').then((mod) => {
      const Hls = mod.default
      const video = ref.current
      if (cancelled || !video) return
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true })
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLevels(hls!.levels.map((l, i) => ({ height: l.height, index: i })))
        })
        hls.on(Hls.Events.LEVEL_SWITCHED, () => {
          if (hls!.autoLevelEnabled) setLevel(-1)
        })
        hlsRef.current = hls
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url
      }
    })
    return () => {
      cancelled = true
      hlsRef.current = null
      hls?.destroy()
      setLevels([])
      setLevel(-1)
    }
  }, [url, isHls])

  // Reset transient UI when the source changes (new lesson/quality).
  useEffect(() => {
    setLoading(true)
    setCurrent(0)
    setBuffered(0)
  }, [url])

  // Track fullscreen on our container so the custom controls stay visible in it.
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // Close the settings menu on an outside click.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [menuOpen])

  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current) }, [])

  const focusSelf = () => containerRef.current?.focus()

  const togglePlay = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) void v.play().catch(() => undefined)
    else v.pause()
    focusSelf()
  }
  const seekBy = (d: number) => {
    const v = ref.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 1e9, v.currentTime + d))
    lastSaved.current = Math.floor(v.currentTime) // rebaseline so the next save is +10s from here
  }
  const setSpeed = (r: number) => {
    setRate(r)
    if (ref.current) ref.current.playbackRate = r
    setMenuOpen(false)
    focusSelf()
  }
  const changeQuality = (idx: number) => {
    setLevel(idx)
    if (hlsRef.current) hlsRef.current.currentLevel = idx
    setMenuOpen(false)
    focusSelf()
  }
  const setVol = (val: number) => {
    const v = ref.current
    if (!v) return
    if (val > 0) lastVol.current = val
    v.muted = val === 0
    v.volume = val
  }
  const toggleMute = () => {
    const v = ref.current
    if (!v) return
    if (v.muted || v.volume === 0) {
      // Unmute, restoring the last audible level (covers slider-dragged-to-0).
      if (v.volume === 0) v.volume = lastVol.current || 1
      v.muted = false
    } else {
      v.muted = true
    }
    focusSelf()
  }
  const togglePiP = async () => {
    const v = ref.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {
      /* PiP unsupported / denied */
    }
    focusSelf()
  }
  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.()
    focusSelf()
  }

  // Drag-to-seek on the scrubber.
  const seekToClientX = (clientX: number) => {
    const bar = barRef.current
    const v = ref.current
    if (!bar || !v || !duration) return
    const rect = bar.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    v.currentTime = frac * duration
    setCurrent(frac * duration)
    lastSaved.current = Math.floor(frac * duration) // rebaseline the save throttle
  }
  const onBarDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    draggingRef.current = true
    barRef.current?.setPointerCapture(e.pointerId)
    seekToClientX(e.clientX)
  }
  const onBarMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekToClientX(e.clientX)
  }
  const onBarUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    try {
      barRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* pointer already released (e.g. a pointercancel from a touch pan) */
    }
    focusSelf()
  }
  // Keyboard control of the scrubber itself (it advertises role="slider").
  const onBarKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = ref.current
    if (!v) return
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        seekBy(-5)
        break
      case 'ArrowRight':
        e.preventDefault()
        seekBy(5)
        break
      case 'Home':
        e.preventDefault()
        v.currentTime = 0
        break
      case 'End':
        e.preventDefault()
        if (duration) v.currentTime = duration
        break
      case ' ':
      case 'k':
        e.preventDefault()
        togglePlay()
        break
    }
  }

  // Auto-hide the controls while playing; reveal on movement.
  const reveal = () => {
    setShowControls(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setShowControls(false), 2600)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = ref.current
    if (!v) return
    // Never swallow browser/OS chords (Ctrl+L, Cmd+F, ...).
    if (e.ctrlKey || e.metaKey || e.altKey) return
    // Only act when the wrapper itself is focused; focused child controls handle
    // their own keys and restore wrapper focus after activating.
    if (e.target !== e.currentTarget) return
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault()
        togglePlay()
        break
      case 'ArrowRight':
        e.preventDefault()
        seekBy(5)
        break
      case 'ArrowLeft':
        e.preventDefault()
        seekBy(-5)
        break
      case 'l':
        e.preventDefault()
        seekBy(10)
        break
      case 'j':
        e.preventDefault()
        seekBy(-10)
        break
      case 'ArrowUp':
        e.preventDefault()
        setVol(Math.min(1, volume + 0.1))
        break
      case 'ArrowDown':
        e.preventDefault()
        setVol(Math.max(0, volume - 0.1))
        break
      case 'm':
        e.preventDefault()
        toggleMute()
        break
      case 'f':
        e.preventDefault()
        toggleFullscreen()
        break
    }
  }

  const playedPct = duration ? (current / duration) * 100 : 0
  const bufferedPct = duration ? (buffered / duration) * 100 : 0
  const controlsVisible = showControls || !playing || menuOpen

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={reveal}
      onPointerDown={reveal}
      onMouseLeave={() => playing && setShowControls(false)}
      className={cn(
        'group relative w-full select-none overflow-hidden bg-black outline-none ring-primary/40 focus-visible:ring-2',
        fullscreen ? 'h-full' : 'aspect-video rounded-2xl border-2 border-foreground',
        !controlsVisible && playing && 'cursor-none'
      )}
    >
      <video
        ref={ref}
        src={isHls ? undefined : url}
        playsInline
        onClick={togglePlay}
        onContextMenu={(e) => e.preventDefault()}
        className="h-full w-full bg-black object-contain"
        onLoadedMetadata={() => {
          const v = ref.current
          if (!v) return
          setDuration(v.duration)
          if (startAt > 5 && startAt < v.duration - 5) v.currentTime = startAt
        }}
        onDurationChange={() => ref.current && setDuration(ref.current.duration)}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlay={() => setPlaying(true)}
        onPlaying={() => {
          setPlaying(true)
          setLoading(false)
        }}
        onPause={() => setPlaying(false)}
        onVolumeChange={() => {
          const v = ref.current
          if (!v) return
          setMuted(v.muted)
          setVolume(v.volume)
        }}
        onProgress={() => {
          const v = ref.current
          if (v && v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
        }}
        onTimeUpdate={() => {
          const v = ref.current
          if (!v) return
          if (!draggingRef.current) setCurrent(v.currentTime)
          const t = Math.floor(v.currentTime)
          // Save on a ~10s drift in either direction, so a rewind is persisted too.
          if (Math.abs(t - lastSaved.current) >= 10) {
            lastSaved.current = t
            onProgress?.(t)
          }
        }}
        onEnded={() => {
          setPlaying(false)
          onEnded?.()
        }}
      />

      {/* Loading: white spinner over the black frame (the native one is invisible). */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/90" />
        </div>
      )}

      {/* Big center play button while paused. */}
      {!playing && !loading && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 z-10 grid place-items-center outline-none"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-white shadow-lg ring-4 ring-white/20 transition-transform hover:scale-105">
            <Play className="h-7 w-7 translate-x-0.5 fill-current" />
          </span>
        </button>
      )}

      {/* Control bar. */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-200',
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {/* Scrubber */}
        <div
          ref={barRef}
          onPointerDown={onBarDown}
          onPointerMove={onBarMove}
          onPointerUp={onBarUp}
          onPointerCancel={onBarUp}
          onKeyDown={onBarKeyDown}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(current)}
          className="group/bar relative flex h-4 touch-none cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <div className="relative h-1.5 w-full rounded-full bg-white/25">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/35"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${playedPct}%` }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/bar:opacity-100"
              style={{ left: `${playedPct}%` }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1 text-white">
          <button type="button" onClick={togglePlay} className={btn} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>

          <div className="flex items-center">
            <button type="button" onClick={toggleMute} className={btn} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVol(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  e.preventDefault() // don't scroll the page; toggle play instead
                  togglePlay()
                }
              }}
              aria-label="Volume"
              className="hidden h-1 w-16 cursor-pointer accent-white sm:block"
            />
          </div>

          <span className="ml-1 text-xs font-semibold tabular-nums text-white/90">
            {fmt(current)} <span className="text-white/50">/ {fmt(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            {/* Settings: speed (+ quality for HLS) */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((o) => !o)
                  focusSelf()
                }}
                className={cn(btn, menuOpen && 'bg-white/15')}
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              {menuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-44 overflow-hidden rounded-xl border border-white/15 bg-ink/95 p-1.5 text-sm text-white shadow-xl backdrop-blur">
                  <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-white/45">
                    Speed
                  </p>
                  {SPEEDS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSpeed(r)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 font-semibold hover:bg-white/10"
                    >
                      <span>{r === 1 ? 'Normal' : `${r}x`}</span>
                      {rate === r && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                  {isHls && levels.length > 1 && (
                    <>
                      <p className="mt-1 border-t border-white/10 px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
                        Quality
                      </p>
                      <button
                        type="button"
                        onClick={() => changeQuality(-1)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 font-semibold hover:bg-white/10"
                      >
                        <span>Auto</span>
                        {level === -1 && <Check className="h-4 w-4 text-primary" />}
                      </button>
                      {[...levels]
                        .sort((a, b) => b.height - a.height)
                        .map((l) => (
                          <button
                            key={l.index}
                            type="button"
                            onClick={() => changeQuality(l.index)}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 font-semibold hover:bg-white/10"
                          >
                            <span>{l.height}p</span>
                            {level === l.index && <Check className="h-4 w-4 text-primary" />}
                          </button>
                        ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <button type="button" onClick={togglePiP} className={btn} aria-label="Picture in picture">
              <PictureInPicture2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className={btn}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LessonPlayer({ source, url, ...rest }: LessonPlayerProps) {
  return <NativeVideoPlayer url={url} isHls={source === 'hls'} {...rest} />
}
