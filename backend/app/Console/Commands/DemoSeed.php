<?php

namespace App\Console\Commands;

use App\Models\AppSetting;
use App\Models\ItemAttempt;
use App\Models\ItemResult;
use App\Models\Pupil;
use App\Models\Section;
use App\Models\Word;
use App\Models\WordDistractor;
use App\Models\WordSentence;
use App\Models\WordSituation;
use App\Support\GameCatalog;
use App\Support\Media;
use App\Support\Stars;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Sample content for testing the map and the game:
 *  - 30 words (Set A = Sesyon 1, Set B = Sesyon 2) with picture, sound, meaning,
 *    3 wrong pictures (Cycle 1), a sentence (Cycle 2) and a situation (Cycle 3).
 *  - Sections "Demo", "Grade 3 - Rosal", "Grade 3 - Sampaguita".
 *  - Pupil "DEMO" (section Demo): Cycle 1 Sesyon 1 finished, Sesyon 2 half way.
 *
 * Only empty word slots are filled, so real words are never overwritten.
 * The pictures are simple placeholders and the sound is a beep: teachers replace them.
 *
 *   php artisan demo:seed
 *   php artisan demo:seed --clear     (removes everything this command added)
 */
class DemoSeed extends Command
{
    protected $signature = 'demo:seed {--clear : Remove the demo content}';

    protected $description = 'Add sample words, sections and a demo pupil for testing';

