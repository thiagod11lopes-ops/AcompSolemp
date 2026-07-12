export const env = {
  /** E-mail opcional aplicado ao bootstrap de gestor/admin no seed local */
  gestorGoogleEmail: (import.meta.env.VITE_GESTOR_GOOGLE_EMAIL ?? '').trim().toLowerCase(),
} as const
