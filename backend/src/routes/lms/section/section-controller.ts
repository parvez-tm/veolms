import { Request, Response } from 'express';
import { Section } from './section-model';
import { Lesson } from '../lesson/lesson-model';
import { Course } from '../course/course-model';
import { Enrollment } from '../enrollment/enrollment-model';
import { sequelize } from '../../../db/sequelize';
import { ApiError } from '../../../types/interface';
import { isAdminOrOwner } from '../../../middleware/role-middleware';
import { loadOwnedCourse } from '../course-access';
import { parseId, bodyId, nonNegInt } from '../../../helpers/parse-id';

export const getSectionsByCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  const courseId = parseId(req.params.courseId, 'courseId');

  const course = await Course.findByPk(courseId);
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  // Draft course content is visible only to its instructor or an Admin.
  const owner = isAdminOrOwner(req.user, course.instructorId);
  if (course.status !== 'published' && !owner) {
    throw new ApiError(403, 'This course is not available');
  }

  // Enrollment gates protected lesson content — mirror getCourseById exactly:
  // non-owners who aren't enrolled get curriculum metadata + preview lessons only.
  let enrolled = false;
  if (!owner && req.user) {
    enrolled = !!(await Enrollment.findOne({
      where: { userId: req.user.id, courseId },
    }));
  }

  const sections = await Section.findAll({
    where: { courseId },
    order: [
      ['position', 'ASC'],
      [{ model: Lesson, as: 'lessons' }, 'position', 'ASC'],
    ],
    include: [{ model: Lesson, as: 'lessons' }],
  });

  type LessonJSON = {
    isPreview: boolean;
    videoAssetId: number | null;
    content: string | null;
  };
  const data = sections.map(
    (s) => s.toJSON() as { lessons?: LessonJSON[]; [key: string]: unknown }
  );

  // Withhold the video source + notes of non-preview lessons from non-owner,
  // non-enrolled viewers, so this endpoint can't be used to read paid course
  // material for free (the paywall bypass this closes).
  if (!owner && !enrolled) {
    for (const section of data) {
      for (const lesson of section.lessons ?? []) {
        if (!lesson.isPreview) {
          lesson.videoAssetId = null;
          lesson.content = null;
        }
      }
    }
  }

  res.status(200).json({ data, message: 'Sections fetched successfully' });
};

export const addSection = async (req: Request, res: Response): Promise<void> => {
  const { courseId, title, position } = req.body ?? {};
  if (!courseId || !title) {
    throw new ApiError(400, 'courseId and title are required');
  }
  const cid = bodyId(courseId, 'courseId');
  await loadOwnedCourse(cid, req.user);

  const section = await Section.create({
    courseId: cid,
    title,
    position: position === undefined ? 0 : nonNegInt(position, 'position'),
  });
  res.status(201).json({ data: section, message: 'Section created successfully' });
};

export const updateSection = async (
  req: Request,
  res: Response
): Promise<void> => {
  const section = await Section.findByPk(req.params.id);
  if (!section) {
    throw new ApiError(404, 'Section not found');
  }
  await loadOwnedCourse(section.courseId, req.user);

  const { title, position } = req.body ?? {};
  if (title !== undefined) section.title = title;
  if (position !== undefined) section.position = nonNegInt(position, 'position');
  await section.save();

  res.status(200).json({ data: section, message: 'Section updated successfully' });
};

/**
 * Reorder a course's sections. Body: { courseId, order: number[] } where `order`
 * is the section ids in their new top-to-bottom order. Positions are rewritten
 * to the array index, scoped to the course so foreign ids are ignored.
 */
export const reorderSections = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { courseId, order } = req.body ?? {};
  if (!courseId || !Array.isArray(order)) {
    throw new ApiError(400, 'courseId and an order array are required');
  }
  const cid = bodyId(courseId, 'courseId');
  await loadOwnedCourse(cid, req.user);

  await sequelize.transaction(async (transaction) => {
    let position = 0;
    for (const raw of order) {
      const id = bodyId(raw, 'order[]');
      await Section.update(
        { position: position++ },
        { where: { id, courseId: cid }, transaction }
      );
    }
  });
  res.status(200).json({ message: 'Sections reordered' });
};

export const deleteSection = async (
  req: Request,
  res: Response
): Promise<void> => {
  const section = await Section.findByPk(req.params.id);
  if (!section) {
    throw new ApiError(404, 'Section not found');
  }
  await loadOwnedCourse(section.courseId, req.user);
  await section.destroy(); // cascades its lessons
  res.status(200).json({ message: 'Section deleted successfully' });
};
