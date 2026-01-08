import { NextResponse } from 'next/server'

// This API route receives webhook calls from Supabase when feedback is submitted
// It sends an email notification using Resend (or another email service)

export async function POST(request: Request) {
  try {
    const { name, email, phone, feedback, id, created_at } = await request.json()

    if (!name || !feedback || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get environment variables
    const resendApiKey = process.env.RESEND_API_KEY
    const toEmail = process.env.FEEDBACK_TO_EMAIL || 'your-email@example.com'
    const fromEmail = process.env.FEEDBACK_FROM_EMAIL || 'onboarding@resend.dev'

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `New Feedback: ${name}`,
        html: `
          <h2>New Feedback Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          ${phone ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
          <p><strong>Submitted:</strong> ${new Date(created_at).toLocaleString()}</p>
          <p><strong>Feedback ID:</strong> ${id}</p>
          <hr>
          <h3>Feedback:</h3>
          <p style="white-space: pre-wrap;">${feedback}</p>
        `,
        text: `
New Feedback Submission

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}
Submitted: ${new Date(created_at).toLocaleString()}
Feedback ID: ${id}

Feedback:
${feedback}
        `.trim(),
      }),
    })

    if (!emailResponse.ok) {
      const error = await emailResponse.text()
      console.error('Email service error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      )
    }

    const emailData = await emailResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: emailData.id,
    })
  } catch (error: any) {
    console.error('Error sending feedback email:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}



