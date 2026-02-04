# AutoCommit

Automatically commit to your repositories when collaborators make changes.

## Features

- 🔐 Secure GitHub token authentication
- 📡 Real-time repository monitoring
- ⚡ Instant auto-commit on collaborator changes
- 📊 Activity logging and statistics
- 🎨 Beautiful dark-themed responsive UI

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. Enter your GitHub Personal Access Token (needs `repo` scope)
2. Add repositories you want to monitor
3. Click "Start Monitoring"
4. When a collaborator makes a commit, AutoCommit will automatically update the README

## Environment Variables

Create a `.env` file with:
```
MONGODB_URI=your_mongodb_connection_string
```

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- MongoDB with Mongoose
- Octokit (GitHub API)
- Zustand (State Management)
- Framer Motion (Animations)