    private const WORDS = [
        'A' => [
            ['bahay', 'Lugar na tinitirhan ng pamilya.', 'Malaki at malinis ang ___ nina Lola.', 'Umuulan nang malakas at basang-basa ka na. Saan ka dapat sumilong?', ['Sa ilalim ng puno', 'Sa loob ng bahay', 'Sa gitna ng daan'], 'b'],
            ['araw', 'Nagbibigay ng liwanag at init sa umaga.', 'Mainit ang sikat ng ___ sa tanghali.', 'Tanghali at napakainit ng araw sa labas. Ano ang dapat mong isuot?', ['Sumbrero', 'Kumot', 'Bota'], 'a'],
            ['buwan', 'Maliwanag na bilog sa langit tuwing gabi.', 'Bilog na bilog ang ___ ngayong gabi.', 'Nakita mo ang maliwanag na buwan sa langit. Anong oras na?', ['Umaga', 'Tanghali', 'Gabi'], 'c'],
            ['puno', 'Matangkad na halaman na may sanga at dahon.', 'Umakyat ang pusa sa mataas na ___.', 'Mainit sa palaruan. Saan ka magpapahinga para malilim?', ['Sa ilalim ng puno', 'Sa gitna ng araw', 'Sa bubong'], 'a'],
            ['ibon', 'Hayop na may pakpak at lumilipad.', 'Umaawit ang ___ sa sanga ng puno.', 'May batang ibon na nahulog mula sa pugad. Ano ang gagawin mo?', ['Hahabulin ito', 'Sasabihin sa nakatatanda', 'Pababayaan sa daan'], 'b'],
            ['aso', 'Alagang hayop na tumatahol at bantay sa bahay.', 'Tumatahol ang ___ kapag may dumarating.', 'Gutom na ang alaga mong aso. Ano ang gagawin mo?', ['Bibigyan ng pagkain', 'Itatali sa labas', 'Sisigawan'], 'a'],
            ['pusa', 'Maliit na alagang hayop na ngumingiyaw.', 'Ngumingiyaw ang ___ dahil gutom na.', 'Natutulog ang pusa sa upuan mo. Ano ang gagawin mo?', ['Itutulak ito', 'Dahan-dahang ililipat', 'Bubuhusan ng tubig'], 'b'],
            ['bulaklak', 'Makulay at mabangong bahagi ng halaman.', 'Pumitas si Ana ng pulang ___ para kay Nanay.', 'Kaarawan ni Nanay. Ano ang magandang ibigay?', ['Bulaklak', 'Bato', 'Basura'], 'a'],
            ['ulan', 'Tubig na bumabagsak mula sa ulap.', 'Malakas ang ___ kaya nagdala ako ng payong.', 'Malakas ang ulan at papasok ka sa paaralan. Ano ang dadalhin mo?', ['Bola', 'Payong', 'Saranggola'], 'b'],
            ['isda', 'Hayop na nakatira at lumalangoy sa tubig.', 'Lumalangoy ang maliit na ___ sa ilog.', 'May isda sa lupa at hindi ito makahinga. Ano ang gagawin mo?', ['Ibabalik sa tubig', 'Paglalaruan', 'Iiwan sa araw'], 'a'],
            ['bundok', 'Napakataas na lupa na inaakyat.', 'Mataas ang ___ na inakyat namin.', 'Aakyat kayo ng pamilya sa bundok. Ano ang dapat dalhin?', ['Tubig at baon', 'Unan at kumot', 'Telebisyon'], 'a'],
            ['dagat', 'Malawak at maalat na tubig.', 'Maalat ang tubig sa ___.', 'Naliligo kayo sa dagat at malakas ang alon. Ano ang gagawin mo?', ['Lalayo sa mga kasama', 'Mananatili malapit sa nakatatanda', 'Lalangoy nang malayo'], 'b'],
            ['aklat', 'Binabasa; may mga pahina at kuwento.', 'Nagbasa ako ng ___ tungkol sa mga hayop.', 'Napunit mo ang aklat ng kaklase mo. Ano ang gagawin mo?', ['Itatago ito', 'Hihingi ng tawad', 'Tatawanan'], 'b'],
            ['lapis', 'Gamit sa pagsulat at pagguhit.', 'Isinulat ko ang aking pangalan gamit ang ___.', 'Walang lapis ang katabi mo. Ano ang gagawin mo?', ['Pahihiramin siya', 'Pagtatawanan siya', 'Hindi papansinin'], 'a'],
            ['mesa', 'Kasangkapan na may patag na ibabaw at mga paa.', 'Inilagay ni Tatay ang pagkain sa ___.', 'Tapos na kayong kumain. Ano ang gagawin mo sa mesa?', ['Iiwang marumi', 'Tutulong maglinis', 'Matutulog sa ibabaw'], 'b'],
        ],
        'B' => [
            ['bituin', 'Maliliit na ilaw na kumikislap sa langit sa gabi.', 'Kumikislap ang ___ sa langit.', 'Maraming bituin sa langit ngayong gabi. Ano ang panahon?', ['Maaliwalas ang langit', 'Malakas ang ulan', 'Tanghaling tapat'], 'a'],
            ['ulap', 'Puti o abong lumulutang sa langit.', 'Maitim ang ___ kaya uulan na.', 'Maitim ang ulap sa langit. Ano ang malamang na mangyari?', ['Uulan', 'Mag-uumaga', 'Lilindol'], 'a'],
            ['kabayo', 'Malaking hayop na sinasakyan at mabilis tumakbo.', 'Mabilis tumakbo ang ___ sa bukid.', 'Pagod at nauuhaw ang kabayo. Ano ang ibibigay mo?', ['Tubig', 'Kendi', 'Laruan'], 'a'],
            ['saging', 'Dilaw na prutas na binabalatan.', 'Kumain si Ben ng hinog na ___.', 'Kumain ka ng saging. Saan mo itatapon ang balat?', ['Sa sahig', 'Sa basurahan', 'Sa bintana'], 'b'],
            ['mangga', 'Matamis na prutas na dilaw kapag hinog.', 'Matamis ang hinog na ___.', 'Isa lang ang mangga at dalawa kayo ng kapatid mo. Ano ang gagawin mo?', ['Kakainin mag-isa', 'Hahatiin', 'Itatago'], 'b'],
            ['sapatos', 'Isinusuot sa paa.', 'Bago ang ___ ko para sa paaralan.', 'Maputik ang sapatos mo pagpasok sa bahay. Ano ang gagawin mo?', ['Huhubarin sa pinto', 'Lalakad sa sala', 'Itatapon'], 'a'],
            ['payong', 'Panangga sa ulan at init.', 'Binuksan ko ang ___ dahil umuulan.', 'Umuulan at may payong ang kaibigan mo. Ano ang sasabihin mo?', ['Akin na ʼyan!', 'Puwede bang makisilong?', 'Wala akong pakialam'], 'b'],
            ['bangka', 'Sasakyang pandagat na sinasagwan.', 'Sumakay kami sa ___ papunta sa isla.', 'Sasakay ka sa bangka. Ano ang dapat mong isuot?', ['Salbabida', 'Kapote lang', 'Pang-party na damit'], 'a'],
            ['tulay', 'Daan na nakatawid sa ibabaw ng ilog.', 'Tumawid kami sa ___ sa ibabaw ng ilog.', 'Makitid ang tulay na tatawiran ninyo. Ano ang gagawin mo?', ['Tatakbo', 'Maglalakad nang maingat', 'Tatalon'], 'b'],
            ['paaralan', 'Lugar kung saan nag-aaral ang mga bata.', 'Maaga akong pumasok sa ___.', 'Nahuli ka ng dating sa paaralan. Ano ang sasabihin mo sa guro?', ['Wala', 'Paumanhin po, nahuli ako', 'Uuwi na lang ako'], 'b'],
            ['kalabaw', 'Malaking hayop na katulong ng magsasaka.', 'Nag-aararo ang ___ sa bukid.', 'Pagod na ang kalabaw sa bukid. Ano ang dapat gawin?', ['Pagpahingahin', 'Paluin', 'Pagtrabahuhin pa'], 'a'],
            ['palay', 'Halaman na pinagmumulan ng bigas.', 'Inaani ng magsasaka ang ___.', 'Nakabilad ang palay sa daan. Ano ang gagawin mo?', ['Tatapakan', 'Iiwasan nang maingat', 'Sisipain'], 'b'],
            ['gatas', 'Puting inumin na nagpapalakas ng buto.', 'Uminom ako ng isang basong ___.', 'Natapon mo ang gatas sa mesa. Ano ang gagawin mo?', ['Pupunasan', 'Tatakbo', 'Sisisihin ang iba'], 'a'],
            ['tinapay', 'Pagkaing gawa sa harina, karaniwan sa almusal.', 'Mainit ang ___ mula sa panaderya.', 'Gutom ang kaklase mo at may dala kang tinapay. Ano ang gagawin mo?', ['Kakainin sa harap niya', 'Hahatian siya', 'Itatapon'], 'b'],
            ['orasan', 'Nagsasabi kung anong oras na.', 'Alas-siyete na ayon sa ___.', 'Tumunog ang orasan, oras na ng pasok. Ano ang gagawin mo?', ['Matutulog ulit', 'Maghahanda papasok', 'Maglalaro'], 'b'],
        ],
    ];

