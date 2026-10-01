// ============================================================================
// PASHA PALLI — DICE-PIT CROSS RACE
// Centurion University (CUTM) • Native & Indigenous Sports of India (2025)
// Full Interactive Web Preview & Rules Engine
// ============================================================================

// ----------------------------------------------------------------------------
// Game State Finite State Machine (FSM) — as specified in §3
// ----------------------------------------------------------------------------
const GameState = {
  Boot: 'Boot',
  MainMenu: 'MainMenu',
  Setup: 'Setup',
  Roll: 'Roll',
  ChooseMove: 'ChooseMove',
  PreviewMove: 'PreviewMove',
  Animating: 'Animating',
  NextPlayer: 'NextPlayer',
  GameOver: 'GameOver',
  Paused: 'Paused'
};

let currentGameState = GameState.Boot;
let previousGameState = GameState.Roll;

// ----------------------------------------------------------------------------
// Players Definition & Configuration (§3 & §5)
// ----------------------------------------------------------------------------
const CANONICAL_PLAYERS = [
  { id: 0, name: 'Crimson Red', title: 'Maharathi', color: '#d82538', symbol: '☀️', type: 'human', aiStyle: 'balanced', homeArm: 2, dockClass: 'dock-south', direction: 'South', badgeClass: 'red' },
  { id: 1, name: 'Emerald Green', title: 'Samrat', color: '#278d46', symbol: '🪷', type: 'ai', aiStyle: 'defensive', homeArm: 3, dockClass: 'dock-west', direction: 'West', badgeClass: 'green' },
  { id: 2, name: 'Golden Yellow', title: 'Senapati', color: '#e5b222', symbol: '🌙', type: 'ai', aiStyle: 'aggressive', homeArm: 0, dockClass: 'dock-north', direction: 'North', badgeClass: 'yellow' },
  { id: 3, name: 'Sapphire Blue', title: 'Yoddha', color: '#227de5', symbol: '⚡', type: 'ai', aiStyle: 'speed', homeArm: 1, dockClass: 'dock-east', direction: 'East', badgeClass: 'blue' }
];

let ALL_PLAYERS = JSON.parse(JSON.stringify(CANONICAL_PLAYERS));

const PRESET_PLAYER_PROFILES = [
  { name: 'Arjuna', title: 'Maharathi', symbol: '🏹' },
  { name: 'Yudhishthira', title: 'Dharmaraja', symbol: '☀️' },
  { name: 'Duryodhana', title: 'Samrat', symbol: '👑' },
  { name: 'Shakuni', title: 'Pasha Master', symbol: '🎲' },
  { name: 'Karna', title: 'Danveer', symbol: '⚡' },
  { name: 'Bhima', title: 'Gadadhari', symbol: '🦁' },
  { name: 'Vikramaditya', title: 'Chhatrapati', symbol: '⚔️' },
  { name: 'Ashoka', title: 'Devanampriya', symbol: '🪷' },
  { name: 'Rani Padmini', title: 'Rajkumari', symbol: '🦚' }
];

const AVAILABLE_AVATARS = ['☀️', '🪷', '🌙', '⚡', '🦁', '🏹', '👑', '🐘', '⚔️', '🦚', '🎲', '🔥'];

const ROYAL_TITLES = [
  'Maharathi',
  'Samrat',
  'Senapati',
  'Yoddha',
  'Dharmaraja',
  'Raja',
  'Rajkumari',
  'Pasha Master',
  'Chaturanga Guru',
  'Grandmaster',
  'Champion'
];

let currentProfileTab = 0; // 0, 1, 2, 3, or 'all'

function loadSavedProfiles() {
  try {
    const raw = localStorage.getItem('pasha_palli_profiles');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 4) {
        parsed.forEach((saved, idx) => {
          if (ALL_PLAYERS[idx] && saved) {
            if (saved.name) ALL_PLAYERS[idx].name = String(saved.name).trim();
            if (saved.title) ALL_PLAYERS[idx].title = String(saved.title).trim();
            if (saved.symbol) ALL_PLAYERS[idx].symbol = String(saved.symbol).trim();
            if (saved.aiStyle) ALL_PLAYERS[idx].aiStyle = saved.aiStyle;
          }
        });
      }
    }
    const savedColor = localStorage.getItem('pasha_palli_human_color');
    if (savedColor !== null) {
      const sc = parseInt(savedColor, 10);
      if (sc >= 0 && sc <= 3) {
        humanChosenColorId = sc;
      }
    }
  } catch (e) {
    console.warn('Failed to load profiles:', e);
  }
}

function saveProfilesToStorage() {
  try {
    const dataToSave = ALL_PLAYERS.map(p => ({
      name: p.name,
      title: p.title,
      symbol: p.symbol,
      type: p.type,
      aiStyle: p.aiStyle
    }));
    localStorage.setItem('pasha_palli_profiles', JSON.stringify(dataToSave));
    localStorage.setItem('pasha_palli_human_color', String(humanChosenColorId));
  } catch (e) {
    console.warn('Failed to save profiles:', e);
  }
}

// Initial profile load
loadSavedProfiles();

let activePlayers = []; // Set depending on player count (2, 3, 4)
let currentTurnIndex = 0; // Index into activePlayers

// Safe Castle Havens: 4 Red cells forming a plus (+) around the green center cell (r=3, c=1) in all 4 sectors
function isCellSafeInArm(r, c) {
  return (
    (r === 2 && c === 1) ||
    (r === 4 && c === 1) ||
    (r === 3 && c === 0) ||
    (r === 3 && c === 2)
  );
}

// Game Options & Toggles
let matchConfig = {
  mode: 'vsAI',       // 'vsAI', 'passPlay', 'spectate'
  playerCount: 4,     // 2, 3, 4
  aiDifficulty: 'medium', // 'easy', 'medium', 'hard'
  diceModel: 'pasa',  // 'pasa', 'cowrie'
  strictEntry: true,  // Entry requires 1, 6, or doubles
  moveSpeedMs: 120,   // Movement animation step speed
  showSymbols: true,  // Color-blind accessibility symbols
  soundEnabled: true, // Procedural sound effects
  language: 'en'      // 'en', 'hi', 'od'
};

// Match Run State
let currentRoll = 0;
let rolledDiceValues = [0, 0];
let rolledGraceBonus = false;
let extraTurnGranted = false;
let selectedPawnForPreview = null;
let previewTargetIdx = -1;
let lastMoveRecord = null; // For casual Undo
let matchRanks = []; // Ranked finishes (1st, 2nd, 3rd, 4th)
let matchStats = { totalTurns: 0, totalCaptures: 0, totalDoubles: 0, startTime: Date.now() };

// Board Graph & Pawns Registry
const cellsMap = new Map();
let pawns = []; // { id, player, pathIdx, el, isFinished }
let playerPaths = []; // Array of arrays of keys for each player id 0..3

// Active animation timeouts to cancel on reset
let activeAnimationTimeouts = [];

function registerTimeout(fn, delay) {
  const t = setTimeout(fn, delay);
  activeAnimationTimeouts.push(t);
  return t;
}

function clearAllTimeouts() {
  activeAnimationTimeouts.forEach(t => clearTimeout(t));
  activeAnimationTimeouts = [];
}

// ----------------------------------------------------------------------------
// Localization Tables (English, Hindi, Odia) — as specified in §6 & §10
// ----------------------------------------------------------------------------
const I18N = {
  en: {
    app_title: "PASHA PALLI",
    app_subtitle: "The Ancient Epic Dice-Pit Cross Race",
    match_setup: "Match Setup",
    how_to_play: "How to Play",
    gdd_spec: "GDD Document",
    dev_journal: "Dev Journal",
    settings: "Settings",
    current_turn: "CURRENT TURN",
    throw_pasas: "THROW PASAS",
    in_dock: "Dock:",
    on_track: "Track:",
    home: "Home:",
    match_participants: "PARTICIPANTS & STATUS",
    event_log: "GAMEPLAY EVENT LOG",
    reset_board: "Reset Board",
    options: "Options",
    hint: "Hint",
    undo: "Undo",
    pause: "Pause",
    confirm_move: "Confirm Move",
    cancel: "Cancel",
    rules_modal_title: "Rule Book: How to Play Pasha Palli",
    enter_court: "Start Match",
    previous: "Previous",
    next: "Next",
    match_setup_title: "Pasha Palli Match Setup",
    game_mode: "Game Mode:",
    player_count: "Player Count:",
    ai_difficulty: "AI Difficulty Tier (§5 of Specification):",
    dice_model: "Dice Throw Model (§4 & §6):",
    entry_rule: "Board Entry Rule (§2 Canonical Rules):",
    apply_and_start: "Start Match with Settings",
    close: "Close",
    settings_title: "Settings & Accessibility",
    language_label: "Language / भाषा / ଭାଷା:",
    accessibility_label: "Accessibility & Visual Aids:",
    color_blind_text: "Display Cultural Symbol Glyphs on Gottis (☀️, 🪷, 🌙, ⚡)",
    audio_sfx_label: "Audio & Sound FX (Web Audio API):",
    sound_sfx_text: "Enable Procedural Sound Effects (Dice, Hop, Capture, Fanfare)",
    anim_speed_label: "Pawn Movement Speed:",
    save_and_close: "Save & Close",
    game_paused: "Match Paused",
    pause_desc: "Take your time. The match state is preserved.",
    resume_game: "Resume Match",
    restart_match: "Restart Match",
    match_settings: "Match Settings",
    play_again: "Play Again",
    inspect_board: "Inspect Final Board",
    gdd_title: "Game Design Document (GDD)",
    journal_title: "Game Developer's Journal",
    player_profiles: "Player Profiles",
    profile_modal_title: "Player Profiles & Roster Setup"
  },
  hi: {
    app_title: "पासा पल्ली",
    app_subtitle: "प्राचीन महाकाव्य पासा-क्रॉस दौड़",
    match_setup: "मैच सेटअप",
    how_to_play: "खेल के नियम",
    gdd_spec: "GDD दस्तावेज़",
    dev_journal: "डेव जर्नल",
    settings: "सेटिंग्स",
    current_turn: "वर्तमान चाल",
    throw_pasas: "पासा फेंकें",
    in_dock: "अड्डा:",
    on_track: "रास्ता:",
    home: "घर:",
    match_participants: "खिलाड़ी और स्थिति",
    event_log: "खेल घटना लॉग",
    reset_board: "बोर्ड रीसेट करें",
    options: "विकल्प",
    hint: "संकेत",
    undo: "वापस लें",
    pause: "रोकें",
    confirm_move: "चाल की पुष्टि करें",
    cancel: "रद्द करें",
    rules_modal_title: "पासा पल्ली नियम पुस्तिका (Rule Book)",
    enter_court: "मैच शुरू करें",
    previous: "पिछला",
    next: "अगला",
    match_setup_title: "पासा पल्ली मैच सेटअप",
    game_mode: "गेम मोड:",
    player_count: "खिलाड़ियों की संख्या:",
    ai_difficulty: "AI कठिनाई स्तर (§5 विनिर्देश):",
    dice_model: "पासा मॉडल (§4 और §6):",
    entry_rule: "बोर्ड प्रवेश नियम (§2 प्रामाणिक नियम):",
    apply_and_start: "सेटिंग्स लागू करें और खेलें",
    close: "बंद करें",
    settings_title: "सेटिंग्स और सुगमता",
    language_label: "भाषा / Language / ଭାଷା:",
    accessibility_label: "सुगमता और दृश्य सहायता:",
    color_blind_text: "गोटियों पर सांस्कृतिक प्रतीक दिखाएं (☀️, 🪷, 🌙, ⚡)",
    audio_sfx_label: "ध्वनि प्रभाव (Web Audio API):",
    sound_sfx_text: "प्रक्रियात्मक ध्वनि प्रभाव सक्षम करें (पासा, छलांग, जीत)",
    anim_speed_label: "गोटी चलने की गति:",
    save_and_close: "सहेजें और बंद करें",
    game_paused: "खेल रुका हुआ है",
    pause_desc: "अपना समय लें। खेल की स्थिति सुरक्षित है।",
    resume_game: "खेल जारी रखें",
    restart_match: "मैच पुनरारंभ करें",
    match_settings: "मैच सेटिंग्स",
    play_again: "फिर से खेलें",
    inspect_board: "अंतिम बोर्ड देखें",
    gdd_title: "गेम डिज़ाइन दस्तावेज़ (GDD)",
    journal_title: "गेम डेवलपर जर्नल",
    player_profiles: "खिलाड़ी प्रोफाइल",
    profile_modal_title: "खिलाड़ी प्रोफाइल और रोस्टर सेटअप"
  },
  od: {
    app_title: "ପାଶା ପଲ୍ଲୀ",
    app_subtitle: "ପ୍ରାଚୀନ ମହାକାବ୍ୟ ପାଶା କ୍ରସ ରେସ୍",
    match_setup: "ମ୍ୟାଚ୍ ସେଟଅପ୍",
    how_to_play: "ନିୟମାବଳୀ",
    gdd_spec: "GDD ଡକ୍ୟୁମେଣ୍ଟ",
    dev_journal: "ଡେଭ୍ ଜର୍ଣ୍ଣାଲ",
    settings: "ସେଟିଙ୍ଗସ୍",
    current_turn: "ବର୍ତ୍ତମାନ ଚାଳ",
    throw_pasas: "ପାଶା ଫିଙ୍ଗନ୍ତୁ",
    in_dock: "ଘାଟ:",
    on_track: "ପଥ:",
    home: "ଘର:",
    match_participants: "ଖେଳାଳି ଓ ସ୍ଥିତି",
    event_log: "ଖେଳ ବିବରଣୀ",
    reset_board: "ବୋର୍ଡ଼ ରିସେଟ୍",
    options: "ବିକଳ୍ପ",
    hint: "ସୂଚନା",
    undo: "ଫେରନ୍ତୁ",
    pause: "ରଖନ୍ତୁ",
    confirm_move: "ନିଶ୍ଚିତ କରନ୍ତୁ",
    cancel: "ବାତିଲ",
    rules_modal_title: "ପାଶା ପଲ୍ଲୀ ନିୟମ ପୁସ୍ତିକା (Rule Book)",
    enter_court: "ଖେଳ ଆରମ୍ଭ କରନ୍ତୁ",
    previous: "ପୂର୍ବ",
    next: "ପରବର୍ତ୍ତୀ",
    match_setup_title: "ପାଶା ପଲ୍ଲୀ ମ୍ୟାଚ୍ ସେଟଅପ୍",
    game_mode: "ଖେଳ ମୋଡ୍:",
    player_count: "ଖେଳାଳି ସଂଖ୍ୟା:",
    ai_difficulty: "AI କଠିନତା ସ୍ତର:",
    dice_model: "ପାଶା ଫିଙ୍ଗିବା ମଡେଲ:",
    entry_rule: "ପ୍ରବେଶ ନିୟମ:",
    apply_and_start: "ଖେଳ ଆରମ୍ଭ କରନ୍ତୁ",
    close: "ବନ୍ଦ କରନ୍ତୁ",
    settings_title: "ସେଟିଙ୍ଗସ୍ ଓ ସୁବିଧା",
    language_label: "ଭାଷା / Language / भाषा:",
    accessibility_label: "ସୁବିଧା ଓ ଦୃଶ୍ୟ ସହାୟତା:",
    color_blind_text: "ଗୋଟିରେ ସାଂସ୍କୃତିକ ପ୍ରତୀକ ଦେଖାନ୍ତୁ (☀️, 🪷, 🌙, ⚡)",
    audio_sfx_label: "ଧ୍ୱନି ପ୍ରଭାବ (Web Audio API):",
    sound_sfx_text: "ଧ୍ୱନି ପ୍ରଭାବ ସକ୍ରିୟ କରନ୍ତୁ",
    anim_speed_label: "ଗୋଟି ଗତି ବେଗ:",
    save_and_close: "ରଖନ୍ତୁ ଓ ବନ୍ଦ କରନ୍ତୁ",
    game_paused: "ଖେଳ ସ୍ଥଗିତ ଅଛି",
    pause_desc: "ଖେଳର ସ୍ଥିତି ସୁରକ୍ଷିତ ଅଛି।",
    resume_game: "ପୁନର୍ବାର ଆରମ୍ଭ କରନ୍ତୁ",
    restart_match: "ମ୍ୟାଚ୍ ପୁନର୍ବାର ଆରମ୍ଭ",
    match_settings: "ମ୍ୟାଚ୍ ସେଟିଙ୍ଗସ୍",
    play_again: "ପୁଣି ଖେଳନ୍ତୁ",
    inspect_board: "ଶେଷ ବୋର୍ଡ଼ ଦେଖନ୍ତୁ",
    gdd_title: "ଗେମ୍ ଡିଜାଇନ୍ ଡକ୍ୟୁମେଣ୍ଟ (GDD)",
    journal_title: "ଗେମ୍ ଡେଭଲପର୍ ଜର୍ଣ୍ଣାଲ",
    player_profiles: "ଖେଳାଳି ପ୍ରୋଫାଇଲ୍",
    profile_modal_title: "ଖେଳାଳି ପ୍ରୋଫାଇଲ୍ ଏବଂ ରୋଷ୍ଟର ସେଟଅପ୍"
  }
};

