import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { CoursesPage } from '@/pages/CoursesPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { TeachPage } from '@/pages/TeachPage'
import { MyLearningPage } from '@/pages/MyLearningPage'
import { LearnPage } from '@/pages/LearnPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminCoursesPage } from '@/pages/admin/AdminCoursesPage'
import { AdminSalesPage } from '@/pages/admin/AdminSalesPage'
import { NewCoursePage } from '@/pages/admin/NewCoursePage'
import { CourseManagePage } from '@/pages/admin/CourseManagePage'
import { NotFoundPage, ForbiddenPage } from '@/pages/NotFoundPage'

function App() {
  return (
    <Routes>
      {/* Public + student (with site chrome) */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/teach" element={<TeachPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/my-learning" element={<MyLearningPage />} />
          <Route path="/learn/:courseId" element={<LearnPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin / Instructor workspace (its own chrome) */}
      <Route element={<ProtectedRoute roles={['Admin', 'Instructor']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="courses/new" element={<NewCoursePage />} />
          <Route path="courses/:id" element={<CourseManagePage />} />
          <Route path="sales" element={<AdminSalesPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