    private const COLORS = [
        [255, 138, 101], [79, 195, 247], [129, 199, 132], [255, 213, 79], [186, 104, 200],
        [77, 182, 172], [240, 98, 146], [149, 117, 205], [255, 167, 38], [100, 181, 246],
        [174, 213, 129], [255, 112, 67], [38, 198, 218], [236, 64, 122], [156, 204, 101],
    ];

    /** Stars of the demo pupil for Cycle 1, Sesyon 1 (one per word). */
    private const DEMO_STARS = [5, 4, 5, 3, 5, 0, 5, 4, 5, 5, 3, 4, 5, 5, 4];

    public function handle(): int
    {
        if (! function_exists('imagecreatetruecolor')) {
            $this->error('PHP GD is needed to draw the sample pictures (enable extension=gd in php.ini).');

            return 1;
        }

        GameCatalog::forgetWords();
        $code = $this->option('clear') ? $this->clear() : $this->seed();
        GameCatalog::forgetWords(); // the game must read the new sample words

        return $code;
    }

    private function seed(): int
    {
        $wordIds = json_decode((string) AppSetting::get('demo_word_ids', '[]'), true) ?: [];
        $added = 0;
        $pictures = [];

        foreach (self::WORDS as $set => $rows) {
            foreach ($rows as $i => [$text, $meaning, $sentence, $situation, $choices, $correct]) {
                $position = $i + 1;
                $existing = Word::where('word_set', $set)->where('position', $position)->first();
                if ($existing) {
                    $pictures[] = $existing->image_path;
                    continue; // never overwrite a teacher's word
                }

                $color = self::COLORS[$i % count(self::COLORS)];
                $word = Word::create([
                    'word_set' => $set,
                    'position' => $position,
                    'word' => $text,
                    'meaning' => $meaning,
                    'image_path' => $this->picture($text, $color, 'words'),
                    'audio_path' => $this->beep($i),
                    'correct_position' => ($i * 3) % 4 + 1,
                ]);
                WordSentence::create(['word_id' => $word->id, 'sentence' => $sentence]);
                WordSituation::create([
                    'word_id' => $word->id,
                    'situation' => $situation,
                    'choice_a' => $choices[0],
                    'choice_b' => $choices[1],
                    'choice_c' => $choices[2],
                    'correct_choice' => $correct,
                ]);
                $pictures[] = $word->image_path;
                $wordIds[] = $word->id;
                $added++;
            }
        }

        // Wrong pictures for Cycle 1: other words' pictures (as a teacher would choose).
        $words = Word::whereIn('id', $wordIds)->get();
        $all = array_values(array_filter($pictures));
        foreach ($words as $w) {
            $others = array_values(array_filter($all, fn ($p) => $p !== $w->image_path));
            foreach ([1, 2, 3] as $slot) {
                if (WordDistractor::where('word_id', $w->id)->where('slot', $slot)->exists() || ! $others) {
                    continue;
                }
                $source = $others[($w->id * 7 + $slot * 5) % count($others)];
                $copy = 'distractors/demo-'.Str::random(16).'.png';
                Storage::disk(Media::DISK)->copy($source, $copy);
                WordDistractor::create(['word_id' => $w->id, 'slot' => $slot, 'image_path' => $copy]);
            }
        }
        AppSetting::put('demo_word_ids', json_encode(array_values(array_unique($wordIds))));

        // Sections
        $sectionIds = json_decode((string) AppSetting::get('demo_section_ids', '[]'), true) ?: [];
        foreach (['Demo', 'Grade 3 - Rosal', 'Grade 3 - Sampaguita'] as $name) {
            $section = Section::firstOrCreate(['name' => $name], ['is_active' => true]);
            if ($section->wasRecentlyCreated) {
                $sectionIds[] = $section->id;
            }
        }
        AppSetting::put('demo_section_ids', json_encode(array_values(array_unique($sectionIds))));

        $this->seedDemoPupil();

        $this->info("Added {$added} sample words (Set A and Set B). Empty slots only; existing words were kept.");
        $this->line('Sections: Demo, Grade 3 - Rosal, Grade 3 - Sampaguita.');
        $this->line('Demo pupils (section "Demo"): DEMO = Castle 1, DEMO2 = Castle 2 open, DEMO3 = Castle 3 open.');
        $this->line('Try a fresh start: any other name in any section begins at Cycle 1, Sesyon 1.');
        $this->line('Remove all of it later with: php artisan demo:seed --clear');

        return 0;
    }

