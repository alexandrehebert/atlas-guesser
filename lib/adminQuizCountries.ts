export const SUPPORTED_ADMIN_QUIZ_COUNTRIES = ['france', 'germany', 'spain', 'italy', 'canada', 'usa', 'brazil', 'china', 'india', 'russia', 'australia', 'argentina', 'algeria'] as const;

export type AdminQuizCountrySlug = (typeof SUPPORTED_ADMIN_QUIZ_COUNTRIES)[number];

export const ADMIN_QUIZ_COUNTRY_CODES: Record<AdminQuizCountrySlug, string> = {
  france: 'FR',
  germany: 'DE',
  spain: 'ES',
  italy: 'IT',
  canada: 'CA',
  usa: 'US',
  brazil: 'BR',
  china: 'CN',
  india: 'IN',
  russia: 'RU',
  australia: 'AU',
  argentina: 'AR',
  algeria: 'DZ',
};

export function isAdminQuizCountrySlug(value: string): value is AdminQuizCountrySlug {
  return SUPPORTED_ADMIN_QUIZ_COUNTRIES.includes(value as AdminQuizCountrySlug);
}