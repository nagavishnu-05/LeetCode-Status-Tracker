# External Cron Service Configuration

If you prefer using an external cron service like cron-job.org or EasyCron instead of GitHub Actions, use this configuration:

## Service: cron-job.org (Recommended)

### Setup Instructions

1. **Visit**: https://cron-job.org/
2. **Create a free account**
3. **Create 5 separate cron jobs** with the following settings:

#### Job 1: 4th of Month
- **Title**: LeetCode Monthly Report - Week 1 (4th)
- **URL**: `https://leetcode-status-tracker.onrender.com/api/admin/trigger-report`
- **HTTP Method**: POST
- **Request Body**: `{"dayOverride": 4}`
- **Content-Type**: application/json
- **Schedule**: `0 18 4 * *` (Every 4th at 6:00 PM IST = 12:30 PM UTC)
- **Timezone**: Asia/Kolkata

#### Job 2: 11th of Month
- **Title**: LeetCode Monthly Report - Week 2 (11th)
- **URL**: `https://leetcode-status-tracker.onrender.com/api/admin/trigger-report`
- **HTTP Method**: POST
- **Request Body**: `{"dayOverride": 11}`
- **Content-Type**: application/json
- **Schedule**: `0 18 11 * *`
- **Timezone**: Asia/Kolkata

#### Job 3: 18th of Month
- **Title**: LeetCode Monthly Report - Week 3 (18th)
- **URL**: `https://leetcode-status-tracker.onrender.com/api/admin/trigger-report`
- **HTTP Method**: POST
- **Request Body**: `{"dayOverride": 18}`
- **Content-Type**: application/json
- **Schedule**: `0 18 18 * *`
- **Timezone**: Asia/Kolkata

#### Job 4: 25th of Month
- **Title**: LeetCode Monthly Report - Week 4 (25th)
- **URL**: `https://leetcode-status-tracker.onrender.com/api/admin/trigger-report`
- **HTTP Method**: POST
- **Request Body**: `{"dayOverride": 25}`
- **Content-Type**: application/json
- **Schedule**: `0 18 25 * *`
- **Timezone**: Asia/Kolkata

#### Job 5: 2nd of Month
- **Title**: LeetCode Monthly Report - Week 5 (2nd)
- **URL**: `https://leetcode-status-tracker.onrender.com/api/admin/trigger-report`
- **HTTP Method**: POST
- **Request Body**: `{"dayOverride": 2}`
- **Content-Type**: application/json
- **Schedule**: `0 18 2 * *`
- **Timezone**: Asia/Kolkata

### Additional Configuration

**Keep-Alive Job** (Prevents Render Free Tier Spin Down):
- **Title**: LeetCode Backend Keep-Alive
- **URL**: `https://leetcode-status-tracker.onrender.com/health`
- **HTTP Method**: GET
- **Schedule**: `*/10 * * * *` (Every 10 minutes)
- **Timezone**: Any

> **Note**: The keep-alive job is only necessary if you're on Render's free tier, which spins down after 15 minutes of inactivity.

## Alternative: GitHub Actions (Already Configured)

The repository includes a GitHub Actions workflow at `.github/workflows/monthly-reports.yml` that automatically triggers reports on all scheduled dates. This is the recommended approach as it:
- Requires no external service accounts
- Provides execution history in the Actions tab
- Is completely free
- Won't spin down

**To enable GitHub Actions**:
1. Push your code to GitHub
2. Go to repository Settings → Actions → General
3. Enable "Allow all actions and reusable workflows"
4. The workflow will automatically run on scheduled dates

## Monitoring

Check if reports are being generated:
- **View Logs**: Check Render dashboard logs around 6:00 PM IST on report days
- **Manual Trigger**: Visit `https://leetcode-status-tracker.onrender.com/api/admin/trigger-report`
- **Health Check**: Visit `https://leetcode-status-tracker.onrender.com/health`