    /**
     * Demo pupils in section "Demo", each already at a different castle:
     *   DEMO   Castle 1, Sesyon 1 done, Sesyon 2 half way
     *   DEMO2  Castle 1 done, Castle 2 Sesyon 1 open
     *   DEMO3  Castles 1 and 2 done, Castle 3 Sesyon 1 open
     */
    private function seedDemoPupil(): void
    {
        $section = Section::where('name', 'Demo')->first();

        $demo = $this->freshPupil($section, 'DEMO');
        $this->finishSesyon($demo, 1, 1);
        $this->finishSesyon($demo, 1, 2, stage1Only: 8);

        $demo2 = $this->freshPupil($section, 'DEMO2');
        foreach ([1, 2, 3] as $s) {
            $this->finishSesyon($demo2, 1, $s);
        }

        $demo3 = $this->freshPupil($section, 'DEMO3');
        foreach ([1, 2] as $c) {
            foreach ([1, 2, 3] as $s) {
                $this->finishSesyon($demo3, $c, $s);
            }
        }
    }

    private function freshPupil(Section $section, string $name): Pupil
    {
        $pupil = Pupil::firstOrCreate(
            ['section_id' => $section->id, 'name' => $name],
            ['consented_at' => now(), 'last_played_at' => now()]
        );
        ItemResult::where('pupil_id', $pupil->id)->delete();

        return $pupil;
    }

