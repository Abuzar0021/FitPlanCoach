import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  reason?: string;
}

const PaymentRejected = ({ name = "Athlete", reason }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We couldn't verify your FitPlanCoach payment</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment couldn't be verified</Heading>
        <Text style={text}>Hi {name},</Text>
        <Text style={text}>
          We weren't able to verify your recent FitPlanCoach payment{reason ? <> for the following reason: <em>{reason}</em></> : ""}.
          Don't worry — no charge has been finalized on our end.
        </Text>
        <Text style={text}>
          Please review and resubmit your payment with a clearer receipt or screenshot. If you believe this is a mistake, reach out to support and we'll sort it out.
        </Text>
        <Section style={{ textAlign: "center", margin: "32px 0" }}>
          <Button href="https://fitplancoach.com/subscription" style={button}>Resubmit payment</Button>
        </Section>
        <Text style={text}>
          Questions? Email <a href="mailto:support@fitplancoach.com" style={link}>support@fitplancoach.com</a> or open a ticket from your <a href="https://fitplancoach.com/support" style={link}>support page</a>.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— The FitPlanCoach team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: PaymentRejected,
  subject: "Action needed: payment verification",
  displayName: "Payment rejected",
  previewData: { name: "Marcus", reason: "Receipt was unreadable" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };
const container = { padding: "32px 24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "24px", fontWeight: 800 as const, color: "#0a0a0a", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "12px 0" };
const button = { backgroundColor: "#84cc16", color: "#0a0a0a", padding: "14px 28px", borderRadius: "12px", fontWeight: 700 as const, fontSize: "14px", textDecoration: "none", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
const link = { color: "#65a30d", textDecoration: "underline" };
const hr = { borderColor: "#e5e7eb", margin: "32px 0 16px" };
const footer = { fontSize: "12px", color: "#9ca3af", textAlign: "center" as const };
