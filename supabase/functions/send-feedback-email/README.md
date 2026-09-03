# Feedback Email Notification Edge Function

This Edge Function sends email notifications when feedback is submitted.

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy send-feedback-email
```

### 2. Set Environment Variables

Set these secrets in your Supabase project:

```bash
# Get your Resend API key from https://resend.com
supabase secrets set RESEND_API_KEY=your_resend_api_key

# Set the email address where you want to receive feedback
supabase secrets set FEEDBACK_TO_EMAIL=your-email@example.com

# Set the "from" email address (must be verified in Resend)
supabase secrets set FEEDBACK_FROM_EMAIL=noreply@yourdomain.com
```

### 3. Update the Database Trigger

The migration file `add_feedback_email_trigger.sql` needs to be updated with your Edge Function URL.

After deploying, get your Edge Function URL from the Supabase dashboard or run:
```bash
supabase functions list
```

Then update the trigger function in the migration to use the correct URL.

### 4. Alternative: Use Supabase Database Webhooks

Instead of using pg_net, you can configure a Database Webhook in the Supabase dashboard:

1. Go to Database → Webhooks
2. Create a new webhook
3. Set trigger: `INSERT` on `public.feedback`
4. Set URL to: `https://your-project.supabase.co/functions/v1/send-feedback-email`
5. Add header: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

### 5. Alternative Email Services

If you prefer a different email service, modify the Edge Function:

**SendGrid:**
```typescript
await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: TO_EMAIL }] }],
    from: { email: FROM_EMAIL },
    subject: `New Feedback: ${name}`,
    content: [{ type: 'text/html', value: htmlContent }],
  }),
})
```

**Postmark:**
```typescript
await fetch('https://api.postmarkapp.com/email', {
  method: 'POST',
  headers: {
    'X-Postmark-Server-Token': POSTMARK_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    From: FROM_EMAIL,
    To: TO_EMAIL,
    Subject: `New Feedback: ${name}`,
    HtmlBody: htmlContent,
    TextBody: textContent,
  }),
})
```