    /** Finish a sesyon with varied stars. With $stage1Only, finish only that many Stage 1 words. */
    private function finishSesyon(Pupil $pupil, int $cycle, int $sesyon, ?int $stage1Only = null): void
    {
        $words = app(GameCatalog::class)->wordsFor($sesyon, $pupil)->values();
        $n = count(self::DEMO_STARS);
        foreach ($words as $i => $word) {
            if ($stage1Only !== null && $i >= $stage1Only) {
                break;
            }
            $this->result($pupil, $cycle, $sesyon, 1, $word, self::DEMO_STARS[($i + $cycle + $sesyon) % $n]);
        }
        if ($stage1Only === null) {
            foreach ($words as $i => $word) {
                $this->result($pupil, $cycle, $sesyon, 2, $word, self::DEMO_STARS[($i + 3 + $cycle) % $n]);
            }
        }
    }

    /** A finished item with the tries that give these stars (5 = right first try, 0 = wrong 3 times). */
    private function result(Pupil $pupil, int $cycle, int $sesyon, int $stage, Word $word, int $stars): void
    {
        $tries = $stars === 0 ? Stars::MAX_ATTEMPTS : Stars::MAX_STARS + 1 - $stars;
        $result = ItemResult::create([
            'pupil_id' => $pupil->id, 'cycle' => $cycle, 'sesyon' => $sesyon, 'stage' => $stage,
            'word_id' => $word->id, 'attempts_used' => $tries, 'is_correct' => $stars > 0,
            'stars' => $stars, 'finished_at' => now(),
        ]);
        $right = $stage === 1 ? GameCatalog::normalize($word->word) : 'Tamang larawan';
        $wrong = $stage === 1 ? strrev(GameCatalog::normalize($word->word)) : 'Maling larawan 1';
        for ($n = 1; $n <= $tries; $n++) {
            $isRight = $stars > 0 && $n === $tries;
            ItemAttempt::create([
                'item_result_id' => $result->id,
                'attempt_no' => $n,
                'answer' => $isRight ? $right : $wrong,
                'is_correct' => $isRight,
            ]);
        }
    }

    private function clear(): int
    {
        $wordIds = json_decode((string) AppSetting::get('demo_word_ids', '[]'), true) ?: [];
        $words = Word::with(['distractors', 'situation'])->whereIn('id', $wordIds)->get();
        foreach ($words as $w) {
            Media::delete($w->image_path);
            Media::delete($w->audio_path);
            $w->distractors->each(fn ($d) => Media::delete($d->image_path));
            Media::delete($w->situation?->image_path);
            $w->delete();
        }

        $sectionIds = json_decode((string) AppSetting::get('demo_section_ids', '[]'), true) ?: [];
        Section::whereIn('id', $sectionIds)->get()->each(function (Section $s) {
            $s->pupils()->each(fn ($p) => $p->tokens()->delete());
            $s->delete();
        });

        AppSetting::put('demo_word_ids', '[]');
        AppSetting::put('demo_section_ids', '[]');
        $this->info("Removed {$words->count()} sample words and ".count($sectionIds).' demo sections.');

        return 0;
    }

