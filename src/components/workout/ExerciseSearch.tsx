'use client';

import { useState, useRef, useEffect } from 'react';
import { useExercises } from '@/hooks/useExercises';
import type { Exercise } from '@/types/domain';

interface ExerciseSearchProps {
  onSelect: (exercise: Exercise) => void;
}

export default function ExerciseSearch({ onSelect }: ExerciseSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: exercises = [], isLoading } = useExercises(query);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="種目を検索..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-gray-400">検索中...</div>
          )}
          {!isLoading && exercises.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">見つかりません</div>
          )}
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleSelect(ex)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">{ex.nameJa}</span>
              <span className="text-gray-400 ml-2 text-xs">{ex.nameEn}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
