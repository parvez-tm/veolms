import { Request, Response } from 'express';
import { Lesson, LessonType, LessonResource } from './lesson-model';
import { Section } from '../section/section-model';
import { Course } from '../course/course-model';
import { Enrollment } from '../enrollment/enrollment-model';
import { MediaAsset } from '../media/media-asset-model';
import { ApiError, JwtPayload } from '../../../types/interface';
import { isAdminOrOwner } from '../../../middleware/role-middleware';
import { loadOwnedCourse } from '../course-access';
import { sanitizeData } from '../../../services/sanitize-service';
import {
  isStorageConfigured,
  createPlaybackUrl,
} from '../../../services/storage-service';
import { issueHlsTicket } from '../../../services/hls-ticket';
import {
  purgeAssetsByIds,
  assetReferenceCount,
} from '../../../services/media-service';
import { sequelize } from '../../../db/sequelize';
import { bodyId, nonNegInt } from '../../../helpers/parse-id';

const TYPES: LessonType[] = ['video', 'text'];

/** Require a non-empty string body field. */
function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(400, `${name} is required and must be a non-empty string`);
  }
  return value;
}

/** Optional string body field (null when absent), rejecting non-strings. */
function optionalString(value: unknown, name: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, `${name} must be a string`);
  }
  return value;
}

/** Parse + validate the optional resources list (title + http(s) url pairs). */
function parseResources(value: unknown): LessonResource[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  const out: LessonResource[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const title = String((raw as { title?: unknown }).title ?? '').trim();
    const url = String((raw as { url?: unknown }).url ?? '').trim();
    if (!title || !url) continue;
    if (!/^https?:\/\//i.test(url)) {
      throw new ApiError(400, 'Resource URLs must start with http:// or https://');
    }
    out.push({ title: title.slice(0, 200), url: url.slice(0, 2000) });
    if (out.length >= 30) break;
  }
  return out;
}

/** Verify a video MediaAsset is the user's own, a video, and uploaded. */
async function resolveVideoAsset(
  rawId: unknown,
  user: JwtPayload | undefined
): Promise<number> {
  const asset = await MediaAsset.findByPk(bodyId(rawId, 'videoAssetId'));
  if (!asset) {
    throw new ApiError(404, 'Video asset not found');
  }
  if (asset.kind !== 'video') {
    throw new ApiError(400, 'Media asset is not a video');
  }
  if (!isAdminOrOwner(user, asset.uploadedById)) {
    throw new ApiError(403, 'You can only attach your own uploads');
  }
  if (asset.status !== 'ready') {
    throw new ApiError(400, 'Video upload has not been confirmed yet');
  }
  return asset.id;
}

/** Resolve a video lesson's source (an uploaded R2 asset) + optional notes. */
async function resolveVideoFields(
  body: Record<string, unknown>,
  user: JwtPayload | undefined
) {
  const hasAsset = body.videoAssetId !== undefined && body.videoAssetId !== null;
  if (!hasAsset) {
    throw new ApiError(400, 'A video lesson requires an uploaded video (videoAssetId)');
  }
  const notes = optionalString(body.content, 'content');
  return {
    videoAssetId: await resolveVideoAsset(body.videoAssetId, user),
    videoDurationSec:
      body.videoDurationSec === undefined || body.videoDurationSec === null
        ? null
        : nonNegInt(body.videoDurationSec, 'videoDurationSec'),
    content: notes ? sanitizeData(notes) : null,
  };
}

