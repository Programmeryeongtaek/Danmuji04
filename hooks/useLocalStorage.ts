'use client';

import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // 로컬 스토리지에서 값을 읽어오는 함수
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // 실제 저장되는 상태
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // 초기화
  useEffect(() => {
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 값을 설정하는 함수
  const setValue = (value: T) => {
    try {
      // 함수로 전달받은 경우 처리
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      // 상태 업데이트
      setStoredValue(valueToStore);

      // 로컬 스토리지 업데이트
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}