type Locale = "fr" | "en";

export interface RoadmapItem {
  icon: string;
  title: string;
  description: string;
}

const roadmapFr: RoadmapItem[] = [
  { icon: "📷", title: "Vous l'avez déjà", description: "Scannez un livre en librairie et sachez tout de suite s'il est déjà chez vous" },
  { icon: "🇫🇷", title: "Livres français reconnus", description: "Les livres que les catalogues internationaux ignorent sont retrouvés dans le catalogue de la BnF" },
  { icon: "🔤", title: "Trier vos piles", description: "Classez une colonne par auteur, par titre ou par date d'ajout" },
  { icon: "📊", title: "Statistiques de la pile", description: "Voyez à quelle vitesse votre pile grandit, et depuis combien de temps vos livres attendent" },
  { icon: "🛒", title: "Trouver en librairie", description: "Retrouvez les livres à acheter chez votre libraire, en un geste" },
];

const roadmapEn: RoadmapItem[] = [
  { icon: "📷", title: "You already have it", description: "Scan a book in a shop and know straight away whether it is already on your shelves" },
  { icon: "🇫🇷", title: "French books recognised", description: "Books the international catalogues miss are found in the French national library catalogue" },
  { icon: "🔤", title: "Sort your piles", description: "Order a column by author, title or date added" },
  { icon: "📊", title: "Pile statistics", description: "See how fast your pile grows, and how long your books have been waiting" },
  { icon: "🛒", title: "Find in a bookshop", description: "Reach the books you mean to buy at your bookshop, in one tap" },
];

export const roadmap: Record<Locale, RoadmapItem[]> = { fr: roadmapFr, en: roadmapEn };
