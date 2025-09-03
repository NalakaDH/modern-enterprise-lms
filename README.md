# Modern Enterprise Learning Management System

A comprehensive, full-stack web application built for undergraduate students (3rd/4th Year - IT, SE, CS) to demonstrate modern enterprise-level development practices.

## 🚀 Technology Stack

- **Backend:** Node.js with Express.js
- **Frontend:** React.js with modern UI components
- **Database:** MySQL
- **Authentication:** JWT-based with Role-Based Access Control (RBAC)
- **Styling:** Tailwind CSS with modern glassmorphism design
- **State Management:** React Query for server state management

## ✨ Features

### 👨‍💼 Admin Functionalities
- **User Management:** Create, update, and delete user accounts for students, instructors, and admins
- **Course Management:** Create, edit, and delete course offerings with detailed information
- **Enrollment Management:** Oversee student registrations and manual enrollment
- **System Analytics:** Comprehensive dashboard with user statistics and system overview
- **Role-based Access Control:** Define and enforce permissions for different user roles

### 👨‍🏫 Instructor Functionalities
- **Course Dashboard:** View and manage assigned courses with detailed statistics
- **Content Management:** Upload and manage course materials (videos, PDFs, documents)
- **Assignment Management:** Create, publish, and manage assignments and quizzes
- **Grading System:** Grade student submissions with detailed feedback
- **Student Progress Tracking:** Monitor individual and class-wide progress
- **Submission Management:** View and grade student assignment submissions

### 🎓 Student Functionalities
- **Course Catalog:** Browse and enroll in available courses
- **My Courses:** Access enrolled courses with materials and assignments
- **Assignment Submission:** Submit assignments with file uploads
- **Grade Viewing:** Check grades and detailed instructor feedback
- **Progress Tracking:** View learning progress and upcoming deadlines
- **Dashboard:** Comprehensive overview of academic activities

## 🎨 Modern UI/UX Features

- **Glassmorphism Design:** Modern translucent elements with backdrop blur
- **Gradient Accents:** Beautiful blue-to-purple gradient themes
- **Smooth Animations:** Hover effects and smooth transitions
- **Responsive Design:** Mobile-first approach with excellent mobile experience
- **Enhanced Typography:** Clear visual hierarchy and improved readability
- **Interactive Elements:** Modern buttons, forms, and navigation components

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=enterprise_app
JWT_SECRET=your_jwt_secret_key
```

4. Set up the MySQL database:
```sql
CREATE DATABASE enterprise_app;
```

5. Start the backend server:
```bash
npm start
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🔐 Demo Credentials

### Admin Account
- **Email:** admin@university.edu
- **Password:** password

### Instructor Account
- **Email:** instructor@university.edu
- **Password:** password

### Student Account
- **Email:** student@university.edu
- **Password:** password

## 📁 Project Structure

```
Modern Enterprise Application/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── validation.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── admin.js
│   │   │   ├── instructor.js
│   │   │   ├── student.js
│   │   │   ├── users.js
│   │   │   └── courses.js
│   │   └── app.js
│   ├── uploads/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.js
│   │   │   ├── Sidebar.js
│   │   │   └── Header.js
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── instructor/
│   │   │   ├── student/
│   │   │   └── Login.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   └── App.js
│   └── package.json
└── README.md
```

## 🚀 Key Features Implemented

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Instructor, Student)
- Protected routes and middleware
- Secure password handling

### File Management
- Course material uploads
- Assignment file submissions
- Multer integration for file handling
- File type validation and size limits

### Database Design
- Normalized database schema
- User management with roles
- Course and enrollment system
- Assignment and grading system
- Student results tracking

### Modern Frontend
- React functional components with hooks
- React Query for server state management
- Modern UI with Tailwind CSS
- Responsive design
- Smooth animations and transitions

## 🎯 Learning Objectives Achieved

This project demonstrates:
- Modern full-stack development practices
- RESTful API design and implementation
- Database design and management
- Authentication and authorization
- File upload and management
- Modern UI/UX design principles
- Responsive web development
- State management in React applications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is created for educational purposes as part of an undergraduate assignment.

## 👨‍💻 Author

Created for Modern Enterprise Application Development course - Undergraduate Level (3rd/4th Year IT/SE/CS)

---

**Note:** This application is built for educational purposes and demonstrates modern web development practices using current technologies instead of traditional Java EE technologies.