/** Authorize viewing a lesson: owner/admin, or published + (preview or enrolled). */
async function assertLessonAccess(
  lesson: Lesson,
  user: JwtPayload | undefined
): Promise<void> {
  const course = await Course.findByPk(lesson.courseId);
  if (isAdminOrOwner(user, course?.instructorId ?? -1)) {
    return;
  }
  if (course?.status !== 'published') {
    throw new ApiError(403, 'This course is not available');
  }
  if (!lesson.isPreview) {
    // Non-preview lessons require an authenticated, enrolled user.
    if (!user) {
      throw new ApiError(401, 'Please log in and enroll to access this lesson');
    }
    const enrolled = await Enrollment.findOne({
      where: { userId: user.id, courseId: lesson.courseId },
    });
    if (!enrolled) {
      throw new ApiError(403, 'Enroll in the course to access this lesson');
    }
  }
  // Preview lessons of a published course are viewable anonymously (no user needed).
}

export const addLesson = async (req: Request, res: Response): Promise<void> => {
  const { sectionId, title, type } = req.body ?? {};
  if (!sectionId || !title || !type) {
    throw new ApiError(400, 'sectionId, title and type are required');
  }
  if (!TYPES.includes(type)) {
    throw new ApiError(400, 'type must be "video" or "text"');
  }

  const section = await Section.findByPk(bodyId(sectionId, 'sectionId'));
  if (!section) {
    throw new ApiError(404, 'Section not found');
  }
  await loadOwnedCourse(section.courseId, req.user);

  let contentFields;
  if (type === 'video') {
    contentFields = await resolveVideoFields(req.body, req.user);
  } else {
    contentFields = {
      content: sanitizeData(requireString(req.body.content, 'content')),
      videoAssetId: null,
      videoDurationSec: null,
    };
  }

  const description = optionalString(req.body.description, 'description');
  const lesson = await Lesson.create({
    sectionId: section.id,
    courseId: section.courseId,
    title: requireString(title, 'title'),
    description: description ? sanitizeData(description) : null,
    type,
    position:
      req.body.position === undefined ? 0 : nonNegInt(req.body.position, 'position'),
    isPreview: !!req.body.isPreview,
    resources: parseResources(req.body.resources) ?? [],
    ...contentFields,
  });
  res.status(201).json({ data: lesson, message: 'Lesson created successfully' });
};

export const updateLesson = async (
  req: Request,
  res: Response
): Promise<void> => {
  const lesson = await Lesson.findByPk(req.params.id);
  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }
  await loadOwnedCourse(lesson.courseId, req.user);

  const {
    title,
    description,
    position,
    isPreview,
    videoAssetId,
    videoDurationSec,
    content,
    resources,
  } = req.body ?? {};

  // A text lesson cannot acquire a video source.
  if (lesson.type === 'text' && videoAssetId !== undefined) {
    throw new ApiError(400, 'A text lesson cannot have a video source');
  }

  if (title !== undefined) lesson.title = requireString(title, 'title');
  if (description !== undefined) {
    const d = optionalString(description, 'description');
    lesson.description = d ? sanitizeData(d) : null;
  }
  if (resources !== undefined) lesson.resources = parseResources(resources) ?? [];
  if (position !== undefined) lesson.position = nonNegInt(position, 'position');
  if (isPreview !== undefined) lesson.isPreview = !!isPreview;

  // The only video source is an uploaded R2 asset. (A video lesson must keep one;
  // enforced below.)
  if (videoAssetId !== undefined) {
    lesson.videoAssetId =
      videoAssetId === null ? null : await resolveVideoAsset(videoAssetId, req.user);
  }
  if (videoDurationSec !== undefined) {
    lesson.videoDurationSec =
      videoDurationSec === null ? null : nonNegInt(videoDurationSec, 'videoDurationSec');
  }
  if (content !== undefined) {
    if (lesson.type === 'text') {
      lesson.content = sanitizeData(requireString(content, 'content'));
    } else {
      lesson.content =
        content === null || content === ''
          ? null
          : sanitizeData(requireString(content, 'content'));
    }
  }

  // A video lesson must always keep its uploaded video.
  if (lesson.type === 'video' && lesson.videoAssetId == null) {
    throw new ApiError(400, 'A video lesson requires an uploaded video (videoAssetId)');
  }

  await lesson.save();

  res.status(200).json({ data: lesson, message: 'Lesson updated successfully' });
};

