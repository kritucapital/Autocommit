# Setup Instructions for Background Monitoring

## 1. Add Environment Variable

Add this to your `.env.local` file (and Vercel environment variables):

```
CRON_SECRET_KEY=your-secure-random-string-here
```

Generate a secure key with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Set Up External Cron Service

Since Vercel's minimum cron interval is 1 minute and you need 30-second intervals, use a free external service:

### Option A: cron-job.org (Free)
1. Go to [cron-job.org](https://cron-job.org/) and create account
2. Create a new cron job:
   - **URL**: `https://your-vercel-app.vercel.app/api/cron/poll`
   - **Schedule**: Every 30 seconds
   - **Request Method**: POST
   - **Headers**: Add `x-cron-secret: YOUR_CRON_SECRET_KEY`
3. Enable the cron job

### Option B: EasyCron (Free tier)
1. Go to [easycron.com](https://www.easycron.com/)
2. Similar setup to above

## 3. Deploy to Vercel

```bash
vercel --prod
```

## How It Works

1. **User enables monitoring** → Dashboard calls `/api/monitoring` → Sets `isMonitoringEnabled: true` in MongoDB
2. **User logs out** → Monitoring state persists in the database
3. **External cron runs every 30s** → Calls `/api/cron/poll` → Checks ALL users with monitoring enabled
4. **Auto-commit happens** → README updated for each detected collaborator commit

The monitoring now runs server-side and continues regardless of whether the user is logged in!
