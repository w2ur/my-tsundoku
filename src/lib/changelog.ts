type Locale = "fr" | "en";

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: Record<Locale, string[]>;
}

export const changelog: ChangelogEntry[] = [
  {
    version: "2.6.0",
    date: "2026-08-03",
    changes: {
      fr: [
        "Tout le texte secondaire est nettement plus lisible : les auteurs, les citations et les libellés étaient affichés en gris trop clair, sous le seuil de lisibilité recommandé",
        "Le zoom à deux doigts fonctionne de nouveau — il était désactivé sur toute l'application",
        "Les onglets affichent maintenant leur nom en entier sur mobile, avec de vraies icônes à la place des emojis",
        "Navigation au clavier : l'élément sélectionné est enfin visible",
        "Les animations se calment si vous avez activé « Réduire les animations » dans votre système",
        "Le bouton d'ajout ne se glisse plus sous la barre de geste de l'iPhone",
        "Les Réglages occupent toute la largeur sur ordinateur au lieu d'une colonne étroite",
      ],
      en: [
        "Secondary text is far more legible throughout: authors, quotes and labels were rendered in a grey too light to meet the recommended readability threshold",
        "Pinch-to-zoom works again — it was disabled across the whole app",
        "Tabs now show their full name on mobile, with real icons instead of emoji",
        "Keyboard navigation: the focused element is finally visible",
        "Animations settle down if you have \"Reduce motion\" enabled in your system",
        "The add button no longer slips under the iPhone gesture bar",
        "Settings uses the full width on desktop instead of a narrow column",
      ],
    },
  },
  {
    version: "2.5.0",
    date: "2026-08-03",
    changes: {
      fr: [
        "L'import de sauvegarde vérifie maintenant chaque livre avant de l'ajouter, et liste ceux qu'il ignore avec la raison — au lieu de les écarter en silence",
        "Correction : un livre à la date invalide bloquait la file de synchronisation en boucle sans jamais être signalé",
      ],
      en: [
        "Backup import now checks every book before adding it, and lists the ones it skips with the reason — instead of discarding them silently",
        "Fix: a book with an invalid date looped in the sync queue for ever without ever being reported",
      ],
    },
  },
  {
    version: "2.4.0",
    date: "2026-08-03",
    changes: {
      fr: [
        "Les livres que le cloud refuse sont maintenant signalés dans Réglages, avec la raison — ils disparaissaient silencieusement",
        "L'état de synchronisation survit au rechargement : il affiche le vrai nombre de modifications en attente au lieu de repartir sur « Synchronisé »",
        "Correction : les lectures Supabase ne passent plus par le cache hors ligne, qui pouvait renvoyer une liste périmée et faire manquer des livres",
      ],
      en: [
        "Books the cloud refuses are now reported in Settings, with the reason — they used to vanish silently",
        "Sync status survives a reload: it shows the real number of pending changes instead of resetting to \"Synced\"",
        "Fix: Supabase reads no longer go through the offline cache, which could return a stale list and cause books to be missed",
      ],
    },
  },
  {
    version: "2.3.0",
    date: "2026-08-03",
    changes: {
      fr: [
        "Correction majeure : une coupure réseau pendant l'envoi d'un livre vers le cloud pouvait le supprimer définitivement de la file de synchronisation — le livre restait alors sur un seul appareil, sans aucun message",
        "« Forcer la resynchronisation » renvoie maintenant vers le cloud tous les livres qui n'y sont jamais arrivés, au lieu de seulement récupérer les nouveautés",
      ],
      en: [
        "Major fix: a network drop while uploading a book could permanently remove it from the sync queue — the book then stayed on a single device, with no warning",
        "\"Force resync\" now re-uploads every book that never made it to the cloud, instead of only fetching what's new",
      ],
    },
  },
  {
    version: "2.2.2",
    date: "2026-07-26",
    changes: {
      fr: [
        "Correction : les livres supprimés sur un autre appareil avant la dernière mise à jour finissent enfin par disparaître",
      ],
      en: [
        "Fix: books deleted on another device before the last update now finally disappear",
      ],
    },
  },
  {
    version: "2.2.1",
    date: "2026-07-26",
    changes: {
      fr: [
        "Correction : la suppression d'un livre sur un appareil ne pouvait plus écraser une modification plus récente faite sur un autre appareil",
      ],
      en: [
        "Fix: deleting a book on one device could no longer overwrite a more recent edit made on another device",
      ],
    },
  },
  {
    version: "2.2.0",
    date: "2026-06-21",
    changes: {
      fr: [
        "Les photos de couverture rognées sont maintenant enregistrées dans le cloud (au lieu de grossir la base locale)",
        "Partagez un lien ou un titre depuis une autre app pour l'ajouter directement à votre Tsundoku",
        "Notification quand une mise à jour de l'application est disponible",
      ],
      en: [
        "Cropped cover photos are now stored in the cloud (instead of bloating local storage)",
        "Share a link or title from another app to add it directly to your Tsundoku",
        "Notification when an app update is available",
      ],
    },
  },
  {
    version: "2.1.0",
    date: "2026-06-11",
    changes: {
      fr: [
        "Page de découverte pour les nouveaux visiteurs sur la page d'accueil, et version anglaise sur /en",
      ],
      en: [
        "Discovery page for new visitors on the homepage, plus an English version at /en",
      ],
    },
  },
  {
    version: "2.0.1",
    date: "2026-03-03",
    changes: {
      fr: [
        "Connexion par code à 6 chiffres au lieu du lien magique — fonctionne dans la PWA installée",
      ],
      en: [
        "Sign in with 6-digit code instead of magic link — works in the installed PWA",
      ],
    },
  },
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
