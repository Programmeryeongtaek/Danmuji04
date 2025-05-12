'use client';

import { quotes } from '@/app/dummy/quotesData';
import { useCallback, useEffect, useState } from 'react';

interface QuotesProps {
  category?: 'reading' | 'writing' | 'question';
}

const QuoteSection = ({ category }: QuotesProps) => {
  const [currentQuote, setCurrentQuote] = useState({ text: '', author: '' });

  const getQuotes = useCallback(() => {
    return category ? quotes[category] : Object.values(quotes).flat();
  }, [category]);

  useEffect(() => {
    const quotesToUse = getQuotes();
    let currentIndex = 0;

    const updateQuote = () => {
      setCurrentQuote(quotesToUse[currentIndex]);
      currentIndex = (currentIndex + 1) % quotesToUse.length;
    };

    updateQuote();
    const interval = setInterval(updateQuote, 5000);

    return () => clearInterval(interval);
  }, [category, getQuotes]);

  return (
    // TODO: 문장이 길어지면 화면에 영향을 받음. 이를 해결하거나, 문장을 나누도록 만들자.
    <div className="flex h-[150px] flex-col items-center justify-center bg-light p-6 text-center">
      <p className="mb-2 text-xl font-medium text-gray-600">
        {currentQuote.text}
      </p>
      <p className="text-sm text-gray-500">- {currentQuote.author}</p>
    </div>
  );
};

export default QuoteSection;
