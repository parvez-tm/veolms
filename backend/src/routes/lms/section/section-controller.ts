import { Request, Response } from 'express';
import { Section } from './section-model';
import { Lesson } from '../lesson/lesson-model';
import { Course } from '../course/course-model';
import { ApiError } from '../../../types/interface';
import { isAdminOrOwner } from '../../../middleware/role-middleware';
import { loadOwnedCourse } from '../course-access';
import { parseId, bodyId, nonNegInt } from '../../../helpers/parse-id';

export const getSectionsByCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  const courseId = parseId(req.params.courseId, 'courseId');

  // Draft course content is visible only to its instructor or an Admin.
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  if (course.status !== 'published' && !isAdminOrOwner(req.user, course.instructorId)) {
    throw new ApiError(403, 'This course is not available');
  }

  const sections = await Section.findAll({
    where: { courseId },
    order: [
      ['position', 'ASC'],
      [{ model: Lesson, as: 'lessons' }, 'position', 'ASC'],
    ],
    include: [{ model: Lesson, as: 'lessons' }],
  });
  res.status(200).json({ data: sections, message: 'Sections fetched successfully' });
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