function updateLanguage(lang) {
  matchConfig.language = lang;
  const dict = I18N[lang] || I18N.en;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  const titleEl = document.getElementById('appTitle');
  if (titleEl && dict.app_title) titleEl.textContent = dict.app_title;

  updateHUD();
}

// ----------------------------------------------------------------------------
// Procedural Web Audio API Synthesizer (§7 Audio Specification)
// Generates authentic organic woodblock clatters, hops, safe chimes, and stings
// ----------------------------------------------------------------------------
class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playDiceTumble() {
    if (!matchConfig.soundEnabled || this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const count = 4;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const freq = 160 + Math.random() * 140;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      }, i * 65);
    }
  }

  playPawnHop() {
    if (!matchConfig.soundEnabled || this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(540, this.ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  playSafeChime() {
    if (!matchConfig.soundEnabled || this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    [523.25, 659.25, 783.99].forEach((f, i) => {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
      }, i * 70);
    });
  }

  playCaptureSting() {
    if (!matchConfig.soundEnabled || this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playVictoryFanfare() {
    if (!matchConfig.soundEnabled || this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, i) => {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
      }, i * 110);
    });
  }

  playClick() {
    if (!matchConfig.soundEnabled || this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }
}

const audio = new ProceduralAudioEngine();

// ----------------------------------------------------------------------------
// Board Graph & Geometry Construction
// ----------------------------------------------------------------------------
function buildBoard() {
  const armNorth = document.getElementById('armNorth');
  const armEast = document.getElementById('armEast');
  const armSouth = document.getElementById('armSouth');
  const armWest = document.getElementById('armWest');

  // North (Arm 0): 8 rows, 3 cols
  buildArmCells(armNorth, 0, 8, 3, true);
  // East (Arm 1): 3 rows, 8 cols
  buildArmCells(armEast, 1, 8, 3, false);
  // South (Arm 2): 8 rows, 3 cols
  buildArmCells(armSouth, 2, 8, 3, true);
  // West (Arm 3): 3 rows, 8 cols
  buildArmCells(armWest, 3, 8, 3, false);

  // Central 'C' (Charkoni / Home) square
  const centerEl = document.getElementById('centerCharkoni');
  cellsMap.set('center', {
    arm: -1, r: -1, c: -1, isSafe: true, isHome: true, el: centerEl, pawnsContainer: document.getElementById('charkoniPawns')
  });

  // Designated starting area docks for each of the 4 players (Rule 2 from book)
  for (let p = 0; p < 4; p++) {
    const dockWrap = document.getElementById(`dockPawns${p}`);
    const dockEl = document.getElementById(`startDockP${p}`);
    if (dockWrap) {
      cellsMap.set(`start_${p}`, {
        arm: ALL_PLAYERS[p].homeArm, r: -2, c: -2, isSafe: true, isHome: false, el: dockEl, pawnsContainer: dockWrap
      });
    }
  }

  generatePlayerPaths();
}

function buildArmCells(container, armIdx, rows, cols, isVertical) {
  container.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 3; c++) {
      const isCrimson = (r + c) % 2 !== 0;
      const isSafe = isCellSafeInArm(r, c);

      const tile = document.createElement('div');
      tile.className = `cell-tile ${isCrimson ? 'crimson' : 'emerald'}`;
      tile.dataset.arm = armIdx;
      tile.dataset.row = r;
      tile.dataset.col = c;

      if (isSafe) {
        const marker = document.createElement('div');
        marker.className = 'safe-marker';
        marker.title = 'Safe Castle (Safe Haven)';
        tile.appendChild(marker);
      }

      const pawnsCont = document.createElement('div');
      pawnsCont.className = 'cell-pawns';
      tile.appendChild(pawnsCont);

      const cellKey = `${armIdx}_${r}_${c}`;
      cellsMap.set(cellKey, {
        arm: armIdx, r, c, isSafe, isHome: false, el: tile, pawnsContainer: pawnsCont
      });

      // Grid position in CSS
      if (!isVertical) {
        if (armIdx === 1) { // East: r=0 is rightmost, c is row
          tile.style.gridColumn = `${8 - r}`;
          tile.style.gridRow = `${c + 1}`;
        } else if (armIdx === 3) { // West: r=0 is leftmost, c is row
          tile.style.gridColumn = `${r + 1}`;
          tile.style.gridRow = `${3 - c}`;
        }
      } else {
        if (armIdx === 0) { // North: r=0 is top, c is col
          tile.style.gridRow = `${r + 1}`;
          tile.style.gridColumn = `${c + 1}`;
        } else if (armIdx === 2) { // South: r=0 is bottom, c is mirrored
          tile.style.gridRow = `${8 - r}`;
          tile.style.gridColumn = `${3 - c}`;
        }
      }

      // Clicking on a cell tile directly when a pawn is selected can also commit move
      tile.addEventListener('click', () => {
        if (selectedPawnForPreview && previewTargetIdx >= 0) {
          const path = playerPaths[selectedPawnForPreview.player];
          if (path[previewTargetIdx] === cellKey) {
            confirmSelectedMove();
          }
        }
      });

      container.appendChild(tile);
    }
  }
}

// ----------------------------------------------------------------------------
// Traversal Path Construction (Rule 4 from Book)
// ----------------------------------------------------------------------------
function generatePlayerPaths() {
  playerPaths = ALL_PLAYERS.map((pl) => {
    const path = [];
    const home = pl.homeArm;

    // 1. Initial exit down middle column of home arm
    for (let r = 7; r >= 0; r--) {
      path.push(`${home}_${r}_1`);
    }

    // 2. Loop counter-clockwise around the perimeter of all 4 arms
    for (let offset = 0; offset < 4; offset++) {
      const arm = (home + offset) % 4;
      for (let r = 0; r < 8; r++) {
        path.push(`${arm}_${r}_2`);
      }
      const nextArm = (arm + 1) % 4;
      for (let r = 7; r >= 0; r--) {
        path.push(`${nextArm}_${r}_0`);
      }
    }

    // 3. Return up middle column of home arm
    for (let r = 0; r < 8; r++) {
      path.push(`${home}_${r}_1`);
    }

    // 4. Central 'C' square (Home Goal)
    path.push('center');
    return path;
  });
}

// ----------------------------------------------------------------------------
// Player Profiles & Roster Management System (§3, §5 & §7)
// ----------------------------------------------------------------------------
function updateDockBadges() {
  ALL_PLAYERS.forEach(pl => {
    const dockEl = document.getElementById(`startDockP${pl.id}`);
    if (dockEl) {
      const isHuman = (pl.type === 'human');
      const badge = dockEl.querySelector('.dock-badge');
      if (badge) {
        badge.innerHTML = `<span class="sym">${pl.symbol}</span> <span>${pl.name}</span>${isHuman ? ' <span class="dock-you-badge">YOU</span>' : ''}`;
      }
      dockEl.title = `${pl.name} (${pl.title} • ${pl.direction}) Starting Base${isHuman ? ' [YOUR GOTIS]' : ''}`;
      if (isHuman) {
        dockEl.classList.add('human-dock');
      } else {
        dockEl.classList.remove('human-dock');
      }
    }
  });
}

function updatePawnVisuals() {
  pawns.forEach(pawn => {
    const pl = ALL_PLAYERS[pawn.player];
    if (pl && pawn.el) {
      const isHuman = (pl.type === 'human');
      pawn.el.title = `${pl.name} (${pl.title}) Gotti #${pawn.id + 1} (${pl.symbol})${isHuman ? ' [Your Gotti]' : ''}`;
      const symBadge = pawn.el.querySelector('.pawn-sym-badge');
      if (symBadge) symBadge.textContent = pl.symbol;
    }
  });
}

function updateSetupRosterPreview() {
  const container = document.getElementById('setupRosterPreview');
  if (!container) return;

  container.innerHTML = '';
  const countInput = document.querySelector('input[name="playerCount"]:checked');
  const pCount = countInput ? parseInt(countInput.value) : matchConfig.playerCount;

  let roster = [];
  if (pCount === 2) {
    const oppId = (humanChosenColorId + 2) % 4;
    roster = [ALL_PLAYERS[humanChosenColorId], ALL_PLAYERS[oppId]];
  } else if (pCount === 3) {
    const otherIds = [0, 1, 2, 3].filter(id => id !== humanChosenColorId);
    roster = [ALL_PLAYERS[humanChosenColorId], ALL_PLAYERS[otherIds[0]], ALL_PLAYERS[otherIds[1]]];
  } else {
    roster = [...ALL_PLAYERS];
  }

  roster.forEach(pl => {
    const isHuman = (pl.type === 'human');
    const chip = document.createElement('div');
    chip.className = 'roster-chip';
    chip.title = `Click to edit ${pl.name}'s profile and options`;
    chip.innerHTML = `
      <span class="roster-chip-dot" style="background:${pl.color};"></span>
      <span class="roster-chip-name">${pl.symbol} ${pl.name}</span>
      <span class="roster-chip-title">[${pl.title}]</span>
      <span class="roster-chip-role ${isHuman ? 'human' : 'ai'}">${isHuman ? 'Human' : (pl.aiStyle ? pl.aiStyle.slice(0, 4) : 'AI')}</span>
    `;
    chip.addEventListener('click', () => {
      document.getElementById('setupModal').classList.add('hidden');
      openProfileModal(pl.id);
    });
    container.appendChild(chip);
  });
}

