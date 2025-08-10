# Multi-User Project Management App

A modern web application for managing projects with multiple users, built with Next.js, TypeScript, Tailwind CSS, and Prisma.

This project has deployed to https://pm.project.rozag.my.id

## Features

### 🔐 Authentication
- User registration and login
- Secure password hashing with bcrypt
- JWT-based session management

### 📋 Project Management
- Create and manage projects
- Invite team members to projects
- Role-based access control (owner/member)
- Project settings and member management

### ✅ Task Management
- Create tasks with title, description, and status
- Kanban-style board with drag-and-drop (planned)
- Task assignment to team members
- Status tracking (todo, in-progress, done)

### 👥 Team Collaboration
- Invite users by email
- View project members and their roles
- Real-time updates (planned)

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Validation**: Zod

## Database Schema

### Users
- `id`: Unique identifier
- `email`: User email (unique)
- `name`: User's full name
- `password`: Hashed password
- `createdAt`, `updatedAt`: Timestamps

### Projects
- `id`: Unique identifier
- `name`: Project name
- `description`: Optional project description
- `ownerId`: Reference to project owner
- `createdAt`, `updatedAt`: Timestamps

### ProjectMembers
- `id`: Unique identifier
- `userId`: Reference to user
- `projectId`: Reference to project
- `role`: Member role (owner/member)
- `createdAt`, `updatedAt`: Timestamps

### Tasks
- `id`: Unique identifier
- `title`: Task title
- `description`: Optional task description
- `status`: Task status (todo/in-progress/done)
- `projectId`: Reference to project
- `assignedToId`: Reference to assigned user
- `createdAt`, `updatedAt`: Timestamps

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-management-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/project_management_db"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # JWT
   JWT_SECRET="your-jwt-secret-here"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev
   
   # (Optional) Seed the database
   npx prisma db seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/signin` - User login
- `GET /api/auth/signout` - User logout

### Projects
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Tasks
- `GET /api/projects/[id]/tasks` - Get project tasks
- `POST /api/projects/[id]/tasks` - Create new task
- `PUT /api/projects/[id]/tasks/[taskId]` - Update task
- `DELETE /api/projects/[id]/tasks/[taskId]` - Delete task

### Members
- `GET /api/projects/[id]/members` - Get project members
- `POST /api/projects/[id]/members` - Invite member
- `DELETE /api/projects/[id]/members/[memberId]` - Remove member

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/
│   │   │   └── [...nextauth]/
│   │   └── projects/
│   │       ├── route.ts
│   │       └── [id]/
│   │           ├── route.ts
│   │           ├── tasks/
│   │           └── members/
│   ├── dashboard/
│   ├── login/
│   ├── register/
│   └── projects/
│       └── [id]/
│           ├── page.tsx
│           └── settings/
├── lib/
│   ├── auth.ts
│   └── prisma.ts
└── components/
    └── (shared components)
```

## Features Roadmap

### ✅ Completed
- [x] User authentication (register/login)
- [x] Project creation and management
- [x] Task creation and status management
- [x] Member invitation system
- [x] Kanban board interface
- [x] Project settings page

### 🚧 In Progress
- [ ] Drag and drop task movement
- [ ] Real-time updates with WebSocket
- [ ] File attachments for tasks
- [ ] Task comments system

### 📋 Planned
- [ ] Email notifications
- [ ] Project templates
- [ ] Time tracking
- [ ] Advanced reporting
- [ ] Mobile app

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email dev.rozag@gmail.com or create an issue in the repository.

---

**Note**: This is a demo application for the Fullstack Sellerpintar submission. For production use, additional security measures and testing should be implemented.
