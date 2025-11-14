# Email Login Setup Guide

This application has been migrated from Slack OAuth to email-based magic link authentication using Loops.so for transactional emails.

## Prerequisites

1. A Loops.so account (https://app.loops.so)
2. A PostgreSQL database

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/onionstore

# Session encryption secret (generate a strong random string)
SESSIONS_SECRET=your-sessions-secret-here

# Loops.so API Configuration
LOOPS_API_KEY=your-loops-api-key-here
LOOPS_LOGIN_TEMPLATE_ID=your-login-template-id-here
```

## Loops.so Setup

### 1. Get Your API Key

1. Log in to Loops.so
2. Navigate to Settings → API Keys (https://app.loops.so/settings?page=api-keys)
3. Copy your API key and set it as `LOOPS_API_KEY` in your `.env` file

### 2. Create a Transactional Email Template

1. Navigate to Transactional Emails (https://app.loops.so/transactional)
2. Create a new template for login emails
3. Add a data variable called `loginUrl` to your template
4. Use this variable in your email template (e.g., as a button or link)
5. Copy the template ID and set it as `LOOPS_LOGIN_TEMPLATE_ID`

Example email template:
```
Subject: Your login link

Hi there!

Click the button below to log in to Onion Store:

[Button with loginUrl]

This link will expire in 15 minutes.
```

## Database Migration

After setting up the environment variables, run the database migration:

```bash
npm run db:push
# or
bun run db:push
```

This will:
- Change the `user` table primary key from `slackId` to `email`
- Make `avatarUrl` nullable
- Create a new `login_tokens` table for magic link authentication
- Update all foreign key references

## How It Works

### Login Flow

1. User enters their email address on `/login`
2. System generates a unique token and stores it in the database
3. An email is sent via Loops.so with a magic link containing the token
4. User clicks the link, which redirects to `/api/verify?token=...`
5. System verifies the token, creates/updates the user, and sets a session cookie
6. User is redirected to the home page

### Session Management

- Sessions are encrypted using AES-256-GCM
- Session cookies last for 90 days
- The session cookie stores the user's email

### Security Features

- Tokens expire after 15 minutes
- Tokens are single-use (deleted after verification)
- Email addresses are normalized (lowercase, trimmed)
- Sessions are encrypted with a strong secret

## API Endpoints

- `POST /api/login` - Request a login link
  - Body: `{ "email": "user@example.com" }`
  - Returns: `{ "success": true }`

- `GET /api/verify?token=...` - Verify login token
  - Redirects to home on success
  - Redirects to `/login?error=...` on failure

- `POST /api/logout` - Log out
  - Deletes session cookie
  - Redirects to login page

## Migration from Slack

The following changes were made to migrate from Slack to email login:

1. **Database Schema**:
   - Changed `user.slackId` → `user.email` (primary key)
   - Made `user.avatarUrl` nullable
   - Added `login_tokens` table

2. **Code Changes**:
   - Replaced `/api/slack-callback` with `/api/login` and `/api/verify`
   - Updated authentication middleware
   - Updated all database queries to use `email` instead of `slackId`
   - Added avatar fallback (first letter of email/displayName)

3. **Environment Variables**:
   - Removed: `PUBLIC_SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
   - Added: `LOOPS_API_KEY`, `LOOPS_LOGIN_TEMPLATE_ID`

## Troubleshooting

### Emails not sending

- Check that `LOOPS_API_KEY` is correct
- Check that `LOOPS_LOGIN_TEMPLATE_ID` is correct
- Check Loops.so dashboard for any errors

### Token expired errors

- Tokens expire after 15 minutes
- User needs to request a new login link

### Database errors

- Make sure you've run the database migration
- Check that `DATABASE_URL` is correct
