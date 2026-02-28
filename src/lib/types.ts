export type Stage = "a_acheter" | "tsundoku" | "bibliotheque" | "revendre";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  stage: Stage;
  position: number;
  createdAt: number;
  updatedAt: number;
  isReading?: boolean;
  notes?: string;
  storeUrl?: string;
  isbn?: string;
  olWorkId?: string;
  deletedAt?: number;
}
