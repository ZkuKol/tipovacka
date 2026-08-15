const url =
  "https://www.chanceliga.cz/rozpis-zapasu/2026?id_stage=1&month=0&round=27&type=1";

const response = await fetch(url);

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const html = await response.text();

const matches = [];

for (const item of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
  const block = item[1];

  // Kolo + datum
  const dateMatch = block.match(
    /<span class="date"><b>#(\d+)<\/b>\s*(\d{2}\/\d{2}\/\d{2})<\/span>/i,
  );

  if (!dateMatch) {
    continue;
  }

  const round = Number(dateMatch[1]);

  // Zajímají nás pouze zápasy 4. kola
  if (round !== 4) {
    continue;
  }

  // Domácí + hosté
  const teamMatches = [
    ...block.matchAll(
      /<span class="team">[\s\S]*?<img[^>]*alt="([^"]+)"[^>]*>[\s\S]*?<b>([^<]+)<\/b>/gi,
    ),
  ];

  if (teamMatches.length !== 2) {
    continue;
  }

  // ID zápasu Chance Ligy
  const gameMatch = block.match(
    /href="\/zapas\/(\d+)-[^"]+"/i,
  );

  if (!gameMatch) {
    continue;
  }

  // Pokud je zápas odehraný, najdeme skóre
  const scoreMatch = block.match(
    /<b class="number">[\s\S]*?<a[^>]*>(\d+)\s*:\s*(\d+)<\/a>/i,
  );

  // U budoucího zápasu je čas uvnitř score-container
  const timeMatch = block.match(
    /<b class="time">[\s\S]*?<a[^>]*>[^<]*?(\d{1,2}:\d{2})<\/a>/i,
  );

  // Záložní varianta pro jiný formát Chance Ligy
  const fallbackTimeMatch = block.match(
    /<span class="info">(?:po|út|st|čt|pá|so|ne)?\s*(\d{1,2}:\d{2})<\/span>/i,
  );

  matches.push({
    chanceGameId: Number(gameMatch[1]),

    round,

    date: dateMatch[2],

    time:
      timeMatch?.[1] ??
      fallbackTimeMatch?.[1] ??
      null,

    homeTeam: teamMatches[0][1],
    homeCode: teamMatches[0][2],

    awayTeam: teamMatches[1][1],
    awayCode: teamMatches[1][2],

    homeScore: scoreMatch
      ? Number(scoreMatch[1])
      : null,

    awayScore: scoreMatch
      ? Number(scoreMatch[2])
      : null,

    finished: Boolean(scoreMatch),
  });
}

console.log(matches);
console.log("Počet:", matches.length);
