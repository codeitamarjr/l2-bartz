import { Link, usePage, usePoll } from '@inertiajs/react';
import { Divider, Embers, LazyVideo } from '@/components/decor';
import { HappeningSection, LivePill } from '@/components/happening';
import RacesSection from '@/components/races-section';
import { pick, useLocale, useT, type Localized } from '@/i18n';
import type { EventFeed, ServerStatus, SharedProps } from '@/types';

type Props = {
    events?: EventFeed | null;
    rates: ServerStatus['rates'];
};

const LEGENDS: { href: string; chapter: Localized; title: Localized; text: Localized }[] = [
    { href: '/lore#giants', chapter: { en: 'Chapter III', pt: 'Capítulo III' }, title: { en: 'The Fall of the Giants', pt: 'A Queda dos Gigantes' },
        text: { en: 'They dared to create life. Einhasad answered with the Hammer of Despair, and Grandferion fell in a single day.',
            pt: 'Ousaram criar vida. Einhasad respondeu com o Martelo do Desespero, e Grandferion caiu em um único dia.' } },
    { href: '/lore#shilen', chapter: { en: 'Chapter IV', pt: 'Capítulo IV' }, title: { en: "Shilen's Betrayal", pt: 'A Traição de Shilen' },
        text: { en: 'The goddess of water fell to the abyss. Her children became the Dark Elves, and her dragons sleep, waiting.',
            pt: 'A deusa da água caiu no abismo. Seus filhos se tornaram os Elfos Negros, e seus dragões dormem, à espera.' } },
    { href: '/lore#baium', chapter: { en: 'Chapter VI', pt: 'Capítulo VI' }, title: { en: 'The Tower of Insolence', pt: 'A Torre da Insolência' },
        text: { en: 'Emperor Baium built a tower to reach the gods. They sealed him at its summit, and his empire broke in two.',
            pt: 'O imperador Baium construiu uma torre para alcançar os deuses. Eles o selaram no topo, e seu império se partiu em dois.' } },
];

const FEATURES: { title: Localized; text: Localized }[] = [
    { title: { en: 'Castle Sieges', pt: 'Cercos aos Castelos' },
        text: { en: 'Weekly sieges across Aden, Giran and Rune. Forge alliances, raise banners, claim the throne.',
            pt: 'Cercos semanais em Aden, Giran e Rune. Forme alianças, erga estandartes e conquiste o trono.' } },
    { title: { en: 'Grand Olympiad', pt: 'Grande Olimpíada' },
        text: { en: 'Prove yourself in the arena and earn the glory of Hero status.', pt: 'Prove seu valor na arena e conquiste a glória de se tornar Herói.' } },
    { title: { en: 'Epic Raids', pt: 'Raids Épicas' },
        text: { en: 'Antharas, Valakas, Baium and Freya await the bravest clans.', pt: 'Antharas, Valakas, Baium e Freya aguardam os clãs mais corajosos.' } },
    { title: { en: 'Balanced Economy', pt: 'Economia Equilibrada' },
        text: { en: 'No pay-to-win. Retail-like drops and a player-driven market.', pt: 'Sem pay-to-win. Drops como no oficial e um mercado movido pelos jogadores.' } },
];

