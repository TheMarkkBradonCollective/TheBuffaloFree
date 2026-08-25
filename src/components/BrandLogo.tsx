import { useState } from 'react';
import { Gift } from 'lucide-react';
import { APP_LOGO_SRC, SITE } from '../siteContent';
import { NEWSPAPER } from '../preview/newspaperBrand';
import { useNewspaperSkin } from '../preview/NewspaperSkinContext';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  showTitle?: boolean;
  /** Defaults to SITE.tagline */
  subtitle?: string;
  /** Square app icon only — collapsed rail, native chrome, launcher contexts. */
  compact?: boolean;
  /** Show name + tagline beside a crest-sized lockup (mobile header). */
  showTitleBesideLockup?: boolean;
}

function BrandTitleBlock({
  title,
  subtitle,
  compact = false,
}: {
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <div className="text-left min-w-0">
      <p
        className={`font-bold text-app leading-tight truncate ${
          compact ? 'text-[13px] tracking-tight' : 'text-sm'
        } tbf-brand-wordmark`}
      >
        {title}
      </p>
      <p
        className={`text-muted truncate tbf-brand-slogan ${
          compact ? 'text-[10px] leading-snug mt-0.5' : 'text-[11px]'
        }`}
      >
        {subtitle}
      </p>
    </div>
  );
}

/** Text-only newspaper nameplate — no logo artwork on the site. */
function NewspaperBrandMark({
  className = '',
  compact = false,
  showTitle = false,
  showTitleBesideLockup = false,
  tagline,
}: {
  className?: string;
  compact?: boolean;
  showTitle?: boolean;
  showTitleBesideLockup?: boolean;
  tagline: string;
}) {
  const displayName = `${NEWSPAPER.the} ${NEWSPAPER.title}`;
  const [city, free] = NEWSPAPER.title.split(' ');

  if (compact) {
    return (
      <div className={`${className} tbf-brand-crest`} aria-hidden="true">
        <span className="tbf-brand-crest__city">{city}</span>
        <span className="tbf-brand-crest__free">{free}</span>
      </div>
    );
  }

  if (showTitle || showTitleBesideLockup) {
    return (
      <div className={className}>
        <BrandTitleBlock
          title={displayName}
          subtitle={tagline}
          compact={showTitleBesideLockup}
        />
      </div>
    );
  }

  return (
    <div className={`${className} tbf-nav-wordmark`}>
      <span className="tbf-nav-wordmark__the">{NEWSPAPER.the}</span>
      <span className="tbf-nav-wordmark__city">{city}</span>
      <span className="tbf-nav-wordmark__free">{free}</span>
    </div>
  );
}

export default function BrandLogo({
  className = 'flex items-center gap-2.5 min-w-0',
  imgClassName = 'h-9 w-9 object-contain rounded-xl shrink-0 bg-transparent',
  showTitle = false,
  subtitle,
  compact = false,
  showTitleBesideLockup = false,
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const { enabled: newspaper } = useNewspaperSkin();
  const title = `${NEWSPAPER.the} ${NEWSPAPER.title}`;
  const tagline = subtitle ?? NEWSPAPER.tagline;

  if (newspaper) {
    return (
      <NewspaperBrandMark
        className={className}
        compact={compact}
        showTitle={showTitle}
        showTitleBesideLockup={showTitleBesideLockup}
        tagline={tagline}
      />
    );
  }

  const showTitleBlock = showTitle;
  const titleCompact = compact || showTitleBesideLockup;

  if (failed) {
    return (
      <div className={className}>
        <div className="w-9 h-9 bg-accent text-on-accent rounded-lg flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        {showTitleBlock && <BrandTitleBlock title={title} subtitle={tagline} compact={titleCompact} />}
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={APP_LOGO_SRC}
        alt={NEWSPAPER.name}
        className={imgClassName}
        onError={() => setFailed(true)}
      />
      {showTitleBlock && <BrandTitleBlock title={title} subtitle={tagline} compact={titleCompact} />}
    </div>
  );
}
