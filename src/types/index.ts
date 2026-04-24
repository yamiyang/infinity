export interface PageData {
  id: string;
  query: string;
  html: string;
  createdAt: number;
  parentId?: string;   // ID of the parent page (for tree-based ancestry)
  title?: string;      // Page <title> extracted after generation
  links?: string[];    // Hyperlink queries (data-q values) from generated page
}

export interface HistoryItem {
  query: string;       // The user's original input/question
  title: string;       // Page <title> from generated HTML
  description: string; // Page <meta description> from generated HTML
  links: string[];     // Hyperlink queries (data-q values) from generated page
}

export interface GenerateRequest {
  query?: string;
  title?: string;
  description?: string;
  history?: HistoryItem[];
  parentId?: string;   // Parent page ID for tree-based context
  pageId?: string;     // Current page ID (used to register in store)
}