function renderProfileEditor(activeTab = null) {
  if (activeTab !== null) {
    currentProfileTab = activeTab;
  }

  // Update Tab buttons state
  document.querySelectorAll('.profile-tab-btn').forEach(btn => {
    const tabVal = btn.dataset.tab;
    const isMatch = (tabVal === String(currentProfileTab));
    btn.classList.toggle('active', isMatch);
  });

  // Update tab labels with current names
  for (let i = 0; i < 4; i++) {
    const lbl = document.getElementById(`tabLabel${i}`);
    if (lbl) {
      lbl.textContent = `${ALL_PLAYERS[i].direction} (${ALL_PLAYERS[i].name})`;
    }
  }

  const container = document.getElementById('profileCardsContainer');
  if (!container) return;

  container.innerHTML = '';
  const isViewAll = (currentProfileTab === 'all');
  container.className = `profile-cards-container ${isViewAll ? 'view-all' : ''}`;

  const targetIdx = Number(currentProfileTab);
  const playersToRender = isViewAll ? ALL_PLAYERS : [ALL_PLAYERS[targetIdx] || ALL_PLAYERS[0]];

  playersToRender.forEach(pl => {
    const card = document.createElement('div');
    card.className = 'player-profile-card';
    card.style.borderLeftColor = pl.color;

    const isHuman = (pl.type === 'human');
    card.innerHTML = `
      <div class="profile-card-header">
        <div class="profile-card-title-group">
          <div class="profile-badge-circle" style="background:${pl.color};">
            <span id="previewSymbol_${pl.id}">${pl.symbol}</span>
          </div>
          <div>
            <div class="profile-direction-tag">${pl.direction} Arm (${pl.color})</div>
            <h3 style="color:#fff; font-size:15px; margin:0;" id="previewCardHeader_${pl.id}">
              ${pl.name} <span style="font-size:11px; color:var(--gold-primary); font-weight:600;">[${pl.title}]</span>
            </h3>
          </div>
        </div>

        <div class="profile-live-preview-pill" title="Live Pawn Token Preview">
          <div class="token-mini-render" style="background-color:${pl.color};">
            <span id="tokenMiniSym_${pl.id}">${pl.symbol}</span>
            <span class="token-mini-badge">1</span>
          </div>
          <span class="preview-name-display" id="tokenMiniLabel_${pl.id}">${pl.name}</span>
        </div>
      </div>

      <div class="profile-form-grid">
        <!-- Player Name -->
        <div class="profile-field profile-field-full">
          <label class="profile-label">Player Name:</label>
          <input type="text" class="profile-input" id="inputProfName_${pl.id}" value="${pl.name}" maxlength="20" placeholder="Enter player name...">

          <!-- Preset Name Suggestions -->
          <div class="preset-pills-wrap">
            <span style="font-size:10px; color:var(--text-muted); align-self:center;">Presets:</span>
            ${PRESET_PLAYER_PROFILES.map(pr => `
              <button type="button" class="preset-pill" data-pid="${pl.id}" data-name="${pr.name}" data-title="${pr.title}" data-sym="${pr.symbol}">
                ${pr.name} ${pr.symbol}
              </button>
            `).join('')}
            <button type="button" class="preset-pill" data-pid="${pl.id}" data-name="Player ${pl.id + 1}" data-title="Champion" data-sym="${pl.symbol}">
              Player ${pl.id + 1}
            </button>
          </div>
        </div>

        <!-- Royal Title -->
        <div class="profile-field">
          <label class="profile-label">Royal Title / Rank:</label>
          <select class="profile-select" id="inputProfTitle_${pl.id}">
            ${ROYAL_TITLES.map(t => `<option value="${t}" ${pl.title === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>

        <!-- Controller Option (Human vs AI) -->
        <div class="profile-field">
          <label class="profile-label">Player Controller Option:</label>
          <div class="controller-segmented-group" id="controllerGroup_${pl.id}">
            <label class="controller-option">
              <input type="radio" name="ctrlType_${pl.id}" value="human" ${isHuman ? 'checked' : ''}>
              <span>👤 Human</span>
            </label>
            <label class="controller-option">
              <input type="radio" name="ctrlType_${pl.id}" value="ai" ${!isHuman ? 'checked' : ''}>
              <span>🤖 AI Bot</span>
            </label>
          </div>
        </div>

        <!-- Avatar Symbol Grid -->
        <div class="profile-field profile-field-full">
          <label class="profile-label">Avatar / Token Symbol:</label>
          <div class="avatar-picker-grid" id="avatarGrid_${pl.id}">
            ${AVAILABLE_AVATARS.map(av => `
              <button type="button" class="avatar-btn ${pl.symbol === av ? 'selected' : ''}" data-pid="${pl.id}" data-avatar="${av}">
                ${av}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- AI Playstyle Option -->
        <div class="profile-field profile-field-full" id="aiStyleField_${pl.id}" style="${isHuman ? 'display:none;' : ''}">
          <label class="profile-label">AI Personality & Playstyle Option:</label>
          <select class="profile-select" id="inputProfAiStyle_${pl.id}">
            <option value="balanced" ${pl.aiStyle === 'balanced' ? 'selected' : ''}>⚖️ Balanced Heuristic (Capture > Safety > Progress)</option>
            <option value="aggressive" ${pl.aiStyle === 'aggressive' ? 'selected' : ''}>⚔️ Aggressive Hunter (Prioritizes cutting and hunting opponent gottis)</option>
            <option value="defensive" ${pl.aiStyle === 'defensive' ? 'selected' : ''}>🛡️ Defensive Sentinel (Safe castles focus & risk-averse play)</option>
            <option value="speed" ${pl.aiStyle === 'speed' ? 'selected' : ''}>⚡ Charkoni Rusher (Rapid sprint straight to central Home 'C')</option>
          </select>
        </div>
      </div>
    `;

    container.appendChild(card);

    // Reactive input listeners
    const nameInput = card.querySelector(`#inputProfName_${pl.id}`);
    const titleSelect = card.querySelector(`#inputProfTitle_${pl.id}`);
    const aiField = card.querySelector(`#aiStyleField_${pl.id}`);
    const tokenMiniLabel = card.querySelector(`#tokenMiniLabel_${pl.id}`);
    const previewHeader = card.querySelector(`#previewCardHeader_${pl.id}`);

    nameInput.addEventListener('input', (e) => {
      const val = e.target.value.trim() || `Player ${pl.id + 1}`;
      pl.name = val;
      tokenMiniLabel.textContent = val;
      previewHeader.innerHTML = `${val} <span style="font-size:11px; color:var(--gold-primary); font-weight:600;">[${pl.title}]</span>`;
    });

    titleSelect.addEventListener('change', (e) => {
      pl.title = e.target.value;
      previewHeader.innerHTML = `${pl.name} <span style="font-size:11px; color:var(--gold-primary); font-weight:600;">[${pl.title}]</span>`;
    });

    // Preset chips
    card.querySelectorAll('.preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const pName = btn.dataset.name;
        const pTitle = btn.dataset.title;
        const pSym = btn.dataset.sym;

        pl.name = pName;
        pl.title = pTitle;
        pl.symbol = pSym;

        nameInput.value = pName;
        titleSelect.value = pTitle;

        card.querySelectorAll('.avatar-btn').forEach(ab => {
          ab.classList.toggle('selected', ab.dataset.avatar === pSym);
        });

        card.querySelector(`#previewSymbol_${pl.id}`).textContent = pSym;
        card.querySelector(`#tokenMiniSym_${pl.id}`).textContent = pSym;
        tokenMiniLabel.textContent = pName;
        previewHeader.innerHTML = `${pName} <span style="font-size:11px; color:var(--gold-primary); font-weight:600;">[${pTitle}]</span>`;
        audio.playClick();
      });
    });

    // Avatar picker
    card.querySelectorAll('.avatar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const av = btn.dataset.avatar;
        pl.symbol = av;
        card.querySelectorAll('.avatar-btn').forEach(ab => ab.classList.remove('selected'));
        btn.classList.add('selected');
        card.querySelector(`#previewSymbol_${pl.id}`).textContent = av;
        card.querySelector(`#tokenMiniSym_${pl.id}`).textContent = av;
        audio.playClick();
      });
    });

    // Controller radios
    card.querySelectorAll(`input[name="ctrlType_${pl.id}"]`).forEach(r => {
      r.addEventListener('change', (e) => {
        pl.type = e.target.value;
        if (aiField) {
          aiField.style.display = (pl.type === 'ai') ? 'flex' : 'none';
        }
        audio.playClick();
      });
    });

    // AI style select
    const aiSelect = card.querySelector(`#inputProfAiStyle_${pl.id}`);
    if (aiSelect) {
      aiSelect.addEventListener('change', (e) => {
        pl.aiStyle = e.target.value;
      });
    }
  });
}

function applyPlayerProfiles() {
  // Commit any uncommitted input values
  for (let i = 0; i < 4; i++) {
    const nameInput = document.getElementById(`inputProfName_${i}`);
    const titleSelect = document.getElementById(`inputProfTitle_${i}`);
    const ctrlRadio = document.querySelector(`input[name="ctrlType_${i}"]:checked`);
    const aiSelect = document.getElementById(`inputProfAiStyle_${i}`);

    if (nameInput) ALL_PLAYERS[i].name = nameInput.value.trim() || `Player ${i + 1}`;
    if (titleSelect) ALL_PLAYERS[i].title = titleSelect.value;
    if (ctrlRadio) ALL_PLAYERS[i].type = ctrlRadio.value;
    if (aiSelect) ALL_PLAYERS[i].aiStyle = aiSelect.value;
  }

  saveProfilesToStorage();
  updateDockBadges();
  updatePawnVisuals();
  updateHUD();
  updateSetupRosterPreview();
  if (typeof syncChampionInputsWithPlayer === 'function') {
    syncChampionInputsWithPlayer(humanChosenColorId);
  }

  audio.playChime();
  addLog('Player profiles & options updated successfully.', 'sys');
}

function openProfileModal(tabId = null) {
  audio.playClick();
  const modal = document.getElementById('profileModal');
  if (modal) {
    modal.classList.remove('hidden');
    const target = (tabId !== null) ? tabId : (activePlayers[currentTurnIndex] ? activePlayers[currentTurnIndex].id : 0);
    renderProfileEditor(target);
  }
}

// ----------------------------------------------------------------------------
// Centralized Pawn Placement & Multi-Pawn Container Count Tracker (Global)
// ----------------------------------------------------------------------------
function placePawnInCell(pawnEl, targetContainer) {
  if (!pawnEl || !targetContainer) return;
  const oldContainer = pawnEl.parentElement;
  targetContainer.appendChild(pawnEl);
  if (oldContainer && oldContainer !== targetContainer) {
    oldContainer.dataset.count = oldContainer.querySelectorAll('.pawn-token').length;
  }
  targetContainer.dataset.count = targetContainer.querySelectorAll('.pawn-token').length;
}

// ----------------------------------------------------------------------------
// Match Initialization & Board Reset
// ----------------------------------------------------------------------------
function setupMatch() {
  clearAllTimeouts();

  // Configure Active Players depending on Match Config
  if (matchConfig.playerCount === 2) {
    // 2 Players Duel: Human vs Opposite Quadrant
    const oppId = (humanChosenColorId + 2) % 4;
    activePlayers = [ALL_PLAYERS[humanChosenColorId], ALL_PLAYERS[oppId]];
  } else if (matchConfig.playerCount === 3) {
    // 3 Players: ensure human chosen color is included
    const otherIds = [0, 1, 2, 3].filter(id => id !== humanChosenColorId);
    activePlayers = [ALL_PLAYERS[humanChosenColorId], ALL_PLAYERS[otherIds[0]], ALL_PLAYERS[otherIds[1]]];
  } else {
    activePlayers = [...ALL_PLAYERS];
  }

  // Adjust Start Dock visibility
  for (let p = 0; p < 4; p++) {
    const dockEl = document.getElementById(`startDockP${p}`);
    const isPlayerActive = activePlayers.some(pl => pl.id === p);
    if (dockEl) {
      dockEl.style.opacity = isPlayerActive ? '1' : '0.25';
      dockEl.style.pointerEvents = isPlayerActive ? 'auto' : 'none';
    }
  }

  // Set initial turn to the human player if active, otherwise player 0
  const humanTurnIdx = activePlayers.findIndex(pl => pl.type === 'human');
  currentTurnIndex = (humanTurnIdx !== -1) ? humanTurnIdx : 0;
  currentRoll = 0;
  rolledDiceValues = [0, 0];
  rolledGraceBonus = false;
  extraTurnGranted = false;
  selectedPawnForPreview = null;
  previewTargetIdx = -1;
  lastMoveRecord = null;
  matchRanks = [];
  matchStats = { totalTurns: 0, totalCaptures: 0, totalDoubles: 0, startTime: Date.now() };

  // Clear all cell pawn containers
  cellsMap.forEach((cellData) => {
    if (cellData.pawnsContainer) {
      cellData.pawnsContainer.innerHTML = '';
      cellData.pawnsContainer.dataset.count = '0';
    }
  });

  pawns.length = 0;

  // Spawn 4 pawns for each active player
  activePlayers.forEach((pl) => {
    const startDock = cellsMap.get(`start_${pl.id}`);
    const container = startDock ? startDock.pawnsContainer : document.getElementById(`dockPawns${pl.id}`);

    for (let i = 0; i < 4; i++) {
      const pawnEl = document.createElement('div');
      pawnEl.className = `pawn-token p${pl.id}`;
      pawnEl.dataset.player = pl.id;
      pawnEl.dataset.id = i;
      const isHuman = (pl.type === 'human');
      pawnEl.title = `${pl.name} (${pl.title}) Gotti #${i + 1} (${pl.symbol})${isHuman ? ' [Your Gotti]' : ''}`;

      const symBadge = document.createElement('span');
      symBadge.className = 'pawn-sym-badge';
      symBadge.textContent = pl.symbol;
      pawnEl.appendChild(symBadge);

      const keyBadge = document.createElement('span');
      keyBadge.className = 'pawn-key-badge';
      keyBadge.textContent = `${i + 1}`;
      keyBadge.title = `Press [${i + 1}] or Click to select`;
      pawnEl.appendChild(keyBadge);

      const pawnObj = {
        id: i,
        player: pl.id,
        pathIdx: -1, // -1 = In Starting Dock
        el: pawnEl,
        isFinished: false
      };

      pawnEl.addEventListener('click', () => onPawnClicked(pawnObj));
      pawns.push(pawnObj);
      placePawnInCell(pawnEl, container);
    }
  });

  clearHighlights();
  cancelMovePreview();

  // Reset Dice View
  updateDiceDisplayMode();
  document.getElementById('rollValueDisplay').textContent = '-';
  document.getElementById('rollNameDisplay').textContent = 'Throw the Pasas to begin!';
  document.getElementById('btnRoll').disabled = false;
  document.getElementById('btnQuickUndo').disabled = true;

  setFSMState(GameState.Roll);
  updateHUD();
  updateDockBadges();
  updateSetupRosterPreview();

  // Auto-roll if the starting player is AI (e.g. AI Spectate mode)
  if (!isHumanTurn()) {
    registerTimeout(rollDice, 600);
  }

  addLog(`New match started: ${activePlayers.length} Players (${matchConfig.mode.toUpperCase()}, AI: ${matchConfig.aiDifficulty.toUpperCase()}).`, 'sys');
}

