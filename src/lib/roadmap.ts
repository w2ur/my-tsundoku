type Locale = "fr" | "en";

export interface RoadmapItem {
  icon: string;
  title: string;
  description: string;
}

const roadmapFr: RoadmapItem[] = [
  { icon: "🔤", title: "Trier vos piles", description: "Classez une colonne par auteur, par titre ou par date d'ajout" },
  { icon: "📊", title: "Statistiques de la pile", description: "Voyez à quelle vitesse votre pile grandit, et depuis combien de temps vos livres attendent" },
  { icon: "🛒", title: "Trouver en librairie", description: "Retrouvez les livres à acheter chez votre libraire, en un geste" },
];

const roadmapEn: RoadmapItem[] = [
  { icon: "🔤", title: "Sort your piles", description: "Order a column by author, title or date added" },
  { icon: "📊", title: "Pile statistics", description: "See how fast your pile grows, and how long your books have been waiting" },
  { icon: "🛒", title: "Find in a bookshop", description: "Reach the books you mean to buy at your bookshop, in one tap" },
];

export const roadmap: Record<Locale, RoadmapItem[]> = { fr: roadmapFr, en: roadmapEn };
