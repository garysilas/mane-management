export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

export type Slot = {
  startTime: string;
  endTime: string;
};