function updateDiceDisplayMode() {
  const pasaTray = document.getElementById('pasaDisplay');
  const cowrieTray = document.getElementById('cowrieDisplay');
  const titleEl = document.getElementById('diceTrayTitle');
  const tagEl = document.getElementById('diceTypeTag');

  if (matchConfig.diceModel === 'cowrie') {
    pasaTray.classList.add('hidden');
    cowrieTray.classList.remove('hidden');
    titleEl.textContent = 'COWRIE SHELLS (KAURI)';
    tagEl.textContent = '4 Shells';
  } else {
    pasaTray.classList.remove('hidden');
    cowrieTray.classList.add('hidden');
    titleEl.textContent = 'TRADITIONAL PASAS (STICK DICE)';
    tagEl.textContent = '2 Pasas';
  }
}

function setFSMState(newState) {
  previousGameState = currentGameState;
  currentGameState = newState;

  const stateBadge = document.getElementById('hudStateBadge');
  const hintEl = document.getElementById('hudQuickHint');
  const btnRoll = document.getElementById('btnRoll');

  if (stateBadge) {
    stateBadge.textContent = `STATE: ${newState.toUpperCase()}`;
  }

  // Update Roll Button disabled status for mouse interactivity
  if (btnRoll) {
    btnRoll.disabled = (newState !== GameState.Roll || !isHumanTurn());
  }

  if (hintEl) {
    switch (newState) {
      case GameState.Roll:
        hintEl.innerHTML = '🖱️ Click <b>Throw</b>/Dice | ⌨️ Press <kbd>Space</kbd> or <kbd>Enter</kbd> to roll';
        break;
      case GameState.ChooseMove:
        hintEl.innerHTML = '🖱️ Click Gotti | ⌨️ Press <kbd>1</kbd>–<kbd>4</kbd> or <kbd>Tab</kbd>/<kbd>Arrows</kbd> to select';
        break;
      case GameState.PreviewMove:
        hintEl.innerHTML = '🖱️ Click <b>Confirm</b>/Cell | ⌨️ Press <kbd>Space</kbd>/<kbd>Enter</kbd> to move (<kbd>Esc</kbd> cancel)';
        break;
      case GameState.Animating:
        hintEl.innerHTML = 'Moving Gotti along the sacred cruciform track...';
        break;
      case GameState.GameOver:
        hintEl.innerHTML = 'Match Completed! Click Play Again or press <kbd>Space</kbd>.';
        break;
      case GameState.Paused:
        hintEl.innerHTML = 'Game Paused. Click Resume or press <kbd>Esc</kbd>.';
        break;
      default:
        hintEl.textContent = '';
    }
  }
}

// ----------------------------------------------------------------------------
// Dice Throw Mechanics (§4 & §6: Pasha Stick Dice vs Cowrie Shells)
// ----------------------------------------------------------------------------
function rollDice() {
  if (currentGameState !== GameState.Roll) return;

  setFSMState(GameState.Animating);
  document.getElementById('btnRoll').disabled = true;
  clearHighlights();
  cancelMovePreview();
  audio.playDiceTumble();

  matchStats.totalTurns++;

  if (matchConfig.diceModel === 'cowrie') {
    // 4 Cowrie shells throw
    const shells = [
      document.getElementById('cowrie0'),
      document.getElementById('cowrie1'),
      document.getElementById('cowrie2'),
      document.getElementById('cowrie3')
    ];
    shells.forEach(s => s.classList.add('rolling'));

    registerTimeout(() => {
      shells.forEach(s => s.classList.remove('rolling'));

      // Each shell has 50% chance of mouth up (open)
      const outcomes = shells.map(() => Math.random() < 0.5);
      outcomes.forEach((isOpen, i) => {
        shells[i].className = `cowrie-shell ${isOpen ? 'open' : 'closed'}`;
      });

      const openCount = outcomes.filter(x => x).length;
      let steps = 0;
      let isGrace = false;

      // Traditional Indian Cowrie Values (Pachisi/Chaupar standard):
      // 0 open = 25 (Charkoni grace + bonus roll)
      // 1 open = 10 (Grace + bonus roll)
      // 2 open = 2
      // 3 open = 3
      // 4 open = 4
      if (openCount === 0) {
        steps = 25;
        isGrace = true;
      } else if (openCount === 1) {
        steps = 10;
        isGrace = true;
      } else {
        steps = openCount;
        isGrace = false;
      }

      currentRoll = steps;
      rolledDiceValues = [openCount, steps];
      rolledGraceBonus = isGrace;
      extraTurnGranted = isGrace;
      if (isGrace) matchStats.totalDoubles++;

      const activePl = activePlayers[currentTurnIndex];
      let desc = `${openCount} mouths open → ${steps} Steps`;
      if (isGrace) desc += ' (Grace Throw! Extra Turn Granted!)';

      document.getElementById('rollValueDisplay').textContent = steps;
      document.getElementById('rollNameDisplay').textContent = desc;
      addLog(`${activePl.name} threw Cowries: ${desc}`, 'action');

      resolvePostRoll();
    }, 600);

  } else {
    // Traditional Pasas (2 long rectangular stick dice)
    const pasa1 = document.getElementById('pasa1');
    const pasa2 = document.getElementById('pasa2');
    const pasas = [pasa1, pasa2];

    pasas.forEach(p => p.classList.add('rolling'));

    const flipInterval = setInterval(() => {
      pasas.forEach(p => {
        const tempVal = Math.floor(Math.random() * 6) + 1;
        const face = p.querySelector('.pasa-face');
        if (face) face.className = `pasa-face face-${tempVal}`;
      });
    }, 60);

    registerTimeout(() => {
      clearInterval(flipInterval);
      pasas.forEach(p => p.classList.remove('rolling'));

      const val1 = Math.floor(Math.random() * 6) + 1;
      const val2 = Math.floor(Math.random() * 6) + 1;
      rolledDiceValues = [val1, val2];
      currentRoll = val1 + val2;

      pasa1.querySelector('.pasa-face').className = `pasa-face face-${val1}`;
      pasa2.querySelector('.pasa-face').className = `pasa-face face-${val2}`;

      // Rule 8: Doubles awards extra roll
      extraTurnGranted = (val1 === val2);
      rolledGraceBonus = extraTurnGranted;
      if (extraTurnGranted) matchStats.totalDoubles++;

      const activePl = activePlayers[currentTurnIndex];
      let desc = `${val1} + ${val2} = ${currentRoll}`;
      if (extraTurnGranted) desc += ' (Doubles! Extra Turn Granted!)';

      document.getElementById('rollValueDisplay').textContent = currentRoll;
      document.getElementById('rollNameDisplay').textContent = desc;
      addLog(`${activePl.name} threw Pasas: [${val1}, ${val2}] → Total ${currentRoll}${extraTurnGranted ? ' (Doubles!)' : ''}`, 'action');

      resolvePostRoll();
    }, 650);
  }
}

function resolvePostRoll() {
  const activePl = activePlayers[currentTurnIndex];
  const movable = getMovablePawns(activePl.id, currentRoll, rolledDiceValues);

  if (movable.length === 0) {
    addLog(`No legal moves for ${activePl.name} with throw of ${currentRoll}. Passing turn.`, 'sys');
    setFSMState(GameState.NextPlayer);
    registerTimeout(endTurn, 1000);
  } else {
    setFSMState(GameState.ChooseMove);
    highlightMovablePawns(movable, true);

    const isCurrentHuman = isHumanTurn();
    if (!isCurrentHuman) {
      registerTimeout(() => executeAIAction(movable), 600);
    }
  }
}

function isHumanTurn() {
  if (matchConfig.mode === 'spectate') return false;
  if (activePlayers.length === 0 || !activePlayers[currentTurnIndex]) return false;
  const pl = activePlayers[currentTurnIndex];
  if (matchConfig.mode === 'passPlay') {
    return (pl.type !== 'ai');
  }
  return (pl.type === 'human');
}

// ----------------------------------------------------------------------------
// Move Validation (Rules 3, 4, 6, 7, 9)
// ----------------------------------------------------------------------------
function canPawnEnterFromDock(diceVals) {
  if (!matchConfig.strictEntry) return true;
  if (matchConfig.diceModel === 'cowrie') {
    // Cowrie entry: on grace throws (10 or 25) or roll of 1, 6
    return (rolledGraceBonus || currentRoll === 1 || currentRoll === 6);
  }
  // Pasha dice entry: 1, 6, or Doubles
  return (diceVals[0] === 1 || diceVals[1] === 1 || diceVals[0] === 6 || diceVals[1] === 6 || diceVals[0] === diceVals[1]);
}

function getMovablePawns(playerIdx, roll, diceVals) {
  const path = playerPaths[playerIdx];
  const canEnter = canPawnEnterFromDock(diceVals);

  return pawns.filter(p => {
    if (p.player !== playerIdx || p.isFinished) return false;

    // Rule 3: Starting dock
    if (p.pathIdx === -1) {
      return canEnter;
    }

    // Rule 9: Finishing (exact roll to reach home)
    const targetIdx = p.pathIdx + roll;
    if (targetIdx >= path.length) {
      return false; // Overshoot invalid
    }

    // Rule 7: Pairing / Defensive Block
    const targetKey = path[targetIdx];
    const targetCell = cellsMap.get(targetKey);
    if (targetCell && !targetCell.isHome && !targetCell.isSafe) {
      const opposingPawnsHere = pawns.filter(o => o.player !== playerIdx && !o.isFinished && playerPaths[o.player][o.pathIdx] === targetKey);
      if (opposingPawnsHere.length >= 2) {
        return false; // Impenetrable block by enemy pair!
      }
    }

    return true;
  });
}

function highlightMovablePawns(pawnList, active) {
  pawns.forEach(p => p.el.classList.remove('selected'));
  if (active) {
    pawnList.forEach(p => p.el.classList.add('selected'));
  }
}

// ----------------------------------------------------------------------------
// Move Preview & Confirmation Mechanic (§3, §8)
// "Legal tokens glow; tap one to preview its landing square and any capture before committing."
// ----------------------------------------------------------------------------
function onPawnClicked(pawn) {
  if (currentGameState !== GameState.ChooseMove && currentGameState !== GameState.PreviewMove) return;
  const activePl = activePlayers[currentTurnIndex];
  if (pawn.player !== activePl.id || pawn.isFinished) return;

  const path = playerPaths[activePl.id];
  let targetIdx = -1;

  if (pawn.pathIdx === -1) {
    if (!canPawnEnterFromDock(rolledDiceValues)) {
      addLog(`Entering the board requires rolling a 1, a 6, or Doubles on Pasas!`, 'sys');
      return;
    }
    targetIdx = 0; // Step 0 on home arm
  } else {
    targetIdx = pawn.pathIdx + currentRoll;
    if (targetIdx >= path.length) {
      addLog(`Exact roll required to enter the central 'C' Home square!`, 'sys');
      return;
    }
  }

  // If clicking already selected pawn in preview mode -> commit directly!
  if (selectedPawnForPreview === pawn && currentGameState === GameState.PreviewMove) {
    confirmSelectedMove();
    return;
  }

  // Activate preview
  showMovePreview(pawn, targetIdx);
}

function showMovePreview(pawn, targetIdx) {
  selectedPawnForPreview = pawn;
  previewTargetIdx = targetIdx;
  setFSMState(GameState.PreviewMove);
  audio.playClick();

  // Clear previous previews
  document.querySelectorAll('.cell-destination-preview').forEach(el => el.remove());
  pawns.forEach(p => p.el.classList.remove('preview-active'));
  pawn.el.classList.add('preview-active');

  const path = playerPaths[pawn.player];
  const targetKey = path[targetIdx];
  const targetCell = cellsMap.get(targetKey);

  // Inspect destination characteristics
  let calloutText = '';
  let isCapture = false;

  if (targetCell.isHome) {
    calloutText = `⭐ Entering Central Charkoni Home!`;
  } else if (targetCell.isSafe) {
    calloutText = `🛡️ Reaching Safe Castle Haven (Protected)`;
  } else {
    const opposing = pawns.filter(o => o.player !== pawn.player && !o.isFinished && playerPaths[o.player][o.pathIdx] === targetKey);
    const friendly = pawns.filter(f => f !== pawn && f.player === pawn.player && !f.isFinished && playerPaths[f.player][f.pathIdx] === targetKey);

    if (opposing.length === 1) {
      isCapture = true;
      calloutText = `⚔️ Capture Opponent Gotti & Gain Extra Turn!`;
    } else if (friendly.length >= 1) {
      calloutText = `🛡️ Forms an Impenetrable PAIR BLOCK (Jodi)!`;
    } else {
      calloutText = `Advancing to step ${targetIdx + 1} of 84`;
    }
  }

  // Place preview ring on target cell
  if (targetCell && targetCell.el) {
    const marker = document.createElement('div');
    marker.className = `cell-destination-preview ${isCapture ? 'capture-target' : ''}`;
    marker.style.cursor = 'pointer';
    marker.title = 'Click to Confirm Move';
    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmSelectedMove();
    });
    targetCell.el.appendChild(marker);
  }

  // Update Callout Banner
  const callout = document.getElementById('previewCallout');
  const title = document.getElementById('previewTitle');
  const text = document.getElementById('previewText');

  title.textContent = `${ALL_PLAYERS[pawn.player].name} Gotti #${pawn.id + 1} Preview`;
  text.textContent = calloutText;
  callout.classList.remove('hidden');
}

function cancelMovePreview() {
  selectedPawnForPreview = null;
  previewTargetIdx = -1;
  document.querySelectorAll('.cell-destination-preview').forEach(el => el.remove());
  pawns.forEach(p => p.el.classList.remove('preview-active'));

  const callout = document.getElementById('previewCallout');
  if (callout) callout.classList.add('hidden');

  if (currentGameState === GameState.PreviewMove) {
    setFSMState(GameState.ChooseMove);
  }
}

