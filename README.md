# 🎓 Greenfield School Portal

A modern, powerful, and intuitive school management system built for private secondary schools. Greenfield is a full-featured web portal that empowers admins, teachers, and students with seamless access to core academic and administrative tools — all in one place.

---

## ✨ Features

### 👥 Role-Based Access
- **Admin**: Manage admissions, staff, students, classes, subjects, and results.
- **Staff/Teachers**: Upload results, manage classes, assignments, and reports.
- **Students**: View academic results, attendance, assignments, and profile.

### 📊 Dashboard Analytics
- Real-time insights into student population, performance, and staff distribution.

### 🎓 Student Management
- Auto-generated **admission numbers** and school **email accounts**.
- Profile picture uploads with direct storage integration.
- CRUD operations for student records.

### 👨‍🏫 Staff & Subject Management
- Assign teachers to specific classes and subjects.
- Manage departments (Science, Art, Commercial).
- Handle junior and senior subject segmentation.

### 📝 Exams & Reports
- Teachers input scores per subject.
- Automated calculations and final report compilation.
- Admins approve and publish results.

### 🔍 Smart Filtering & Search
- Quick search, pagination, and class-level filtering for students and classes.

### 📰 News & Events Management
- Create and manage school news and announcements.
- Event scheduling and management.
- File upload support for news images.

---

## 🛠️ Tech Stack

| Layer        | Technology           |
|--------------|----------------------|
| **Frontend** | React + Vite         |
| **Styling**  | Tailwind CSS         |
| **Backend**  | Supabase (Database, Auth, Storage) |
| **Routing**  | React Router         |
| **State**    | React Context        |
| **UI**       | Custom Components    |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

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

   Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:5173
   - Use the test credentials or create new accounts

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Common components (Header, Sidebar, etc.)
│   ├── forms/          # Form components
│   ├── debug/          # Development/debug components
│   └── ui/             # Basic UI components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── lib/                # Library configurations (Supabase)
├── pages/              # Page components
│   ├── dashboard/      # Dashboard pages
│   ├── student/        # Student-specific pages
│   └── debug/          # Development pages
├── services/           # API service layers
│   └── supabase/       # Supabase service functions
├── utils/              # Utility functions
└── data/               # Static data and constants
```

---

## 🔐 Authentication & Authorization

The system uses Supabase Auth with role-based access control:

- **Authentication**: Email/password with Supabase Auth
- **Authorization**: Role-based permissions (admin, teacher, student)
- **Security**: Row Level Security (RLS) policies in Supabase

### Default Test Accounts
- **Admin**: admin@school.com / password123
- **Teacher**: teacher@school.com / password123
- **Student**: student@school.com / password123

---

## 🗄️ Database Schema

The application uses Supabase PostgreSQL with the following main tables:

- `user_profiles` - User information and roles
- `classes` - Class/grade information
- `subjects` - Subject management
- `students` - Student-specific data
- `teachers` - Teacher-specific data
- `news_events` - News and events
- `exam_results` - Student exam results
- `assignments` - Assignment management

---

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Interactive Components**: Modern UI with smooth animations
- **Accessibility**: WCAG compliant components
- **Performance**: Optimized with React best practices

---

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Style
- ESLint configuration for React
- Prettier for code formatting
- Conventional commit messages

---

## 🚀 Deployment

### Supabase Setup
1. Create a new Supabase project
2. Run the SQL schema files in the Supabase SQL editor
3. Configure Row Level Security policies
4. Set up storage buckets for file uploads

### Production Build
```bash
npm run build
```

Deploy the `dist` folder to your preferred hosting service (Vercel, Netlify, etc.)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `/docs` folder

---

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced reporting features
- [ ] Integration with external systems
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

---

**Built with ❤️ for educational excellence**
