type Locale = "fr" | "en";

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: Record<Locale, string[]>;
}

export const changelog: ChangelogEntry[] = [
  {
    version: "2.0.0",
    date: "2026-02-28",
    changes: {
      fr: [
        "Nouveau : créez un compte pour synchroniser vos livres entre vos appareils",
        "Sauvegarde automatique dans le cloud à chaque modification",
        "Couvertures générées pour les livres sans image",
        "Recadrage des photos de couverture avant l'ajout",
        "Catalogue communautaire : les livres ajoutés manuellement enrichissent la recherche pour tous",
        "Recherche enrichie : résultats Open Library + catalogue communautaire",
        "Passage de l'ISBN scanné vers la saisie manuelle en cas d'échec",
        "Suppression de compte et des données associées",
      ],
      en: [
        "New: create an account to sync your books across devices",
        "Automatic cloud backup on every change",
        "Generated covers for books without an image",
        "Crop cover photos before adding them",
        "Community catalog: manually-added books enrich search for everyone",
        "Enriched search: Open Library + community catalog results",
        "Pass scanned ISBN to manual entry on lookup failure",
        "Delete account and associated data",
      ],
    },
  },
  {
    version: "1.8.1",
    date: "2026-02-25",
    changes: {
      fr: [
        "Correction : le bouton + sur mobile ajoute maintenant dans la pile active, pas toujours dans tsundoku",
      ],
      en: [
        "Fix: the + button on mobile now adds to the active pile, not always to tsundoku",
      ],
    },
  },
  {
    version: "1.8.0",
    date: "2026-02-24",
    changes: {
      fr: [
        "Nouveau moteur de glisser-déposer pour une meilleure compatibilité iOS Safari",
        "Les livres montrent un espace de destination lors du déplacement entre colonnes (bureau et mobile)",
        "Mobile : swipe rapide pour changer d'étape + appui long pour glisser-déposer complet avec colonne adjacente",
        "Le livre suit le curseur librement entre les colonnes sur bureau",
      ],
      en: [
        "New drag-and-drop engine for better iOS Safari compatibility",
        "Books show a placeholder gap when dragging between columns (desktop and mobile)",
        "Mobile: quick swipe for stage changes + long-press for full drag with adjacent column slide-in",
        "Books follow the cursor freely across columns on desktop",
      ],
    },
  },
  {
    version: "1.7.0",
    date: "2026-02-22",
    changes: {
      fr: [
        "Recherche rapide : touchez un résultat pour accéder directement au livre dans sa colonne",
        "Marquez vos livres « en cours de lecture » — ils montent automatiquement en haut de la pile",
      ],
      en: [
        "Quick search: tap a result to jump directly to the book in its column",
        "Mark books as \"currently reading\" — they automatically move to the top of the pile",
      ],
    },
  },
  {
    version: "1.6.0",
    date: "2026-02-22",
    changes: {
      fr: ["Interface disponible en anglais", "Mode sombre avec palette littéraire", "Section Préférences dans les paramètres"],
      en: ["Interface available in English", "Dark mode with a literary palette", "Preferences section in settings"],
    },
  },
  {
    version: "1.5.0",
    date: "2026-02-21",
    changes: {
      fr: ["Nouveau swipe en deux étapes sur mobile : glissez pour prévisualiser, puis confirmez", "Retour haptique lors du swipe (sur appareils compatibles)", "Reprise du swipe depuis la position ouverte sans réinitialisation"],
      en: ["New two-step swipe on mobile: swipe to preview, then confirm", "Haptic feedback during swipe (on compatible devices)", "Resume swiping from the open position without resetting"],
    },
  },
  {
    version: "1.4.0",
    date: "2026-02-20",
    changes: {
      fr: ["Réorganisation des livres par glisser-déposer dans chaque colonne", "Les livres déplacés arrivent en haut de la pile"],
      en: ["Reorder books by drag and drop within each column", "Moved books land at the top of the pile"],
    },
  },
  {
    version: "1.3.0",
    date: "2026-02-20",
    changes: {
      fr: ["Recherche rapide depuis le tableau : filtrez vos livres par titre ou auteur"],
      en: ["Quick search from the board: filter your books by title or author"],
    },
  },
  {
    version: "1.2.3",
    date: "2026-02-20",
    changes: {
      fr: ["Le bouton + sur mobile redirige vers tsundoku par défaut", "Les sections Prochainement et Nouveautés sont désormais repliables dans les paramètres"],
      en: ["The + button on mobile defaults to tsundoku", "Coming Soon and What's New sections are now collapsible in settings"],
    },
  },
  {
    version: "1.2.2",
    date: "2026-02-20",
    changes: {
      fr: ["Correction de l'affichage des couvertures ajoutées par URL"],
      en: ["Fix display of covers added by URL"],
    },
  },
  {
    version: "1.2.1",
    date: "2026-02-20",
    changes: {
      fr: ["Bouton + dans chaque colonne sur bureau", "Suppression du bouton flottant sur bureau", "Suppression du bouton « Ajouter un livre » dans les colonnes vides"],
      en: ["+ button in each column on desktop", "Removed floating button on desktop", "Removed 'Add a book' button in empty columns"],
    },
  },
  {
    version: "1.2.0",
    date: "2026-02-20",
    changes: {
      fr: ["Recherche Open Library : bouton Rechercher au lieu de la recherche automatique", "Résultats de recherche affichés dans le formulaire avec miniatures de couverture", "Choix de l'étape lors de l'ajout sur bureau"],
      en: ["Open Library search: Search button instead of automatic search", "Search results shown in the form with cover thumbnails", "Stage selection when adding on desktop"],
    },
  },
  {
    version: "1.1.0",
    date: "2026-02-20",
    changes: {
      fr: ["Recherche Open Library plus compacte et moins intrusive", "Mode édition : recherche Open Library optionnelle (plus de clics accidentels)", "Le bouton + ajoute maintenant dans l'étape active", "Retour automatique à l'étape d'origine après ajout d'un livre"],
      en: ["More compact and less intrusive Open Library search", "Edit mode: optional Open Library search (no more accidental clicks)", "The + button now adds to the active stage", "Automatic return to the original stage after adding a book"],
    },
  },
  {
    version: "1.0.0",
    date: "2026-02-18",
    changes: {
      fr: ["Lancement public de Tsundoku", "Tableau Kanban avec 4 étapes : à acheter, tsundoku, bibliothèque, s'en séparer", "Ajout de livres par scan de code-barres, recherche Open Library, ou saisie manuelle", "Glisser-déposer pour déplacer les livres entre les étapes", "Sauvegarde et restauration de la bibliothèque en JSON", "Application installable (PWA) avec mode hors-ligne"],
      en: ["Public launch of Tsundoku", "Kanban board with 4 stages: wishlist, tsundoku, library, to sell", "Add books by barcode scan, Open Library search, or manual entry", "Drag and drop to move books between stages", "Backup and restore your library as JSON", "Installable app (PWA) with offline mode"],
    },
  },
];
