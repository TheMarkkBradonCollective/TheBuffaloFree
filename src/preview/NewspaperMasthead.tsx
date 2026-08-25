import { formatNewspaperDate, NEWSPAPER } from './newspaperBrand';
import { useNewspaperSkin } from './NewspaperSkinContext';

interface NewspaperMastheadProps {
  /** `front` is the full front-page crest; `banner` is the nameplate over every page. */
  variant?: 'front' | 'banner' | 'compact';
  className?: string;
  onHomeClick?: () => void;
}

function MastheadWordmark({ onHomeClick }: { onHomeClick?: () => void }) {
  const [city, free] = NEWSPAPER.title.split(' ');

  const content = (
    <>
      <span className="tbf-masthead__the">{NEWSPAPER.the}</span>
      <span className="tbf-masthead__name">{city}</span>
      <span className="tbf-masthead__free">{free}</span>
    </>
  );

  if (onHomeClick) {
    return (
      <button
        type="button"
        className="tbf-masthead__wordmark"
        onClick={onHomeClick}
        aria-label={`${NEWSPAPER.the} ${NEWSPAPER.title} home`}
      >
        {content}
      </button>
    );
  }

  return <p className="tbf-masthead__wordmark">{content}</p>;
}

/**
 * The nameplate for The Buffalo Free. The publication title is not a page
 * headline — the lead story carries the h1.
 */
export default function NewspaperMasthead({
  variant = 'front',
  className = '',
  onHomeClick,
}: NewspaperMastheadProps) {
  const { enabled } = useNewspaperSkin();
  if (!enabled) return null;

  return (
    <header className={`tbf-masthead tbf-masthead--${variant} ${className}`.trim()}>
      {variant === 'front' && (
        <>
          <div className="tbf-masthead__strip">
            <span className="tbf-masthead__strip-item">{NEWSPAPER.edition}</span>
            <span className="tbf-masthead__strip-item tbf-masthead__strip-item--center">{NEWSPAPER.motto}</span>
            <span className="tbf-masthead__strip-item tbf-masthead__strip-item--end">{NEWSPAPER.volume}</span>
          </div>
          <div className="tbf-masthead__rule tbf-masthead__rule--hair" />
        </>
      )}

      <div className="tbf-masthead__crest">
        <MastheadWordmark onHomeClick={onHomeClick} />
      </div>

      {variant === 'front' && (
        <>
          <div className="tbf-masthead__rule tbf-masthead__rule--double" />
          <div className="tbf-masthead__dateline">
            <span>{NEWSPAPER.cityLine}</span>
            <span className="tbf-masthead__dateline-date">{formatNewspaperDate()}</span>
            <span className="tbf-masthead__dateline-price">{NEWSPAPER.price}</span>
          </div>
          <div className="tbf-masthead__rule tbf-masthead__rule--hair" />
        </>
      )}
    </header>
  );
}
