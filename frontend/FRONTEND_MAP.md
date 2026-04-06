# Frontend import/call map (`frontend/`)

This is a **static map of local imports** (who is used by whom) for `frontend/src/`.  
Entry flow is `src/main.jsx` → `src/App.jsx` → route pages.

## Entry points

- `src/main.jsx`
  - **renders**: `src/App.jsx`
  - **wraps providers**:
    - `src/context/ThemeContext.jsx` (`ThemeProvider`)
    - `src/components/common/Toast.jsx` (`ToastProvider`)
    - `src/context/AuthContext.jsx` (`AuthProvider`)
  - **router**: `BrowserRouter` (react-router)

- `src/App.jsx`
  - **uses**: `src/context/AuthContext.jsx` (`useAuth`)
  - **defines**: `ProtectedRoute` (role-gated route wrapper)
  - **routes to pages**:
    - `/` → `src/pages/LandingPage.jsx`
    - `/login` → `src/pages/Login.jsx`
    - `/change-password` → `src/pages/ChangePassword.jsx`
    - `/settings` → `src/pages/Settings.jsx` (protected: admin, school)
    - `/student/login` → `src/pages/student/StudentLogin.jsx`
    - `/student` → `src/pages/student/StudentAssessment.jsx` (protected: student)
    - `/student/thankyou` → `src/pages/student/ThankYou.jsx`
    - `/student/incomplete` → `src/pages/student/StudentIncomplete.jsx`
    - `/admin` → `src/pages/admin/AdminDashboard.jsx` (protected: admin)
    - `/admin/schools` → `src/pages/admin/SchoolManagement.jsx` (protected: admin)
    - `/admin/assessments` → `src/pages/admin/AssessmentManagement.jsx` (protected: admin)
    - `/admin/analytics` → `src/pages/admin/Analytics.jsx` (protected: admin)
    - `/admin/tickets` → `src/pages/admin/AdminTickets.jsx` (protected: admin)
    - `/admin/admins` → `src/pages/admin/AdminManagement.jsx` (protected: admin)
    - `/school` → `src/pages/school/SchoolDashboard.jsx` (protected: school)
    - `/school/students` → `src/pages/school/StudentManagement.jsx` (protected: school)
    - `/school/analytics` → `src/pages/school/SchoolAnalytics.jsx` (protected: school)
    - `/school/branches` → `src/pages/school/SchoolBranches.jsx` (protected: school)
    - `/school/support` → `src/pages/school/SchoolSupport.jsx` (protected: school)
    - `/preview/assessment/:assessmentId` → `src/pages/student/StudentAssessment.jsx` (protected: admin, school; `previewMode`)

## Cross-cutting shared modules

- `src/services/api.js`
  - Axios instance used by most pages
  - Adds auth token via request interceptor
  - On 401 clears auth storage and redirects to `/login`

- `src/context/AuthContext.jsx`
  - **imports**: `src/services/api.js`
  - Exposes: `AuthProvider`, `useAuth` (login/logout/updateUser + role helpers)

- `src/context/ThemeContext.jsx`
  - Exposes: `ThemeProvider`, `useTheme`

- `src/components/common/Toast.jsx`
  - Exposes: `ToastProvider`, `useToast`

## Layout backbone (shared UI shell)