export default function Home({ events, rates }: Props) {
    usePoll(30_000, { only: ['events'] });
    const { serverName } = usePage<SharedProps>().props;
    const locale = useLocale();
    const t = useT();

    const landingRates = [
        { value: rates.xp, label: t('Experience', 'Experiência') },
        { value: rates.adena, label: 'Adena' },
        { value: rates.drop, label: 'Drop' },
        { value: rates.raid, label: t('Raid Boss', 'Raid Boss') },
    ];

    return (
        <>
            <section className="hero">
                <div className="hero-media" data-parallax="hero">
                    <video src="/assets/video/home-hero.mp4" poster="/assets/hero.jpg" autoPlay muted loop playsInline></video>
                </div>
                <div className="hero-shade"></div>
                <div className="hero-fade bg-fade"></div>
                <Embers />
                <div className="hero-content" data-parallax="hero-content">
                    <LivePill feed={events} />
                    <p className="hero-kicker">{t('The Chronicle Returns', 'A Crônica Retorna')}</p>
                    <h1 className="hero-title text-gold">L2 {serverName.toUpperCase()}</h1>
                    {/* The chronicle: Lineage II: The Chaotic Throne – Freya – High Five, split over two lines to fit. */}
                    <p className="hero-subtitle" aria-label="The Chaotic Throne – Freya – High Five">
                        <span className="hero-subtitle-series" aria-hidden="true">
                            The Chaotic Throne
                        </span>
                        <span aria-hidden="true">Freya – High Five</span>
                    </p>
                    <Divider />
                    <p className="hero-tagline">
                        {t(
                            'The gods are silent. The dragons awaken. Aden calls for heroes once more.',
                            'Os deuses estão em silêncio. Os dragões despertam. Aden chama seus heróis mais uma vez.',
                        )}
                    </p>
                    <div className="actions">
                        <a href="#join" className="btn btn-primary">{t('Start Your Journey', 'Comece Sua Jornada')}</a>
                        <a href="#world" className="btn btn-outline">{t('Discover Aden', 'Descubra Aden')}</a>
                    </div>
                </div>
                <a href="#world" className="scroll-hint">{t('Scroll', 'Role')}</a>
            </section>

            <HappeningSection feed={events} mode="compact" />

            <section id="world" className="world">
                <div className="world-bg" data-parallax="world"></div>
                <div className="world-shade"></div>
                <div className="world-content">
                    <p className="reveal kicker">{t('The World of Aden', 'O Mundo de Aden')}</p>
                    <h2 className="reveal section-title text-gold">{t('A Kingdom Forged in War', 'Um Reino Forjado na Guerra')}</h2>
                    <Divider />
                    <p className="reveal lead">
                        {t(
                            'From the frozen peaks of Schuttgart to the burning lands of Primeval Isle, the continent of Aden is torn between nine castles and countless clans. In the High Five chronicle, the Seed of Destruction blooms, Freya awakens in her icy prison, and only the strongest will write history.',
                            'Dos picos congelados de Schuttgart às terras em chamas da Primeval Isle, o continente de Aden está dividido entre nove castelos e incontáveis clãs. Na crônica High Five, a Seed of Destruction floresce, Freya desperta em sua prisão de gelo, e só os mais fortes vão escrever a história.',
                        )}
                    </p>
                    <div className="reveal actions">
                        <Link href="/map" className="btn btn-outline">{t('Explore the Live Map', 'Explore o Mapa ao Vivo')}</Link>
                    </div>
                </div>
            </section>

            <RacesSection />

            <section id="legends" className="legends">
                <div className="container">
                    <div className="section-head">
                        <p className="reveal kicker">{t('History & Lore', 'História e Lendas')}</p>
                        <h2 className="reveal section-title text-gold">{t('Legends of Aden', 'Lendas de Aden')}</h2>
                        <Divider />
                        <p className="reveal lead legends-lead">
                            {t(
                                'From the shattering of the world to the age of High Five: the gods, the Giants and the empires whose ruins you will fight over.',
                                'Da ruptura do mundo à era High Five: os deuses, os Gigantes e os impérios por cujas ruínas você vai lutar.',
                            )}
                        </p>
                    </div>
                    <div className="legends-grid">
                        {LEGENDS.map((legend, i) => (
                            <a key={legend.href} href={legend.href} className="reveal legend" style={{ transitionDelay: `${i * 120}ms` }}>
                                <span className="legend-num">{pick(locale, legend.chapter)}</span>
                                <h3>{pick(locale, legend.title)}</h3>
                                <p>{pick(locale, legend.text)}</p>
                                <span className="legend-more">{t('Read the chapter', 'Ler o capítulo')}</span>
                            </a>
                        ))}
                    </div>
                    <div className="reveal actions">
                        <a href="/lore" className="btn btn-outline">{t('Read the Full History', 'Ler a História Completa')}</a>
                    </div>
                </div>
            </section>

            <section id="features" className="features">
                <div className="container">
                    <div className="section-head">
                        <p className="reveal kicker">{t('Server Features', 'Recursos do Servidor')}</p>
                        <h2 className="reveal section-title text-gold">{t('Glory Awaits', 'A Glória Aguarda')}</h2>
                        <Divider />
                    </div>
                    <div className="features-grid">
                        {FEATURES.map((feature, i) => (
                            <div key={feature.title.en} className="reveal feature" style={{ transitionDelay: `${i * 120}ms` }}>
                                <span className="feature-num">{String(i + 1).padStart(2, '0')}</span>
                                <h3>{pick(locale, feature.title)}</h3>
                                <p>{pick(locale, feature.text)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="rates" className="rates">
                <div className="rates-media">
                    <video src="/assets/video/home-hero.mp4" autoPlay muted loop playsInline></video>
                </div>
                <div className="rates-shade"></div>
                <div className="rates-content">
                    <h2 className="reveal section-title text-gold">{t('Server Rates', 'Rates do Servidor')}</h2>
                    <Divider />
                    {/* Read from overrides/game/config/rates.properties, so they always match the server. */}
                    <div className="rates-grid">
                        {landingRates.map((rate) => (
                            <div key={rate.label} className="reveal rate">
                                <div className="rate-value text-gold">x{rate.value}</div>
                                <div className="rate-label">{rate.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="reveal actions rates-actions">
                        <a href="/about" className="btn btn-outline">{t('Live Server Status', 'Status do Servidor ao Vivo')}</a>
                    </div>
                </div>
            </section>

            <section id="join" className="join">
                <div className="join-media">
                    <LazyVideo src="/assets/video/home-join.webm" />
                </div>
                <div className="join-shade"></div>
                <div className="join-content">
                    <h2 className="reveal join-title text-gold">{t('Your Legend Begins', 'Sua Lenda Começa')}</h2>
                    <Divider />
                    <p className="reveal lead">
                        {t('Create your account, download the client and step into Aden today.', 'Crie sua conta, baixe o cliente e entre em Aden hoje mesmo.')}
                    </p>
                    <div className="reveal actions">
                        <a href="/register" className="btn btn-primary">{t('Create Account', 'Criar Conta')}</a>
                        <a href="/about#connect" className="btn btn-outline">
                            {t('Download Client', 'Baixar Cliente')}
                        </a>
                    </div>
                </div>
            </section>
        </>
    );
}
