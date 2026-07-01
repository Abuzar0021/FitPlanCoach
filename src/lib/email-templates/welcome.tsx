import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  supportEmail?: string;
}

const Welcome = ({ name = "Athlete", supportEmail = DEFAULT_SITE_CONFIG.support_email }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to FitPlanCoach — let's build your plan</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome, {name} 👋</Heading>
        <Text style={text}>
          Thanks for joining FitPlanCoach. We build personalized meal plans and adaptive workouts
          around your body, goals, schedule, and budget.
        </Text>
        <Text style={text}>
          <strong>Here's what to do next:</strong>
        </Text>
        <ul style={list}>
          <li style={li}>Complete your fitness profile (2 minutes)</li>
          <li style={li}>Generate your first personalized plan</li>
          <li style={li}>Log your weight and a workout to start your streak</li>
        </ul>
        <Section style={{ textAlign: "center", margin: "32px 0" }}>
          <Button href="https://fitplancoach.com/dashboard" style={button}>
            Open my dashboard
          </Button>
        </Section>
        <Text style={text}>
          Stuck? Email{" "}
          <a href={`mailto:${supportEmail}`} style={link}>
            {supportEmail}
          </a>{" "}
          — real humans reply within 1–2 business days.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Train smart, eat with purpose. — FitPlanCoach</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Welcome,
  subject: "Welcome to FitPlanCoach",
  displayName: "Welcome email",
  previewData: { name: "Marcus" },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};
const container = { padding: "32px 24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "26px", fontWeight: 800 as const, color: "#0a0a0a", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#374151", margin: "12px 0" };
const list = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#374151",
  paddingLeft: "20px",
  margin: "12px 0",
};
const li = { margin: "6px 0" };
const button = {
  backgroundColor: "#84cc16",
  color: "#0a0a0a",
  padding: "14px 28px",
  borderRadius: "12px",
  fontWeight: 700 as const,
  fontSize: "14px",
  textDecoration: "none",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};
const link = { color: "#65a30d", textDecoration: "underline" };
const hr = { borderColor: "#e5e7eb", margin: "32px 0 16px" };
const footer = { fontSize: "12px", color: "#9ca3af", textAlign: "center" as const };
