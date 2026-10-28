// Header state, parallax, embers, race switcher, lore chapter menu and scroll reveals.
// Shared by index.html and lore.html: every feature checks that its elements exist on the page.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Header gets a background once the page is scrolled.
const header = document.getElementById('header');
const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 40);

// Phone menu toggle.
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.getElementById('site-nav');
if (menuToggle && siteNav) {
	const setMenu = (open) => {
		siteNav.classList.toggle('is-open', open);
		menuToggle.setAttribute('aria-expanded', String(open));
		menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
	};
	menuToggle.addEventListener('click', () => setMenu(!siteNav.classList.contains('is-open')));
	siteNav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
	document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
}

// Parallax
const heroMedia = document.querySelector('[data-parallax="hero"]');
const heroContent = document.querySelector('[data-parallax="hero-content"]');
const worldBg = document.querySelector('[data-parallax="world"]');
const racePortrait = document.querySelector('.race-portrait');

// Distance (px) between an element's center and the viewport's center.
const centerOffset = (el) => {
	const r = el.getBoundingClientRect();
	return r.top + r.height / 2 - window.innerHeight / 2;
};

const updateParallax = () => {
	const y = window.scrollY;
	if (heroMedia && y < window.innerHeight * 1.5) {
		heroMedia.style.transform = `translateY(${y * 0.4}px) scale(${1 + y * 0.0003})`;
		heroContent.style.transform = `translateY(${-y * 0.2}px)`;
		heroContent.style.opacity = String(Math.max(0, 1 - y / 600));
	}
	if (worldBg) worldBg.style.transform = `translateY(${-centerOffset(worldBg.parentElement) * 0.25}px) scale(1.2)`;
	if (racePortrait) racePortrait.style.setProperty('--race-shift', `${-centerOffset(racePortrait) * 0.05}px`);
};

let ticking = false;
const onScroll = () => {
	if (ticking) return;
	ticking = true;
	requestAnimationFrame(() => {
		updateHeader();
		if (!reduceMotion) updateParallax();
		ticking = false;
	});
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
updateHeader();
if (!reduceMotion) updateParallax();

// Floating embers over the hero.
const embers = document.querySelector('.embers');
for (let i = 0; embers && i < 28; i++) {
	const s = document.createElement('span');
	const size = 2 + Math.random() * 3;
	s.className = 'ember';
	s.style.left = `${Math.random() * 100}%`;
	s.style.width = s.style.height = `${size}px`;
	s.style.animationDuration = `${8 + Math.random() * 10}s`;
	s.style.animationDelay = `${Math.random() * 10}s`;
	embers.appendChild(s);
}

// Race switcher
const RACES = {
	human: {
		name: 'Human',
		kicker: 'Knights of Aden',
		desc: 'Versatile warriors and mages, sworn to the crown. Paladins, Duelists and Archmages rise from their ranks.',
	},
	elf: {
		name: 'Elf',
		kicker: 'Children of Eva',
		desc: 'Agile and graceful, gifted in magic and precision. Templars, Sword Muses and Moonlight Sentinels guard the forests of Aden.',
	},
	darkelf: {
		name: 'Dark Elf',
		kicker: 'Children of Shilen',
		desc: 'Masters of forbidden magic and deadly blades. Spellhowlers and Ghost Hunters strike from the shadows.',
	},
	orc: {
		name: 'Orc',
		kicker: "Sons of Pa'agrio",
		desc: 'Unbreakable fury and fire. Titans, Tyrants and Overlords shake the battlefield.',
	},
	dwarf: {
		name: 'Dwarf',
		kicker: 'Children of Maphr',
		desc: 'Sturdy defenders and master artisans. Fortune Seekers and Maestros dig, craft and fight for every adena.',
	},
	kamael: {
		name: 'Kamael',
		kicker: 'The Winged Ones',
		desc: 'Winged warriors forged for war. Doombringers, Soul Hounds and Tricksters wield ancient soul magic.',
	},
};

document.querySelectorAll('.race-tab').forEach((tab) => {
	tab.addEventListener('click', () => {
		const key = tab.dataset.race;
		const race = RACES[key];
		document.querySelectorAll('.race-tab').forEach((t) => {
			const active = t === tab;
			t.classList.toggle('is-active', active);
			t.setAttribute('aria-selected', String(active));
		});
		document.querySelectorAll('.race-portrait img').forEach((img) => {
			img.classList.toggle('is-active', img.dataset.race === key);
		});
		document.getElementById('race-name').textContent = race.name;
		document.getElementById('race-kicker').textContent = race.kicker;
		document.getElementById('race-desc').textContent = race.desc;
	});
});

// Background videos with data-src load and play only when their section is about to scroll into view.
const lazyVideos = new IntersectionObserver((entries) => {
	entries.forEach((entry) => {
		if (!entry.isIntersecting) return;
		const video = entry.target;
		video.src = video.dataset.src;
		video.play().catch(() => {});
		lazyVideos.unobserve(video);
	});
}, { rootMargin: '600px 0px' });
if (!reduceMotion) document.querySelectorAll('video[data-src]').forEach((v) => lazyVideos.observe(v));

// Lore page: highlight the chapter currently being read in the chapter menu.
const tocLinks = [...document.querySelectorAll('.lore-toc ol a')];
if (tocLinks.length) {
	const chapterObserver = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (!entry.isIntersecting) return;
			tocLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
		});
	}, { rootMargin: '-40% 0px -55% 0px' });
	document.querySelectorAll('.chapter[id]').forEach((c) => chapterObserver.observe(c));
}

// Fade/slide sections in as they enter the viewport.
const observer = new IntersectionObserver((entries) => {
	entries.forEach((entry) => {
		if (entry.isIntersecting) {
			entry.target.classList.add('in');
			observer.unobserve(entry.target);
		}
	});
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