function confirmSelectedMove() {
  if (!selectedPawnForPreview || previewTargetIdx < 0) return;
  const p = selectedPawnForPreview;
  const target = previewTargetIdx;

  cancelMovePreview();
  executeMove(p, target);
}

// ----------------------------------------------------------------------------
// Move Execution & Animation
// ----------------------------------------------------------------------------
function executeMove(pawn, targetIdx) {
  setFSMState(GameState.Animating);
  highlightMovablePawns([], false);
  clearHighlights();

  const activePl = ALL_PLAYERS[pawn.player];
  const path = playerPaths[pawn.player];
  const previousIdx = pawn.pathIdx;

  // Record for casual Undo
  lastMoveRecord = {
    pawn,
    fromIdx: previousIdx,
    toIdx: targetIdx,
    capturedPawn: null
  };
  document.getElementById('btnQuickUndo').disabled = !isHumanTurn();

  const steps = [];
  if (pawn.pathIdx === -1) {
    steps.push(path[0]);
  } else {
    for (let i = pawn.pathIdx + 1; i <= targetIdx; i++) {
      steps.push(path[i]);
    }
  }

  animatePathSteps(pawn, steps, 0, () => {
    pawn.pathIdx = targetIdx;
    const destKey = path[targetIdx];
    const destCell = cellsMap.get(destKey);

    // Rule 5: Capturing
    if (!destCell.isSafe && !destCell.isHome) {
      const opposing = pawns.filter(o => o !== pawn && o.player !== pawn.player && !o.isFinished && playerPaths[o.player][o.pathIdx] === destKey);

      if (opposing.length === 1) {
        const capturedPawn = opposing[0];
        capturedPawn.pathIdx = -1;
        const oppDock = cellsMap.get(`start_${capturedPawn.player}`);
        if (oppDock && oppDock.pawnsContainer) {
          placePawnInCell(capturedPawn.el, oppDock.pawnsContainer);
        }

        lastMoveRecord.capturedPawn = capturedPawn;
        matchStats.totalCaptures++;
        audio.playCaptureSting();

        addLog(`⚔️ CAPTURE! ${activePl.name} captured ${ALL_PLAYERS[capturedPawn.player].name}'s Gotti! Extra Turn awarded!`, 'capture');
        extraTurnGranted = true;
      }
    } else if (destCell.isSafe && !destCell.isHome) {
      audio.playSafeChime();
      addLog(`${activePl.name} landed on Safe Castle. Immune to capture!`, 'sys');
    }

    // Rule 9 & 10: Reaching Home & Winning
    if (destCell.isHome && targetIdx === path.length - 1) {
      pawn.isFinished = true;
      pawn.el.style.opacity = '0.5';
      audio.playSafeChime();
      addLog(`⭐ ${activePl.name}'s Gotti entered the central 'C' Charkoni Home!`, 'sys');

      if (checkPlayerWon(pawn.player)) {
        if (!matchRanks.includes(pawn.player)) {
          matchRanks.push(pawn.player);
        }
        concludeMatch();
        return;
      }
    }

    updateHUD();

    // Extra Turn Resolution
    if (extraTurnGranted) {
      extraTurnGranted = false;
      addLog(`Extra roll awarded to ${activePl.name}!`, 'action');
      setFSMState(GameState.Roll);
      document.getElementById('btnRoll').disabled = false;

      if (!isHumanTurn()) {
        registerTimeout(rollDice, 700);
      }
    } else {
      setFSMState(GameState.NextPlayer);
      registerTimeout(endTurn, 450);
    }
  });
}

function animatePathSteps(pawn, steps, idx, onDone) {
  if (idx >= steps.length) {
    onDone();
    return;
  }
  const key = steps[idx];
  const cell = cellsMap.get(key);
  if (cell && cell.pawnsContainer) {
    placePawnInCell(pawn.el, cell.pawnsContainer);
    audio.playPawnHop();
  }
  registerTimeout(() => animatePathSteps(pawn, steps, idx + 1, onDone), matchConfig.moveSpeedMs);
}

function checkPlayerWon(playerIdx) {
  const finished = pawns.filter(p => p.player === playerIdx && p.isFinished).length;
  return (finished === 4);
}

// Celebratory Confetti Simulation
function launchVictoryConfetti() {
  const canvas = document.getElementById('victoryConfettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth || 760;
  canvas.height = parent.clientHeight || 560;

  const colors = ['#ffd700', '#f0c345', '#ff5264', '#44d46e', '#59a6ff', '#ffffff', '#cd7f32', '#94a3b8'];
  const particles = [];
  for (let i = 0; i < 95; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 260,
      y: canvas.height * 0.22 + (Math.random() - 0.5) * 80,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -6 - 2.5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      gravity: 0.16,
      shape: Math.random() > 0.45 ? 'rect' : 'circle'
    });
  }

  let startTime = Date.now();

  function renderConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.985;
      p.rotation += p.rSpeed;
      if (Date.now() - startTime > 2600) {
        p.opacity -= 0.016;
      }
      if (p.opacity > 0 && p.y < canvas.height + 50) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    if (alive) {
      requestAnimationFrame(renderConfetti);
    }
  }

  requestAnimationFrame(renderConfetti);
}

function concludeMatch() {
  setFSMState(GameState.GameOver);
  audio.playVictoryFanfare();

  // 1. Calculate complete leaderboard rankings
  // Ranks start with finished players in order of finish
  const ranked = [];
  if (matchRanks && matchRanks.length > 0) {
    matchRanks.forEach(id => {
      if (!ranked.includes(id)) ranked.push(id);
    });
  }

  // 2. Rank remaining active players by progress:
  // Score = (finishedCount * 1000) + (pawns on track * 50) + total path steps
  const remaining = activePlayers
    .filter(pl => !ranked.includes(pl.id))
    .map(pl => {
      const plPawns = pawns.filter(p => p.player === pl.id);
      const finishedCount = plPawns.filter(p => p.isFinished).length;
      let totalSteps = 0;
      let onTrackCount = 0;
      plPawns.forEach(p => {
        if (p.isFinished) {
          totalSteps += 60;
        } else if (!p.inDock) {
          totalSteps += (p.currentStep || 0);
          onTrackCount++;
        }
      });
      const progressScore = (finishedCount * 1000) + (onTrackCount * 50) + totalSteps;
      return { id: pl.id, player: pl, finishedCount, totalSteps, score: progressScore };
    })
    .sort((a, b) => b.score - a.score);

  remaining.forEach(r => ranked.push(r.id));

  // If no players ranked yet (e.g. forced test trigger), include all active
  if (ranked.length === 0) {
    activePlayers.forEach(pl => ranked.push(pl.id));
  }

  matchRanks = ranked;

  const winner = ALL_PLAYERS[matchRanks[0]];
  addLog(`🏆 MATCH OVER! ${winner.name} is the Winner of Pasha Palli!`, 'capture');

  // Populate Victory Modal Header
  const modal = document.getElementById('victoryModal');
  const title = document.getElementById('victoryTitle');
  const sub = document.getElementById('victorySubtitle');
  const podiumGrid = document.getElementById('podiumGrid');

  if (title) title.textContent = `${winner.name.toUpperCase()} WINS!`;
  if (sub) sub.textContent = `${winner.name} (${winner.title || 'Maharathi'}) has brought all 4 Gottis into the Charkoni Home!`;

  // Leaderboard Tiers Definition (1st - Gold, 2nd - Silver, 3rd - Bronze, 4th - Iron)
  const LEADERBOARD_TIERS = [
    {
      tierName: 'Gold',
      rankTitle: '1st - Gold',
      badge: '1ST • GOLD',
      medalIcon: '🥇',
      subtitle: 'Grand Champion',
      cssClass: 'tier-gold'
    },
    {
      tierName: 'Silver',
      rankTitle: '2nd - Silver',
      badge: '2ND • SILVER',
      medalIcon: '🥈',
      subtitle: 'Runner Up',
      cssClass: 'tier-silver'
    },
    {
      tierName: 'Bronze',
      rankTitle: '3rd - Bronze',
      badge: '3RD • BRONZE',
      medalIcon: '🥉',
      subtitle: '3rd Place',
      cssClass: 'tier-bronze'
    },
    {
      tierName: 'Iron',
      rankTitle: '4th - Iron',
      badge: '4TH • IRON',
      medalIcon: '🛡️',
      subtitle: '4th Place',
      cssClass: 'tier-iron'
    }
  ];

  if (podiumGrid) {
    podiumGrid.innerHTML = '';
    matchRanks.forEach((pId, idx) => {
      const tier = LEADERBOARD_TIERS[idx] || LEADERBOARD_TIERS[3];
      const pl = ALL_PLAYERS[pId];
      if (!pl) return;
      const plPawns = pawns.filter(p => p.player === pId);
      const finished = plPawns.filter(p => p.isFinished).length;

      const slot = document.createElement('div');
      slot.className = `podium-slot ${tier.cssClass}`;
      slot.innerHTML = `
        <div class="podium-medal-crown">${tier.medalIcon}</div>
        <div class="podium-tier-pill">${tier.rankTitle}</div>
        <div class="podium-avatar-orb" style="border-color:${pl.color}; box-shadow: 0 0 14px ${pl.color}66;">
          <span class="podium-avatar-sym">${pl.symbol || '☀️'}</span>
        </div>
        <div class="podium-name" style="color:${pl.color};">${pl.name}</div>
        <div class="podium-title">${pl.title || 'Maharathi'}</div>
        <div class="podium-status-box">
          <div class="podium-pawns-stat"><b>${finished}</b>/4 Gottis Home</div>
          <div class="podium-subtext">${tier.subtitle}</div>
        </div>
      `;
      podiumGrid.appendChild(slot);
    });
  }

  // Update Match Stats
  const statTurns = document.getElementById('statTotalTurns');
  if (statTurns) statTurns.textContent = matchStats.totalTurns;
  const statCaps = document.getElementById('statTotalCaptures');
  if (statCaps) statCaps.textContent = matchStats.totalCaptures;
  const statDbls = document.getElementById('statTotalDoubles');
  if (statDbls) statDbls.textContent = matchStats.totalDoubles;

  const statDur = document.getElementById('statMatchDuration');
  if (statDur) {
    const elapsedMs = Math.max(0, Date.now() - (matchStats.startTime || Date.now()));
    const mins = Math.floor(elapsedMs / 60000);
    const secs = Math.floor((elapsedMs % 60000) / 1000);
    statDur.textContent = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }

  if (modal) {
    modal.classList.remove('hidden');
    launchVictoryConfetti();
  }
}

function endTurn() {
  cancelMovePreview();
  clearHighlights();

  // Find next unfinished player in activePlayers loop
  let attempts = 0;
  do {
    currentTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
    attempts++;
  } while (checkPlayerWon(activePlayers[currentTurnIndex].id) && attempts < activePlayers.length);

  setFSMState(GameState.Roll);
  updateHUD();

  if (!isHumanTurn()) {
    registerTimeout(rollDice, 600);
  }
}

// ----------------------------------------------------------------------------
// Casual Undo Support (§7 - Game HUD)
// ----------------------------------------------------------------------------
function executeCasualUndo() {
  if (!lastMoveRecord || currentGameState === GameState.Animating) return;

  const rec = lastMoveRecord;
  const p = rec.pawn;

  // Restore pawn position
  p.pathIdx = rec.fromIdx;
  if (p.isFinished) p.isFinished = false;
  p.el.style.opacity = '1';

  if (rec.fromIdx === -1) {
    const dock = cellsMap.get(`start_${p.player}`);
    if (dock && dock.pawnsContainer) placePawnInCell(p.el, dock.pawnsContainer);
  } else {
    const prevKey = playerPaths[p.player][rec.fromIdx];
    const prevCell = cellsMap.get(prevKey);
    if (prevCell && prevCell.pawnsContainer) placePawnInCell(p.el, prevCell.pawnsContainer);
  }

  // Restore captured pawn if any
  if (rec.capturedPawn) {
    const cap = rec.capturedPawn;
    cap.pathIdx = rec.toIdx;
    const destKey = playerPaths[p.player][rec.toIdx];
    const destCell = cellsMap.get(destKey);
    if (destCell && destCell.pawnsContainer) placePawnInCell(cap.el, destCell.pawnsContainer);
  }

  lastMoveRecord = null;
  document.getElementById('btnQuickUndo').disabled = true;
  addLog(`Move undone by player. Choose a different Gotti.`, 'sys');

  setFSMState(GameState.ChooseMove);
  const movable = getMovablePawns(activePlayers[currentTurnIndex].id, currentRoll, rolledDiceValues);
  highlightMovablePawns(movable, true);
}

// ----------------------------------------------------------------------------
// AI Opponent & Solvers (§5 of Specification)
// Heuristic policy + 1-ply expectiminimax
// ----------------------------------------------------------------------------
function executeAIAction(movable) {
  const pId = activePlayers[currentTurnIndex].id;
  const diff = matchConfig.aiDifficulty;

  let chosen = movable[0];

  if (diff === 'easy') {
    // Greedy single best gain (ignores risk)
    let bestGain = -999;
    movable.forEach(p => {
      let gain = (p.pathIdx === -1) ? 10 : (p.pathIdx + currentRoll);
      if (gain > bestGain) {
        bestGain = gain;
        chosen = p;
      }
    });
  } else if (diff === 'medium') {
    // Weighted Heuristic Policy: Capture > Safety > Home > Forward Progress > Entry
    let bestScore = -999;
    movable.forEach(p => {
      const score = evaluateHeuristic(p, pId, currentRoll);
      if (score > bestScore) {
        bestScore = score;
        chosen = p;
      }
    });
  } else {
    // Hard Tier: 1-Ply Expectiminimax Lookahead (§5)
    // Evaluates immediate score + subtracts capture-risk expectation over opponent dice distributions
    let bestScore = -9999;
    movable.forEach(p => {
      const immediate = evaluateHeuristic(p, pId, currentRoll);
      const risk = calculateCaptureRiskLookahead(p, pId, currentRoll);
      const net = immediate - (risk * 0.7);

      if (net > bestScore) {
        bestScore = net;
        chosen = p;
      }
    });
  }

  const targetIdx = (chosen.pathIdx === -1) ? 0 : (chosen.pathIdx + currentRoll);
  executeMove(chosen, targetIdx);
}

