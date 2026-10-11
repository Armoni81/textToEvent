// Public page: no login required (A2P reviewers and guests need to read it).

const OPERATOR = "YOUR NAME OR BUSINESS NAME";
const CONTACT_EMAIL = "your-email@example.com";
const LAST_UPDATED = "October 2026";

export const metadata = {
  title: "Privacy Policy — textToEvent",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div className="text-sm leading-relaxed opacity-80 flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-1">Privacy Policy</h1>
      <p className="text-sm opacity-60 mb-8">Last updated: {LAST_UPDATED}</p>

      <Section title="Who we are">
        <p>
          textToEvent is a tool that lets people planning a wedding or event
          upload a guest list and send text messages to their guests from one
          dashboard. It is operated by {OPERATOR}. Questions about this policy
          can be sent to {CONTACT_EMAIL}.
        </p>
      </Section>

      <Section title="Information we collect">
        <p>
          <strong>From event organizers (our users):</strong> your email
          address and password when you create an account, and the guest
          information you choose to upload.
        </p>
        <p>
          <strong>About guests:</strong> names, phone numbers, party size, group
          labels, and RSVP status, which organizers upload or enter themselves.
          We also store the text messages sent to guests and the replies we
          receive from them.
        </p>
      </Section>

      <Section title="How we use information">
        <p>
          We use this information only to run the service: to show organizers
          their guest list, to send the messages organizers write to their
          guests, and to show organizers the replies. We do not use guest phone
          numbers or message content for advertising.
        </p>
      </Section>

      <Section title="Text messaging (SMS)">
        <p>
          Organizers use textToEvent to send event-related messages, such as
          save-the-dates, RSVP reminders, and event logistics, to guests they
          know and have invited. Organizers agree to message only people they
          have a personal relationship with and who would reasonably expect to
          hear from them about the event.
        </p>
        <p>
          Message frequency varies by event. Message and data rates may apply.
          Guests can reply STOP at any time to stop receiving messages, and
          reply HELP for help. After a guest replies STOP, we will not send
          them further messages.
        </p>
        <p>
          No mobile information will be shared with third parties or
          affiliates for marketing or promotional purposes. Mobile opt-in data
          and consent are not shared with any third parties.
        </p>
      </Section>

      <Section title="Who we share information with">
        <p>
          We do not sell personal information. We use a small number of service
          providers that process data on our behalf: Supabase, which hosts our
          database and handles account login, and Twilio, which delivers text
          messages. These providers may only use the data to provide their
          services to us.
        </p>
        <p>
          We may disclose information if required by law or to protect against
          fraud or abuse.
        </p>
      </Section>

      <Section title="Storage, security, and retention">
        <p>
          Data is stored in a hosted database with access controls so that each
          organizer can only see their own guests and messages. We keep
          information for as long as an account is active. Organizers can
          delete guests, and you can ask us to delete your account and
          associated data at any time.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          Guests: reply STOP to any message to opt out, or contact us at{" "}
          {CONTACT_EMAIL} to ask that your phone number be removed.
        </p>
        <p>
          Organizers: you can edit or delete your guest data, or contact us to
          close your account.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we change this policy, we will update the date at the top of this
          page.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          {OPERATOR} — {CONTACT_EMAIL}
        </p>
      </Section>
    </main>
  );
}
