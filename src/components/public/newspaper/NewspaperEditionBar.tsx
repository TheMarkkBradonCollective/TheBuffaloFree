import { formatNewspaperDate, NEWSPAPER } from '../../../preview/newspaperBrand';
import { useNewspaperSkin } from '../../../preview/NewspaperSkinContext';

/** Decorative dateline strip — preview skin only; does not change app structure. */
export default function NewspaperEditionBar() {
  const { enabled } = useNewspaperSkin();
  if (!enabled) return null;

  return (
    <div className="tbf-edition-bar" aria-hidden="true">
      <div className="tbf-edition-bar__rule tbf-edition-bar__rule--thin" />
      <div className="tbf-edition-bar__inner">
        <span className="tbf-edition-bar__date">{formatNewspaperDate()}</span>
        <span className="tbf-edition-bar__city">{NEWSPAPER.city}</span>
        <span className="tbf-edition-bar__meta">
          Vol. I · No. 1 · {NEWSPAPER.price}
        </span>
      </div>
      <div className="tbf-edition-bar__rule tbf-edition-bar__rule--thick" />
    </div>
  );
}
