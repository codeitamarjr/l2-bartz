import { Link, usePoll } from '@inertiajs/react';
import { Divider } from '@/components/decor';
import PageHero from '@/components/page-hero';
import { HappeningSection } from '@/components/happening';
import { languageTag, pick, raceName, useLocale, useT, type Localized } from '@/i18n';
import type { EventFeed, ServerStatus } from '@/types';

type Props = {
    status: ServerStatus;
    events?: EventFeed | null;
};

// What kind of server this is. L2J's licence asks servers to credit the L2J developers and never to distribute world
// content (client files); NCSOFT owns Lineage II, so the server says plainly that it is an unofficial fan project.
const FREE_SERVER: { title: Localized; text: Localized }[] = [
    {
        title: { en: 'Free to Play', pt: 'Gratuito' },
        text: {
            en: 'No subscription and no client fee. Create an account on this website and you are ready to play.',
            pt: 'Sem assinatura e sem taxa pelo cliente. Crie uma conta neste site e você já pode jogar.',
        },
    },
    {
        title: { en: 'Open Source', pt: 'Código Aberto' },
        text: {
            en: 'Runs on L2J Server, the open-source Java emulator of the High Five chronicle, built by the L2J developers in their free time.',
            pt: 'Roda no L2J Server, o emulador Java de código aberto da crônica High Five, feito pelos desenvolvedores do L2J no seu tempo livre.',
        },
    },
    {
        title: { en: 'Community Run', pt: 'Feito pela Comunidade' },
        text: {
            en: 'An independent, non-commercial server, hosted by players for players. Play fair and respect each other.',
            pt: 'Um servidor independente e sem fins lucrativos, mantido por jogadores para jogadores. Jogue limpo e respeite os outros.',
        },
    },
    {
        title: { en: 'Unofficial', pt: 'Não Oficial' },
        text: {
            en: 'Not affiliated with or endorsed by NCSOFT. Bring your own High Five client: no game files are distributed here.',
            pt: 'Sem vínculo nem endosso da NCSOFT. Traga seu próprio cliente High Five: nenhum arquivo do jogo é distribuído aqui.',
        },
    },
];

const RATE_CARDS: [keyof ServerStatus['rates'], Localized][] = [
    ['xp', { en: 'Experience', pt: 'Experiência' }],
    ['sp', { en: 'Skill Points', pt: 'Pontos de Habilidade' }],
    ['adena', { en: 'Adena', pt: 'Adena' }],
    ['drop', { en: 'Drop', pt: 'Drop' }],
    ['spoil', { en: 'Spoil', pt: 'Spoil' }],
    ['raid', { en: 'Raid Boss', pt: 'Raid Boss' }],
    ['questXp', { en: 'Quest XP / SP', pt: 'XP / SP de Missões' }],
    ['questAdena', { en: 'Quest Adena', pt: 'Adena de Missões' }],
];

const TOTALS: Record<'accounts' | 'characters' | 'clans', Localized> = {
    accounts: { en: 'accounts', pt: 'contas' },
    characters: { en: 'characters', pt: 'personagens' },
    clans: { en: 'clans', pt: 'clãs' },
};

function StatusCard({ label, up, note }: { label: string; up: boolean; note: string }) {
    return (
        <div className={`status-card ${up ? 'is-online' : 'is-offline'}`}>
            <p className="status-label">{label}</p>
            <p className="status-value">
                <span className="status-dot" aria-hidden="true"></span>
                <span className="status-text">{up ? 'Online' : 'Offline'}</span>
            </p>
            <p className="status-note">{note}</p>
        </div>
    );
}

function Ranking({ title, rows }: { title: string; rows: { name: string; race: string; level: number; value: string }[] }) {
    const locale = useLocale();
    const t = useT();

    return (
        <div className="ranking">
            <h3 className="about-subtitle">{title}</h3>
            <ol className="ranking-list">
                {rows.length ? (
                    rows.map((row) => (
                        <li key={row.name} className="ranking-row">
                            <span className="ranking-name">
                                {row.name}
                                <span className="ranking-meta">
                                    {raceName(locale, row.race)} · Lv {row.level}
                                </span>
                            </span>
                            <span className="ranking-value text-gold">{row.value}</span>
                        </li>
                    ))
                ) : (
                    <li className="about-empty">{t('No heroes yet. Be the first.', 'Nenhum herói ainda. Seja o primeiro.')}</li>
                )}
            </ol>
        </div>
    );
}

