export type RoleName = 'Admin' | 'Instructor' | 'Student'

/** Shape of `data` returned by /user/login and /register (the JWT payload). */
export interface AuthUser {
  id: number
  userName: string
  email: string
  roleId: number
  roleName: RoleName
  lastPermissionUpdate?: string
  // populated when fetched from /user/me
  firstName?: string
  lastName?: string
  avatarUrl?: string | null
}

/** POST /user/login | /register | /become-instructor response. */
export interface LoginResponse {
  token: string
  data: AuthUser
  message?: string
}

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'
export type CourseStatus = 'draft' | 'published'

export interface Category {
  id: number
  name: string
  description?: string | null
}

export interface Instructor {
  id: number
  firstName?: string
  lastName?: string
  userName?: string
}

export interface Course {
  id: number
  title: string
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  thumbnailAssetId?: number | null
  banner?: string | null
  bannerAssetId?: number | null
  price: number // paise
  discountPrice?: number | null // paise
  currency: string
  level: CourseLevel
  language?: string
  tags?: string[]
  learningOutcomes?: string[]
  prerequisites?: string[]
  whoThisIsFor?: string[]
  status: CourseStatus
  categoryId?: number | null
  instructorId: number
  category?: Category | null
  instructor?: Instructor
  sections?: Section[]
  publishedAt?: string | null
  updatedAt?: string | null
  // Aggregates attached by the API (catalog + detail).
  studentCount?: number
  lessonCount?: number
  totalDurationSec?: number
  isEnrolled?: boolean
}

export type LessonType = 'video' | 'text'

export interface LessonResource {
  title: string
  url: string
}

export interface Lesson {
  id: number
  sectionId: number
  courseId: number
  title: string
  description?: string | null
  type: LessonType
  content?: string | null
  videoAssetId?: number | null
  videoDurationSec?: number | null
  resources?: LessonResource[]
  isPreview: boolean
  position: number
}

export interface Section {
  id: number
  courseId: number
  title: string
  position: number
  lessons?: Lesson[]
}

export interface Pagination {
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export interface ListResponse<T> {
  data: T[]
  pagination?: Pagination
  message?: string
}
