# Bloom - Task and Habit Tracker

Bloom is a full-stack personal growth and productivity application designed to help individuals manage tasks, build sustainable daily habits, and visualize long-term progress in a responsive, gamified workspace.

---

## Overview

Bloom combines agile task workflows with habit development and performance metrics. Built with a modern full-stack architecture, it features real-time progress calculations, level and badge progression, calendar scheduling with Google Calendar synchronization, automated email digests, and fine-grained data export capabilities.

---

## Key Features

### Task Management and Kanban Board
- **Interactive Kanban Board**: Visual workflow stages (To Do, In Progress, Done) powered by drag-and-drop interactions via `@dnd-kit`.
- **Subtasks and Milestones**: Break tasks into granular action items with dynamic completion percentage tracking.
- **Priority and Tagging**: Categorize tasks by urgency (High, Medium, Low) and custom colored tags.
- **Search and Filtering**: Instant client-side filtering by status, priority level, category, and text queries.

### Daily Habit Tracking
- **Habit Streaks and Logs**: Track recurring daily and weekly habits with visual streak counters and completion logs.
- **Frequency Customization**: Set target frequencies and review personal consistency patterns over time.

### Gamification System
- **Experience Points (XP) and Levels**: Earn XP by checking off tasks, finishing subtasks, and logging daily habits.
- **Milestone Badges**: Unlock collectible achievement badges based on completion milestones and habit streaks.

### Calendar and Google Calendar Integration
- **Interactive Calendar View**: View scheduled tasks, due dates, and deadlines across month, week, and day views.
- **Google Calendar Synchronization**: Secure OAuth-based connection to sync deadlines and reminders directly with Google Calendar.

### Analytics and Growth Reports
- **Visual Analytics**: Interactive charts powered by Recharts detailing task completion velocity, category distributions, and weekly productivity patterns.
- **Key Performance Indicators**: Real-time counters for active tasks, completed habits, current streak count, and total earned XP.

### Automated Notifications and Email Digests
- **Scheduled Background Reminders**: Automated cron jobs via `node-cron` and `nodemailer` delivering daily morning task summaries and deadline alerts.

### Data Portability and Customization
- **CSV Data Export**: Export personal tasks and habit history into structured CSV files for offline analysis.
- **Theme Support**: Seamless toggle between light mode and dark mode with persistent user preferences.
- **Profile and Security Management**: Update account details, change passwords, and manage sessions securely.

---

## Technical Stack

### Frontend
- **Framework**: React 19, TypeScript
- **Build Tool**: Vite 6
- **Routing**: React Router 7
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Animations**: Motion (`motion/react`)
- **Drag and Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Data Visualization**: Recharts, D3
- **Icons**: Lucide React
- **Date Utilities**: `date-fns`

### Backend and Persistence
- **Server Runtime**: Node.js, Express
- **ORM**: Prisma ORM v6
- **Database**: PostgreSQL (Neon connection pooling compatible)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs` password hashing
- **Task Scheduling**: `node-cron`
- **Email Delivery**: `nodemailer`
- **Security**: Endpoint rate limiting (`express-rate-limit`), CORS configuration, input validation via Zod

---

## Architecture and Performance

- **Modular Code Splitting**: Critical application routes (`Kanban`, `Progress`, `Calendar`, `Settings`, `Auth`) are code-split using `React.lazy` and `Suspense` fallbacks with animated skeleton loaders.
- **Optimized Bundle Strategy**: Manual chunk allocation separates vendor dependencies (`vendor-react`, `vendor-motion`, `vendor-icons`, `vendor-dnd`, `vendor-charts`).
- **Deferred Chart Payloads**: The Recharts visualization suite (~380 KB uncompressed) is loaded strictly on demand, ensuring zero performance impact on the initial application render.
- **Targeted Module Preloading**: Selective preload rules ensure that core React and UI runtime scripts load concurrently without waterfall delays.
- **Lighthouse Performance Targets**: Perfect 100/100 scores in Accessibility, Best Practices, and SEO audits.

---

## Getting Started

### Prerequisites
- Node.js 18.0 or higher
- npm 9.0 or higher
- A PostgreSQL database instance (Neon, Supabase, Railway, or local PostgreSQL)
- (Optional) Google Cloud Console OAuth 2.0 Client Credentials (for Google Calendar sync)
- (Optional) SMTP email credentials (for automated reminders)

### Installation

1. Clone the repository and navigate to the project root:
   ```bash
   git clone <repository-url>
   cd bloom
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Populate `.env` with your values:
   ```env
   APP_URL="http://localhost:3000"
   DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
   JWT_SECRET="your-secure-random-jwt-secret"

   # Google Calendar Integration (Optional)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Automated Email Digests (Optional)
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT=587
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASS="your-app-password"
   ```

5. Synchronize the Prisma database schema:
   ```bash
   npm run prisma:push
   ```

6. Generate the Prisma client:
   ```bash
   npm run prisma:generate
   ```

### Development

Run the development server with hot reload:
```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Production Build

Compile the frontend assets with Vite and bundle the Node.js backend using esbuild:
```bash
npm run build
```

Launch the production server:
```bash
npm start
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate and receive a JWT token
- `GET /api/auth/me` - Retrieve current authenticated session
- `POST /api/auth/forgot-password` - Request a password reset token
- `POST /api/auth/reset-password` - Set a new password using a reset token

### Tasks
- `GET /api/tasks` - List tasks for the authenticated user
- `POST /api/tasks` - Create a new task with optional subtasks
- `PUT /api/tasks/:id` - Update task details, status, or subtasks
- `DELETE /api/tasks/:id` - Delete a task

### Habits
- `GET /api/habits` - List active habits and streaks
- `POST /api/habits` - Create a new habit
- `POST /api/habits/:id/toggle` - Check in a habit for the current day
- `DELETE /api/habits/:id` - Delete a habit

### User and Analytics
- `GET /api/users/stats` - Fetch XP level, active streaks, and badge counts
- `PUT /api/users/profile` - Update user display name and profile settings
- `GET /api/export/csv` - Download task and habit history as CSV files

### Feedback
- `POST /api/feedback` - Submit user feedback, suggestions, or bug reports (persisted with a PostgreSQL `jsonb` payload)
- `GET /api/feedback` - Retrieve past feedback submissions for the authenticated user

---

## License

This project is licensed under the MIT License.
