import { Divider } from '@/components/decor';
import PageHero from '@/components/page-hero';

/** The Lore page in Brazilian Portuguese: the same chapters, ids and structure as lore-en.tsx; keep both in step. */
export default function LorePt() {
	return (
		<>
			<PageHero
				kicker="A História do Mundo"
				title="História de Aden"
				tagline="Antes dos castelos e dos clãs, antes de os dragões dormirem sob a terra, havia apenas uma esfera que guardava tudo e nada ao mesmo tempo."
			/>

			<div className="lore-layout">
				<nav className="lore-toc" aria-label="Capítulos">
					<p className="lore-toc-title">Capítulos</p>
					<ol>
						<li><a href="#creation">A Esfera Partida</a></li>
						<li><a href="#gods">Filhos dos Deuses</a></li>
						<li><a href="#giants">A Queda dos Gigantes</a></li>
						<li><a href="#shilen">A Traição de Shilen</a></li>
						<li><a href="#empire">O Império de Elmoreden</a></li>
						<li><a href="#baium">A Torre da Insolência</a></li>
						<li><a href="#chaos">A Era do Caos</a></li>
						<li><a href="#gracia">Além do Mar</a></li>
						<li><a href="#highfive">A Rainha do Gelo e High Five</a></li>
					</ol>
					<a href="#chronicles" className="lore-toc-extra">Linha do Tempo das Crônicas</a>
					<a href="#pantheon" className="lore-toc-extra">O Panteão</a>
				</nav>

				<article className="lore-chapters">
					<section id="creation" className="chapter reveal">
						<p className="chapter-num">Capítulo I</p>
						<h2 className="chapter-title text-gold">A Esfera Partida</h2>
						<p>Antes de tudo, quando ainda não havia Aden nem Elmore, nem Humanos, Elfos, Anões ou Orcs, tudo o que um dia existiria dormia junto dentro de uma única esfera. E foi ali, no silêncio sem fim, que dois poderes despertaram: uma luz branca que tomou a forma de uma mulher e se chamou <strong>Einhasad</strong>, e uma escuridão que tomou a forma de um homem e se chamou <strong>Gran Kain</strong>.</p>
						<p>Juntos, romperam a esfera, e do estilhaço nasceu o mundo. Os cacos que caíram viraram chão; os que subiram viraram céu; e os espíritos que ali dormiam acordaram como cada fera que corre e cada planta que cresce.</p>
						<p>Dentre esses espíritos, os maiores e mais sábios eram os <strong>Gigantes</strong>. Olhavam para Einhasad e Gran Kain como filhos olham para os pais e juraram lealdade eterna. Os deuses, contentes, os coroaram senhores de toda criatura viva. Por um tempo, pareceu que seria para sempre.</p>
					</section>

					<section id="gods" className="chapter reveal">
						<p className="chapter-num">Capítulo II</p>
						<h2 className="chapter-title text-gold">Filhos dos Deuses</h2>
						<p>Einhasad e Gran Kain também tiveram filhos. Os cinco primeiros foram <strong>Shilen</strong>, a deusa da água; <strong>Paagrio</strong>, o deus do fogo; <strong>Maphr</strong>, a deusa da terra; <strong>Sayha</strong>, o deus do vento; e <strong>Eva</strong>, cujas canções embalavam o trabalho dos outros deuses. Cada um moldou um povo à imagem do seu elemento:</p>
						<ul className="lore-list">
							<li><strong>Os Elfos</strong>, nascidos da água de Shilen, sábios e tocados pela magia, aconselhavam os Gigantes na política e na feitiçaria.</li>
							<li><strong>Os Orcs</strong>, em quem Paagrio soprou o próprio fogo, ganharam força e vontade que nunca se apagam e se tornaram os guerreiros dos Gigantes.</li>
							<li><strong>Os Anões</strong>, esculpidos por Maphr, construíam e calculavam como ninguém e cuidavam das forjas e do comércio dos Gigantes.</li>
							<li><strong>Os Arteias</strong>, filhos do vento de Sayha, corriam o mundo levando notícias aos Gigantes, até o dia em que sumiram com o vento.</li>
						</ul>
						<p>Os Humanos vieram por último, e não por amor. Gran Kain recolheu o que os filhos haviam jogado fora (água parada, fogo quase apagado, terra estéril e vento sem rumo) e com essas sobras costurou o primeiro povo. Fracos e desprezados, foram entregues aos Gigantes como servos. E, mesmo assim, guarde bem isto: foi justamente o povo feito de restos que um dia governaria o continente.</p>
						<blockquote className="lore-quote">Como os humanos são feitos do refugo dos deuses, nasceram inquietos. Não lhes dê um inimigo, e eles farão um do próprio vizinho.</blockquote>
					</section>

					<section id="giants" className="chapter reveal">
						<p className="chapter-num">Capítulo III</p>
						<h2 className="chapter-title text-gold">A Queda dos Gigantes</h2>
						<p>Era após era, os Gigantes ergueram uma civilização tão grandiosa que começou a encarar os próprios deuses. Sua capital, <strong>Grandferion</strong>, brilhava como uma cidade de maravilhas, e seus sábios aprenderam a dobrar a natureza, forjar armas impossíveis e, por fim, criar a própria vida, o único poder que Einhasad guardava só para si.</p>
						<p>Em seus laboratórios nasceram os <strong>Kamael</strong>, uma raça de armas vivas que o poder divino mal conseguia tocar. Para Einhasad, aquilo era rebelião. Ela enviou seus anjos contra os Gigantes, e começou uma guerra que fez tremer o céu e a terra.</p>
						<p>Como os Gigantes não se curvaram, Einhasad tomou emprestado o <strong>Martelo Estelar</strong> de Gran Kain, o Martelo do Desespero, uma arma que nem seu dono ousava usar. E o martelo caiu sobre Grandferion. Estrelas choveram do céu, cidades inteiras sumiram, e a maior civilização que o mundo já viu desapareceu em um único dia. Os sobreviventes foram caçados de ponta a ponta do continente, e os Kamael foram trancados na distante <strong>Ilha das Almas</strong>.</p>
					</section>

					<section id="shilen" className="chapter reveal">
						<p className="chapter-num">Capítulo IV</p>
						<h2 className="chapter-title text-gold">A Traição de Shilen</h2>
						<p>Shilen não ficou ao lado da mãe, e pagou caro por isso. Por seu papel na era dos Gigantes, foi derrubada: suas águas passaram para a irmã Eva, e Shilen se tornou a deusa da <strong>morte</strong>, reinando lá do fundo do abismo.</p>
						<p>Seus Elfos se partiram ao meio. Os que permaneceram fiéis à luz seguiram Eva e continuaram sendo os Elfos das florestas. Os que desceram à escuridão atrás da mãe caída se tornaram os <strong>Elfos Negros</strong>, mestres da magia proibida, os Filhos de Shilen.</p>
						<p>Da união de Shilen e Gran Kain nasceram os grandes <strong>dragões</strong>, e os mais terríveis deles foram <strong>Antharas</strong>, da terra, e <strong>Valakas</strong>, do fogo. Quando Shilen caiu, eles se esconderam: Antharas no covil sob o Vale do Dragão, perto de Giran, e Valakas nas chamas da Forja dos Deuses. Lá dormem, contando os séculos até a volta da mãe. E Shilen deixou para trás sua filha mais amada, <strong>Lilith</strong>, amaldiçoada com uma vida sem fim, para preparar o caminho.</p>
					</section>

					<section id="empire" className="chapter reveal">
						<p className="chapter-num">Capítulo V</p>
						<h2 className="chapter-title text-gold">O Império de Elmoreden</h2>
						<p>Sem os Gigantes, Elfos, Orcs e Humanos disputaram o continente por gerações. Os Humanos, morrendo aos milhares, imploravam por um deus que lhes prometesse algo depois da morte, e muitos se voltaram para Shilen. Quando as guerras enfim se apagaram, quem estava de pé sobre as cinzas era a humanidade.</p>
						<p>O imperador <strong>Shunaiman</strong> uniu as terras de Aden e Elmore no <strong>Império de Elmoreden</strong>. No dia da sua coroação, uma menina alada, envolta em fogo sagrado, desceu do céu: <strong>Anakim</strong>, enviada de Einhasad. Shunaiman declarou Einhasad a única fé verdadeira, riscou Gran Kain da história da criação dos homens e proibiu o culto às trevas.</p>
						<p>Mas os Filhos de Shilen se recusaram a ajoelhar. Sob o comando de Lilith ergueram a <strong>Necrópole</strong> e as <strong>Catacumbas</strong> e treinaram um exército de elite, os <strong>Lilim</strong>. Contra eles, Anakim liderou os <strong>Nephilim</strong>, gigantescos guerreiros de luz em armaduras. Essa guerra nunca terminou de verdade: ainda ecoa nos <strong>Sete Sinais</strong>, onde os Senhores da Aurora e os Revolucionários do Crepúsculo disputam os selos até hoje.</p>
					</section>

					<section id="baium" className="chapter reveal">
						<p className="chapter-num">Capítulo VI</p>
						<h2 className="chapter-title text-gold">A Torre da Insolência</h2>
						<p>Gerações depois, o Imperador <strong>Baium</strong> sentou no trono de Elmoreden e achou que um império era pouco. Com sussurros sombrios ao pé do ouvido, mandou erguer uma torre tão alta que tocasse os próprios deuses: a <strong>Torre da Insolência</strong>.</p>
						<p>Os deuses responderam à ousadia selando-o lá dentro, congelado para sempre no topo do próprio monumento, à espera de alguém tolo o bastante para acordá-lo. Seus herdeiros, a filha Solina e o filho <strong>Frintezza</strong>, brigaram pelo que sobrou. O império se partiu em dois, o <strong>Reino de Aden</strong> ao sul e o <strong>Reino de Elmore</strong> ao norte, e em poucas décadas Elmoreden virou lembrança. Dizem que o espírito inquieto de Frintezza ainda vaga pela Tumba Imperial.</p>
					</section>

					<section id="chaos" className="chapter reveal">
						<p className="chapter-num">Capítulo VII</p>
						<h2 className="chapter-title text-gold">A Era do Caos</h2>
						<p>Os reis de Aden mantiveram as coroas, mas perderam as rédeas da terra. A virada veio na <strong>Batalha pelo Castelo de Giran</strong>, quando um aventureiro sem sangue nobre tomou um castelo e, pelas antigas regras de cerco, se tornou seu senhor por direito. A partir daquele dia, qualquer um com espadas suficientes ao seu lado podia governar.</p>
						<p>Aventureiros unidos por amizade ou sangue formaram <strong>clãs</strong>, clãs formaram <strong>alianças</strong>, e os castelos de Aden (Gludio, Dion, Giran, Oren, Aden, Innadril e Goddard, e mais tarde Rune e Schuttgart) trocaram de dono em cercos sem fim. Os mais corajosos desvendaram os segredos dos Gigantes, tornaram-se <strong>Noblesse</strong> e foram à <strong>Grande Olimpíada</strong> disputar o direito de serem chamados de <strong>Herói</strong>.</p>
					</section>

					<section id="gracia" className="chapter reveal">
						<p className="chapter-num">Capítulo VIII</p>
						<h2 className="chapter-title text-gold">Além do Mar</h2>
						<p>O passado não aceitou ficar enterrado. Os <strong>Kamael</strong>, as armas vivas dos Gigantes, voltaram da Ilha das Almas, chamados por Eva para defender Aden em vez de destruí-la. Mas inclinar a balança para o lado da luz cobrou seu preço.</p>
						<p>Na ilha amaldiçoada de <strong>Hellbound</strong>, demônios dominavam nativos escravizados até que aventureiros quebraram seu domínio. Do outro lado do mar, o continente esquecido de <strong>Gracia</strong> foi redescoberto, e com ele as <strong>Sementes</strong>: crescimentos monstruosos que se espalhavam pela terra. A aliança de Aden ergueu sua base em Keucereus e enviou seus mais fortes à <strong>Semente do Infinito</strong>, onde o imortal Ekimus aguarda, e à <strong>Semente da Destruição</strong>, onde o comandante <strong>Tiat</strong> reúne seu exército.</p>
					</section>

					<section id="highfive" className="chapter reveal">
						<p className="chapter-num">Capítulo IX</p>
						<h2 className="chapter-title text-gold">A Rainha do Gelo e High Five</h2>
						<p>No extremo norte, além de Schuttgart, <strong>Freya</strong>, a Rainha do Gelo, despertou em seu castelo congelado e espalhou um inverno sem fim pela terra. No Vale do Dragão, o chão volta a tremer onde Antharas dorme, e as chamas ao redor de Valakas queimam mais forte a cada estação.</p>
						<p>Esta é a era de <strong>High Five</strong>, onde a história de Aden está hoje. Os deuses estão em silêncio, os dragões se agitam, e cada castelo, cada raid e cada título de Herói ainda está aí para ser conquistado. O resto da história cabe a você escrever.</p>
						<div className="chapter-cta">
							<a href="/#join" className="btn btn-primary">Comece Sua Jornada</a>
							<a href="/#races" className="btn btn-outline">Escolha Sua Raça</a>
						</div>
					</section>
				</article>
			</div>

			<section id="chronicles" className="chronicles">
				<div className="container">
					<div className="section-head">
						<p className="reveal kicker">Do Prelude ao High Five</p>
						<h2 className="reveal section-title text-gold">As Crônicas</h2>
						<Divider />
					</div>
					<ol className="timeline">
						<li className="reveal"><span className="timeline-saga">The Chaotic Chronicle</span><h3>Prelude</h3><p>O mundo se abre. Humanos, Elfos, Elfos Negros, Orcs e Anões partem de suas vilas.</p></li>
						<li className="reveal"><h3>Harbingers of War</h3><p>Crônica 1. Os cercos aos castelos começam com a batalha por Giran.</p></li>
						<li className="reveal"><h3>Age of Splendor</h3><p>Crônica 2. Clan halls e novas terras por toda Aden.</p></li>
						<li className="reveal"><h3>Rise of Darkness</h3><p>Crônica 3. Os Sete Sinais, Lilith, Anakim e a Necrópole.</p></li>
						<li className="reveal"><h3>Scions of Destiny</h3><p>Crônica 4. Subclasses, Noblesse e os herdeiros dos Gigantes.</p></li>
						<li className="reveal"><h3>Oath of Blood</h3><p>Crônica 5. Clãs, facções, Heróis e a Grande Olimpíada.</p></li>
						<li className="reveal"><span className="timeline-saga">The Chaotic Throne</span><h3>Interlude</h3><p>Rune e Schuttgart, guerras territoriais e a era dos clãs.</p></li>
						<li className="reveal"><h3>The Kamael</h3><p>As armas vivas dos Gigantes voltam da Ilha das Almas.</p></li>
						<li className="reveal"><h3>Hellbound</h3><p>A ilha amaldiçoada e seus senhores demoníacos.</p></li>
						<li className="reveal"><h3>Gracia</h3><p>Partes 1 e 2, Final e Epilogue. O continente perdido e suas Sementes.</p></li>
						<li className="reveal"><h3>Freya</h3><p>A Rainha do Gelo desperta no norte congelado.</p></li>
						<li className="reveal is-current"><h3>High Five</h3><p>Onde este servidor está. Os dragões se agitam, as Sementes ainda ardem e Aden chama seus heróis.</p></li>
					</ol>
				</div>
			</section>

			<section id="pantheon" className="pantheon">
				<div className="container">
					<div className="section-head">
						<p className="reveal kicker">Deuses de Aden</p>
						<h2 className="reveal section-title text-gold">O Panteão</h2>
						<Divider />
					</div>
					<div className="pantheon-grid">
						<div className="reveal god"><p className="god-domain">Luz e Criação</p><h3>Einhasad</h3><p>Mãe dos deuses, cultuada pela humanidade e pelo Império.</p></div>
						<div className="reveal god"><p className="god-domain">Trevas e Destruição</p><h3>Gran Kain</h3><p>Pai dos deuses e criador dos Humanos, que depois abandonou.</p></div>
						<div className="reveal god"><p className="god-domain">Água, depois Morte</p><h3>Shilen</h3><p>Mãe dos Elfos, caída no abismo. Cultuada pelos Elfos Negros.</p></div>
						<div className="reveal god"><p className="god-domain">Água e Canção</p><h3>Eva</h3><p>Recebeu as águas de Shilen. Deusa dos Elfos da floresta.</p></div>
						<div className="reveal god"><p className="god-domain">Fogo</p><h3>Paagrio</h3><p>Soprou o fogo nos Orcs, cujos mortos se juntam às suas chamas.</p></div>
						<div className="reveal god"><p className="god-domain">Terra</p><h3>Maphr</h3><p>Criadora dos Anões, padroeira do ofício e do comércio.</p></div>
						<div className="reveal god"><p className="god-domain">Vento</p><h3>Sayha</h3><p>Pai dos Arteias errantes, há muito desaparecidos do mundo.</p></div>
					</div>
				</div>
			</section>
		</>
	);
}
