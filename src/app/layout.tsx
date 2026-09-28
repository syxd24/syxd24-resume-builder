import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./styles.css";
import { resumeFontVariables } from "./resume-fonts";

export const metadata: Metadata = {
  title: "Resume Builder",
  description: "A private, production-quality personal resume builder.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={resumeFontVariables}>
      <body>{children}</body>
    </html>
  );
}
