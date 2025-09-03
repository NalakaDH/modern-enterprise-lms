# Modern Enterprise Application - Setup Guide

This guide will help you set up and run the Modern Enterprise Application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download here](https://dev.mysql.com/downloads/)
- **Git** - [Download here](https://git-scm.com/)

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd modern-enterprise-app
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all dependencies (backend + frontend)
npm run install-all
```

### 3. Database Setup

1. **Start MySQL service** on your machine
2. **Create a new database**:
   ```sql
   CREATE DATABASE enterprise_app;
   ```
3. **Run the schema**:
   ```bash
   # Import the database schema
   mysql -u root -p enterprise_app < database/schema.sql
   ```

### 4. Environment Configuration

#### Backend Environment
1. Copy the example environment file:
   ```bash
   cd backend
   cp env.example .env
   ```

2. Edit `.env` with your database credentials:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=enterprise_app
   DB_USER=root
   DB_PASSWORD=your_mysql_password

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   JWT_EXPIRES_IN=7d

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

#### Frontend Environment
1. Create a `.env` file in the frontend directory:
   ```bash
   cd frontend
   touch .env
   ```

2. Add the following content:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

### 5. Start the Application

#### Option 1: Start Both Servers (Recommended)
```bash
# From the root directory
npm run dev
```

This will start both the backend (port 5000) and frontend (port 3000) servers simultaneously.

#### Option 2: Start Servers Separately
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Default Login Credentials

The application comes with a default admin account:

- **Email**: admin@university.edu
- **Password**: admin123

## Project Structure

```
modern-enterprise-app/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   └── utils/          # Utility functions
│   ├── config/             # Configuration files
│   └── package.json
├── frontend/               # React.js frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── context/       # React context
│   │   └── utils/         # Utility functions
│   └── package.json
├── database/              # Database scripts
│   └── schema.sql
└── README.md
```

## Available Scripts

### Root Level
- `npm run dev` - Start both backend and frontend in development mode
- `npm run install-all` - Install dependencies for all projects
- `npm run build` - Build the frontend for production
- `npm start` - Start the production server

### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## Features Implemented

### ✅ Completed Features

#### Backend
- ✅ JWT-based authentication with role-based access control
- ✅ User management (CRUD operations)
- ✅ Course management system
- ✅ Enrollment system
- ✅ Assessment and grading system
- ✅ Admin dashboard APIs
- ✅ Instructor dashboard APIs
- ✅ Student dashboard APIs
- ✅ Database schema with proper relationships
- ✅ Input validation and error handling
- ✅ Security middleware (helmet, rate limiting, CORS)

#### Frontend
- ✅ Modern React.js application with hooks
- ✅ Responsive design with Tailwind CSS
- ✅ Role-based routing and navigation
- ✅ Authentication context and protected routes
- ✅ Admin dashboard with statistics
- ✅ Instructor dashboard with course management
- ✅ Student dashboard with course overview
- ✅ Profile management
- ✅ Toast notifications
- ✅ Loading states and error handling

### 🚧 Features in Development

The following features have placeholder pages and are ready for implementation:

- User Management (Admin)
- Course Management (Admin)
- System Settings (Admin)
- Course Management (Instructor)
- Gradebook (Instructor)
- My Courses (Student)
- Course Catalog (Student)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/auth/verify` - Verify JWT token

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create course (instructor/admin)
- `PUT /api/courses/:id` - Update course (instructor/admin)
- `DELETE /api/courses/:id` - Delete course (instructor/admin)

### Enrollments
- `GET /api/enrollments` - Get all enrollments (admin only)
- `POST /api/enrollments` - Enroll student in course
- `DELETE /api/enrollments/:id` - Drop student from course

### Results
- `GET /api/results` - Get all results
- `POST /api/results/submit` - Submit assessment (student)
- `PUT /api/results/:id/grade` - Grade assessment (instructor)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MySQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **Port Already in Use**
   - Change ports in `.env` files
   - Kill processes using the ports

3. **Module Not Found Errors**
   - Run `npm run install-all` to install all dependencies
   - Clear node_modules and reinstall if needed

4. **CORS Errors**
   - Ensure frontend URL is correct in backend `.env`
   - Check that both servers are running

### Getting Help

If you encounter issues:

1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check that MySQL is running and accessible

## Development Notes

### Adding New Features

1. **Backend**: Add routes in `backend/src/routes/`
2. **Frontend**: Add pages in `frontend/src/pages/`
3. **Database**: Update schema in `database/schema.sql`

### Code Style

- Use ES6+ features
- Follow React hooks patterns
- Use async/await for API calls
- Implement proper error handling
- Add loading states for better UX

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in backend `.env`
2. Run `npm run build` in frontend directory
3. Use a process manager like PM2 for the backend
4. Serve frontend build files with a web server
5. Use a production database
6. Set up SSL certificates
7. Configure proper security headers

## License

This project is created for educational purposes for undergraduate students in IT, SE, and CS programs.
