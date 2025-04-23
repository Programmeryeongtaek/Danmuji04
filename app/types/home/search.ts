export interface Post {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  category: string;
  createdAt: string;
}

export interface SearchResults {
  keywordResults: Post[];
  titleResults: Post[];
  contentResults: Post[];
}