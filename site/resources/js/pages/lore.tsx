import { useEffect } from 'react';
import LoreEn from '@/components/lore/lore-en';
import LorePt from '@/components/lore/lore-pt';
import { useLocale } from '@/i18n';

/**
 * History & Lore: the history of Aden up to High Five (the server's chronicle), the chronicle timeline and the pantheon.
 * Original summaries (sources in the README). The text lives in components/lore (lore-en.tsx and lore-pt.tsx); this
 * page picks the visitor's language.
 */
export default function Lore() {
	const locale = useLocale();

	// Highlight the chapter currently being read in the chapter menu.
	useEffect(() => {
		const links = [...document.querySelectorAll<HTMLAnchorElement>('.lore-toc ol a')];
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
					}
				});
			},
			{ rootMargin: '-40% 0px -55% 0px' },
		);
		document.querySelectorAll('.chapter[id]').forEach((chapter) => observer.observe(chapter));

		return () => observer.disconnect();
	}, [locale]);

	return locale === 'pt_BR' ? <LorePt /> : <LoreEn />;
}
