import type { CountryShapePreview } from '~/lib/server/adminQuizCountryShapePreviews';

interface CountryShapeIconProps {
  preview: CountryShapePreview;
  className?: string;
}

export default function CountryShapeIcon({ preview, className }: CountryShapeIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${preview.viewBox.width} ${preview.viewBox.height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={preview.path} fill="currentColor" />
    </svg>
  );
}