import { toYouTubeEmbed } from '@/lib/video'

/**
 * Renders a lesson video. External YouTube links become an embed; R2-hosted
 * (presigned) URLs and other direct files use a native <video> element.
 * The richer custom player (shortcuts, speed, PiP, resume) lands in a later pass.
 */
export function VideoPlayer({
  source,
  url,
  className = '',
}: {
  source: 'r2' | 'external'
  url: string
  className?: string
}) {
  const embed = source === 'external' ? toYouTubeEmbed(url) : null

  if (embed) {
    return (
      <iframe
        className={`aspect-video w-full rounded-xl border border-border bg-black ${className}`}
        src={embed}
        title="Lesson video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    )
  }

  return (
    <video
      className={`aspect-video w-full rounded-xl border border-border bg-black ${className}`}
      src={url}
      controls
      playsInline
      controlsList="nodownload"
    />
  )
}
