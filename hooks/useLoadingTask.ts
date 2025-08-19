"use client";

import { useState, useCallback } from "react";

export function useLoadingTask() {
  const [isLoading, setIsLoading] = useState(false);

  const runWithLoading = useCallback(
    async <T>(task: () => Promise<T>): Promise<T | undefined> => {
      setIsLoading(true);
      try {
        return await task();
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { isLoading, runWithLoading };
}
