/**
 * Hand-authored starter bank.
 *
 * Every adjacent pair reads downward as a compound word or a two-word phrase
 * (`fire engine`, `engine room`, `room service`...). These 30 chains exist so
 * the game is playable end to end before the generator in `tools/puzzle-forge`
 * lands in P2; that pipeline will replace this file with a reviewed, scheduled
 * bank stored in Postgres.
 *
 * Words are lowercase and no chain repeats a word.
 */

export interface SeedPuzzle {
  chain: string[];
  difficulty: number;
}

export const SEED_PUZZLES: SeedPuzzle[] = [
  { chain: ['fire', 'engine', 'room', 'service', 'desk', 'top', 'coat'], difficulty: 2 },
  { chain: ['sun', 'flower', 'pot', 'luck', 'out', 'side', 'walk'], difficulty: 1 },
  { chain: ['book', 'shelf', 'life', 'time', 'line', 'up', 'grade'], difficulty: 2 },
  { chain: ['horse', 'play', 'ground', 'work', 'shop', 'keeper', 'sake'], difficulty: 3 },
  { chain: ['rain', 'bow', 'tie', 'break', 'down', 'town', 'hall'], difficulty: 2 },
  { chain: ['black', 'board', 'walk', 'way', 'side', 'step', 'ladder'], difficulty: 3 },
  { chain: ['hand', 'book', 'mark', 'up', 'beat', 'box', 'car'], difficulty: 3 },
  { chain: ['head', 'light', 'house', 'hold', 'up', 'right', 'hand'], difficulty: 2 },
  { chain: ['water', 'fall', 'out', 'break', 'through', 'put', 'down'], difficulty: 3 },
  { chain: ['green', 'light', 'weight', 'lift', 'off', 'spring', 'board'], difficulty: 3 },
  { chain: ['news', 'paper', 'back', 'pack', 'age', 'old', 'school'], difficulty: 2 },
  { chain: ['moon', 'light', 'year', 'book', 'worm', 'hole', 'punch'], difficulty: 2 },
  { chain: ['snow', 'ball', 'park', 'way', 'point', 'blank', 'check'], difficulty: 3 },
  { chain: ['air', 'port', 'hole', 'punch', 'line', 'man', 'power'], difficulty: 4 },
  { chain: ['sea', 'shell', 'fish', 'hook', 'up', 'hill', 'side'], difficulty: 2 },
  { chain: ['day', 'dream', 'land', 'mark', 'down', 'pour', 'over'], difficulty: 3 },
  { chain: ['gold', 'fish', 'bowl', 'game', 'play', 'book', 'store'], difficulty: 2 },
  { chain: ['home', 'work', 'bench', 'mark', 'up', 'town', 'house'], difficulty: 3 },
  { chain: ['back', 'fire', 'wood', 'shed', 'light', 'house', 'boat'], difficulty: 4 },
  { chain: ['under', 'dog', 'house', 'hold', 'over', 'time', 'table'], difficulty: 2 },
  { chain: ['cross', 'road', 'side', 'kick', 'off', 'shore', 'line'], difficulty: 2 },
  { chain: ['tooth', 'pick', 'pocket', 'book', 'case', 'work', 'shop'], difficulty: 3 },
  { chain: ['butter', 'fly', 'paper', 'weight', 'room', 'service', 'road'], difficulty: 3 },
  { chain: ['door', 'step', 'father', 'land', 'slide', 'show', 'case'], difficulty: 2 },
  { chain: ['eye', 'ball', 'game', 'show', 'down', 'side', 'walk'], difficulty: 2 },
  { chain: ['jelly', 'fish', 'net', 'work', 'shop', 'lift', 'off'], difficulty: 2 },
  { chain: ['pan', 'cake', 'walk', 'over', 'head', 'line', 'up'], difficulty: 3 },
  { chain: ['shot', 'gun', 'fire', 'fly', 'wheel', 'chair', 'man'], difficulty: 2 },
  { chain: ['corn', 'field', 'work', 'horse', 'play', 'ground', 'hog'], difficulty: 3 },
  { chain: ['key', 'board', 'game', 'night', 'life', 'guard', 'rail'], difficulty: 2 },
];
