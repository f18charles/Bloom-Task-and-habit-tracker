import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  if (!process.env.EMAIL_USER) {
    console.warn("Email service not configured. Skipping email sending.");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Bloom Productivity" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

export async function sendDailyDigest(user: any, pendingTasks: any[], habitsToComplete: any[]) {
  const tasksHtml = pendingTasks.length > 0 
    ? `<ul>${pendingTasks.map(t => `<li>${t.title} (${t.priority})</li>`).join("")}</ul>`
    : "<p>No tasks for today! Time to bloom new ones.</p>";

  const habitsHtml = habitsToComplete.length > 0
    ? `<ul>${habitsToComplete.map(h => `<li>${h.title}</li>`).join("")}</ul>`
    : "<p>All habits logged? Great job!</p>";

  const html = `
    <h1>Good Morning, ${user.displayName}! 🌸</h1>
    <p>Here is your daily Bloom digest to keep you flourishing.</p>
    
    <h2>Today's Pending Tasks</h2>
    ${tasksHtml}
    
    <h2>Daily Habits</h2>
    ${habitsHtml}
    
    <p>Current Points: <strong>${user.points}</strong></p>
    <p>Keep blooming!</p>
  `;

  await sendEmail({
    to: user.email,
    subject: "Your Daily Bloom Digest 🌸",
    html
  });
}