function evaluateHeuristic(pawn, playerIdx, roll) {
  const path = playerPaths[playerIdx];
  const pl = ALL_PLAYERS[playerIdx] || {};
  const style = pl.aiStyle || 'balanced';
  let score = 0;

  if (pawn.pathIdx === -1) {
    score = (style === 'aggressive') ? 40 : 25; // Release new token from dock
  } else {
    const targetIdx = pawn.pathIdx + roll;
    if (targetIdx === path.length - 1) {
      score = (style === 'speed') ? 220 : 120; // Exact home goal!
    } else {
      const destKey = path[targetIdx];
      const destCell = cellsMap.get(destKey);

      if (!destCell.isSafe && !destCell.isHome) {
        const opposing = pawns.filter(o => o.player !== playerIdx && !o.isFinished && playerPaths[o.player][o.pathIdx] === destKey);
        if (opposing.length === 1) {
          score = (style === 'aggressive') ? 160 : (style === 'defensive') ? 65 : 85; // Modulated capture reward
        }

        const friendly = pawns.filter(f => f !== pawn && f.player === playerIdx && !f.isFinished && playerPaths[f.player][f.pathIdx] === destKey);
        if (friendly.length >= 1) {
          score += (style === 'defensive') ? 50 : 35; // Pair block bonus
        }
      }

      if (destCell.isSafe) {
        score += (style === 'defensive') ? 70 : 30; // Safety reward
      }

      const progressWeight = (style === 'speed') ? 2.6 : 1.2;
      score += (targetIdx * progressWeight); // Forward progress
    }
  }

  return score;
}

function calculateCaptureRiskLookahead(pawn, playerIdx, roll) {
  const path = playerPaths[playerIdx];
  const targetIdx = (pawn.pathIdx === -1) ? 0 : (pawn.pathIdx + roll);
  const targetKey = path[targetIdx];
  const targetCell = cellsMap.get(targetKey);

  // If in safe castle or home, risk is strictly 0
  if (targetCell.isSafe || targetCell.isHome) return 0;

  // Check how many opponents can reach this cell with probable dice throws (2 to 12)
  let threatSum = 0;
  pawns.forEach(o => {
    if (o.player !== playerIdx && !o.isFinished && o.pathIdx >= 0) {
      const oppPath = playerPaths[o.player];
      const oppDestIdx = oppPath.indexOf(targetKey);
      if (oppDestIdx > o.pathIdx) {
        const distNeeded = oppDestIdx - o.pathIdx;
        if (distNeeded >= 2 && distNeeded <= 12) {
          const pTable = [0, 0, 1/36, 2/36, 3/36, 4/36, 5/36, 6/36, 5/36, 4/36, 3/36, 2/36, 1/36];
          threatSum += (pTable[distNeeded] || 0) * 100;
        }
      }
    }
  });

  const pl = ALL_PLAYERS[playerIdx] || {};
  const riskMult = (pl.aiStyle === 'defensive') ? 1.6 : (pl.aiStyle === 'aggressive') ? 0.4 : 1.0;
  return threatSum * riskMult;
}

// ----------------------------------------------------------------------------
// Hint System (Utilizing Hard AI solver for user guidance)
// ----------------------------------------------------------------------------
function provideHint() {
  if (currentGameState !== GameState.ChooseMove && currentGameState !== GameState.PreviewMove) {
    addLog(`Hint: Throw the Pasas first to view legal moves!`, 'sys');
    return;
  }

  const pId = activePlayers[currentTurnIndex].id;
  const movable = getMovablePawns(pId, currentRoll, rolledDiceValues);
  if (movable.length === 0) return;

  // Find best move using evaluation
  let best = movable[0];
  let bestScore = -9999;
  movable.forEach(p => {
    const s = evaluateHeuristic(p, pId, currentRoll) - calculateCaptureRiskLookahead(p, pId, currentRoll);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  });

  const targetIdx = (best.pathIdx === -1) ? 0 : (best.pathIdx + currentRoll);
  showMovePreview(best, targetIdx);
  addLog(`💡 AI Strategic Hint: Selected Gotti #${best.id + 1} offers optimal advantage!`, 'sys');
}

// ----------------------------------------------------------------------------
// HUD & Opponent Status Updates
// ----------------------------------------------------------------------------
function updateHUD() {
  if (activePlayers.length === 0) return;
  const activePl = activePlayers[currentTurnIndex];

  const nameEl = document.getElementById('currentPlayerName');
  const titleBadge = document.getElementById('playerTitleBadge');
  const badgeEl = document.getElementById('playerColorBadge');
  const symEl = document.getElementById('playerSymbolBadge');
  const typeEl = document.getElementById('playerTypeLabel');
  const turnCard = document.getElementById('turnCard');

  const isHuman = (activePl.type === 'human');
  if (nameEl) nameEl.textContent = isHuman ? `${activePl.name} (You)` : `${activePl.name}`;
  if (titleBadge) titleBadge.textContent = activePl.title || 'Warrior';
  if (badgeEl) badgeEl.style.backgroundColor = activePl.color;
  if (symEl) symEl.textContent = activePl.symbol;
  if (turnCard) turnCard.style.borderLeftColor = activePl.color;

  if (typeEl) {
    if (isHumanTurn()) {
      typeEl.textContent = 'Human Player (You)';
    } else {
      const styleName = activePl.aiStyle ? activePl.aiStyle.toUpperCase() : matchConfig.aiDifficulty.toUpperCase();
      typeEl.textContent = `AI Bot (${styleName})`;
    }
  }

  // Active Player Token Stats
  const dockCount = pawns.filter(p => p.player === activePl.id && p.pathIdx === -1).length;
  const trackCount = pawns.filter(p => p.player === activePl.id && p.pathIdx >= 0 && !p.isFinished).length;
  const homeCount = pawns.filter(p => p.player === activePl.id && p.isFinished).length;

  document.getElementById('statDock').textContent = `${dockCount}/4`;
  document.getElementById('statTrack').textContent = `${trackCount}/4`;
  document.getElementById('statHome').textContent = `${homeCount}/4`;

  // Opponents Status List
  const oppList = document.getElementById('opponentsList');
  if (oppList) {
    oppList.innerHTML = '';
    activePlayers.forEach((pl, idx) => {
      const isTurn = (idx === currentTurnIndex);
      const isHuman = (pl.type === 'human');
      const hCount = pawns.filter(p => p.player === pl.id && p.isFinished).length;
      const tCount = pawns.filter(p => p.player === pl.id && p.pathIdx >= 0 && !p.isFinished).length;

      const row = document.createElement('div');
      row.className = `opponent-row ${isTurn ? 'active-turn' : ''}`;
      row.innerHTML = `
        <div class="opp-name-group">
          <span class="opp-dot" style="background-color: ${pl.color}"></span>
          <b>${pl.name}</b> <span style="font-size:10px; color:var(--gold-primary);">[${pl.title}]</span> ${pl.symbol}
          <span class="roster-chip-role ${isHuman ? 'human' : 'ai'}" style="margin-left:4px;">${isHuman ? 'Human' : (pl.aiStyle ? pl.aiStyle.slice(0, 4) : 'AI')}</span>
        </div>
        <div class="opp-stat">Home: ${hCount}/4 | Track: ${tCount}</div>
      `;
      oppList.appendChild(row);
    });
  }

  // Mode badge in top status bar
  const modeBadge = document.getElementById('hudModeBadge');
  if (modeBadge) {
    modeBadge.textContent = `${matchConfig.mode.toUpperCase()} (${matchConfig.playerCount}P, AI: ${matchConfig.aiDifficulty.toUpperCase()})`;
  }

  // Ensure Roll button and dice trays are enabled for mouse on human turn
  const btnRoll = document.getElementById('btnRoll');
  if (btnRoll) {
    btnRoll.disabled = (currentGameState !== GameState.Roll || !isHumanTurn());
  }
}

function clearHighlights() {
  document.querySelectorAll('.cell-highlight').forEach(el => el.remove());
  document.querySelectorAll('.pawn-token.selected').forEach(el => el.classList.remove('selected'));
}

function addLog(msg, type = '') {
  const log = document.getElementById('eventLog');
  if (!log) return;
  const p = document.createElement('p');
  p.className = `log-entry ${type}`;
  p.textContent = msg;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

// ----------------------------------------------------------------------------
// Dual Keyboard & Mouse Controls (§8 Specification)
// ----------------------------------------------------------------------------
function cycleMovablePawn(direction = 1) {
  const activePl = activePlayers[currentTurnIndex];
  if (!activePl || !isHumanTurn()) return;
  const movable = getMovablePawns(activePl.id, currentRoll, rolledDiceValues);
  if (movable.length === 0) return;

  if (!selectedPawnForPreview) {
    onPawnClicked(movable[0]);
    return;
  }

  const currentIdx = movable.indexOf(selectedPawnForPreview);
  let nextIdx = (currentIdx + direction + movable.length) % movable.length;
  onPawnClicked(movable[nextIdx]);
}

window.addEventListener('keydown', (e) => {
  // If in text input, ignore
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

  // Spacebar: Roll if ready, Confirm if previewing, or pick first legal pawn
  if (e.code === 'Space') {
    e.preventDefault();
    if (currentGameState === GameState.Roll && isHumanTurn()) {
      rollDice();
    } else if (currentGameState === GameState.PreviewMove && isHumanTurn()) {
      confirmSelectedMove();
    } else if (currentGameState === GameState.ChooseMove && isHumanTurn()) {
      cycleMovablePawn(1);
    }
  }
  // Enter: Roll or Confirm
  else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    if (currentGameState === GameState.Roll && isHumanTurn()) {
      rollDice();
    } else if (currentGameState === GameState.PreviewMove && isHumanTurn()) {
      confirmSelectedMove();
    }
  }
  // Number Keys 1-4 (Top row or Numpad): Pick/Confirm Gotti
  else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].includes(e.code)) {
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= 4) {
      const pawnId = num - 1;
      const activePl = activePlayers[currentTurnIndex];
      if (activePl && isHumanTurn()) {
        const matchPawn = pawns.find(p => p.player === activePl.id && p.id === pawnId);
        if (matchPawn) {
          onPawnClicked(matchPawn);
        }
      }
    }
  }
  // Tab / Arrow Keys / WASD: Cycle between legal pawns
  else if (['Tab', 'ArrowRight', 'ArrowDown', 'KeyD', 'KeyS'].includes(e.code)) {
    if (e.code === 'Tab') e.preventDefault();
    if ((currentGameState === GameState.ChooseMove || currentGameState === GameState.PreviewMove) && isHumanTurn()) {
      cycleMovablePawn(1);
    }
  }
  else if (['ArrowLeft', 'ArrowUp', 'KeyA', 'KeyW'].includes(e.code)) {
    if ((currentGameState === GameState.ChooseMove || currentGameState === GameState.PreviewMove) && isHumanTurn()) {
      cycleMovablePawn(-1);
    }
  }
  // Escape: Close Rule Book or other open modals, or Cancel Preview or Toggle Pause
  else if (e.code === 'Escape') {
    const rulesM = document.getElementById('rulesModal');
    if (rulesM && !rulesM.classList.contains('hidden')) {
      closeRulesModal();
      return;
    }
    const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
    if (openModals.length > 0) {
      openModals.forEach(m => m.classList.add('hidden'));
      return;
    }
    if (currentGameState === GameState.PreviewMove) {
      cancelMovePreview();
    } else {
      togglePause();
    }
  }
  // Backspace: Cancel Preview or Undo
  else if (e.code === 'Backspace') {
    if (currentGameState === GameState.PreviewMove) {
      e.preventDefault();
      cancelMovePreview();
    } else if (isHumanTurn()) {
      executeCasualUndo();
    }
  }
  // H: Hint
  else if (e.code === 'KeyH') {
    provideHint();
  }
  // U: Undo
  else if (e.code === 'KeyU') {
    executeCasualUndo();
  }
  // M: Mute/Unmute
  else if (e.code === 'KeyM') {
    audio.isMuted = !audio.isMuted;
    document.getElementById('soundIcon').textContent = audio.isMuted ? '🔇' : '🔊';
  }
  // R: Reset Board
  else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
    setupMatch();
  }
  // Shift + V: Test Victory Screen & Leaderboard (Gold, Silver, Bronze, Iron)
  else if (e.code === 'KeyV' && e.shiftKey) {
    testVictoryScreen();
  }
});

window.testVictoryScreen = function(winnerId = 0) {
  matchRanks = [winnerId];
  concludeMatch();
};

function togglePause() {
  const modal = document.getElementById('pauseModal');
  if (currentGameState === GameState.Paused) {
    modal.classList.add('hidden');
    setFSMState(previousGameState);
  } else if (currentGameState !== GameState.GameOver) {
    modal.classList.remove('hidden');
    setFSMState(GameState.Paused);
  }
}

// ----------------------------------------------------------------------------
// Event Listeners & Modals Binding (Mouse & Touch)
// ----------------------------------------------------------------------------
document.getElementById('btnRoll').addEventListener('click', rollDice);

// Mouse click directly on the dice trays rolls the dice
const pasaTrayEl = document.getElementById('pasaDisplay');
if (pasaTrayEl) {
  pasaTrayEl.addEventListener('click', () => {
    if (currentGameState === GameState.Roll && isHumanTurn()) rollDice();
  });
}
const cowrieTrayEl = document.getElementById('cowrieDisplay');
if (cowrieTrayEl) {
  cowrieTrayEl.addEventListener('click', () => {
    if (currentGameState === GameState.Roll && isHumanTurn()) rollDice();
  });
}

// Clicking viewport background cancels move preview
const viewportEl = document.getElementById('viewport');
if (viewportEl) {
  viewportEl.addEventListener('click', (e) => {
    if (currentGameState === GameState.PreviewMove && e.target === viewportEl) {
      cancelMovePreview();
    }
  });
}

