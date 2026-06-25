import { Request, Response } from 'express';
import { Enrollment } from './enrollment-model';
import { Course } from '../course/course-model';
import { Lesson } from '../lesson/lesson-model';
import { LessonProgress } from '../progress/lesson-progress-model';
import { User } from '../../control/user/user-model';
import { sequelize } from '../../../db/sequelize';
import { ApiError } from '../../../types/interface';
import { isAdminOrOwner } from '../../../middleware/role-middleware';
import { parseId, bodyId } from '../../../helpers/parse-id';
import { isFreeCourse } from '../course/course-pricing';
import {
  THUMBNAIL_ASSET_INCLUDE,
  resolveThumbnailUrl,
} from '../course/course-thumbnail';

/** Self-enroll the current user in a published course. */
export const enroll = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.body ?? {};
  if (!courseId) {
    throw new ApiError(400, 'courseId is required');
  }
  const cid = bodyId(courseId, 'courseId');

  const course = await Course.findByPk(cid);
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  if (course.status !== 'published') {
    throw new ApiError(400, 'Cannot enroll in an unpublished course');
  }
  // Free self-enrollment only. Paid courses MUST go through the payment flow
  // (POST /payment/create-order -> verify) so this endpoint can't be used to
  // bypass payment. Fail closed: anything not exactly free is treated as paid.
  if (!isFreeCourse(course.price)) {
    throw new ApiError(
      402,
      'This is a paid course. Purchase it to enroll.'
    );
  }

  const existing = await Enrollment.findOne({
    where: { userId: req.user!.id, courseId: cid },
  });
  if (existing) {
    throw new ApiError(409, 'Already enrolled in this course');
  }

  const enrollment = await Enrollment.create({
    userId: req.user!.id,
    courseId: cid,
  });
  res.status(201).json({ data: enrollment, message: 'Enrolled successfully' });
};

export const unenroll = async (req: Request, res: Response): Promise<void> => {
  const courseId = parseId(req.params.courseId, 'courseId');
  const userId = req.user!.id;

  // Remove the enrollment and its progress together so re-enrolling starts fresh.
  const deleted = await sequelize.transaction(async (transaction) => {
    const count = await Enrollment.destroy({
      where: { userId, courseId },
      transaction,
    });
    if (count > 0) {
      await LessonProgress.destroy({ where: { userId, courseId }, transaction });
    }
    return count;
  });

  if (!deleted) {
    throw new ApiError(404, 'You are not enrolled in this course');
  }
  res.status(200).json({ message: 'Unenrolled successfully' });
};

/** Courses the current user is enrolled in, each with a progress summary. */
export const myCourses = async (req: Request, res: Response): Promise<void> => {
  const enrollments = await Enrollment.findAll({
    where: { userId: req.user!.id },
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Course,
        as: 'course',
        include: [
          { model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName'] },
          THUMBNAIL_ASSET_INCLUDE,
        ],
      },
    ],
  });

  const data = await Promise.all(
    enrollments.map(async (e) => {
      const [total, completed] = await Promise.all([
        Lesson.count({ where: { courseId: e.courseId } }),
        LessonProgress.count({
          where: { userId: req.user!.id, courseId: e.courseId, completed: true },
        }),
      ]);
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      // Resolve the course cover to its display URL (presigned for uploads).
      const thumbnailUrl = e.course ? await resolveThumbnailUrl(e.course) : null;
      const json = e.toJSON() as {
        course?: { thumbnail?: string | null; thumbnailAsset?: unknown };
        [key: string]: unknown;
      };
      if (json.course) {
        json.course.thumbnail = thumbnailUrl;
        delete json.course.thumbnailAsset;
      }
      return { ...json, progress: { total, completed, percent } };
    })
  );

  res.status(200).json({ data, message: 'Enrolled courses fetched successfully' });
};

/** Roster of students enrolled in a course (instructor/admin only). */
export const courseStudents = async (
  req: Request,
  res: Response
): Promise<void> => {
  const courseId = parseId(req.params.courseId, 'courseId');
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  if (!isAdminOrOwner(req.user, course.instructorId)) {
    throw new ApiError(403, 'Only the course instructor can view its students');
  }

  const enrollments = await Enrollment.findAll({
    where: { courseId },
    order: [['createdAt', 'DESC']],
    include: [
      { model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email'] },
    ],
  });
  res.status(200).json({ data: enrollments, message: 'Students fetched successfully' });
};
