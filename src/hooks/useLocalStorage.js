import { useState, useEffect } from 'react';

// useLocalStorage: works just like useState, but automatically saves your
// data to the browser's localStorage so it survives a page refresh.
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('localStorage error:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
