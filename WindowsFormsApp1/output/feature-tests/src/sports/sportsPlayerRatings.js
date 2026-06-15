"use strict";
// A curated "star power" table — an approximate strength/market-value tier (0-100) for
// well-known international footballers. ESPN's free feed carries no per-player rating, so
// this is the no-key way to let marquee names (Mbappé, Haaland, Bellingham…) stand out in
// the player matchups instead of every squad member reading the same number. Values are
// hand-set estimates for learning/analysis, NOT official ratings, and the table is meant
// to grow. Names are matched accent- and order-insensitively (see normalize()).
Object.defineProperty(exports, "__esModule", { value: true });
exports.starPlayerTier = starPlayerTier;
exports.isStarPlayer = isStarPlayer;
exports.marketValueTier = marketValueTier;
const RAW_STAR_VALUE = {
    // ~96-99 — generational
    'Kylian Mbappe': 98, 'Erling Haaland': 97, 'Jude Bellingham': 95, 'Vinicius Junior': 95,
    // ~90-94 — world class
    'Lionel Messi': 92, 'Rodri': 93, 'Harry Kane': 92, 'Lamine Yamal': 92, 'Kevin De Bruyne': 91,
    'Jamal Musiala': 91, 'Mohamed Salah': 90, 'Pedri': 90, 'Phil Foden': 90, 'Florian Wirtz': 90,
    'Bukayo Saka': 90, 'Khvicha Kvaratskhelia': 89, 'Federico Valverde': 89, 'Victor Osimhen': 88,
    'Lautaro Martinez': 89, 'Toni Kroos': 88, 'Virgil van Dijk': 88, 'Thibaut Courtois': 88,
    'Alisson Becker': 88, 'Rodrygo': 88, 'Martin Odegaard': 88, 'Nico Williams': 87,
    // ~84-88 — elite starters
    'Julian Alvarez': 87, 'Antoine Griezmann': 87, 'Bruno Fernandes': 87, 'Rafael Leao': 86,
    'Declan Rice': 86, 'Joshua Kimmich': 86, 'Achraf Hakimi': 86, 'Theo Hernandez': 85,
    'Aurelien Tchouameni': 85, 'Frenkie de Jong': 85, 'Gianluigi Donnarumma': 86, 'Ederson': 85,
    'Mike Maignan': 85, 'Marc-Andre ter Stegen': 85, 'Ruben Dias': 87, 'William Saliba': 86,
    'Son Heung-Min': 86, 'Cody Gakpo': 83, 'Dani Olmo': 84, 'Nicolo Barella': 85,
    'Alexis Mac Allister': 85, 'Enzo Fernandez': 85, 'Cristian Romero': 85, 'Emiliano Martinez': 85,
    'Dayot Upamecano': 84, 'Ousmane Dembele': 86, 'Marcus Rashford': 84, 'Bernardo Silva': 86,
    'Joao Cancelo': 84, 'Vitinha': 85, 'Bruno Guimaraes': 84, 'Alphonso Davies': 84,
    // ~80-84 — strong internationals
    'Christian Pulisic': 83, 'Weston McKennie': 80, 'Tyler Adams': 80, 'Gio Reyna': 79,
    'Dusan Vlahovic': 83, 'Federico Chiesa': 82, 'Gianluigi Buffon': 80, 'Mason Mount': 80,
    'Cole Palmer': 88, 'Trent Alexander-Arnold': 85, 'Reece James': 83, 'Kyle Walker': 81,
    'John Stones': 83, 'Harry Maguire': 79, 'Jordan Pickford': 81, 'Manuel Neuer': 83,
    'Ilkay Gundogan': 83, 'Leroy Sane': 84, 'Serge Gnabry': 82, 'Kai Havertz': 84, 'Leon Goretzka': 81,
    'Niclas Fullkrug': 79, 'Antonio Rudiger': 85, 'Pau Cubarsi': 82, 'Gavi': 85, 'Fabian Ruiz': 83,
    'Mikel Merino': 82, 'Alvaro Morata': 81, 'Ferran Torres': 80, 'Unai Simon': 81, 'Robin Le Normand': 81,
    'Marquinhos': 85, 'Casemiro': 83, 'Gabriel Jesus': 82, 'Gabriel Martinelli': 83, 'Raphinha': 86,
    'Eder Militao': 84, 'Bremer': 83, 'Danilo': 79, 'Alisson': 88, 'Neymar': 85, 'Richarlison': 79,
    'Angel Di Maria': 82, 'Nicolas Otamendi': 80, 'Rodrigo De Paul': 82, 'Giovani Lo Celso': 79,
    'Paulo Dybala': 83, 'Nahuel Molina': 79, 'Luka Modric': 85, 'Josko Gvardiol': 85, 'Mateo Kovacic': 82,
    'Marcelo Brozovic': 80, 'Andrej Kramaric': 79, 'Ivan Perisic': 79, 'Romelu Lukaku': 83,
    'Jeremy Doku': 84, 'Amadou Onana': 81, 'Youri Tielemans': 80,
    'Wojciech Szczesny': 81, 'Robert Lewandowski': 87, 'Piotr Zielinski': 80, 'Nicolo Zaniolo': 78,
    'Rasmus Hojlund': 81, 'Christian Eriksen': 80, 'Pierre-Emile Hojbjerg': 80, 'Andreas Christensen': 81,
    'Dejan Kulusevski': 81, 'Alexander Isak': 86, 'Victor Lindelof': 78, 'Emil Forsberg': 78,
    'Hakan Calhanoglu': 84, 'Arda Guler': 82, 'Kenan Yildiz': 82, 'Ferdi Kadioglu': 79,
    'Andre Onana': 82, 'Sebastien Haller': 79, 'Sofyan Amrabat': 80, 'Hakim Ziyech': 80,
    'Yassine Bounou': 83, 'Noussair Mazraoui': 80, 'Sadio Mane': 84, 'Edouard Mendy': 80,
    'Kalidou Koulibaly': 80, 'Nicolas Jackson': 80, 'Ademola Lookman': 84, 'Andre-Frank Zambo Anguissa': 80,
    'Moises Caicedo': 83, 'Pervis Estupinan': 79, 'Luis Diaz': 85, 'James Rodriguez': 80,
    'Jhon Duran': 80, 'Darwin Nunez': 81, 'Ronald Araujo': 84,
    'Takefusa Kubo': 82, 'Kaoru Mitoma': 83, 'Wataru Endo': 79, 'Hidemasa Morita': 78,
    'Kim Min-Jae': 84, 'Lee Kang-In': 81
};
// Normalize a name to lowercase, accent-free, single-spaced so "Vinícius Júnior" and a
// plain ASCII spelling match. Order is left as provided; the table mostly uses "First Last".
const normalize = (name) => name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
// Build the lookup once, normalizing every key. Also index by "Last First" so a flipped
// provider ordering still resolves.
const STAR_VALUE = new Map();
for (const [name, value] of Object.entries(RAW_STAR_VALUE)) {
    const key = normalize(name);
    if (!STAR_VALUE.has(key))
        STAR_VALUE.set(key, value);
    const parts = key.split(' ');
    if (parts.length === 2) {
        const flipped = `${parts[1]} ${parts[0]}`;
        if (!STAR_VALUE.has(flipped))
            STAR_VALUE.set(flipped, value);
    }
}
// Returns a 0-100 strength/value tier for a known star, or null for everyone else.
function starPlayerTier(name) {
    const key = normalize(name ?? '');
    if (!key)
        return null;
    return STAR_VALUE.get(key) ?? null;
}
// Convenience: is this a notable / marquee player worth flagging in the UI?
function isStarPlayer(name) {
    return starPlayerTier(name) !== null;
}
// Maps a real Transfermarkt market value (in euros) onto the same 0-100 strength tier the
// star table uses, on a log scale (~€100m -> 98, €10m -> 73, €1m -> 54). This is the
// "Layer 3" signal — preferred over the curated star table when the local proxy supplies
// it, because it is real data for the whole squad, not just marquee names.
function marketValueTier(euros) {
    if (euros == null || !(euros > 0))
        return null;
    const millions = euros / 1_000_000;
    const tier = 46 + 26 * Math.log10(millions + 1);
    return Math.round(Math.min(99, Math.max(42, tier)));
}
