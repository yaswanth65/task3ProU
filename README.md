# 🚀 TaskFlow - Modern Task Management SaaS

<div align="center">
  <img src="frontend/public/logo.svg" alt="TaskFlow Logo" width="120" />
  
  **A comprehensive task management platform with real-time collaboration**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47a248.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Features

### 📋 Task Management

- **Kanban Board** - Drag-and-drop task organization
- **List View** - Traditional table-style task management
- **Task Details** - Rich descriptions, attachments, comments
- **Priority Levels** - Low, Medium, High, Urgent
- **Tags & Labels** - Organize tasks with custom tags
- **Due Dates** - Track deadlines with calendar integration

### 👥 Team Collaboration

- **Role-Based Access** - Manager and User roles
- **Team Dashboard** - View all team members
- **Task Assignment** - Assign tasks to team members
- **Activity Tracking** - See who did what and when

### 💬 Real-Time Messaging

- **Direct Messages** - One-on-one conversations
- **Group Chats** - Team channels for discussions
- **Real-Time Updates** - Instant message delivery via WebSocket
- **Unread Indicators** - Never miss important messages

### 📅 Calendar Integration

- **Monthly View** - See all tasks in calendar format
- **Due Date Visualization** - Color-coded task deadlines
- **Quick Add** - Create tasks directly from calendar

### 📊 Reports & Analytics (Manager Only)

- **Completion Rates** - Track team productivity
- **Task Distribution** - Charts by status and priority
- **Top Performers** - Identify high achievers
- **Export Options** - Download reports as PDF or CSV

### 🎨 Modern UI/UX

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Mode Ready** - Theme switching support
- **Smooth Animations** - Framer Motion transitions
- **Accessible** - WCAG compliant components

---

## 🛠️ Tech Stack

### Frontend

- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **React Router v6** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **dnd-kit** - Drag and drop functionality
- **Recharts** - Beautiful charts and graphs
- **Framer Motion** - Smooth animations
- **Headless UI** - Accessible UI components
- **date-fns** - Date manipulation

### Backend

- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **TypeScript** - Type-safe backend
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - Secure authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Express Validator** - Request validation

### DevOps

- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Production web server
- **Render** - Cloud deployment platform

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/taskflow.git
   cd taskflow
   ```

2. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   ```

3. **Set up environment variables**

   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your values

   # Frontend (optional - has defaults)
   cp frontend/.env.example frontend/.env
   ```

4. **Start MongoDB** (if not using Docker)

   ```bash
   mongod
   ```

5. **Seed the database**

   ```bash
   cd backend && npm run seed
   ```

6. **Start development servers**

   ```bash
   # From root directory
   npm run dev
   ```

7. **Open the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Using Docker

1. **Development mode**

   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Production mode**
   ```bash
   docker-compose up --build
   ```

---

## 🔐 Demo Credentials

Use these accounts to explore the application:

| Role        | Email                 | Password    |
| ----------- | --------------------- | ----------- |
| **Manager** | manager@taskflow.demo | Manager123! |
| **User**    | user@taskflow.demo    | User1234!   |

### Additional Demo Accounts

- alice.johnson@taskflow.demo / Alice123!
- bob.smith@taskflow.demo / BobSmith1!
- carol.williams@taskflow.demo / Carol123!

---

## 📁 Project Structure

```
taskflow/
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── config/          # Database & app configuration
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── socket/          # WebSocket handlers
│   │   ├── scripts/         # Database seeding
│   │   └── server.ts        # Application entry point
│   ├── uploads/             # File upload directory
│   ├── Dockerfile           # Production container
│   └── Dockerfile.dev       # Development container
│
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/          # Base components (Button, Input, etc.)
│   │   │   └── tasks/       # Task-related components
│   │   ├── pages/           # Route pages
│   │   ├── stores/          # Zustand state stores
│   │   ├── lib/             # Utilities, API client, socket
│   │   ├── App.tsx          # Main application component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   ├── Dockerfile           # Production container
│   └── Dockerfile.dev       # Development container
│
├── docker-compose.yml        # Production orchestration
├── docker-compose.dev.yml    # Development orchestration
└── README.md                 # This file
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint             | Description        |
| ------ | -------------------- | ------------------ |
| POST   | `/api/auth/register` | Create new account |
| POST   | `/api/auth/login`    | Sign in            |
| POST   | `/api/auth/logout`   | Sign out           |
| GET    | `/api/auth/me`       | Get current user   |

### Tasks

| Method | Endpoint                  | Description      |
| ------ | ------------------------- | ---------------- |
| GET    | `/api/tasks`              | List all tasks   |
| POST   | `/api/tasks`              | Create task      |
| GET    | `/api/tasks/:id`          | Get task details |
| PUT    | `/api/tasks/:id`          | Update task      |
| DELETE | `/api/tasks/:id`          | Delete task      |
| POST   | `/api/tasks/:id/comments` | Add comment      |

### Messages

| Method | Endpoint                          | Description         |
| ------ | --------------------------------- | ------------------- |
| GET    | `/api/messages/conversations`     | List conversations  |
| POST   | `/api/messages/conversations`     | Create conversation |
| GET    | `/api/messages/conversations/:id` | Get messages        |
| POST   | `/api/messages/conversations/:id` | Send message        |

### Users

| Method | Endpoint         | Description      |
| ------ | ---------------- | ---------------- |
| GET    | `/api/users`     | List all users   |
| GET    | `/api/users/:id` | Get user profile |
| PUT    | `/api/users/me`  | Update profile   |

### Reports (Manager only)

| Method | Endpoint                | Description        |
| ------ | ----------------------- | ------------------ |
| GET    | `/api/reports/overview` | Get analytics data |
| GET    | `/api/reports/export`   | Export report      |

---

## 🌐 Deployment

### Deploy to Render

1. **Create a new Web Service** for the backend

   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Environment Variables: Add all from `.env`

2. **Create a Static Site** for the frontend

   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`
   - Environment Variables: Add API URL

3. **Create a MongoDB database** on MongoDB Atlas
   - Add connection string to backend environment

### Environment Variables

#### Backend

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-production-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend.onrender.com
```

#### Frontend

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

---

## 📝 Scripts

### Root

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both packages for production
- `npm run lint` - Lint all files

### Backend

- `npm run dev` - Start with hot reload (nodemon + ts-node)
- `npm run build` - Compile TypeScript
- `npm start` - Start production server
- `npm run seed` - Seed database with demo data

### Frontend

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Heroicons](https://heroicons.com/) - Beautiful hand-crafted SVG icons
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Headless UI](https://headlessui.com/) - Unstyled, accessible UI components

---

<div align="center">
  Made with ❤️ by TaskFlow Team
</div>
