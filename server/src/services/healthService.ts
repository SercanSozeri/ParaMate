export interface HealthResponse {
  ok: boolean;
  timestamp: string;
  service: string;
}

export const checkHealth = (): HealthResponse => {
  return {
    ok: true,
    timestamp: new Date().toISOString(),
    service: 'ParaMate API'
  };
};

