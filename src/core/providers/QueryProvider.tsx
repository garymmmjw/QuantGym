import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { shouldRetryQuery } from "./queryRetry";

type QueryProviderProps = Readonly<{
  children: ReactNode;
}>;

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      networkMode: "always",
      retry: false,
    },
  },
});

export const QueryProvider = ({ children }: QueryProviderProps) => {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
