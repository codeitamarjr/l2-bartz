import type { EventLoreSet } from '@/data/event-lore';

/** The "Learn more" texts of resources/js/data/event-lore.ts in Brazilian Portuguese; keep both in step. */
export const EVENT_LORE_PT: EventLoreSet = {
    sevensigns: {
        lore: [
            'Desde os tempos do Imperador Shunaiman, os Senhores da Aurora (Dawn), fiéis a Einhasad e ao Império, travam guerra contra os Revolucionários do Crepúsculo (Dusk), herdeiros de Lilith e dos Filhos de Shilen. Seu campo de batalha são as Necrópoles e as Catacumbas, erguidas há muito tempo pelos seguidores de Shilen.',
            'Três selos antigos decidem qual lado molda Aden: o Selo da Avareza, o Selo da Gnose e o Selo da Discórdia. Quem vence a guerra detém o poder deles na semana seguinte.',
        ],
        howItWorks: [
            'Um ciclo dura duas semanas e vira toda segunda-feira às 18:00 (horário do servidor): um breve Recrutamento, uma semana de Competição, breves Resultados e então uma semana de Validação dos Selos.',
            'Durante a Competição, junte-se à Aurora ou ao Crepúsculo com um Priest of Dawn ou Priest of Dusk em qualquer cidade, e ganhe pontos para seu lado coletando Seal Stones nas Catacumbas e Necrópoles e lutando no Festival of Darkness.',
            'O lado vencedor controla os selos durante a Validação: a Avareza abre o Mercador e o Ferreiro de Mammon, a Gnose traz sacerdotes que abençoam os vencedores e amaldiçoam os perdedores, e a Discórdia decide se os portões dos castelos ficam reforçados ou enfraquecidos nos cercos.',
        ],
        chapter: { href: '/lore#empire', label: 'Capítulo V: O Império de Elmoreden' },
    },
    olympiad: {
        lore: [
            'Quando os aventureiros mais corajosos aprenderam os segredos dos Gigantes e se tornaram Noblesse, Aden precisou de um jeito de coroar os melhores entre eles. Assim nasceu a Grande Olimpíada: uma arena, um oponente, e só a habilidade decide.',
            'Cada temporada termina com um novo Herói para cada classe, cujo nome é lembrado por toda a terra.',
        ],
        howItWorks: [
            'Só Noblesse podem competir. Inscreva-se com um Olympiad Manager enquanto a arena estiver aberta: todos os dias a partir das 18:00, por 6 horas (horário do servidor).',
            'Lute em partidas por classe ou abertas a todas as classes para ganhar pontos; são necessárias pelo menos 15 partidas na temporada para concorrer a Herói.',
            'No fim de cada temporada, o melhor Noblesse de cada classe se torna Herói, com armas de Herói, habilidades de Herói e uma aura brilhante.',
        ],
        chapter: { href: '/lore#chaos', label: 'Capítulo VII: A Era do Caos' },
    },
    siege: {
        lore: [
            'Desde a Batalha pelo Castelo de Giran, as antigas regras de cerco são lei: quem toma um castelo se torna seu senhor legítimo, seja qual for seu berço. Os reis de Aden só podem confirmar o resultado.',
            'Nove castelos se erguem pela terra. Cada um traz impostos, um salão do castelo e o respeito, ou a inveja, de todos os clãs de Aden.',
        ],
        howItWorks: [
            'Clãs de nível 5 ou superior se inscrevem como atacantes ou defensores com o mensageiro do castelo antes do cerco.',
            'Um cerco dura 2 horas. Os atacantes precisam romper muralhas e portões, e o líder do clã precisa gravar o selo do clã no Artefato Sagrado do castelo.',
            'O clã que domina o castelo quando o tempo acaba o governa até o próximo cerco.',
        ],
        chapter: { href: '/lore#chaos', label: 'Capítulo VII: A Era do Caos' },
    },
    raid: {
        lore: [
            'Campeões caídos, feras antigas e generais de guerras esquecidas vagam pelas terras selvagens de Aden. São mais fortes que qualquer aventureiro sozinho, e guardam tesouros à altura.',
        ],
        howItWorks: [
            'Os raid bosses ficam em lugares fixos pelo mundo, do nível 20 ao fim de jogo. Reúna um grupo, encontre um do seu nível e derrube-o.',
            'Eles dropam materiais raros, receitas e equipamentos, e dão Raid Points.',
            'Um raid boss derrotado volta um ou dois dias depois. A página Sobre mostra quando os mais recentes devem voltar.',
        ],
    },
    tvt: {
        lore: ['Nem toda batalha é por tronos. No Coliseu, aventureiros provam seu valor diante da multidão.'],
        howItWorks: [
            'Inscreva-se com o gerente do evento enquanto as inscrições estiverem abertas. Quando fecharem, os jogadores são divididos em dois times e enviados à arena.',
            'Cada abate vale ponto para seu time; o time com mais abates quando o tempo acabar leva as recompensas.',
        ],
    },
    epic: {
        '29068': {
            lore: [
                'Antharas, o Dragão da Terra, é filho de Shilen e Gran Kain. Quando Shilen foi derrotada, ele se escondeu sob o Vale do Dragão perto de Giran, onde dorme à espera do retorno dela.',
                'Sempre que o chão do vale treme, o povo de Giran olha para as montanhas.',
            ],
            howItWorks: [
                'Reúna um exército na entrada do covil dele no Vale do Dragão. Quando os primeiros heróis entram, o covil fica aberto por pouco tempo para outros se juntarem, e depois se fecha.',
                'Ele é um dos seres mais fortes de Aden: só alianças bem preparadas sobrevivem.',
                'Se ele cair, volta dias depois. O card mostra quando.',
            ],
            chapter: { href: '/lore#shilen', label: 'Capítulo IV: A Traição de Shilen' },
        },
        '29028': {
            lore: ['Valakas, o Dragão do Fogo, é filho de Shilen e Gran Kain. Ele dorme nas chamas da Forja dos Deuses, e o fogo ali queima mais forte a cada estação.'],
            howItWorks: [
                'O Salão das Chamas fica no fundo da Forja dos Deuses. Quando os primeiros heróis entram, há 30 minutos para outros se juntarem antes que o salão se feche.',
                'Depois que a batalha começa, ninguém mais pode entrar. Leve resistência ao fogo e uma aliança completa.',
                'Se ele for derrotado, volta dias depois. O card mostra quando.',
            ],
            chapter: { href: '/lore#shilen', label: 'Capítulo IV: A Traição de Shilen' },
        },
        '29020': {
            lore: [
                'O Imperador Baium de Elmoreden ergueu a Torre da Insolência para alcançar os próprios deuses. Os deuses responderam selando-o no topo, congelado em seu próprio monumento.',
                'Seu império se partiu em dois quando ele caiu: o Reino de Aden e o Reino de Elmore.',
            ],
            howItWorks: [
                'Suba a Torre da Insolência até o último andar, onde Baium está congelado em seu trono. Despertá-lo começa a luta.',
                'Ele luta ao lado de seus Arcanjos. Traga um grupo de raid completo.',
                'Depois de derrotado, ele volta dias depois. O card mostra quando.',
            ],
            chapter: { href: '/lore#baium', label: 'Capítulo VI: A Torre da Insolência' },
        },
        '29118': {
            lore: ['Na ilha amaldiçoada de Hellbound, demônios dominavam os nativos escravizados até que aventureiros quebraram seu domínio. Beleth ocupa seu trono no coração da ilha.'],
            howItWorks: [
                'O trono dele fica em Hellbound, alcançável só depois que a ilha é aberta por suas longas cadeias de missões.',
                'Uma batalha para as alianças mais fortes do servidor.',
            ],
            chapter: { href: '/lore#gracia', label: 'Capítulo VIII: Além do Mar' },
        },
        '29001': {
            lore: ['Sob os campos de Dion há um vasto Ninho das Formigas. Em seu coração, a Queen Ant gera uma cria sem fim, protegida por suas enfermeiras e guardas reais.'],
            howItWorks: [
                'Atravesse o Ninho das Formigas até a câmara dela. Mate as enfermeiras primeiro, ou elas vão curá-la.',
                'Um alvo clássico para clãs de nível médio. Se derrotada, ela volta um ou dois dias depois.',
            ],
        },
        '29006': {
            lore: ['A Torre de Cruma, relíquia de uma era antiga, ainda zumbe com máquinas ancestrais. Em seu núcleo aguarda Core, protegido pelos autômatos que o servem.'],
            howItWorks: ['Desça pela Torre de Cruma até a câmara do núcleo. Um alvo para clãs de nível médio; depois de destruído, volta um ou dois dias depois.'],
        },
        '29014': {
            lore: ['Orfen, o Kraken do Pesadelo, assombra o Mar de Esporos perto de Oren, uma criatura nascida do veneno que paira sobre aquela terra.'],
            howItWorks: ['Orfen vaga pelo Mar de Esporos com sua escolta. Um alvo para clãs de nível médio; se derrotada, volta um ou dois dias depois.'],
        },
    },
};
