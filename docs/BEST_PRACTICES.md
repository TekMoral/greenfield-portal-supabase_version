# 📘 Project Best Practices

## 1. Project Purpose
Greenfield School Portal is a comprehensive school management system built for private secondary schools. It provides role-based access for admins, teachers, and students to manage academic and administrative operations including student enrollment, class management, exam results, news/events, and reporting. The system uses React with Supabase as the backend for authentication, database, and file storage.

## 2. Project Structure
```
src/
├── components/          # Reusable UI components organized by feature
│   ├── common/         # Shared components (Header, Sidebar, ProfileImage)
│   ├── forms/          # Form components (StudentForm, etc.)
│   ├── students/       # Student-specific components (StudentTable)
│   ├── teachers/       # Teacher-specific components (TeacherTable)
│   ├── examResults/    # Exam result components (AdminReviewModal)
│   ├── reports/        # Report components (StudentReportModal)
│   └── ui/             # Basic UI components
├── contexts/           # React Context providers (Auth, Toast)
├── hooks/              # Custom React hooks (useAuth, useToast, useReportsData)
├── layouts/            # Layout components (DashboardLayout, StudentLayout, TeacherLayout)
├── lib/                # Library configurations (supabaseClient.js)
├── pages/              # Page components organized by role/feature
│   ├── dashboard/      # Admin dashboard pages
│   ├── student/        # Student-specific pages
│   ├── academics/      # Academic information pages
│   └── dashboard/teacher/ # Teacher-specific pages
├── routes/             # Routing configuration (AppRouter.jsx)
├── services/           # API service layers
│   └── supabase/       # Supabase service functions organized by domain
├── utils/              # Utility functions (authDebug, reportUtils, nameUtils)
└── data/               # Static data and constants
```

**Key Directories:**
- `services/supabase/` - Contains domain-specific service modules (studentService, teacherService, etc.)
- `layouts/` - Role-based layout components that wrap page content
- `components/` - Feature-organized reusable components
- `contexts/` - Global state management using React Context

## 3. Test Strategy
**Framework:** No formal testing framework is currently implemented, but the project structure supports adding Jest/React Testing Library.

**Testing Philosophy:**
- Manual testing through development environment
- Debug components in `components/debug/` for development testing
- Test accounts provided for different roles (admin, teacher, student)
- Database connection testing via `testConnection()` helper in supabaseClient

**Recommended Testing Approach:**
- Unit tests for service functions in `services/supabase/`
- Integration tests for form components
- E2E tests for critical user flows (login, student creation, result entry)

## 4. Code Style

### Language-Specific Rules
- **React Hooks:** Extensive use of `useEffect`, `useCallback`, `useState` with proper dependency arrays
- **Async/Await:** Consistent async/await pattern in service functions with try/catch error handling
- **ES6+ Features:** Arrow functions, destructuring, template literals, optional chaining

### Naming Conventions
- **Files:** PascalCase for components (`StudentForm.jsx`), camelCase for utilities (`reportUtils.js`)
- **Components:** PascalCase (`StudentForm`, `DashboardLayout`)
- **Functions:** camelCase (`createStudent`, `getAllStudents`)
- **Variables:** camelCase (`studentData`, `isSubmitting`)
- **Constants:** UPPER_SNAKE_CASE for environment variables (`VITE_SUPABASE_URL`)
- **Service Objects:** camelCase with descriptive names (`studentService`, `classService`)

### Error Handling
- **Service Layer:** Consistent return pattern `{ success: boolean, data?: any, error?: string }`
- **Console Logging:** Structured logging with emojis for visual distinction (✅ success, ❌ error, 🔄 processing)
- **User Feedback:** Toast notifications for user actions, form validation messages
- **Async Operations:** Always wrapped in try/catch with meaningful error messages

### Form Handling
- **React Hook Form:** Used for all forms with validation rules
- **Auto-generation:** Admission numbers and emails auto-generated based on student data
- **Validation:** Client-side validation with async validation for uniqueness checks
- **State Management:** Form state managed separately from component state

## 5. Common Patterns

