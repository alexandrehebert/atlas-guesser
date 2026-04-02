export const SUPPORTED_ADMIN_QUIZ_COUNTRIES = ['france', 'germany', 'spain', 'italy', 'canada', 'usa', 'brazil', 'china'] as const;

export type AdminQuizCountrySlug = (typeof SUPPORTED_ADMIN_QUIZ_COUNTRIES)[number];

export function isAdminQuizCountrySlug(value: string): value is AdminQuizCountrySlug {
  return SUPPORTED_ADMIN_QUIZ_COUNTRIES.includes(value as AdminQuizCountrySlug);
}