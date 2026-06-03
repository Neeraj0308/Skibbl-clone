const wordList = {
  animals: [
    'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'tiger', 'lion',
    'monkey', 'rabbit', 'fox', 'wolf', 'bear', 'panda', 'koala', 'kangaroo',
    'zebra', 'hippo', 'crocodile', 'parrot', 'owl', 'eagle', 'shark', 'whale',
    'octopus', 'jellyfish', 'butterfly', 'snail', 'turtle', 'frog', 'snake',
  ],
  objects: [
    'chair', 'table', 'lamp', 'phone', 'laptop', 'book', 'pencil', 'mirror',
    'clock', 'glasses', 'umbrella', 'backpack', 'camera', 'guitar', 'piano',
    'bicycle', 'car', 'airplane', 'rocket', 'trophy', 'crown', 'key', 'lock',
    'candle', 'globe', 'compass', 'telescope', 'microscope', 'hammer', 'scissors',
  ],
  food: [
    'pizza', 'burger', 'sushi', 'taco', 'pasta', 'sandwich', 'salad', 'soup',
    'cake', 'ice cream', 'donut', 'cookie', 'apple', 'banana', 'strawberry',
    'watermelon', 'pineapple', 'lemon', 'avocado', 'broccoli', 'carrot', 'corn',
    'mushroom', 'cheese', 'bread', 'egg', 'popcorn', 'chocolate', 'candy',
  ],
  places: [
    'beach', 'mountain', 'forest', 'desert', 'island', 'city', 'village',
    'castle', 'lighthouse', 'bridge', 'stadium', 'library', 'hospital', 'school',
    'airport', 'museum', 'park', 'cave', 'volcano', 'waterfall', 'lake', 'river',
  ],
  actions: [
    'running', 'jumping', 'swimming', 'flying', 'dancing', 'singing', 'cooking',
    'reading', 'sleeping', 'laughing', 'crying', 'thinking', 'drawing', 'climbing',
    'fishing', 'surfing', 'skiing', 'boxing', 'painting', 'building', 'gardening',
  ],
  sports: [
    'soccer', 'basketball', 'tennis', 'baseball', 'volleyball', 'golf', 'boxing',
    'swimming', 'cycling', 'archery', 'bowling', 'chess', 'wrestling', 'hockey',
    'rugby', 'cricket', 'badminton', 'ping pong', 'snowboarding', 'skateboarding',
  ],
  nature: [
    'rainbow', 'lightning', 'tornado', 'tsunami', 'earthquake', 'cloud', 'snowflake',
    'fire', 'wave', 'sunset', 'sunrise', 'moon', 'star', 'sun', 'planet', 'comet',
    'tree', 'flower', 'leaf', 'seed', 'mushroom', 'cactus', 'seaweed',
  ],
  fantasy: [
    'dragon', 'unicorn', 'wizard', 'witch', 'fairy', 'mermaid', 'vampire', 'zombie',
    'ghost', 'monster', 'giant', 'dwarf', 'elf', 'pirate', 'knight', 'princess',
    'ninja', 'robot', 'alien', 'phoenix', 'werewolf', 'treasure',
  ],
};

const allWords = Object.values(wordList).flat();

/**
 * Get N random words from the word list or custom words
 */
function getRandomWords(count = 3, customWords = []) {
  const pool = customWords.length > 5 ? customWords : [...allWords, ...customWords];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generate hint string array - reveals letters progressively
 * e.g., "apple" -> ["_ _ _ _ _", "_ p _ _ _", "_ p p _ _", "a p p l _", "a p p l e"]
 */
function generateHints(word, hintCount) {
  const letters = word.split('');
  const positions = letters
    .map((l, i) => (l !== ' ' ? i : null))
    .filter((i) => i !== null);

  const hints = [];
  const revealed = new Set();

  // Base hint: underscores
  const base = letters.map((l) => (l === ' ' ? ' ' : '_')).join(' ');
  hints.push(base);

  const shuffledPositions = [...positions].sort(() => Math.random() - 0.5);
  const revealPerHint = Math.max(1, Math.floor(positions.length / (hintCount + 1)));

  for (let h = 0; h < hintCount; h++) {
    const toReveal = shuffledPositions.splice(0, revealPerHint);
    toReveal.forEach((i) => revealed.add(i));
    const hintStr = letters
      .map((l, i) => (l === ' ' ? ' ' : revealed.has(i) ? l : '_'))
      .join(' ');
    hints.push(hintStr);
  }

  return hints;
}

/**
 * Check if a guess matches the word (case-insensitive, trimmed)
 */
function checkGuess(guess, word) {
  return guess.trim().toLowerCase() === word.trim().toLowerCase();
}

/**
 * Calculate points for a correct guess
 */
function calculatePoints(timeRemaining, totalTime, rank) {
  const basePoints = 500;
  const timeBonus = Math.floor((timeRemaining / totalTime) * 300);
  const rankPenalty = (rank - 1) * 50;
  return Math.max(50, basePoints + timeBonus - rankPenalty);
}

/**
 * Calculate points for the drawer based on how many guessed
 */
function calculateDrawerPoints(correctGuessers, totalPlayers) {
  if (correctGuessers === 0) return 0;
  return Math.min(300, correctGuessers * 50);
}

module.exports = {
  wordList,
  allWords,
  getRandomWords,
  generateHints,
  checkGuess,
  calculatePoints,
  calculateDrawerPoints,
};
