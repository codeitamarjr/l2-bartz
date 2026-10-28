<?php

namespace Tests\Feature;

use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_english_is_the_default(): void
    {
        $this->get('/')->assertOk()
            ->assertSee('<html lang="en">', false)
            ->assertSee('<title>L2 Bartz — Free Lineage II High Five Server</title>', false)
            ->assertInertia(fn ($page) => $page->where('locale', 'en'));
    }

    public function test_portuguese_browsers_get_brazilian_portuguese(): void
    {
        $this->withHeader('Accept-Language', 'pt-BR,pt;q=0.9,en;q=0.8')->get('/')->assertOk()
            ->assertSee('<html lang="pt-BR">', false)
            ->assertSee('<title>L2 Bartz — Servidor Gratuito de Lineage II High Five</title>', false)
            ->assertSee('<meta property="og:locale" content="pt_BR">', false)
            ->assertInertia(fn ($page) => $page->where('locale', 'pt_BR'));
    }

    public function test_the_switch_remembers_the_choice_over_the_browser_language(): void
    {
        $this->from('/about')->get('/locale/pt_BR')
            ->assertRedirect('/about')
            ->assertCookie(SetLocale::COOKIE, 'pt_BR');

        $this->withCookie(SetLocale::COOKIE, 'en')->withHeader('Accept-Language', 'pt-BR')->get('/lore')
            ->assertInertia(fn ($page) => $page->where('locale', 'en'));

        $this->get('/locale/fr')->assertNotFound();
    }

    public function test_server_messages_follow_the_language(): void
    {
        $this->withCookie(SetLocale::COOKIE, 'pt_BR')
            ->post('/account/login', ['login' => '', 'password' => ''])
            ->assertSessionHasErrors(['login' => 'Digite o nome da sua conta do jogo.']);
    }

    public function test_every_portuguese_entry_keeps_its_placeholders(): void
    {
        $entries = json_decode(file_get_contents(lang_path('pt_BR.json')), true, flags: JSON_THROW_ON_ERROR);

        foreach ($entries as $english => $portuguese) {
            preg_match_all('/:[a-z]+/', $english, $expected);
            preg_match_all('/:[a-z]+/', $portuguese, $actual);
            sort($expected[0]);
            sort($actual[0]);
            $this->assertSame($expected[0], $actual[0], "Placeholders differ in: {$english}");
        }
    }
}
