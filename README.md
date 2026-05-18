# Bloom Productivity 🌸

Bloom is a gamified productivity application designed to help you organize your tasks, build lasting habits, and track your personal growth in a visually stunning interface.

## ✨ Features

- **Gamified Experience**: Earn XP for every task completed and habit logged. Level up and earn unique badges as you grow.
- **Smart Task Management**: Organize your workflow with a dynamic Kanban board. Filter by priority and sort by due dates to stay on top of your game.
- **Detailed Subtasks**: Break down complex goals into manageable steps within each task.
- **Habit Tracking**: Build consistency with a dedicated daily habit tracker.
- **Google Calendar Sync**: Never miss a deadline. Sync your tasks directly to your Google Calendar.
- **Insightful Dashboard**: Visualize your weekly growth and daily progress with real-time statistics and historical charts.
- **Responsive Design**: A polished, mobile-friendly interface inspired by the "Bloom" aesthetic—soft pinks, vibrant greens, and clean typography.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion (motion), Lucide React.
- **Backend**: Node.js (Express), Prisma ORM.
- **Database**: PostgreSQL (Neon).
- **Authentication**: JWT-based secure authentication.
- **Integrations**: Google Calendar API.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- A PostgreSQL database (Neon recommended)
- Google Cloud Console Project (for Calendar integration)

### Configuration

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by copying `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Fill in the required variables:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: A secure secret for token signing.
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Your Google OAuth credentials.
   - `APP_URL`: The URL where your app is hosted.

5. Push the database schema:
   ```bash
   npx prisma db push
   ```

### Running Locally

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📜 License

MIT
