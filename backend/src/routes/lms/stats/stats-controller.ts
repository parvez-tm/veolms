import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Course } from '../course/course-model';
import { Enrollment } from '../enrollment/enrollment-model';
import { Payment } from '../payment/payment-model';
import { LessonProgress } from '../progress/lesson-progress-model';
import { User } from '../../control/user/user-model';

/**
 * Aggregate dashboard statistics. Admins see platform-wide numbers; instructors
 * see numbers scoped to the courses they own.
 */
export const getOverviewStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const isAdmin = req.user!.roleName === 'Admin';
  const courseWhere = isAdmin ? {} : { instructorId: req.user!.id };

  const [totalCourses, publishedCourses] = await Promise.all([
    Course.count({ where: courseWhere }),
    Course.count({ where: { ...courseWhere, status: 'published' } }),
  ]);

  // Restrict enrollment/payment/activity aggregates to the in-scope courses.
  let courseIdFilter: Record<string, unknown> = {};
  if (!isAdmin) {
    const owned = (await Course.findAll({
      where: courseWhere,
      attributes: ['id'],
      raw: true,
    })) as unknown as Array<{ id: number }>;
    courseIdFilter = { courseId: { [Op.in]: owned.map((c) => c.id) } };
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalEnrollments,
    totalStudents,
    revenue,
    payingStudents,
    activeUsers,
    registeredUsers,
  ] = await Promise.all([
    Enrollment.count({ where: courseIdFilter }),
    Enrollment.count({ where: courseIdFilter, distinct: true, col: 'userId' }),
    Payment.sum('amount', { where: { ...courseIdFilter, status: 'paid' } }),
    Payment.count({
      where: { ...courseIdFilter, status: 'paid' },
      distinct: true,
      col: 'userId',
    }),
    LessonProgress.count({
      where: { ...courseIdFilter, updatedAt: { [Op.gte]: since } },
      distinct: true,
      col: 'userId',
    }),
    isAdmin ? User.count() : Promise.resolve(undefined),
  ]);

  res.status(200).json({
    data: {
      totalCourses,
      publishedCourses,
      draftCourses: totalCourses - publishedCourses,
      totalEnrollments,
      totalStudents, // distinct enrolled learners
      payingStudents,
      revenue: Number(revenue) || 0, // paise
      activeUsers, // distinct learners active in the last 30 days
      registeredUsers, // platform-wide users (admin only)
    },
    message: 'Stats fetched',
  });
};