export const getLessonById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const lesson = await Lesson.findByPk(req.params.id);
  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }
  await assertLessonAccess(lesson, req.user);
  res.status(200).json({ data: lesson, message: 'Lesson fetched successfully' });
};

/**
 * Issue a playback source for a lesson's R2-hosted video: encrypted HLS once it
 * has transcoded, otherwise a short-lived presigned MP4 (the bucket is private).
 * Gated by the same access rules as viewing the lesson.
 */
export const getLessonPlayback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const lesson = await Lesson.findByPk(req.params.id);
  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }
  await assertLessonAccess(lesson, req.user);

  if (lesson.type !== 'video') {
    throw new ApiError(400, 'This lesson has no video');
  }

  if (lesson.videoAssetId) {
    if (!isStorageConfigured()) {
      throw new ApiError(503, 'Media storage (R2) is not configured');
    }
    const asset = await MediaAsset.findByPk(lesson.videoAssetId);
    if (!asset) {
      throw new ApiError(409, 'Video is not ready');
    }
    // Preferred: AES-128 encrypted HLS, where playlist + key are ticket-gated and the
    // raw file is gone, so there's no single downloadable video in the Network tab.
    if (asset.hlsStatus === 'ready') {
      // userId 0 for anonymous preview viewers; the ticket still gates access.
      const ticket = issueHlsTicket(asset.id, req.user?.id ?? 0);
      const base = `${req.protocol}://${req.get('host')}`;
      res.status(200).json({
        data: {
          source: 'hls',
          url: `${base}/api/media/hls/${asset.id}/playlist?ticket=${encodeURIComponent(ticket)}`,
        },
        message: 'Playback URL issued',
      });
      return;
    }
    // Fallback: short-lived presigned MP4 (before transcode finishes, or if ffmpeg is unavailable).
    if (asset.status !== 'ready') {
      throw new ApiError(409, 'Video is not ready');
    }
    const { url, expiresIn } = await createPlaybackUrl(
      asset.storageKey,
      asset.contentType
    );
    res
      .status(200)
      .json({ data: { source: 'r2', url, expiresIn }, message: 'Playback URL issued' });
    return;
  }

  throw new ApiError(404, 'No video for this lesson');
};

/**
 * Reorder lessons within a section. Body: { sectionId, order: number[] } where
 * `order` is the lesson ids top-to-bottom. Positions are rewritten to the array
 * index, scoped to the section so foreign ids are ignored.
 */
export const reorderLessons = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { sectionId, order } = req.body ?? {};
  if (!sectionId || !Array.isArray(order)) {
    throw new ApiError(400, 'sectionId and an order array are required');
  }
  const section = await Section.findByPk(bodyId(sectionId, 'sectionId'));
  if (!section) {
    throw new ApiError(404, 'Section not found');
  }
  await loadOwnedCourse(section.courseId, req.user);

  await sequelize.transaction(async (transaction) => {
    let position = 0;
    for (const raw of order) {
      const id = bodyId(raw, 'order[]');
      await Lesson.update(
        { position: position++ },
        { where: { id, sectionId: section.id }, transaction }
      );
    }
  });
  res.status(200).json({ message: 'Lessons reordered' });
};

export const deleteLesson = async (
  req: Request,
  res: Response
): Promise<void> => {
  const lesson = await Lesson.findByPk(req.params.id);
  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }
  await loadOwnedCourse(lesson.courseId, req.user);

  const videoAssetId = lesson.videoAssetId ?? null;
  await lesson.destroy();
  // Remove the lesson's R2 video (object + row) only if nothing else references it.
  if (videoAssetId && (await assetReferenceCount(videoAssetId)) === 0) {
    await purgeAssetsByIds([videoAssetId]);
  }

  res.status(200).json({ message: 'Lesson deleted successfully' });
};
