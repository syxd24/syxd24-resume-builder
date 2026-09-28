import {
  Alegreya,
  Inter,
  Lato,
  Libre_Baskerville,
  Merriweather,
  Open_Sans,
  Roboto,
  Source_Sans_3,
} from "next/font/google";

const alegreya = Alegreya({
  display: "swap",
  preload: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-alegreya",
  style: ["normal", "italic"],
});

const inter = Inter({
  display: "swap",
  preload: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  style: ["normal", "italic"],
});

const lato = Lato({
  display: "swap",
  preload: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-lato",
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

const libreBaskerville = Libre_Baskerville({
  display: "swap",
  preload: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-libre-baskerville",
  style: ["normal", "italic"],
});

const merriweather = Merriweather({
  display: "swap",
  preload: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-merriweather",
  style: ["normal", "italic"],
});

const openSans = Open_Sans({
  display: "swap",
  preload: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-open-sans",
  style: ["normal", "italic"],
});

const roboto = Roboto({
  display: "swap",
  preload: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-roboto",
  style: ["normal", "italic"],
});

const sourceSans = Source_Sans_3({
  display: "swap",
  preload: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans-3",
  style: ["normal", "italic"],
});

export const resumeFontVariables = [
  alegreya.variable,
  inter.variable,
  lato.variable,
  libreBaskerville.variable,
  merriweather.variable,
  openSans.variable,
  roboto.variable,
  sourceSans.variable,
].join(" ");
