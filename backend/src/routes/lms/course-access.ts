import { Course } from './course/course-model';
import { ApiError, JwtPayload } from '../../types/interface';
import { isAdminOrOwner } from '../../middleware/role-middleware';

/**
 * Load a course and assert the user may edit it (its instructor, or an Admin).
 * Used by the course, section, and lesson controllers for authoring actions.
 */
export async function loadOwnedCourse(
  courseId: number | string,
  user?: JwtPayload
): Promise<Course> {
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  if (!isAdminOrOwner(user, course.instructorId)) {
    throw new ApiError(403, 'You can only modify your own courses');
  }
  return course;
}
