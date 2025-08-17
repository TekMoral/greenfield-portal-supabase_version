# 🎓 Greenfield School Portal

A comprehensive, modern school management system built for private secondary schools. This full-featured web portal provides role-based access for administrators, teachers, and students to manage academic and administrative operations including student enrollment, class management, exam results, news/events, and comprehensive reporting.

---

## ✨ Key Features

### 👥 **Role-Based Access Control**
- **Admin/Super Admin**: Complete system management, user creation, class/subject assignment, result approval
- **Teachers**: Class management, exam result entry, assignment creation, student progress tracking
- **Students**: Academic results viewing, assignment submission, profile management, timetable access

### 📊 **Comprehensive Dashboard Analytics**
- Real-time student population and performance metrics
- Staff distribution and assignment tracking
- Academic performance trends and insights
- System activity monitoring and audit logs

### 🎓 **Advanced Student Management**
- **Auto-generated admission numbers** with systematic formatting
- **Automated school email generation** with validation and alternatives
- **Cloudinary-integrated profile image uploads**
- Complete CRUD operations with advanced search and filtering
- Guardian information and contact management

### 👨‍🏫 **Sophisticated Staff & Subject Management**
- **Department-based subject organization** (Core, Junior, Science, Art, Commercial)
- **Teacher-subject-class assignment system** with academic year/term tracking
- **Flexible subject categorization** supporting multi-level education
- **Teacher assignment management** with active/inactive status tracking

### 📝 **Comprehensive Exam & Results System**
- **Multi-component grading** (assignments, tests, exams with configurable weights)
- **Automated grade calculations** with letter grades and GPA
- **Teacher result entry** with validation and approval workflows
- **Student report generation** with comprehensive academic summaries
- **Admin review and approval** system for result publication

### 🔍 **Advanced Search & Filtering**
- **Multi-criteria search** across students, teachers, and classes
- **Pagination and sorting** for large datasets
- **Class-level and department-based filtering**
- **Real-time search suggestions** and autocomplete

### 📰 **News & Events Management**
- **Rich content creation** with image upload support
- **Event scheduling** with registration management
- **Carousel image management** for homepage displays
- **Publication status control** and content moderation

### 🔒 **Security & Audit Features**
- **Row Level Security (RLS)** with Supabase policies
- **Comprehensive audit logging** for all system actions
- **Role-based permissions** with granular access control
- **Session management** and automatic cleanup

---

## 🛠️ **Technology Stack**

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React | 19.1.0 |
| **Build Tool** | Vite | 7.0.0 |
| **Styling** | Tailwind CSS | 4.1.10 |
| **Backend** | Supabase | 2.52.1 |
| **Routing** | React Router DOM | 7.6.2 |
| **Forms** | React Hook Form | 7.58.1 |
| **Notifications** | React Hot Toast | 2.5.2 |
| **State Management** | React Context | Built-in |
| **Database** | PostgreSQL | (via Supabase) |
| **Authentication** | Supabase Auth | Built-in |
| **File Storage** | Supabase Storage + Cloudinary | Hybrid |

