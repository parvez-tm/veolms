import { Router } from 'express';
import userRouter from './routes/control/user/user-api';
import roleRouter from './routes/control/role/role-api';
import menuRouter from './routes/control/menu/menu-api';
import permissionRouter from './routes/control/permission/permission-api';
import categoryRouter from './routes/lms/category/category-api';
import courseRouter from './routes/lms/course/course-api';
import sectionRouter from './routes/lms/section/section-api';
import lessonRouter from './routes/lms/lesson/lesson-api';
import enrollmentRouter from './routes/lms/enrollment/enrollment-api';
import progressRouter from './routes/lms/progress/progress-api';
import mediaRouter from './routes/lms/media/media-api';
import paymentRouter from './routes/lms/payment/payment-api';

const router = Router();

// Access control (admin panel)
router.use('/user', userRouter);
router.use('/role', roleRouter);
router.use('/menu', menuRouter);
router.use('/permission', permissionRouter);

// LMS domain
router.use('/category', categoryRouter);
router.use('/course', courseRouter);
router.use('/section', sectionRouter);
router.use('/lesson', lessonRouter);
router.use('/enrollment', enrollmentRouter);
router.use('/progress', progressRouter);
router.use('/media', mediaRouter);
router.use('/payment', paymentRouter);

router.get('/', (_req, res) => {
  res.send('VeoLMS API');
});

export default router;
