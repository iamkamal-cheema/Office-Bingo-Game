export interface BingoCell {
  id: string;
  text: string;
  photos?: string[]; // Array of base64 strings
  completedAt?: number;
}

export interface BingoGame {
  id: string;
  title: string;
  size: number; // e.g., 5 for 5x5
  cells: BingoCell[];
  createdAt: number;
  theme?: string;
}

export type CreateGameParams = {
  title: string;
  size: number;
  topic?: string; // For AI generation
  customItems?: string[]; // If manual
};