---

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Cloudinary account (for image uploads)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd school-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

   Configure your environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```

4. **Database Setup**
   - Import the SQL schema from `sql-private/supabase-consolidated-clean-schema.sql`
   - Apply security policies from `sql-private/supabase-security-policies-final.sql`
   - Configure storage buckets using `sql-private/supabase-storage-setup-fixed.sql`

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:5173
   - Create your first admin account or use test credentials

---

## 📁 **Project Structure**

```
school-portal/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── admin/              # Admin-specific components
│   │   ├── common/             # Shared components (ProfileImage, ImageCarousel)
│   │   ├── debug/              # Development/testing components
│   │   ├── examResults/        # Exam result management components
│   │   ├── forms/              # Form components (StudentForm, TeacherForm, etc.)
│   │   ├── news/               # News and events components
│   │   ├── notifications/      # Notification system components
│   │   ├── reports/            # Report generation components
│   │   ├── results/            # Result display components
│   │   ├── shared/             # Shared utility components
│   │   ├── students/           # Student-specific components
│   │   ├── teachers/           # Teacher-specific components
│   │   └── ui/                 # Basic UI components
│   ├── contexts/               # React Context providers
│   │   ├── SupabaseAuthContext.jsx  # Authentication context
│   │   └── ToastContext.jsx         # Toast notification context
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.js          # Authentication hook
│   │   ├── useToast.js         # Toast notification hook
│   │   ├── useReportsData.js   # Reports data management
│   │   └── useAuditLog.js      # Audit logging hook
│   ├── layouts/                # Layout components
│   │   ├── DashboardLayout.jsx # Admin dashboard layout
│   │   ├── StudentLayout.jsx   # Student portal layout
│   │   └── TeacherLayout.jsx   # Teacher portal layout
│   ├── lib/                    # Library configurations
│   │   └── supabaseClient.js   # Supabase client setup
│   ├── pages/                  # Page components
│   │   ├── academics/          # Academic information pages
│   │   ├── admin/              # Admin-specific pages
│   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── teacher/        # Teacher dashboard pages
│   │   │   └── classes/        # Class management pages
│   │   ├── debug/              # Development/testing pages
│   │   └── student/            # Student portal pages
│   ├── routes/                 # Routing configuration
│   │   └── AppRouter.jsx       # Main router component
│   ├── services/               # API service layers
│   │   └── supabase/           # Supabase service functions
│   │       ├── adminService.js      # Admin operations
│   │       ├── studentService.js    # Student management
│   │       ├── teacherService.js    # Teacher management
│   │       ├── classService.js      # Class operations
│   │       ├── subjectService.js    # Subject management
│   │       ├── examService.js       # Exam management
│   │       ├── resultService.js     # Result processing
│   │       ├── reportService.js     # Report generation
│   │       ├── newsService.js       # News/events management
│   │       ├── uploadService.js     # File upload handling
│   │       └── [15+ other services] # Comprehensive service layer
│   ├── utils/                  # Utility functions
│   │   ├── emailGenerator.js   # Email generation utilities
│   │   ├── nameUtils.js        # Name processing utilities
│   │   ├── reportUtils.js      # Report processing utilities
│   │   ├── cloudinaryUpload.js # Image upload utilities
│   │   └── [8+ other utilities] # Various helper functions
│   ├── data/                   # Static data and constants
│   └── constants/              # Application constants
├── sql-private/                # Database schema and policies
│   ├── supabase-consolidated-clean-schema.sql
│   ├── supabase-security-policies-final.sql
│   └── supabase-storage-setup-fixed.sql
├── public/                     # Static assets
├── docs/                       # Documentation
│   ├── SUBJECT_SYSTEM_GUIDE.md      # Subject management guide
│   ├── TEACHER_ASSIGNMENT_FLOW.md   # Teacher assignment workflow
│   ├── BEST_PRACTICES.md            # Development best practices
│   └── ENVIRONMENT_SETUP.md         # Environment setup guide
└── [Configuration files]      # Vite, Tailwind, ESLint configs
```

---

## 🔐 **Authentication & Authorization**

### **Authentication System**
- **Supabase Auth** with email/password authentication
- **Role-based access control** (admin, super_admin, teacher, student)
- **Session management** with automatic token refresh
- **Profile creation** with automatic user profile generation

### **Authorization Levels**
- **Super Admin**: Full system access, user role management
- **Admin**: School management, user creation, result approval
- **Teacher**: Class management, result entry, assignment creation
- **Student**: Academic data viewing, assignment submission

### **Security Features**
- **Row Level Security (RLS)** policies in Supabase
- **Role-based route protection** with RoleBasedRoute component
- **Audit logging** for all critical operations
- **Session timeout** and automatic cleanup

---

## 🗄️ **Database Architecture**

### **Core Tables**
- `user_profiles` - Unified user information with role-based fields
- `classes` - Class/grade management with level and category
- `subjects` - Subject management with department organization
- `teacher_assignments` - Teacher-subject-class relationships
- `exams` - Exam scheduling and configuration
- `exam_results` - Student exam results with grading
- `assignments` - Assignment management and tracking
- `grades` - Comprehensive grade calculations
- `student_reports` - Generated academic reports
- `news_events` - News and event management
- `audit_logs` - System activity tracking

### **Advanced Features**
- **Foreign key constraints** for data integrity
- **Automatic timestamp management** with triggers
- **Soft delete functionality** for data preservation
- **Comprehensive indexing** for performance optimization

---

## 🎨 **UI/UX Features**

### **Design System**
- **Responsive design** with mobile-first approach
- **Tailwind CSS** for consistent styling
- **Custom component library** with reusable elements
- **Accessibility compliance** with WCAG guidelines

### **User Experience**
- **Intuitive navigation** with role-based menus
- **Real-time notifications** with toast messages
- **Loading states** and error handling
- **Progressive enhancement** for better performance

---

## 🔧 **Development**

### **Available Scripts**
```bash
npm run dev          # Start development server (localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint code analysis
```

### **Development Standards**
- **ESLint configuration** with React-specific rules
- **Component organization** by feature and role
- **Service layer pattern** for API interactions
- **Custom hooks** for reusable logic
- **Context-based state management**

### **Code Organization**
- **Feature-based component structure**
- **Centralized service layer** in `services/supabase/`
- **Utility functions** for common operations
- **Custom hooks** for stateful logic
- **Layout components** for consistent page structure

---

## 🚀 **Deployment**

### **Production Setup**
1. **Database Configuration**
   - Deploy schema to production Supabase instance
   - Configure RLS policies and storage buckets
   - Set up environment-specific settings

2. **Build and Deploy**
   ```bash
   npm run build
   ```
   Deploy the `dist` folder to your hosting service

3. **Environment Configuration**
   - Configure production environment variables
   - Set up Cloudinary for image uploads
   - Configure email settings for notifications

---

## 📚 **Documentation**

- **[Subject System Guide](SUBJECT_SYSTEM_GUIDE.md)** - Comprehensive subject management documentation
- **[Teacher Assignment Flow](TEACHER_ASSIGNMENT_FLOW.md)** - Teacher assignment workflow guide
- **[Best Practices](BEST_PRACTICES.md)** - Development guidelines and patterns
- **[Environment Setup](ENVIRONMENT_SETUP.md)** - Detailed setup instructions

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the established code patterns and best practices
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### **Development Guidelines**
- Follow the established service layer pattern
- Use React Hook Form for all form implementations
- Implement proper error handling and loading states
- Follow the component organization structure
- Add appropriate documentation for new features

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 **Support**

For support and questions:
- Create an issue in the repository
- Check the comprehensive documentation
- Review the best practices guide
- Contact the development team

---

## 🎯 **Roadmap**

### **Phase 1 (Current)**
- [x] Core school management functionality
- [x] Role-based access control
- [x] Student and teacher management
- [x] Exam and result management
- [x] News and events system

### **Phase 2 (Planned)**
- [ ] Advanced analytics and reporting
- [ ] Mobile application development
- [ ] Multi-language support
- [ ] Advanced notification system
- [ ] Integration with external systems

### **Phase 3 (Future)**
- [ ] AI-powered insights and recommendations
- [ ] Advanced scheduling and timetabling
- [ ] Parent portal integration
- [ ] Financial management module

---

**Built with ❤️ for educational excellence**
