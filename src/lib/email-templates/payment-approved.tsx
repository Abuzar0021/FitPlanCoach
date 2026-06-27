import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
}

const PaymentApproved = ({ name = "Athlete" }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your FitPlanCoach Pro subscription is now active</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Pro 🎉</Heading>
        <Text style={text}>Hi {name},</Text>
        <Text style={text}>
          Your payment was verified and your <strong>FitPlanCoach Pro</strong> subscription is now active.
          You've unlocked unlimited personalized plans, weekly regeneration, full progress tracking, and priority support.
        </Text>
        <Section style={{ textAlign: "center", margin: "32px 0" }}>
          <Button href="https://fitplancoach.com/dashboard" style={button}>Open your dashboard</Button>
        </Section>
        <Text style={text}>
          Your subscription details are available on your <a href="https://fitplancoach.com/billing" style={link}>billing page</a>. Cancel anytime in one click — and our 30-day money-back guarantee applies.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Train smart, eat with purpose. — The FitPlanCoach team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: PaymentApproved,
  subject: "Welcome to FitPlanCoach Pro",
  displayName: "Payment approved",
  previewData: { name: "Marcus" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };
const container = { padding: "32px 24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "26px", fontWeight: 800 as const, color: "#0a0a0a", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "12px 0" };
const button = { backgroundColor: "#84cc16", color: "#0a0a0a", padding: "14px 28px", borderRadius: "12px", fontWeight: 700 as const, fontSize: "14px", textDecoration: "none", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
const link = { color: "#65a30d", textDecoration: "underline" };
const hr = { borderColor: "#e5e7eb", margin: "32px 0 16px" };
const footer = { fontSize: "12px", color: "#9ca3af", textAlign: "center" as const };