export default function About({ status, events }: Props) {
    usePoll(30_000, { only: ['status', 'events'] });
    const locale = useLocale();
    const t = useT();
    const fmt = (n: number) => n.toLocaleString(languageTag(locale));

    const { server, rates, races = [], top, castles = [] } = status;
    const raceTotal = races.reduce((sum, race) => sum + race.count, 0);
    const updated = new Date(status.generatedAt).toLocaleTimeString(languageTag(locale), { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <>
            <PageHero
                className="about-hero"
                kicker={t('Server Information', 'Informações do Servidor')}
                title={server.name}
                tagline={t(
                    `A ${server.chronicle} server. Live status of the realm, updated every 30 seconds.`,
                    `Um servidor ${server.chronicle}. Status do reino ao vivo, atualizado a cada 30 segundos.`,
                )}
                video={{ src: '/assets/video/about-hero.mp4', poster: '/assets/video/about-hero-poster.jpg' }}
            >
                <p className="about-updated" aria-live="polite">
                    {t('Updated', 'Atualizado às')} {updated}
                    {status.status.database ? '' : t(' · world statistics temporarily unavailable', ' · estatísticas do mundo temporariamente indisponíveis')}
                </p>
            </PageHero>

            <section className="about-section" id="status">
                <div className="container">
                    <div className="status-grid">
                        <StatusCard label={t('Login Server', 'Servidor de Login')} up={status.status.login} note={`${t('Port', 'Porta')} 2106`} />
                        <StatusCard label={t('Game Server', 'Servidor do Jogo')} up={status.status.game} note={`${t('Port', 'Porta')} 7777`} />
                        <div className="status-card">
                            <p className="status-label">{t('Players Online', 'Jogadores Online')}</p>
                            <p className="status-value status-number text-gold">{status.players ? fmt(status.players.online) : '—'}</p>
                            <p className="status-note">{t('Right now', 'Agora mesmo')}</p>
                        </div>
                        <div className="status-card">
                            <p className="status-label">Geodata</p>
                            <p className="status-value status-number text-gold">{fmt(server.geodataRegions)}</p>
                            <p className="status-note">{t('Regions loaded', 'Regiões carregadas')}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="about-section" id="free-server">
                <div className="container">
                    <div className="section-head">
                        <p className="reveal kicker">{t(`What is ${server.name}?`, `O que é o ${server.name}?`)}</p>
                        <h2 className="reveal section-title text-gold">{t('A Free Server', 'Um Servidor Gratuito')}</h2>
                        <Divider />
                        <p className="reveal lead">
                            {t(
                                `${server.name} is a free, community-run alternative to the official Lineage II servers, set in the ${server.chronicle} chronicle.`,
                                `${server.name} é uma alternativa gratuita e mantida pela comunidade aos servidores oficiais de Lineage II, na crônica ${server.chronicle}.`,
                            )}
                        </p>
                    </div>
                    <div className="features-grid">
                        {FREE_SERVER.map((item, i) => (
                            <div key={item.title.en} className="reveal feature" style={{ transitionDelay: `${i * 120}ms` }}>
                                <span className="feature-num">{String(i + 1).padStart(2, '0')}</span>
                                <h3>{pick(locale, item.title)}</h3>
                                <p>{pick(locale, item.text)}</p>
                            </div>
                        ))}
                    </div>
                    <p className="about-footnote">
                        {t('Powered by', 'Feito com')}{' '}
                        <a className="text-link" href="https://www.l2jserver.com/" target="_blank" rel="noopener noreferrer">
                            L2J Server
                        </a>
                        {t(', free software under the', ', software livre sob a licença')}{' '}
                        <a className="text-link" href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">
                            GNU GPL v3
                        </a>
                        {t('. Lineage II is a trademark of NCSOFT Corporation.', '. Lineage II é uma marca registrada da NCSOFT Corporation.')}
                    </p>
                </div>
            </section>

            <HappeningSection feed={events} mode="full" />

            <section className="about-section" id="rates">
                <div className="container">
                    <div className="section-head">
                        <p className="reveal kicker">{t("Read from the server's config", 'Lidas da configuração do servidor')}</p>
                        <h2 className="reveal section-title text-gold">{t('Server Rates', 'Rates do Servidor')}</h2>
                        <Divider />
                    </div>
                    <div className="about-rates">
                        {RATE_CARDS.map(([key, label]) => (
                            <div key={key} className="rate">
                                <div className="rate-value text-gold">x{rates[key]}</div>
                                <div className="rate-label">{pick(locale, label)}</div>
                            </div>
                        ))}
                    </div>
                    <p className="about-footnote">
                        {t(
                            `Party XP bonus, herbs, manor and quest item drops are retail (x1). Max level ${server.maxLevel}.`,
                            `Bônus de XP em grupo, ervas, manor e drops de itens de missão são retail (x1). Nível máximo ${server.maxLevel}.`,
                        )}
                    </p>
                </div>
            </section>

            <section className="about-section" id="world-stats">
                <div className="container">
                    <div className="section-head">
                        <p className="reveal kicker">{t('The realm in numbers', 'O reino em números')}</p>
                        <h2 className="reveal section-title text-gold">{t('World Statistics', 'Estatísticas do Mundo')}</h2>
                        <Divider />
                    </div>
                    <div className="totals-grid">
                        {(['accounts', 'characters', 'clans'] as const).map((key) => (
                            <div key={key} className="total">
                                <p className="total-value text-gold">{status.totals ? fmt(status.totals[key]) : '—'}</p>
                                <p className="total-label">{pick(locale, TOTALS[key])}</p>
                            </div>
                        ))}
                    </div>
                    <h3 className="about-subtitle">{t('Races of Aden', 'Raças de Aden')}</h3>
                    <div className="race-bars">
                        {races.length ? (
                            races.map((race) => {
                                const pct = raceTotal ? Math.round((race.count / raceTotal) * 100) : 0;

                                return (
                                    <div key={race.name} className="race-bar">
                                        <span className="race-bar-name">{raceName(locale, race.name)}</span>
                                        <span className="race-bar-track">
                                            <span className="race-bar-fill" style={{ width: `${pct}%` }}></span>
                                        </span>
                                        <span className="race-bar-count">
                                            {fmt(race.count)} · {pct}%
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="about-empty">{t('Waiting for the realm…', 'Aguardando o reino…')}</p>
                        )}
                    </div>
                </div>
            </section>

            <section className="about-section" id="rankings">
                <div className="container">
                    <div className="section-head">
                        <p className="reveal kicker">{t('Heroes of the realm', 'Heróis do reino')}</p>
                        <h2 className="reveal section-title text-gold">{t('Top Players', 'Melhores Jogadores')}</h2>
                        <Divider />
                    </div>
                    <div className="rankings-grid">
                        <Ranking title={t('Highest Level', 'Maior Nível')} rows={(top?.level ?? []).map((row) => ({ ...row, value: `Lv ${row.level}` }))} />
                        <Ranking title={t('Most PvP Kills', 'Mais Vitórias PvP')} rows={(top?.pvp ?? []).map((row) => ({ ...row, value: fmt(row.pvp) }))} />
                    </div>
                    <p className="about-footnote">{t('Game Masters are not ranked.', 'Game Masters não entram no ranking.')}</p>
                </div>
            </section>

            <section className="about-section" id="castles">
                <div className="container">
                    <div className="section-head">
                        <p className="reveal kicker">{t('Lords of the land', 'Senhores da terra')}</p>
                        <h2 className="reveal section-title text-gold">{t('Castles', 'Castelos')}</h2>
                        <Divider />
                    </div>
                    <div className="castle-grid">
                        {castles.map((castle) => (
                            <div key={castle.name} className={`castle${castle.owner ? ' is-owned' : ''}`}>
                                <p className="castle-name">{castle.name}</p>
                                <p className="castle-owner">{castle.owner ?? t('Unclaimed', 'Sem dono')}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="about-section about-connect" id="connect">
                <div className="container">
                    <div className="section-head">
                        <p className="reveal kicker">{t('Join the realm', 'Entre no reino')}</p>
                        <h2 className="reveal section-title text-gold">{t('How to Connect', 'Como se Conectar')}</h2>
                        <Divider />
                    </div>
                    <ol className="connect-steps">
                        <li>
                            <h3>{t('Get the client', 'Consiga o cliente')}</h3>
                            <p>
                                {t(
                                    <>
                                        A clean <strong>Lineage II High Five Part 5</strong> client (Windows; on macOS through CrossOver, Whisky or a virtual
                                        machine).
                                    </>,
                                    <>
                                        Um cliente <strong>Lineage II High Five Part 5</strong> limpo (Windows; no macOS pelo CrossOver, Whisky ou uma máquina
                                        virtual).
                                    </>,
                                )}
                            </p>
                            <p>
                                <a
                                    className="btn btn-outline btn-small connect-download"
                                    href="https://www.lineage2.org.uk/download/lineage-ii-the-chaotic-throne-freya-high-five/"
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                >
                                    {t('Download the client', 'Baixar o cliente')}
                                </a>
                                <span className="connect-download-note">
                                    {t(
                                        'Lineage II: The Chaotic Throne – Freya – High Five, about 5.7 GB, from lineage2.org.uk.',
                                        'Lineage II: The Chaotic Throne – Freya – High Five, cerca de 5,7 GB, do lineage2.org.uk.',
                                    )}
                                </span>
                            </p>
                        </li>
                        <li>
                            <h3>{t('Start the game with the Bartz launcher', 'Inicie o jogo com o launcher do Bartz')}</h3>
                            <p>
                                {t(
                                    <>
                                        Download <strong>start-L2-Bartz.bat</strong>, put it in the <code>system</code> folder of your client (next to{' '}
                                        <code>L2.bin</code>) and double-click it to play. It connects to Bartz by itself: no settings to change, and it keeps
                                        working even if the server's address changes.
                                    </>,
                                    <>
                                        Baixe o <strong>start-L2-Bartz.bat</strong>, coloque-o na pasta <code>system</code> do seu cliente (ao lado do{' '}
                                        <code>L2.bin</code>) e dê dois cliques para jogar. Ele se conecta ao Bartz sozinho: nada para configurar, e continua
                                        funcionando mesmo se o endereço do servidor mudar.
                                    </>,
                                )}
                            </p>
                            <p>
                                <a className="btn btn-outline btn-small connect-download" href="/downloads/start-L2-Bartz.bat" download>
                                    {t('Download the launcher', 'Baixar o launcher')}
                                </a>
                                <span className="connect-download-note">
                                    {t(
                                        'Windows asks for Administrator rights (the game needs them). If Windows SmartScreen warns about the file, choose “More info”, then “Run anyway”. Tip: right-click it and choose “Send to → Desktop (create shortcut)”.',
                                        'O Windows pede direitos de Administrador (o jogo precisa deles). Se o Windows SmartScreen avisar sobre o arquivo, escolha “Mais informações” e depois “Executar assim mesmo”. Dica: clique com o botão direito e escolha “Enviar para → Área de trabalho (criar atalho)”.',
                                    )}
                                </span>
                            </p>
                            <details className="connect-alt">
                                <summary>{t('Prefer the hosts file?', 'Prefere o arquivo hosts?')}</summary>
                                <p>
                                    {t(
                                        <>
                                            Instead of the launcher, add this line to your <code>hosts</code> file (as Administrator) and start the game normally:
                                        </>,
                                        <>
                                            Em vez do launcher, adicione esta linha ao seu arquivo <code>hosts</code> (como Administrador) e inicie o jogo normalmente:
                                        </>,
                                    )}
                                </p>
                                <pre>
                                    <code>{server.address ?? t('server-address', 'endereço-do-servidor')} l2authd.lineage2.com</code>
                                </pre>
                                <p>{t("If the server's address ever changes, update the line with the one shown here.", 'Se o endereço do servidor mudar, atualize a linha com o que aparece aqui.')}</p>
                            </details>
                        </li>
                        <li>
                            <h3>{t('Create your account and log in', 'Crie sua conta e entre')}</h3>
                            <p>
                                {t(
                                    <>
                                        <Link href="/register" className="text-link">Create your account here</Link> with your email, then log in to the game with that
                                        account name and password.
                                    </>,
                                    <>
                                        <Link href="/register" className="text-link">Crie sua conta aqui</Link> com seu e-mail e depois entre no jogo com esse nome de
                                        conta e senha.
                                    </>,
                                )}
                                {server.autoCreateAccounts
                                    ? t(
                                          ' (Logging in with a new name also creates an account, but without an email you could never reset its password.)',
                                          ' (Entrar com um nome novo também cria uma conta, mas sem e-mail você nunca poderia redefinir a senha dela.)',
                                      )
                                    : ''}
                            </p>
                        </li>
                    </ol>
                </div>
            </section>
        </>
    );
}