    /** Placeholder picture: coloured card with the first letter and the word. */
    private function picture(string $label, array $rgb, string $folder): string
    {
        $w = 480;
        $h = 360;
        $im = imagecreatetruecolor($w, $h);
        [$r, $g, $b] = $rgb;
        for ($y = 0; $y < $h; $y++) {
            $t = $y / $h;
            $c = imagecolorallocate($im, (int) ($r + (255 - $r) * 0.35 * (1 - $t)), (int) ($g + (255 - $g) * 0.35 * (1 - $t)), (int) ($b + (255 - $b) * 0.35 * (1 - $t)));
            imageline($im, 0, $y, $w, $y, $c);
        }
        $white = imagecolorallocate($im, 255, 255, 255);
        $dark = imagecolorallocate($im, 40, 32, 24);
        $shade = imagecolorallocate($im, (int) ($r * 0.7), (int) ($g * 0.7), (int) ($b * 0.7));

        imagefilledellipse($im, 240, 150, 196, 196, $shade);
        imagefilledellipse($im, 240, 144, 190, 190, $white);
        $this->bigText($im, strtoupper(mb_substr($label, 0, 1)), 240, 144, 12, $dark);

        imagefilledrectangle($im, 40, 270, 440, 334, $white);
        $this->bigText($im, strtoupper($label), 240, 302, 5, $dark);

        ob_start();
        imagepng($im);
        $png = ob_get_clean();
        imagedestroy($im);

        $path = $folder.'/demo-'.Str::random(16).'.png';
        Storage::disk(Media::DISK)->put($path, $png);

        return $path;
    }

    /** Built-in GD font scaled up (keeps a pixel look). */
    private function bigText($im, string $text, int $cx, int $cy, int $scale, $color): void
    {
        $fw = imagefontwidth(5) * strlen($text);
        $fh = imagefontheight(5);
        $scale = min($scale, (int) floor(380 / max(1, $fw)));
        $small = imagecreatetruecolor($fw, $fh);
        $bg = imagecolorallocate($small, 255, 0, 255);
        imagefill($small, 0, 0, $bg);
        imagecolortransparent($small, $bg);
        $rgb = imagecolorsforindex($im, $color);
        imagestring($small, 5, 0, 0, $text, imagecolorallocate($small, $rgb['red'], $rgb['green'], $rgb['blue']));
        imagecopyresized($im, $small, (int) ($cx - $fw * $scale / 2), (int) ($cy - $fh * $scale / 2), 0, 0, $fw * $scale, $fh * $scale, $fw, $fh);
        imagedestroy($small);
    }

    /** Short two-note beep standing in for the pronunciation recording. */
    private function beep(int $i): string
    {
        $rate = 8000;
        $data = '';
        $notes = [[523 + ($i % 5) * 40, 0.18], [784 + ($i % 5) * 40, 0.24]];
        foreach ($notes as [$freq, $len]) {
            $n = (int) ($rate * $len);
            for ($k = 0; $k < $n; $k++) {
                $env = min(1, $k / 200, ($n - $k) / 400);
                $data .= chr((int) (128 + 70 * $env * sin(2 * M_PI * $freq * $k / $rate)));
            }
        }
        $wav = 'RIFF'.pack('V', 36 + strlen($data)).'WAVEfmt '.pack('VvvVVvv', 16, 1, 1, $rate, $rate, 1, 8)
            .'data'.pack('V', strlen($data)).$data;

        $path = 'audio/demo-'.Str::random(16).'.wav';
        Storage::disk(Media::DISK)->put($path, $wav);

        return $path;
    }
}