- `src/components/common/Layout.jsx`
  - **imports**:
    - `src/components/common/Sidebar.jsx`
    - `src/components/common/Header.jsx`
    - `src/components/common/MobileNav.jsx`
  - Used by most **admin**/**school** pages

- `src/components/common/Sidebar.jsx`
  - **uses**: `useAuth` (`src/context/AuthContext.jsx`), `useTheme` (`src/context/ThemeContext.jsx`)
  - **drives navigation** (menu items) to:
    - admin: `/admin`, `/admin/schools`, `/admin/assessments`, `/admin/analytics`, `/admin/tickets`, `/admin/admins`
    - school: `/school`, `/school/branches` (if super school), `/school/students`, `/school/analytics`, `/school/support`

- `src/components/common/Header.jsx`
  - **uses**: `useAuth`, `useTheme`
  - navigates to `/settings`, `/login` (logout)

- `src/components/common/MobileNav.jsx`
  - **uses**: `useAuth`
  - bottom-nav shortcuts to `/settings` + main dashboards

- `src/components/common/Background3D.jsx`
  - **uses**: `useTheme`
  - imported by several pages for background visuals

- `src/components/common/Pagination.jsx`
  - used by: `src/pages/admin/SchoolManagement.jsx`

## Public / shared pages

- `src/pages/LandingPage.jsx`
  - **imports**: `src/services/api.js`, `src/context/ThemeContext.jsx`, `src/components/common/Background3D.jsx`

- `src/pages/Login.jsx`
  - **imports**: `src/context/AuthContext.jsx`, `src/context/ThemeContext.jsx`, `src/components/common/Background3D.jsx`

- `src/pages/ChangePassword.jsx`
  - **imports**: `src/context/AuthContext.jsx`, `src/context/ThemeContext.jsx`, `src/services/api.js`

- `src/pages/Settings.jsx`
  - **imports**: `src/components/common/Layout.jsx`, `src/context/AuthContext.jsx`, `src/services/api.js`

## Admin pages

- `src/pages/admin/AdminDashboard.jsx`
  - **imports**: `Layout`, `Background3D`, `src/services/api.js`

- `src/pages/admin/SchoolManagement.jsx`
  - **imports**: `Layout`, `Background3D`, `Pagination`, `useToast`, `src/services/api.js`

- `src/pages/admin/AssessmentManagement.jsx`
  - **imports**: `Layout`, `Background3D`, `useToast`, `src/services/api.js`

- `src/pages/admin/Analytics.jsx`
  - **imports**: `Layout`, `src/services/api.js`

- `src/pages/admin/AdminTickets.jsx`
  - **imports**: `Layout`, `Background3D`, `useTheme`, `useAuth`, `useToast`, `src/services/api.js`

- `src/pages/admin/AdminManagement.jsx`
  - **imports**: `Layout`, `Background3D`, `useAuth`, `src/services/api.js`

## School pages

- `src/pages/school/SchoolDashboard.jsx`
  - **imports**: `Layout`, `Background3D`, `useAuth`, `src/services/api.js`

- `src/pages/school/StudentManagement.jsx`
  - **imports**: `Layout`, `useToast`, `src/services/api.js`
  - **imports modal**: `src/pages/school/StudentHistoryModal.jsx` (uses `src/services/api.js`)

- `src/pages/school/SchoolAnalytics.jsx`
  - **imports**: `Layout`, `useAuth`, `src/services/api.js`
  - **imports charts**: `src/components/school/AnalyticsCharts.jsx`

- `src/pages/school/SchoolBranches.jsx`
  - **imports**: `Layout`, `useToast`, `useAuth`, `src/services/api.js`

- `src/pages/school/SchoolSupport.jsx`
  - **imports**: `Layout`, `useTheme`, `useAuth`, `useToast`, `src/services/api.js`

## Present but not routed (currently unused by `src/App.jsx`)

- `src/pages/school/SchoolTests.jsx`
  - **imports**: `Layout`, `useToast`, `src/services/api.js`
  - **note**: `src/pages/school/SchoolDashboard.jsx` has links to `/school/tests`, but there is **no** `/school/tests` route in `src/App.jsx` right now.

## Student pages

- `src/pages/student/StudentLogin.jsx`
  - **imports**: `useAuth`, `useTheme`, `src/services/api.js`, `Background3D`

- `src/pages/student/StudentAssessment.jsx`
  - **imports**: `useAuth`, `useToast`, `src/services/api.js`
  - used by:
    - `/student` (student flow)
    - `/preview/assessment/:assessmentId` (admin/school preview flow)

- `src/pages/student/ThankYou.jsx`
  - **imports**: `useAuth`

- `src/pages/student/StudentIncomplete.jsx`
  - **imports**: `useAuth`, `useTheme`

