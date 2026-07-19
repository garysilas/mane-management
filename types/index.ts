export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  sortOrder: number;
  isFeatured: boolean;
  category: string | null;
};

export type PublicBarberProfile = {
  slug: string;
  name: string;
  businessName: string | null;
  location: string | null;
  timezone: string;
  bookingPolicy: string | null;
};

export type PublicBookingBootstrap = {
  barber: PublicBarberProfile;
  services: PublicService[];
};

export type Slot = {
  startTime: string;
  endTime: string;
};
