import { Request, Response } from 'express';
import { UniqueConstraintError } from 'sequelize';
import { LessonProgress } from './lesson-progress-model';
import { Lesson } from '../lesson/lesson-model';
import { Enrollment } from '../enrollment/enrollment-model';
import { ApiError } from '../../../types/interface';
import { parseId, bodyId, nonNegInt } from '../../../helpers/parse-id';

/**
 * Run a find-or-create; if a concurrent request wins the unique race on
 * (userId, lessonId), re-fetch the existing row instead of surfacing a 500.
 */
async function raceSafeProgress(
  create: () => Promise<LessonProgress>,
  refetch: () => Promise<LessonProgress | null>
): Promise<LessonProgress> {
  try {
    return await create();
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      const existing = await refetch();
      if (existing) return existing;
    }
    throw err;
  }
}

interface ProgressSummary {
  courseId: number;
  total: number;
  completed: number;
  percent: number;
  lessons?: Array<{
    lessonId: number;
    title: string;
    completed: boolean;
    lastPositionSec: number;
  }>;
}

async function ensureEnrolled(userId: number, courseId: number): Promise<void> {
  const enrolled = await Enrollment.findOne({ where: { userId, courseId } });
  if (!enrolled) {
    throw new ApiError(403, 'You are not enrolled in this course');
  }
}

async function computeCourseProgress(
  userId: number,
  courseId: number,
  includeLessons = false
): Promise<ProgressSummary> {
  const [lessons, progressRows] = await Promise.all([
    Lesson.findAll({
      where: { courseId },
      attributes: ['id', 'title', 'position'],
      order: [['position', 'ASC']],
    }),
    LessonProgress.findAll({ where: { userId, courseId } }),
  ]);

  const byLesson = new Map(progressRows.map((p) => [p.lessonId, p]));
  const total = lessons.length;
  const completed = progressRows.filter((p) => p.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const summary: ProgressSummary = { courseId, total, completed, percent };
  if (includeLessons) {
    summary.lessons = lessons.map((l) => {
      const p = byLesson.get(l.id);
      return {
        lessonId: l.id,
        title: l.title,
        completed: !!p?.completed,
        lastPositionSec: p?.lastPositionSec ?? 0,
      };
    });
  }
  return summary;
}

export const completeLesson = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { lessonId } = req.body ?? {};
  if (!lessonId) {
    throw new ApiError(400, 'lessonId is required');
  }

  const lesson = await Lesson.findByPk(bodyId(lessonId, 'lessonId'));
  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }
  await ensureEnrolled(req.user!.id, lesson.courseId);

  const userId = req.user!.id;
  const progress = await raceSafeProgress(
    async () =>
      (
        await LessonProgress.findOrCreate({
          where: { userId, lessonId: lesson.id },
          defaults: {
            userId,
            lessonId: lesson.id,
            courseId: lesson.courseId,
            completed: true,
            completedAt: new Date(),
          },
        })
      )[0],
    () => LessonProgress.findOne({ where: { userId, lessonId: lesson.id } })
  );
  if (!progress.completed) {
    progress.completed = true;
    progress.completedAt = new Date();
    await progress.save();
  }

  const summary = await computeCourseProgress(req.user!.id, lesson.courseId);
  // Auto-complete the enrollment when every lesson is done.
  if (summary.percent === 100) {
    await Enrollment.update(
      { status: 'completed', completedAt: new Date() },
      { where: { userId: req.user!.id, courseId: lesson.courseId, status: 'active' } }
    );
  }

  res.status(200).json({ data: summary, message: 'Lesson marked complete' });
};

export const updatePosition = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { lessonId, positionSec } = req.body ?? {};
  if (!lessonId || positionSec === undefined) {
    throw new ApiError(400, 'lessonId and positionSec are required');
  }
  const safePosition = nonNegInt(positionSec, 'positionSec');

  const lesson = await Lesson.findByPk(bodyId(lessonId, 'lessonId'));
  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }
  await ensureEnrolled(req.user!.id, lesson.courseId);

  const userId = req.user!.id;
  const progress = await raceSafeProgress(
    async () =>
      (
        await LessonProgress.findOrCreate({
          where: { userId, lessonId: lesson.id },
          defaults: {
            userId,
            lessonId: lesson.id,
            courseId: lesson.courseId,
            lastPositionSec: safePosition,
          },
        })
      )[0],
    () => LessonProgress.findOne({ where: { userId, lessonId: lesson.id } })
  );
  progress.lastPositionSec = safePosition;
  await progress.save();

  res.status(200).json({ data: progress, message: 'Progress saved' });
};

export const getCourseProgress = async (
  req: Request,
  res: Response
): Promise<void> => {
  const courseId = parseId(req.params.courseId, 'courseId');
  await ensureEnrolled(req.user!.id, courseId);
  const summary = await computeCourseProgress(req.user!.id, courseId, true);
  res.status(200).json({ data: summary, message: 'Progress fetched' });
};
