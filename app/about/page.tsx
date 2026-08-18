import type { Metadata } from "next";
import { AboutPage } from "@/components/about-page";

export const metadata: Metadata = {
  title: "About MatClock | Fight Interval Timer",
  description:
    "Meet the father-and-son BJJ practitioners behind MatClock and share feedback on the fight interval timer.",
  alternates: {
    canonical: "/about",
  },
};

export default function About() {
  return <AboutPage />;
}
