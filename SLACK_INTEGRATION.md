# Slack Integration Guide

This guide explains how the sisg-platform integrates with your Slack workspace to send notifications for forms, errors, user activity, and deployments.

## What's Integrated

### 1. **Contact Form Submissions** → #sisg-forms
When someone submits the contact form on your website, a formatted message is automatically posted to Slack with:
- Submitter name and email
- Phone number (if provided)
- Subject and full message
- Submission timestamp

### 2. **System Alerts & Errors** → #sisg-alerts
Application errors are automatically captured and sent to Slack with:
- Error title and message
- Severity level (critical, warning, info)
- Context information
- Stack traces (for debugging)

### 3. **User Activity** → #sisg-activity
Key user events are tracked and logged:
- User signups
- Login events
- Profile updates
- Custom activity events

### 4. **Deployment Notifications** → #sisg-deployments
Every deployment triggers Slack notifications:
- Deployment success/failure status
- Repository, branch, and commit information
- Author of the deployment
- Direct link to logs on failure

## Setup Instructions

### Step 1: Add GitHub Secrets

The deployment notifications require GitHub secrets. Set them using the GitHub CLI:

```bash
gh secret set SLACK_DEPLOYMENTS_WEBHOOK --body "your_actual_webhook_url_here"
gh secret set SLACK_ALERTS_WEBHOOK --body "your_actual_webhook_url_here"
gh secret set SLACK_FORMS_WEBHOOK --body "your_actual_webhook_url_here"
gh secret set SLACK_ACTIVITY_WEBHOOK --body "your_actual_webhook_url_here"
```

Replace each `your_actual_webhook_url_here` with the corresponding webhook URL from your Slack workspace.

### Step 2: Update Production Environment Variables

SSH into your DigitalOcean Droplet and update `.env.production`:

```bash
ssh root@your_droplet_ip_address
cd /app/sisg-platform
nano .env.production
```

Add these lines with your actual webhook URLs from your Slack workspace:

```env
# Slack Webhooks for Notifications
SLACK_ALERTS_WEBHOOK=https://hooks.slack.com/services/YOUR/ALERTS/WEBHOOK
SLACK_FORMS_WEBHOOK=https://hooks.slack.com/services/YOUR/FORMS/WEBHOOK
SLACK_ACTIVITY_WEBHOOK=https://hooks.slack.com/services/YOUR/ACTIVITY/WEBHOOK
SLACK_DEPLOYMENTS_WEBHOOK=https://hooks.slack.com/services/YOUR/DEPLOYMENTS/WEBHOOK
```

Replace each webhook URL with the actual one from your Slack app configuration.

Save with: `Ctrl+X`, `Y`, `Enter`

Then exit:

```bash
exit
```

### Step 3: Deploy

Push the latest code to trigger the deployment:

```bash
cd "/Users/briansmith/Coworking File/sisg-platform"
git commit --allow-empty -m "Add Slack webhook configuration"
git push origin main
```

Watch GitHub Actions: **https://github.com/HM2SOFTENG/sisg-platform/actions**

Once deployed, the new container will have access to the Slack webhooks and start sending notifications.

## API Endpoints

### Contact Form Submission

**Endpoint:** `POST /api/contact`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "subject": "Inquiry about services",
  "message": "I'm interested in learning more..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Your message has been received. We'll get back to you soon!"
}
```

### Error Tracking

**Endpoint:** `POST /api/errors`

**Request Body:**
```json
{
  "title": "Form validation failed",
  "message": "Email field is required",
  "severity": "warning",
  "context": {
    "page": "/contact",
    "component": "ContactForm",
    "field": "email"
  }
}
```

### Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

## Frontend Implementation

### Error Tracking in React Components

```typescript
import { trackError } from '@/lib/errorTracking';

// In your component
try {
  // Some operation
} catch (error) {
  trackError(error, {
    component: 'ContactForm',
    action: 'submit',
    userId: currentUser?.id
  });
}
```

### Global Error Handler

The error tracking is automatically initialized when the app starts (in `main.tsx`):

```typescript
import { setupGlobalErrorHandler } from '@/lib/errorTracking';

setupGlobalErrorHandler();
```

This automatically captures:
- Uncaught JavaScript errors
- Unhandled promise rejections
- Network errors
- etc.

## Backend Implementation

### Using the Slack Service

```typescript
import { slack } from './services/slack.js';

// Send a form submission
await slack.notifyFormSubmission({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1-555-0123',
  subject: 'Inquiry',
  message: 'Hello...'
});

// Send an error alert
await slack.notifyError({
  title: 'Database Connection Failed',
  message: 'Could not connect to PostgreSQL',
  severity: 'critical',
  context: { server: 'prod-01' }
});

// Log user activity
await slack.notifyUserActivity({
  type: 'signup',
  user: { email: 'user@example.com', name: 'John Doe' },
  details: 'Signed up via website'
});

// Log deployment
await slack.notifyDeployment({
  status: 'success',
  branch: 'main',
  commit: 'abc123def456',
  duration: '2m 30s'
});
```

## Customization

### Adding New Webhook Channels

1. Create a new webhook in Slack (via API section)
2. Add to `.env.example`:
   ```env
   SLACK_CUSTOM_WEBHOOK=https://hooks.slack.com/services/...
   ```
3. Update `server/services/slack.ts` to add the new channel
4. Use in your code

### Disabling Notifications

To disable notifications for a channel, simply remove or leave the webhook URL empty in `.env.production`. The service will silently skip notifications for missing webhooks.

### Customizing Message Format

Edit `server/services/slack.ts` to customize the Slack message formatting using Slack's Block Kit format.

## Monitoring

### View Slack Webhook History

In your Slack channels, you can:
1. Click the channel name
2. Go to **Settings** → **Integration**
3. View webhook logs and delivery history

### Debugging

If notifications aren't being delivered:

1. Check container logs: `docker-compose logs app`
2. Verify webhook URLs in `.env.production`
3. Check Slack app integration settings
4. Verify bot has access to the channels

## Security Notes

- **Never commit webhook URLs** to version control
- Rotate webhook URLs if they're exposed
- Use environment variables for all sensitive URLs
- Review Slack app permissions regularly

## Troubleshooting

### "Webhook not configured" warning

This means the environment variable is missing or empty. Add it to `.env.production` on the droplet.

### Messages not appearing in Slack

1. Verify the webhook URL is correct
2. Check that the Slack channel still exists
3. Verify the bot has permissions to post to the channel
4. Check container logs for errors: `docker-compose logs app | grep -i slack`

### Error tracking not working

1. Verify `/api/errors` endpoint is responding: `curl http://localhost:3000/api/errors`
2. Check that error tracking is initialized: look for error handler setup in `client/src/main.tsx`
3. Check browser console for errors

## Support

For issues with the Slack integration:
- Check the [Slack API Documentation](https://api.slack.com/messaging/webhooks)
- Review container logs on the droplet
- Check GitHub Actions workflow logs for deployment issues

