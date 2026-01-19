import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Login to your Raatap account to access community ride sharing. Connect with verified members and start sharing rides today.",
  keywords: [
    "Raatap login",
    "ride sharing login",
    "carpool login",
    "community rides access",
  ],
  openGraph: {
    title: "Login to Raatap",
    description:
      "Access your Raatap account to share rides with trusted community members.",
    url: "https://raatap.com/login",
  },
  twitter: {
    card: "summary",
    title: "Login to Raatap",
    description: "Access your community ride sharing account.",
  },
  alternates: {
    canonical: "https://raatap.com/login",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
