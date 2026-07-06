// src/routes/contact.ts
import { Hono } from "hono";
import { Resend } from "resend";

type Bindings = {
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL: string;
};

export const contactRouter = new Hono<{ Bindings: Bindings }>();

contactRouter.post("/", async (c) => {
  const { name, email, subject, message } = await c.req.json();

  if (!name || !email || !message) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const resend = new Resend(c.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: "Contact Form <onboarding@resend.dev>", // swap once you verify a domain
      to: c.env.CONTACT_TO_EMAIL,
      replyTo: email,
      subject: subject || `New message from ${name}`,
      text: `${message}\n\n— ${name} (${email})`,
    });
    return c.json({ ok: true });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Failed to send" }, 500);
  }
});