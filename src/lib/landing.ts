type Locale = "fr" | "en";

export interface LandingSectionContent {
  title: string;
  body: string;
}

export interface LandingContent {
  heroTitle: string;
  heroSubtitle: string;
  sections: LandingSectionContent[];
  ctaLabel: string;
  metaDescription: string;
}

const FR: LandingContent = {
  heroTitle: "Votre pile à lire, enfin organisée",
  heroSubtitle:
    "My Tsundoku range votre PAL et votre bibliothèque en quatre piles claires. Gratuit, hors ligne, sans compte obligatoire.",
  sections: [
    {
      title: "Une PAL qui ressemble à quelque chose",
      body: "Quatre piles : envies d'achat, tsundoku (la pile à lire), bibliothèque, à revendre. Vous glissez vos livres d'une pile à l'autre au fil de vos lectures, comme sur une étagère.",
    },
    {
      title: "Un livre ajouté en quelques secondes",
      body: "Scannez le code-barres ISBN et la fiche se remplit toute seule — titre, auteur, couverture, via Open Library. Ou saisissez tout à la main si vous préférez.",
    },
    {
      title: "Vos données restent chez vous",
      body: "Tout est stocké sur votre appareil et fonctionne hors ligne. L'application s'installe sur votre téléphone comme une app native. La synchronisation entre appareils existe, mais elle est optionnelle.",
    },
    {
      title: "Gratuit et open source",
      body: "My Tsundoku est un logiciel libre (AGPL), sans publicité et sans tracking. Organiser sa bibliothèque ne devrait rien coûter.",
    },
  ],
  ctaLabel: "Ajouter mon premier livre",
  metaDescription:
    "Organisez votre pile à lire (PAL) et votre bibliothèque en quatre piles : envies, tsundoku, bibliothèque, à revendre. Gratuit, hors ligne, open source.",
};

const EN: LandingContent = {
  heroTitle: "Your to-be-read pile, finally organized",
  heroSubtitle:
    "My Tsundoku sorts your book collection into four clear piles. Free, offline-first, no account required.",
  sections: [
    {
      title: "A book tracker shaped like your shelves",
      body: "Four piles: wishlist, tsundoku (the to-be-read pile), library, to sell. Drag books from pile to pile as your reading life moves on.",
    },
    {
      title: "Add a book in seconds",
      body: "Scan the ISBN barcode and the details fill themselves in — title, author, cover, via Open Library. Or type everything in manually if you prefer.",
    },
    {
      title: "Your data stays with you",
      body: "Everything is stored on your device and works offline. Install it on your phone like a native app. A simple alternative to Goodreads for tracking what you own and what you'll read next. Cross-device sync exists, but it's optional.",
    },
    {
      title: "Free and open source",
      body: "My Tsundoku is free software (AGPL), with no ads and no tracking. Organizing your library shouldn't cost anything.",
    },
  ],
  ctaLabel: "Add my first book",
  metaDescription:
    "Organize your tsundoku — the to-be-read pile — and your library in four piles: wishlist, tsundoku, library, to sell. Free, offline, open-source book tracker.",
};

export const LANDING: Record<Locale, LandingContent> = { fr: FR, en: EN };