document.getElementById('btnRestart').addEventListener('click', setupMatch);
document.getElementById('btnConfirmMove').addEventListener('click', confirmSelectedMove);
document.getElementById('btnCancelMove').addEventListener('click', cancelMovePreview);
document.getElementById('btnQuickHint').addEventListener('click', provideHint);
document.getElementById('btnQuickUndo').addEventListener('click', executeCasualUndo);
document.getElementById('btnQuickPause').addEventListener('click', togglePause);
document.getElementById('btnResumeGame').addEventListener('click', togglePause);
document.getElementById('btnRestartFromPause').addEventListener('click', () => { togglePause(); setupMatch(); });
document.getElementById('btnPlayAgain').addEventListener('click', () => {
  document.getElementById('victoryModal').classList.add('hidden');
  setupMatch();
});
const btnVictoryToTitle = document.getElementById('btnVictoryToTitle');
if (btnVictoryToTitle) {
  btnVictoryToTitle.addEventListener('click', () => {
    document.getElementById('victoryModal').classList.add('hidden');
    const btnTitle = document.getElementById('btnOpenTitleScreen');
    if (btnTitle) btnTitle.click();
  });
}
document.getElementById('btnClearLog').addEventListener('click', () => {
  document.getElementById('eventLog').innerHTML = '';
});

// Sound Mute Toggle
document.getElementById('btnSoundToggle').addEventListener('click', () => {
  audio.isMuted = !audio.isMuted;
  document.getElementById('soundIcon').textContent = audio.isMuted ? '🔇' : '🔊';
});

// =============================================================================
// Rule Book Flow Controller (§2 Canonical Rules & §8 Tutorial)
// =============================================================================
let pendingFirstRollAfterRules = false;

function openRulesModal(fromStart = false) {
  pendingFirstRollAfterRules = fromStart;
  if (typeof showSlide === 'function') {
    showSlide(0);
  }
  const modal = document.getElementById('rulesModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeRulesModal() {
  const modal = document.getElementById('rulesModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  if (pendingFirstRollAfterRules) {
    pendingFirstRollAfterRules = false;
    setFSMState(GameState.Roll);
    updateHUD();
    addLog('Rule book accepted. Court match started! May the Pasas roll in your favor.', 'sys');
    if (!isHumanTurn()) {
      registerTimeout(rollDice, 600);
    }
  }
}

// Modal Open Handlers
function bindModal(btnId, modalId) {
  const btn = document.getElementById(btnId);
  const modal = document.getElementById(modalId);
  if (btn && modal) {
    btn.addEventListener('click', () => {
      audio.playClick();
      modal.classList.remove('hidden');
    });
  }
}

bindModal('btnOpenSetup', 'setupModal');
bindModal('btnOpenSetupBottom', 'setupModal');
bindModal('btnOpenSetupFromPause', 'setupModal');
bindModal('btnOpenSettings', 'settingsModal');

const btnOpenRules = document.getElementById('btnOpenRules');
if (btnOpenRules) {
  btnOpenRules.addEventListener('click', () => {
    audio.playClick();
    openRulesModal(false);
  });
}

const btnStartFromRules = document.getElementById('btnStartFromRules');
if (btnStartFromRules) {
  btnStartFromRules.addEventListener('click', () => {
    audio.playSafeChime();
    closeRulesModal();
  });
}

// Profile Modal Open Handlers
const btnProfiles = document.getElementById('btnOpenProfiles');
if (btnProfiles) btnProfiles.addEventListener('click', () => openProfileModal());

const btnSplashProf = document.getElementById('btnSplashProfiles');
if (btnSplashProf) btnSplashProf.addEventListener('click', () => openProfileModal());

const btnSetupProf = document.getElementById('btnOpenProfilesFromSetup');
if (btnSetupProf) btnSetupProf.addEventListener('click', () => {
  document.getElementById('setupModal').classList.add('hidden');
  openProfileModal();
});

const btnPauseProf = document.getElementById('btnOpenProfilesFromPause');
if (btnPauseProf) btnPauseProf.addEventListener('click', () => {
  document.getElementById('pauseModal').classList.add('hidden');
  openProfileModal();
});

const btnEditTurn = document.getElementById('btnEditTurnProfile');
if (btnEditTurn) btnEditTurn.addEventListener('click', () => {
  const activePId = activePlayers[currentTurnIndex] ? activePlayers[currentTurnIndex].id : 0;
  openProfileModal(activePId);
});

// Profile Modal Tab clicks
document.querySelectorAll('.profile-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    audio.playClick();
    renderProfileEditor(btn.dataset.tab);
  });
});

// Apply Profiles
const btnApplyProf = document.getElementById('btnApplyProfiles');
if (btnApplyProf) {
  btnApplyProf.addEventListener('click', () => {
    applyPlayerProfiles();
    document.getElementById('profileModal').classList.add('hidden');
  });
}

// Reset Defaults
const btnResetProf = document.getElementById('btnResetProfilesDefault');
if (btnResetProf) {
  btnResetProf.addEventListener('click', () => {
    audio.playClick();
    ALL_PLAYERS = JSON.parse(JSON.stringify(CANONICAL_PLAYERS));
    saveProfilesToStorage();
    renderProfileEditor(currentProfileTab);
    applyPlayerProfiles();
  });
}

// React to setup modal player count & mode selections to update roster preview
document.querySelectorAll('input[name="playerCount"]').forEach(r => {
  r.addEventListener('change', updateSetupRosterPreview);
});

document.querySelectorAll('input[name="gameMode"]').forEach(r => {
  r.addEventListener('change', () => {
    const val = r.value;
    if (val === 'passPlay') {
      ALL_PLAYERS.forEach(p => { p.type = 'human'; });
    } else if (val === 'vsAI') {
      ALL_PLAYERS.forEach((p, idx) => {
        p.type = (idx === humanChosenColorId) ? 'human' : 'ai';
      });
    } else if (val === 'spectate') {
      ALL_PLAYERS.forEach(p => { p.type = 'ai'; });
    }
    updateSetupRosterPreview();
  });
});

// Universal Modal Close Handlers
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-close');
    if (modalId === 'rulesModal') {
      closeRulesModal();
      return;
    }
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  });
});

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      if (modal.id === 'rulesModal') {
        closeRulesModal();
        return;
      }
      modal.classList.add('hidden');
    }
  });
});

// Apply Setup Form
document.getElementById('btnApplySetup').addEventListener('click', () => {
  const modeVal = document.querySelector('input[name="gameMode"]:checked').value;
  const countVal = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
  const diffVal = document.querySelector('input[name="aiDiff"]:checked').value;
  const diceVal = document.querySelector('input[name="diceModel"]:checked').value;
  const strictVal = document.getElementById('chkStrictEntryModal').checked;

  matchConfig.mode = modeVal;
  matchConfig.playerCount = countVal;
  matchConfig.aiDifficulty = diffVal;
  matchConfig.diceModel = diceVal;
  matchConfig.strictEntry = strictVal;

  document.getElementById('setupModal').classList.add('hidden');
  setupMatch();
});

// Settings Handlers
document.querySelectorAll('input[name="gameLang"]').forEach(r => {
  r.addEventListener('change', (e) => updateLanguage(e.target.value));
});

document.getElementById('chkColorBlind').addEventListener('change', (e) => {
  matchConfig.showSymbols = e.target.checked;
  if (matchConfig.showSymbols) {
    document.body.classList.remove('hide-symbols');
  } else {
    document.body.classList.add('hide-symbols');
  }
});

document.getElementById('chkSoundEffects').addEventListener('change', (e) => {
  matchConfig.soundEnabled = e.target.checked;
});

document.getElementById('rngMoveSpeed').addEventListener('input', (e) => {
  matchConfig.moveSpeedMs = parseInt(e.target.value);
});

// Carousel Navigation (How to Play)
let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.carousel-dots .dot');

function showSlide(idx) {
  slides.forEach((s, i) => s.classList.toggle('active', i === idx));
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  currentSlide = idx;
}

document.getElementById('btnNextSlide').addEventListener('click', () => {
  showSlide((currentSlide + 1) % slides.length);
});

document.getElementById('btnPrevSlide').addEventListener('click', () => {
  showSlide((currentSlide - 1 + slides.length) % slides.length);
});

dots.forEach(d => {
  d.addEventListener('click', () => {
    showSlide(parseInt(d.dataset.dot));
  });
});

// ============================================================================
// Simplified & Beautiful Player Choice Controller (§3 & §5)
// ============================================================================
let humanChosenColorId = 0; // 0: Red, 1: Green, 2: Yellow, 3: Blue
let selectedPresetId = '1h3ai';

const MATCH_PRESETS = {
  '1h3ai': { id: '1h3ai', title: '1 Human vs 3 AI', label: 'SOLO VS 3 AI', count: 4, mode: 'vsAI' },
  '1h1h': { id: '1h1h', title: '1 Human vs 1 Human', label: '1v1 DUEL', count: 2, mode: 'passPlay' },
  '4human': { id: '4human', title: '4 Humans (Pass & Play)', label: '4 HUMANS PASS & PLAY', count: 4, mode: 'passPlay' },
  '4ai': { id: '4ai', title: '4 AI Bots (Spectate)', label: 'AI SPECTATE', count: 4, mode: 'spectate' },
  '2h2ai': { id: '2h2ai', title: '2 Humans vs 2 AI', label: '2 HUMANS VS 2 AI', count: 4, mode: 'vsAI' },
  '3h1ai': { id: '3h1ai', title: '3 Humans vs 1 AI', label: '3 HUMANS VS 1 AI', count: 4, mode: 'vsAI' },
  '1h1ai': { id: '1h1ai', title: '1 Human vs 1 AI', label: '1v1 VS BOT', count: 2, mode: 'vsAI' },
  '1h2ai': { id: '1h2ai', title: '1 Human vs 2 AI', label: '1 HUMAN VS 2 AI', count: 3, mode: 'vsAI' },
  '3human': { id: '3human', title: '3 Humans (Pass & Play)', label: '3 HUMANS', count: 3, mode: 'passPlay' },
  '2h1ai': { id: '2h1ai', title: '2 Humans vs 1 AI', label: '2 HUMANS VS 1 AI', count: 3, mode: 'vsAI' }
};

function updateStartMatchButtonText() {
  const btnText = document.getElementById('btnEnterText');
  if (!btnText) return;
  const preset = MATCH_PRESETS[selectedPresetId] || MATCH_PRESETS['1h3ai'];
  const colorName = ALL_PLAYERS[humanChosenColorId] ? ALL_PLAYERS[humanChosenColorId].direction : 'South';
  btnText.textContent = `START MATCH (${preset.label} • ${colorName.toUpperCase()})`;
}

function syncChampionInputsWithPlayer(playerId) {
  const pl = ALL_PLAYERS[playerId];
  if (!pl) return;

  const nameInput = document.getElementById('splashPlayerName');
  const titleSelect = document.getElementById('splashPlayerTitle');

  if (nameInput) nameInput.value = pl.name;
  if (titleSelect) titleSelect.value = pl.title;

  // Sync avatar buttons
  document.querySelectorAll('#splashAvatarRow .champ-sym-btn').forEach(btn => {
    if (btn.dataset.sym === pl.symbol) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });

  // Sync color orbs
  document.querySelectorAll('#splashColorOrbs .color-orb-btn').forEach(btn => {
    const pId = parseInt(btn.dataset.playerId, 10);
    if (pId === playerId) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
    const symEl = document.getElementById(`orbSym_${pId}`);
    if (symEl && ALL_PLAYERS[pId]) {
      symEl.textContent = ALL_PLAYERS[pId].symbol;
    }
  });

  updateStartMatchButtonText();
}

function selectHumanColor(playerId) {
  if (playerId < 0 || playerId > 3) return;
  const nameInput = document.getElementById('splashPlayerName');
  const titleSelect = document.getElementById('splashPlayerTitle');

  // If user entered a custom name in the input, transfer it to chosen color profile
  const currentVal = nameInput ? nameInput.value.trim() : '';
  const defaultNames = ['Crimson Red', 'Emerald Green', 'Golden Yellow', 'Sapphire Blue', 'Player 1', 'Player 2', 'Player 3', 'Player 4'];
  const hasCustomName = currentVal && !defaultNames.includes(currentVal);

  humanChosenColorId = playerId;

  if (hasCustomName) {
    ALL_PLAYERS[playerId].name = currentVal;
  }
  if (titleSelect && titleSelect.value) {
    ALL_PLAYERS[playerId].title = titleSelect.value;
  }
  const selectedAvatarBtn = document.querySelector('#splashAvatarRow .champ-sym-btn.selected');
  if (selectedAvatarBtn && selectedAvatarBtn.dataset.sym) {
    ALL_PLAYERS[playerId].symbol = selectedAvatarBtn.dataset.sym;
  }

  syncChampionInputsWithPlayer(playerId);
  audio.playClick();
}

