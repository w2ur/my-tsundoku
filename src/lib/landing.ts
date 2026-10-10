import type { Stage } from "@/lib/types";

type Locale = "fr" | "en";

export const CODE_URL = "https://github.com/w2ur/my-tsundoku";

export interface LandingPile {
  stage: Stage;
  name: string;
  caption: string;
}

export interface LandingFaqItem {
  question: string;
  answer: string;
}

export interface LandingContent {
  heroTitle: string;
  heroSubtitle: string;
  reassurance: string;
  ctaLabel: string;
  enterAppLabel: string;
  pilesTitle: string;
  piles: LandingPile[];
  scan: { title: string; body: string };
  privacy: { title: string; body: string; codeLinkLabel: string };
  faqTitle: string;
  faq: LandingFaqItem[];
  screenshotAlt: string;
  metaDescription: string;
}

const FR: LandingContent = {
  heroTitle: "Votre tsundoku, de l’envie à la bibliothèque",
  heroSubtitle:
    "My Tsundoku range votre PAL et votre bibliothèque en quatre piles claires.",
  reassurance: "Gratuit · sans compte · hors ligne · open source",
  ctaLabel: "Ajouter mon premier livre",
  enterAppLabel: "Ouvrir l’application",
  pilesTitle: "Quatre piles",
  piles: [
    { stage: "a_acheter", name: "À acheter", caption: "Les livres que vous repérez" },
    { stage: "tsundoku", name: "Tsundoku", caption: "Votre pile à lire" },
    { stage: "bibliotheque", name: "Bibliothèque", caption: "Les livres lus et gardés" },
    { stage: "revendre", name: "S’en séparer", caption: "À donner ou revendre" },
  ],
  scan: {
    title: "Un livre ajouté en quelques secondes",
    body: "Scannez le code-barres ISBN et la fiche se remplit toute seule — titre, auteur, couverture, via Open Library. Ou saisissez tout à la main si vous préférez.",
  },
  privacy: {
    title: "Vos données restent chez vous",
    body: "Tout est stocké sur votre appareil et fonctionne hors ligne. L’application s’installe sur votre téléphone comme une app native, et la synchronisation entre appareils reste optionnelle. My Tsundoku est un logiciel libre (AGPL), sans publicité, mesure d’audience anonyme.",
    codeLinkLabel: "Voir le code source",
  },
  faqTitle: "Questions fréquentes",
  faq: [
    {
      question: "Et si je vide les données de mon navigateur ?",
      answer:
        "Vos livres partent avec, puisqu’ils vivent dans le navigateur. D’où l’intérêt d’exporter de temps en temps une sauvegarde (Réglages › Exporter ma bibliothèque), ou d’activer la synchronisation.",
    },
    {
      question: "Je change de téléphone, je perds tout ?",
      answer:
        "Non, si vous avez pris vos précautions : soit vous importez votre sauvegarde sur le nouvel appareil, soit vous vous connectez avec votre e-mail (un code suffit, pas de mot de passe) et vos livres reviennent.",
    },
    {
      question: "Je peux récupérer mes données ?",
      answer:
        "Oui, à tout moment, dans un fichier JSON, depuis les Réglages. Elles sont à vous, c’est un peu le principe.",
    },
    {
      question: "La synchronisation est-elle obligatoire ?",
      answer:
        "Non. L’application fonctionne entièrement sans compte, la synchronisation sert seulement à retrouver la même bibliothèque sur plusieurs appareils.",
    },
  ],
  screenshotAlt:
    "Le tableau My Tsundoku rempli : quatre piles de livres, des envies d’achat à la bibliothèque",
  metaDescription:
    "Organisez votre pile à lire (PAL) et votre bibliothèque en quatre piles : envies, tsundoku, bibliothèque, à revendre. Gratuit, hors ligne, open source.",
};

const EN: LandingContent = {
  heroTitle: "Your tsundoku, from wishlist to library",
  heroSubtitle: "My Tsundoku sorts your book collection into four clear piles.",
  reassurance: "Free · no account · offline · open source",
  ctaLabel: "Add my first book",
  enterAppLabel: "Open the app",
  pilesTitle: "Four piles",
  piles: [
    { stage: "a_acheter", name: "To buy", caption: "Books you've spotted" },
    { stage: "tsundoku", name: "Tsundoku", caption: "Your reading pile" },
    { stage: "bibliotheque", name: "Library", caption: "Books read and kept" },
    { stage: "revendre", name: "Let go", caption: "To give away or sell" },
  ],
  scan: {
    title: "Add a book in seconds",
    body: "Scan the ISBN barcode and the details fill themselves in — title, author, cover, via Open Library. Or type everything in manually if you prefer.",
  },
  privacy: {
    title: "Your data stays with you",
    body: "Everything is stored on your device and works offline. Install it on your phone like a native app; syncing across devices stays optional. My Tsundoku is free software (AGPL), with no ads, anonymous audience measurement.",
    codeLinkLabel: "See the source code",
  },
  faqTitle: "Common questions",
  faq: [
    {
      question: "What if I clear my browser data?",
      answer:
        "Your books go with it, since they live in the browser. That's why it's worth exporting a backup now and then (Settings › Export my library), or turning on sync.",
    },
    {
      question: "I'm changing phones — do I lose everything?",
      answer:
        "Not if you planned ahead: either import your backup on the new device, or sign in with your email (a code is enough, no password) and your books come back.",
    },
    {
      question: "Can I get my data out?",
      answer:
        "Yes, any time, as a JSON file, from Settings. It's yours — that's rather the point.",
    },
    {
      question: "Is sync required?",
      answer:
        "No. The app works fully without an account; sync only lets you find the same library on several devices.",
    },
  ],
  screenshotAlt:
    "The My Tsundoku board filled in: four piles of books, from wishlist to library",
  metaDescription:
    "Organize your tsundoku — the to-be-read pile — and your library in four piles: wishlist, tsundoku, library, to sell. Free, offline, open-source book tracker.",
};

export const LANDING: Record<Locale, LandingContent> = { fr: FR, en: EN };
