export default function PrivacyPolicyPage() {
  return (
    <main style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 680,
      margin: "0 auto",
      padding: "48px 24px",
      color: "#e6edf3",
      background: "#0d1117",
      minHeight: "100vh",
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: "#6e7681", fontSize: 13, marginBottom: 40 }}>
        Last updated: March 2026
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>About Entropik</h2>
        <p style={{ color: "#8b949e", lineHeight: 1.7 }}>
          Entropik is a private fitness challenge app used by a small group of participants
          to track daily plank workouts and encourage each other to stay consistent.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Information We Collect</h2>
        <p style={{ color: "#8b949e", lineHeight: 1.7 }}>
          We collect only what is necessary to run the challenge: your name, email address
          (used for login via Google), and — if you choose to opt in — your mobile phone number
          for SMS workout reminders.
        </p>
      </section>

      <section style={{ marginBottom: 32, padding: 20, background: "#161b22", borderRadius: 12, border: "1px solid #30363d" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10, color: "#5dffdd" }}>SMS / Text Message Policy</h2>
        <p style={{ color: "#8b949e", lineHeight: 1.7, marginBottom: 12 }}>
          If you voluntarily provide your mobile phone number and check the opt-in box,
          you agree to receive SMS text message reminders about your daily plank workout.
          Message frequency is at most 3 messages per day.
        </p>
        <p style={{ color: "#8b949e", lineHeight: 1.7, marginBottom: 12 }}>
          <strong style={{ color: "#e6edf3" }}>
            We will never sell, share, rent, or disclose your mobile phone number or SMS
            opt-in data to any third party for marketing, advertising, or promotional purposes.
          </strong>{" "}
          Your phone number is used solely to send you the workout reminders you signed up for.
        </p>
        <p style={{ color: "#8b949e", lineHeight: 1.7 }}>
          To opt out of SMS messages at any time, reply <strong style={{ color: "#e6edf3" }}>STOP</strong> to
          any message. To get help, reply <strong style={{ color: "#e6edf3" }}>HELP</strong>.
          Message and data rates may apply. Consent to receive SMS messages is never a
          condition of participation in the challenge.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>How We Use Your Information</h2>
        <p style={{ color: "#8b949e", lineHeight: 1.7 }}>
          Your information is used only to run the challenge: displaying your name on the
          leaderboard, tracking your check-ins, and (if opted in) sending you SMS reminders.
          We do not use your data for advertising, and we do not share it with third parties.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Data Retention & Deletion</h2>
        <p style={{ color: "#8b949e", lineHeight: 1.7 }}>
          Your data is stored for the duration of the challenge. You can request deletion
          of your account and all associated data at any time by contacting the challenge
          administrator. You can remove your phone number at any time via Edit Profile in the app.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Contact</h2>
        <p style={{ color: "#8b949e", lineHeight: 1.7 }}>
          For any privacy questions, please contact the challenge administrator through the app.
        </p>
      </section>
    </main>
  )
}
