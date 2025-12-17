import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, created_at } = await req.json();

    console.log('New user signup:', { email, created_at });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Send email via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AI Assistant <onboarding@resend.dev>',
        to: ['santimwamba0@gmail.com'],
        subject: 'New User Signup - AI Assistant',
        html: `
          <h1>New User Signup</h1>
          <p>A new user has signed up for your AI Assistant application.</p>
          <h2>User Details:</h2>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Signup Date:</strong> ${new Date(created_at).toLocaleString()}</li>
          </ul>
          <p>This is an automated notification from your AI Assistant application.</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Resend API error:', emailResponse.status, error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await emailResponse.json();
    console.log('Notification email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in signup-notification function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
