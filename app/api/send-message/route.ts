import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const MAX_RECIPIENTS = 500;
const MAX_BODY_LENGTH = 1600;

export async function POST(req: NextRequest) {
  try {
    // 1. Who is calling? The browser sends the logged-in user's access token.
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    // 2. A Supabase client that acts AS that user, so RLS applies to everything
    //    it reads or writes. No service role key is used in this route.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // 3. Validate the request
    const { guestIds, body } = await req.json();

    if (!Array.isArray(guestIds) || guestIds.length === 0 || typeof body !== 'string' || !body.trim()) {
      return NextResponse.json(
        { error: 'guestIds (array) and body (text) are required' },
        { status: 400 }
      );
    }

    if (guestIds.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `Too many recipients (max ${MAX_RECIPIENTS} per send)` },
        { status: 400 }
      );
    }

    if (body.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_BODY_LENGTH} characters)` },
        { status: 400 }
      );
    }

    // 4. Load the guests. RLS means only guests owned by this user come back.
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id, phone, name')
      .in('id', guestIds);

    if (guestError) throw guestError;

    if (!guests || guests.length === 0) {
      return NextResponse.json(
        { error: 'No matching guests found for the given guestIds' },
        { status: 404 }
      );
    }

    const requested = new Set(guestIds.map(String)).size;
    const skipped = requested - guests.length;

    // 5. Log every attempt (user_id is filled in by the database default)
    const logMessage = async (row: {
      guest_id: number | string;
      status: 'sent' | 'failed';
      twilio_sid?: string;
    }) => {
      const { error } = await supabase.from('messages').insert({
        guest_id: row.guest_id,
        body,
        direction: 'outbound',
        status: row.status,
        twilio_sid: row.twilio_sid ?? null,
      });
      if (error) console.error('Failed to log message:', error.message);
    };

    // 6. Send
    const outcomes = await Promise.all(
      guests.map(async (guest) => {
        try {
          const message = await twilioClient.messages.create({
            to: guest.phone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            body,
          });

          await logMessage({
            guest_id: guest.id,
            status: 'sent',
            twilio_sid: message.sid,
          });
          return { guestId: guest.id, ok: true };
        } catch (err: any) {
          console.error(
            `Failed to send to guest ${guest.id} (${guest.phone}):`,
            err?.message || err
          );
          await logMessage({ guest_id: guest.id, status: 'failed' });
          return { guestId: guest.id, ok: false };
        }
      })
    );

    return NextResponse.json({
      sent: outcomes.filter((o) => o.ok).length,
      failed: outcomes.filter((o) => !o.ok).length,
      skipped,
    });
  } catch (err) {
    console.error('Send error:', err);
    return NextResponse.json({ error: 'Failed to send messages' }, { status: 500 });
  }
}