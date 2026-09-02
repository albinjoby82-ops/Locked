export const SiteConfig = {
  title: "Workout Cool",
  description: "Modern fitness coaching platform with comprehensive exercise database",
  keywords: [
    "fitness",
    "workout",
    "exercise",
    "training",
    "muscle building",
    "strength training",
    "bodybuilding",
    "fitness app",
    "workout planner",
    "exercise database",
  ],
  // Not used for URL resolution — see src/shared/lib/server-url.ts, which reads
  // NEXT_PUBLIC_APP_URL. Kept only so nothing here claims upstream's domain.
  prodUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  logo: "/images/logo.png",
  domain: "locked-in",
  appIcon: "/images/logo4.jpg",
  company: {
    name: "Workout Cool",
    address: "34 avenue des champ Elysée 75008 Paris, France",
  },
  brand: {
    primary: "#007291",
  },
  email: {
    from: "Workout Cool <hello@workout.cool>",
    contact: "hello@workout.cool",
  },
  maker: {
    image: "https://workout.cool/images/me/twitter-en.jpg",
    website: "https://workout.cool",
    twitter: "https://twitter.com/workout_cool",
    name: "Workout Cool",
  },
  auth: {
    password: false,
  },
  seo: {
    ogImage: {
      width: 1200,
      height: 630,
    },
    twitterHandle: "@snouzy_biceps",
    applicationName: "Workout Cool",
    category: "fitness",
    classification: "Fitness & Health",
  },
};
