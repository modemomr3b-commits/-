// Client-side storage cache disabled as requested
export const localCache = {
  get: async <T = any>(key: string, maxAgeMs = 0): Promise<T | null> => {
    return null;
  },

  set: async (key: string, data: any): Promise<void> => {
    // Caching disabled
  },

  remove: async (key: string): Promise<void> => {
    // Caching disabled
  },

  clearMatching: async (prefix: string): Promise<void> => {
    // Caching disabled
  },

  clearAll: async (): Promise<void> => {
    // Caching disabled
  }
};