### Service Layer Pattern
```javascript
export const serviceObject = {
  async createEntity(data) {
    try {
      // Validation
      // Database operation
      // Return standardized response
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
```

### Authentication Context Pattern
- Centralized auth state management via `SupabaseAuthContext`
- Role-based access control with helper functions (`hasRole`, `isAdmin`)
- Automatic profile fetching and session management
- AbortController for canceling async operations

### Component Organization
- Feature-based component organization
- Shared components in `common/` directory
- Role-specific components in dedicated folders
- Layout components for consistent page structure

### Data Fetching Pattern
```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      const result = await service.getData();
      if (result.success) {
        setData(result.data);
      } else {
        console.error('Error:', result.error);
      }
    } catch (error) {
      console.error('Exception:', error);
    }
  };
  fetchData();
}, []);
```

## 6. Do's and Don'ts

### ✅ Do's
- Use the standardized service response format `{ success, data, error }`
- Implement proper loading states and error handling in components
- Use React Hook Form for all form implementations
- Follow the established folder structure for new components
- Use the auth context for role-based access control
- Implement proper cleanup in useEffect hooks (AbortController, unsubscribe)
- Use descriptive console logging with emoji prefixes for debugging
- Validate user inputs both client-side and server-side
- Use lazy loading for route components to improve performance
- Follow the established naming conventions consistently

### ❌ Don'ts
- Don't bypass the service layer for direct Supabase calls in components
- Don't hardcode role checks - use the auth context helper functions
- Don't forget to handle loading and error states in async operations
- Don't create components without proper prop validation
- Don't ignore the established error handling patterns
- Don't mix authentication logic with business logic
- Don't create deeply nested component structures
- Don't forget to implement proper form validation
- Don't use inline styles - prefer Tailwind CSS classes
- Don't create services without proper error handling

## 7. Tools & Dependencies

### Core Dependencies
- **React 19.1.0** - Frontend framework with latest features
- **React Router DOM 7.6.2** - Client-side routing with nested routes
- **Supabase 2.52.1** - Backend-as-a-Service (database, auth, storage)
- **React Hook Form 7.58.1** - Form state management and validation
- **React Hot Toast 2.5.2** - Toast notification system

### Development Tools
- **Vite 7.0.0** - Build tool and development server
- **Tailwind CSS 4.1.10** - Utility-first CSS framework
- **ESLint 9.29.0** - Code linting with React-specific rules
- **PostCSS 8.5.6** - CSS processing

### Project Setup
```bash
npm install          # Install dependencies
npm run dev          # Start development server (localhost:5173)
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Environment Configuration
Required environment variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 8. Other Notes

### Database Integration
- Uses Supabase PostgreSQL with Row Level Security (RLS)
- Service functions handle all database operations
- Automatic user profile creation and management
- File upload integration with Supabase Storage

### Role-Based Access Control
- Three main roles: `admin`, `teacher`, `student`
- `super_admin` role for elevated permissions
- Route protection via `RoleBasedRoute` component
- Context-based role checking throughout the application

### Auto-Generation Features
- Admission numbers generated from surname + sequential number + year
- Email addresses systematically generated using format: `firstlettersurnamefirstnamelastThreeNumberOfAdmissionNumber.schoolname@gmail.com`
- Profile images handled via Supabase Storage
- Default passwords set to admission numbers
- Email generation utility in `src/utils/emailGenerator.js` with validation and alternatives

### Performance Considerations
- Lazy loading for all route components
- AbortController for canceling async operations
- Optimized Supabase client configuration
- Custom localStorage wrapper with error handling

### Development Workflow
- Use debug components for testing new features
- Test with provided default accounts for each role
- Follow the established service → component → page pattern
- Implement proper error boundaries for production stability

### LLM Code Generation Guidelines
When generating new code for this repository:
1. Follow the established service layer pattern for data operations
2. Use the auth context for user state and role checking
3. Implement proper form validation using React Hook Form
4. Follow the component organization structure
5. Use the standardized error handling and logging patterns
6. Ensure responsive design with Tailwind CSS
7. Implement proper loading states and user feedback
8. Follow the established naming conventions and file structure