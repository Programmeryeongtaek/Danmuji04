import { useEffect, useState } from 'react';

import { SearchResults } from '../app/types/home/search';
import { dummyPosts } from '@/app/dummy/searchData';

function useSearch(initialSearchTerm: string = '') {
  const [searchResults, setSearchResults] = useState<SearchResults>({
    keywordResults: [],
    titleResults: [],
    contentResults: []
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!initialSearchTerm.trim()) {
      setSearchResults({
        keywordResults: [],
        titleResults: [],
        contentResults: []
      });
      return;
    }

    setIsLoading(true);

    const results = {
      keywordResults: dummyPosts.filter(post => 
        post.keywords.some(keyword => 
          keyword.toLowerCase().includes(initialSearchTerm.toLowerCase())
        )
      ),
      titleResults: dummyPosts.filter(post => 
        post.title.toLowerCase().includes(initialSearchTerm.toLowerCase())
      ),
      contentResults: dummyPosts.filter(post => {
        if (post.category !== '프로그래밍') return false;
        
        const regex = new RegExp(initialSearchTerm, 'gi');
        const matches = post.content.match(regex);
        return matches && matches.length >= 3;
      })
    };

    setSearchResults(results);
    setIsLoading(false);
  }, [initialSearchTerm])

  return {
    searchResults,
    isLoading
  }
}

export default useSearch;