function applySelectedPresetToMatch() {
  const preset = MATCH_PRESETS[selectedPresetId] || MATCH_PRESETS['1h3ai'];

  // Save current input values into chosen player profile
  const nameInput = document.getElementById('splashPlayerName');
  const titleSelect = document.getElementById('splashPlayerTitle');
  const selectedAvatarBtn = document.querySelector('#splashAvatarRow .champ-sym-btn.selected');

  if (ALL_PLAYERS[humanChosenColorId]) {
    const inputVal = nameInput ? nameInput.value.trim() : '';
    if (inputVal) {
      ALL_PLAYERS[humanChosenColorId].name = inputVal;
    } else if (!ALL_PLAYERS[humanChosenColorId].name) {
      ALL_PLAYERS[humanChosenColorId].name = `Player ${humanChosenColorId + 1}`;
    }
    if (titleSelect && titleSelect.value) {
      ALL_PLAYERS[humanChosenColorId].title = titleSelect.value;
    }
    if (selectedAvatarBtn && selectedAvatarBtn.dataset.sym) {
      ALL_PLAYERS[humanChosenColorId].symbol = selectedAvatarBtn.dataset.sym;
    }
  }

  matchConfig.playerCount = preset.count;
  matchConfig.mode = preset.mode;

  // Assign player roles depending on chosen color and mode
  if (preset.mode === 'vsAI') {
    if (preset.id === '2h2ai') {
      const partnerId = (humanChosenColorId + 2) % 4;
      ALL_PLAYERS.forEach((pl, idx) => {
        pl.type = (idx === humanChosenColorId || idx === partnerId) ? 'human' : 'ai';
      });
    } else if (preset.id === '3h1ai' || preset.id === '2h1ai') {
      const aiId = (humanChosenColorId + 2) % 4;
      ALL_PLAYERS.forEach((pl, idx) => {
        pl.type = (idx === aiId) ? 'ai' : 'human';
      });
    } else {
      // 1 Human vs AI: chosen color is Human, all others are AI
      ALL_PLAYERS.forEach((pl, idx) => {
        pl.type = (idx === humanChosenColorId) ? 'human' : 'ai';
      });
    }
  } else if (preset.mode === 'passPlay') {
    // All active players are human
    ALL_PLAYERS.forEach(pl => { pl.type = 'human'; });
  } else if (preset.mode === 'spectate') {
    // All active players are AI
    ALL_PLAYERS.forEach(pl => { pl.type = 'ai'; });
  }

  // Synchronize Setup Modal controls
  const modeRadio = document.querySelector(`input[name="gameMode"][value="${preset.mode}"]`);
  if (modeRadio) modeRadio.checked = true;

  const countRadio = document.querySelector(`input[name="playerCount"][value="${preset.count}"]`);
  if (countRadio) countRadio.checked = true;

  const diceRadio = document.querySelector(`input[name="diceModel"][value="${matchConfig.diceModel}"]`);
  if (diceRadio) diceRadio.checked = true;

  const diffRadio = document.querySelector(`input[name="aiDifficulty"][value="${matchConfig.aiDifficulty}"]`);
  if (diffRadio) diffRadio.checked = true;

  saveProfilesToStorage();
  updateDockBadges();
  updatePawnVisuals();
  setupMatch();
}

function initSimplifiedSplashInteractions() {
  // Mode Cards click
  const modeCards = document.querySelectorAll('#splashModeCards .mode-card');
  const moreSelect = document.getElementById('splashMoreModesSelect');

  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      audio.playClick();
      modeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPresetId = card.dataset.preset;
      if (moreSelect) moreSelect.value = '';
      updateStartMatchButtonText();
    });
  });

  // More modes select dropdown
  if (moreSelect) {
    moreSelect.addEventListener('change', (e) => {
      if (!e.target.value) return;
      audio.playClick();
      modeCards.forEach(c => c.classList.remove('selected'));
      selectedPresetId = e.target.value;
      updateStartMatchButtonText();
    });
  }

  // Color Orbs click
  document.querySelectorAll('#splashColorOrbs .color-orb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = parseInt(btn.dataset.playerId, 10);
      selectHumanColor(pId);
    });
  });

  // Name Input live sync
  const nameInput = document.getElementById('splashPlayerName');
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      if (ALL_PLAYERS[humanChosenColorId]) {
        ALL_PLAYERS[humanChosenColorId].name = e.target.value.trim() || `Player ${humanChosenColorId + 1}`;
      }
    });
  }

  // Title Select live sync
  const titleSelect = document.getElementById('splashPlayerTitle');
  if (titleSelect) {
    titleSelect.addEventListener('change', (e) => {
      if (ALL_PLAYERS[humanChosenColorId]) {
        ALL_PLAYERS[humanChosenColorId].title = e.target.value;
      }
    });
  }

  // Preset Name chips
  document.querySelectorAll('#splashNamePresets .preset-name-pill').forEach(chip => {
    chip.addEventListener('click', () => {
      audio.playClick();
      const chosenName = chip.dataset.name;
      if (nameInput) nameInput.value = chosenName;
      if (ALL_PLAYERS[humanChosenColorId]) {
        ALL_PLAYERS[humanChosenColorId].name = chosenName;
      }
    });
  });

  // Avatar Symbol Picker
  document.querySelectorAll('#splashAvatarRow .champ-sym-btn').forEach(symBtn => {
    symBtn.addEventListener('click', () => {
      audio.playClick();
      document.querySelectorAll('#splashAvatarRow .champ-sym-btn').forEach(b => b.classList.remove('selected'));
      symBtn.classList.add('selected');
      const sym = symBtn.dataset.sym;
      if (ALL_PLAYERS[humanChosenColorId]) {
        ALL_PLAYERS[humanChosenColorId].symbol = sym;
        const orbSym = document.getElementById(`orbSym_${humanChosenColorId}`);
        if (orbSym) orbSym.textContent = sym;
      }
    });
  });

  // Dice Modifier Pills
  document.querySelectorAll('#splashDicePills .splash-mod-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playClick();
      document.querySelectorAll('#splashDicePills .splash-mod-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      matchConfig.diceModel = btn.dataset.dice;
      updateDiceVisuals();
    });
  });

  // AI Modifier Pills
  document.querySelectorAll('#splashAiPills .splash-mod-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playClick();
      document.querySelectorAll('#splashAiPills .splash-mod-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      matchConfig.aiDifficulty = btn.dataset.ai;
    });
  });

  // Initial populate with default player (0)
  syncChampionInputsWithPlayer(humanChosenColorId);
}

// ============================================================================
// Loading Screen & Title Splash Controller (§7 Specification)
// ============================================================================
const loadingStages = [
  { percent: 20, text: "Booting Pasha Palli Game Engine..." },
  { percent: 45, text: "Weaving 19×19 Embroidered Velvet Cruciform Board..." },
  { percent: 70, text: "Carving Authentic Pasa Stick Dice with Ivory Pips..." },
  { percent: 90, text: "Calibrating Expectiminimax AI Opponents..." },
  { percent: 100, text: "Royal Court Ready!" }
];

function initLoadingSequence() {
  setFSMState(GameState.Boot);
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingContainer = document.querySelector('.loading-container');
  const statusText = document.getElementById('loadingStatusText');
  const percentText = document.getElementById('loadingPercentText');
  const barFill = document.getElementById('loadingBarFill');
  const progressGroup = document.getElementById('loadingProgressGroup');
  const gateGroup = document.getElementById('loadingGateGroup');
  const btnEnter = document.getElementById('btnEnterGame');

  if (!loadingScreen) return;

  initSimplifiedSplashInteractions();

  loadingScreen.classList.remove('hidden', 'fade-out');
  if (loadingContainer) loadingContainer.classList.remove('gate-active');
  if (progressGroup) progressGroup.classList.remove('hidden');
  if (gateGroup) gateGroup.classList.add('hidden');
  if (barFill) barFill.style.width = '0%';
  if (percentText) percentText.textContent = '0%';

  let currentStageIdx = 0;

  function runStage() {
    if (currentStageIdx >= loadingStages.length) {
      // Completed 100%
      if (progressGroup) progressGroup.classList.add('hidden');
      if (gateGroup) gateGroup.classList.remove('hidden');
      if (loadingContainer) loadingContainer.classList.add('gate-active');

      const nameInput = document.getElementById('splashPlayerName');
      if (nameInput && nameInput.value.trim() && ALL_PLAYERS[humanChosenColorId]) {
        const defaultColorNames = ['Crimson Red', 'Emerald Green', 'Golden Yellow', 'Sapphire Blue'];
        if (defaultColorNames.includes(ALL_PLAYERS[humanChosenColorId].name)) {
          ALL_PLAYERS[humanChosenColorId].name = nameInput.value.trim();
        }
      }

      syncChampionInputsWithPlayer(humanChosenColorId);
      return;
    }

    const stage = loadingStages[currentStageIdx];
    if (statusText) statusText.textContent = stage.text;
    if (percentText) percentText.textContent = `${stage.percent}%`;
    if (barFill) barFill.style.width = `${stage.percent}%`;

    currentStageIdx++;
    const delay = 160 + Math.random() * 100;
    setTimeout(runStage, delay);
  }

  setTimeout(runStage, 140);

  // Enter Game / Start Match Button Click - Pops Up Rule Book
  if (btnEnter) {
    btnEnter.onclick = () => {
      audio.init();
      audio.playSafeChime();
      applySelectedPresetToMatch();
      const preset = MATCH_PRESETS[selectedPresetId] || MATCH_PRESETS['1h3ai'];
      addLog(`Court match initialized: ${preset.title}. All Rights Reserved under Devesh Das.`, 'sys');
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        openRulesModal(true);
      }, 550);
    };
  }
}

// Return to Title Screen Handler
const btnOpenTitleScreen = document.getElementById('btnOpenTitleScreen');
if (btnOpenTitleScreen) {
  btnOpenTitleScreen.addEventListener('click', () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingContainer = document.querySelector('.loading-container');
    const progressGroup = document.getElementById('loadingProgressGroup');
    const gateGroup = document.getElementById('loadingGateGroup');
    const barFill = document.getElementById('loadingBarFill');
    const percentText = document.getElementById('loadingPercentText');
    const statusText = document.getElementById('loadingStatusText');

    if (loadingScreen) {
      syncChampionInputsWithPlayer(humanChosenColorId);
      loadingScreen.classList.remove('hidden', 'fade-out');
      if (loadingContainer) loadingContainer.classList.add('gate-active');
      if (progressGroup) progressGroup.classList.add('hidden');
      if (gateGroup) gateGroup.classList.remove('hidden');
      if (barFill) barFill.style.width = '100%';
      if (percentText) percentText.textContent = '100%';
      if (statusText) statusText.textContent = 'Royal Court Ready!';
    }
  });

  const topNavLogo = document.getElementById('topNavLogoGroup');
  if (topNavLogo) {
    topNavLogo.addEventListener('click', () => {
      btnOpenTitleScreen.click();
    });
  }
}

// =============================================================================
// Royal Theme Engine: Dark & Light Mode Support
// =============================================================================
let currentTheme = 'dark';
try {
  const saved = localStorage.getItem('pasha_theme');
  if (saved === 'light' || saved === 'dark') currentTheme = saved;
} catch (e) {}

function applyTheme(theme, notify = false) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('pasha_theme', theme);
  } catch (e) {}

  const themeBtnIcon = document.getElementById('themeToggleIcon');
  const themeBtnText = document.getElementById('themeToggleText');
  const themeBtn = document.getElementById('btnThemeToggle');

  if (theme === 'light') {
    if (themeBtnIcon) themeBtnIcon.textContent = '🌙';
    if (themeBtnText) themeBtnText.textContent = 'Dark Mode';
    if (themeBtn) themeBtn.title = 'Switch to Dark Mode (Royal Night)';
  } else {
    if (themeBtnIcon) themeBtnIcon.textContent = '☀️';
    if (themeBtnText) themeBtnText.textContent = 'Light Mode';
    if (themeBtn) themeBtn.title = 'Switch to Light Mode (Palace Court)';
  }

  // Synchronize Settings Modal radio buttons
  const radios = document.querySelectorAll('input[name="settingsTheme"]');
  radios.forEach(r => {
    r.checked = (r.value === theme);
  });

  if (notify && typeof addLog === 'function') {
    addLog(`Theme set to ${theme === 'light' ? 'Palace Light' : 'Royal Dark'} mode.`, 'sys');
  }
}

function toggleTheme() {
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(nextTheme, true);
  if (typeof audio !== 'undefined' && audio.playClick) {
    audio.playClick();
  }
}

function initThemeSystem() {
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', toggleTheme);
  }

  document.querySelectorAll('input[name="settingsTheme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        applyTheme(e.target.value, true);
        if (typeof audio !== 'undefined' && audio.playClick) {
          audio.playClick();
        }
      }
    });
  });

  applyTheme(currentTheme, false);
}

// ----------------------------------------------------------------------------
// Game Boot
// ----------------------------------------------------------------------------
buildBoard();
setupMatch();
initThemeSystem();
initLoadingSequence();

// URL Query Parameter Automation for Visual Verification & Report Screenshots
try {
  const urlParams = new URLSearchParams(window.location.search);
  const viewMode = urlParams.get('view');
  if (viewMode === 'gameplay') {
    const loading = document.getElementById('loadingScreen');
    if (loading) loading.classList.add('hidden');
    applySelectedPresetToMatch();
    setFSMState(GameState.Roll);
    updateHUD();
    if (pawns && pawns.length >= 16) {
      pawns[0].inDock = false;
      pawns[0].currentStep = 14;
      const c1 = cellsMap.get(playerPaths[0][14]);
      if (c1 && c1.pawnsContainer) placePawnInCell(pawns[0].el, c1.pawnsContainer);

      pawns[4].inDock = false;
      pawns[4].currentStep = 8;
      const c2 = cellsMap.get(playerPaths[1][8]);
      if (c2 && c2.pawnsContainer) placePawnInCell(pawns[4].el, c2.pawnsContainer);

      pawns[8].inDock = false;
      pawns[8].currentStep = 4;
      const c3 = cellsMap.get(playerPaths[2][4]);
      if (c3 && c3.pawnsContainer) placePawnInCell(pawns[8].el, c3.pawnsContainer);

      pawns[12].inDock = false;
      pawns[12].currentStep = 22;
      const c4 = cellsMap.get(playerPaths[3][22]);
      if (c4 && c4.pawnsContainer) placePawnInCell(pawns[12].el, c4.pawnsContainer);

      rolledDiceValues = [4, 2];
      currentRoll = 6;
      renderDiceFaces();
      addLog('Pasas rolled: [4, 2] = Total 6. Choose an active Gotti to advance!', 'action');
    }
  } else if (viewMode === 'rules') {
    const loading = document.getElementById('loadingScreen');
    if (loading) loading.classList.add('hidden');
    openRulesModal(true);
  } else if (viewMode === 'victory') {
    const loading = document.getElementById('loadingScreen');
    if (loading) loading.classList.add('hidden');
    window.testVictoryScreen(0);
  }
} catch (e) {
  console.warn('Screenshot query automation error:', e);
}

