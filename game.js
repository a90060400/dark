(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const bgImage = new Image();
  bgImage.src = "static/backgurend.png";
  let bgReady = false;
  bgImage.onload = () => {
    bgReady = true;
    paintPreview();
  };

  const darkBossImage = new Image();
  darkBossImage.src = "static/dark.png";
  let darkBossReady = false;
  let darkBossCustomLayout = false;

  const DEFAULT_KEYS = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    jump: "Space",
    skill1: "KeyX",
    skill2: "KeyC",
    manualHp: "KeyZ",
    manualMp: "KeyV",
  };

  const BASE_KEY_LABELS = {
    left: "左移",
    right: "右移",
    up: "上 / 爬繩",
    down: "下 / 下繩",
    jump: "跳躍",
    manualHp: "手動補血",
    manualMp: "手動補 MP",
  };

  const CLASSES = {
    dk: {
      id: "dk",
      name: "黑騎士",
      skills: [
        {
          id: "holyFire",
          name: "聖火",
          key: "skill1",
          desc: "設定 HP ×1.6（消技自動 ÷1.6）",
        },
        {
          id: "powerDispel",
          name: "力消",
          key: "skill2",
          desc: "15 秒內物理傷害 -35%",
        },
      ],
    },
    mage: {
      id: "mage",
      name: "法師",
      skills: [
        {
          id: "magicGuard",
          name: "魔心",
          key: "skill1",
          desc: "45 秒內受傷 80% 扣 MP、20% 扣 HP",
        },
      ],
    },
    thief: {
      id: "thief",
      name: "刀賊",
      skills: [
        {
          id: "mesoGuard",
          name: "楓幣護盾",
          key: "skill1",
          desc: "抵擋下一次傷害",
        },
      ],
    },
    archer: {
      id: "archer",
      name: "弓箭手",
      skills: [
        {
          id: "puppet",
          name: "稻草人",
          key: "skill1",
          desc: "放置稻草人，吸收 1 次攻擊（30 秒）",
        },
      ],
    },
    pirate: {
      id: "pirate",
      name: "海盜",
      skills: [
        {
          id: "flashFist",
          name: "閃索命",
          key: "skill1",
          desc: "將翼龍拉向自身位置",
        },
      ],
    },
  };

  const MAGIC_ATTACK_TYPES = new Set([
    "iceCone",
    "iceFloor",
    "bolt",
    "bigBolt",
    "redLightning",
    "fireBlast",
    "chain",
  ]);

  const PHYSICAL_ATTACK_TYPES = new Set(["stomp", "bite", "tail", "flutter"]);

  const HOLY_FIRE_MULT = 1.6;

  const HP_POTIONS = [
    { id: "ramen", name: "拉麵", heal: 1500 },
    { id: "popsicle", name: "棒冰棒", heal: 2000 },
    { id: "cheese", name: "起司乳酪", heal: 4000 },
    { id: "reindeer", name: "馴鹿奶", heal: 5000 },
    { id: "cherry_pie", name: "櫻桃派", heal: 2000, mpRestore: 2000 },
  ];

  const MP_POTIONS = [
    { id: "shaved_ice", name: "刨冰", restore: 2000 },
    { id: "cherry_pie", name: "櫻桃派", restore: 2000, heal: 2000 },
    { id: "morning_dew", name: "清晨之露", restore: 4000 },
    { id: "dusk_dew", name: "黃昏之露", restore: 5000 },
    { id: "special", name: "特殊藥水", restorePercent: 0.5 },
    { id: "super", name: "超級藥水", restorePercent: 1 },
  ];

  const DEFAULT_PLAYER_SETTINGS = {
    maxHp: 5000,
    maxMp: 30000,
    petHpPotionId: "ramen",
    manualHpPotionId: "ramen",
    manualMpPotionId: "shaved_ice",
    petAutoHeal: true,
  };

  const PET_HEAL_INTERVAL = 2.5;

  let playerSettings = loadPlayerSettings();
  let playerClass = null;

  const skillState = {
    holyFire: 0,
    powerDispel: 0,
    magicGuard: 0,
    mesoShield: 0,
    puppet: null,
    msg: "",
    msgTimer: 0,
  };

  const STOMP_CYCLE = [
    { id: "rLight", name: "右腳輕踩", side: "right", heavy: false, hint: "輕踩打最下層 — 右半地面跳起" },
    { id: "rHeavy", name: "右腳重踩", side: "right", heavy: true, hint: "重踩打中層 — 右半中平台跳起或回地面" },
    { id: "lLight", name: "左腳輕踩", side: "left", heavy: false, hint: "輕踩打最下層 — 左半地面跳起" },
    { id: "lHeavy", name: "左腳重踩", side: "left", heavy: true, hint: "重踩打中層 — 左半中平台跳起或回地面" },
  ];

  const ALTAR_RULES = [
    "祭壇白 → 推紅龍或藍龍（50%以上推不同色）",
    "祭壇紅 → 推藍龍或黑龍",
    "祭壇藍 → 推紅龍或黑龍",
    "翅膀 50% 以下：改推相同色（黃字提示）",
  ];

  let keys = loadKeys();
  let listeningAction = null;
  let running = false;
  let paused = false;
  let lastTs = 0;
  let surviveMs = 0;
  let dodgeCount = 0;
  let hitCount = 0;

  const ui = {
    hpBar: document.getElementById("hpBar"),
    hpText: document.getElementById("hpText"),
    mpRow: document.getElementById("mpRow"),
    mpBar: document.getElementById("mpBar"),
    mpText: document.getElementById("mpText"),
    elec: document.getElementById("elec"),
    bleed: document.getElementById("bleed"),
    slow: document.getElementById("slow"),
    survive: document.getElementById("survive"),
    dodges: document.getElementById("dodges"),
    hits: document.getElementById("hits"),
    attackName: document.getElementById("attackName"),
    attackHint: document.getElementById("attackHint"),
    stompSeq: document.getElementById("stompSeq"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayMsg: document.getElementById("overlayMsg"),
    maxHpInput: document.getElementById("maxHpInput"),
    applyHpBtn: document.getElementById("applyHpBtn"),
    maxMpConfig: document.getElementById("maxMpConfig"),
    maxMpInput: document.getElementById("maxMpInput"),
    applyMpBtn: document.getElementById("applyMpBtn"),
    petHpPotionList: document.getElementById("petHpPotionList"),
    manualHpPotionList: document.getElementById("manualHpPotionList"),
    manualMpPotionList: document.getElementById("manualMpPotionList"),
    potionSelectedText: document.getElementById("petPotionSelectedText"),
    manualHpSelectedText: document.getElementById("manualHpSelectedText"),
    manualMpSelectedText: document.getElementById("manualMpSelectedText"),
    useManualHpBtn: document.getElementById("useManualHpBtn"),
    useManualMpBtn: document.getElementById("useManualMpBtn"),
    mpPotionSection: document.getElementById("mpPotionSection"),
    petAutoHeal: document.getElementById("petAutoHeal"),
    potionMsg: document.getElementById("potionMsg"),
    potionOverlay: document.getElementById("potionOverlay"),
    openPotionBtn: document.getElementById("openPotionBtn"),
    closePotionBtn: document.getElementById("closePotionBtn"),
    potionQuickSummary: document.getElementById("potionQuickSummary"),
    classOverlay: document.getElementById("classOverlay"),
    classGrid: document.getElementById("classGrid"),
    classNameBadge: document.getElementById("classNameBadge"),
    skillBar: document.getElementById("skillBar"),
    changeClassBtn: document.getElementById("changeClassBtn"),
  };

  const pressed = new Set();

  const GROUND_Y = 430;
  let editMode = false;
  let editAnim = 0;
  let selected = null;
  let dragState = null;

  const DEFAULT_PLATFORMS = [
    { id: "ground", label: "地面", x: 0, y: GROUND_Y, w: W, h: 110, layer: "ground" },
    { id: "L-lower", label: "左①", x: 42, y: 382, w: 98, h: 10, layer: "mid" },
    { id: "L-mid", label: "左②", x: 18, y: 314, w: 162, h: 10, layer: "mid" },
    { id: "L-upper", label: "左③", x: 36, y: 256, w: 132, h: 10, layer: "mid" },
    { id: "L-bridge1", label: "左④", x: 172, y: 214, w: 54, h: 8, layer: "high" },
    { id: "L-bridge2", label: "左⑤", x: 232, y: 182, w: 50, h: 8, layer: "high" },
    { id: "L-bridge3", label: "左⑥", x: 284, y: 156, w: 44, h: 8, layer: "high" },
    { id: "R-lower", label: "右①", x: 836, y: 384, w: 98, h: 10, layer: "mid" },
    { id: "R-float1", label: "右②", x: 864, y: 338, w: 58, h: 8, layer: "mid" },
    { id: "R-step1", label: "右③", x: 884, y: 294, w: 50, h: 8, layer: "mid" },
    { id: "R-step2", label: "右④", x: 888, y: 250, w: 48, h: 8, layer: "high" },
    { id: "R-step3", label: "右⑤", x: 892, y: 206, w: 46, h: 8, layer: "high" },
    { id: "R-mid", label: "右⑥", x: 696, y: 316, w: 148, h: 10, layer: "mid" },
    { id: "R-upper", label: "右⑦", x: 754, y: 252, w: 128, h: 10, layer: "mid" },
    { id: "R-bridge1", label: "右⑧", x: 664, y: 190, w: 52, h: 8, layer: "high" },
    { id: "R-bridge2", label: "右⑨", x: 604, y: 160, w: 50, h: 8, layer: "high" },
  ];

  const DEFAULT_ROPES = [
    { id: "rope-L1", label: "繩A", x: 118, y: 148, h: 288 },
    { id: "rope-L2", label: "繩B", x: 96, y: 324, h: 110 },
    { id: "rope-R1", label: "繩C", x: 846, y: 168, h: 268 },
    { id: "rope-R2", label: "繩D", x: 910, y: 210, h: 130 },
  ];

  const DEFAULT_TAIL_ZONE = {
    id: "tail-danger",
    label: "尾巴危險區",
    x: 820,
    y: 380,
    w: 130,
    h: 100,
  };

  const DEFAULT_DARK_BOSS = {
    id: "dark-boss",
    label: "闇黑龍王",
    x: 280,
    y: 90,
    w: 400,
    h: 360,
  };

  let platforms = [];
  let ropes = [];
  let tailZone = { ...DEFAULT_TAIL_ZONE };
  let darkBoss = { ...DEFAULT_DARK_BOSS };

  function cloneTailZone(z) {
    return { ...DEFAULT_TAIL_ZONE, ...z };
  }

  function cloneDarkBoss(d) {
    return { ...DEFAULT_DARK_BOSS, ...d };
  }

  function centerDarkBossSize() {
    const iw = darkBossImage.naturalWidth || DEFAULT_DARK_BOSS.w;
    const ih = darkBossImage.naturalHeight || DEFAULT_DARK_BOSS.h;
    const maxW = W * 0.52;
    const maxH = H * 0.62;
    let bw = iw;
    let bh = ih;
    if (bw > maxW || bh > maxH) {
      const scale = Math.min(maxW / bw, maxH / bh);
      bw = Math.max(32, Math.floor(bw * scale));
      bh = Math.max(32, Math.floor(bh * scale));
    }
    darkBoss.w = bw;
    darkBoss.h = bh;
    darkBoss.x = Math.floor((W - bw) / 2);
    darkBoss.y = Math.floor((H - bh) / 2);
  }

  function finalizeDarkBossLayout(forceCenter) {
    if (!darkBossReady) return;
    if (!darkBossCustomLayout || forceCenter) centerDarkBossSize();
  }

  darkBossImage.onload = () => {
    darkBossReady = true;
    finalizeDarkBossLayout(false);
    paintPreview();
  };

  function clonePlatforms(list) {
    return list.map((p) => ({ ...p }));
  }

  function cloneRopes(list) {
    return list.map((r) => ({ ...r }));
  }

  const STORAGE_PLATFORMS = "artale-ht-platforms";
  const STORAGE_DEFAULTS = "artale-ht-platform-defaults";

  function getBuiltinDefaults() {
    return {
      platforms: clonePlatforms(DEFAULT_PLATFORMS),
      ropes: cloneRopes(DEFAULT_ROPES),
      tailZone: cloneTailZone(DEFAULT_TAIL_ZONE),
      darkBoss: cloneDarkBoss(DEFAULT_DARK_BOSS),
    };
  }

  function applyLayoutTemplate(tpl, resetDarkBossLayout) {
    platforms = tpl.platforms;
    ropes = tpl.ropes;
    tailZone = cloneTailZone(tpl.tailZone || DEFAULT_TAIL_ZONE);
    darkBoss = cloneDarkBoss(tpl.darkBoss || DEFAULT_DARK_BOSS);
    darkBossCustomLayout = !!tpl.darkBoss && !resetDarkBossLayout;
    if (resetDarkBossLayout) darkBossCustomLayout = false;
    finalizeDarkBossLayout(resetDarkBossLayout);
  }

  function getSavedDefaultTemplate() {
    try {
      const raw = localStorage.getItem(STORAGE_DEFAULTS);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.platforms) && data.platforms.length) {
          return {
            platforms: clonePlatforms(data.platforms),
            ropes: cloneRopes(Array.isArray(data.ropes) ? data.ropes : DEFAULT_ROPES),
            tailZone: cloneTailZone(data.tailZone || DEFAULT_TAIL_ZONE),
            darkBoss: cloneDarkBoss(data.darkBoss || DEFAULT_DARK_BOSS),
          };
        }
      }
    } catch (_) {}
    return getBuiltinDefaults();
  }

  function hasUserDefaultTemplate() {
    try {
      return !!localStorage.getItem(STORAGE_DEFAULTS);
    } catch (_) {
      return false;
    }
  }

  function loadPlatforms() {
    try {
      const raw = localStorage.getItem(STORAGE_PLATFORMS);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.platforms)) platforms = clonePlatforms(data.platforms);
        if (Array.isArray(data.ropes)) ropes = cloneRopes(data.ropes);
        if (data.tailZone) tailZone = cloneTailZone(data.tailZone);
        if (data.darkBoss) {
          darkBoss = cloneDarkBoss(data.darkBoss);
          darkBossCustomLayout = true;
        }
        if (platforms.length) {
          finalizeDarkBossLayout(false);
          return;
        }
      }
    } catch (_) {}
    applyLayoutTemplate(getSavedDefaultTemplate(), false);
  }

  function savePlatforms() {
    localStorage.setItem(
      STORAGE_PLATFORMS,
      JSON.stringify({ platforms, ropes, tailZone, darkBoss })
    );
    syncEditorFields();
    setEditorStatus("已儲存目前位置");
  }

  function setCurrentAsDefault() {
    localStorage.setItem(
      STORAGE_DEFAULTS,
      JSON.stringify({ platforms, ropes, tailZone, darkBoss })
    );
    savePlatforms();
    setEditorStatus("已設為預設。「還原預設」將使用這組配置。");
  }

  function resetPlatformsToDefault() {
    applyLayoutTemplate(getSavedDefaultTemplate(), false);
    selected = null;
    buildEditorSelect();
    if (platforms.length) selectItem("platform", platforms[0].id);
    else syncEditorFields();
    savePlatforms();
    setEditorStatus(hasUserDefaultTemplate() ? "已還原到你的預設" : "已還原到內建初始（尚未設自訂預設）");
  }

  function resetPlatformsToBuiltin() {
    applyLayoutTemplate(getBuiltinDefaults(), true);
    selected = null;
    buildEditorSelect();
    selectItem("platform", "ground");
    savePlatforms();
    setEditorStatus("已還原到程式內建初始位置");
  }

  function deleteSelectedItem() {
    if (!selected) {
      setEditorStatus("請先選取要刪除的平台或繩索");
      return;
    }
    if (selected.type === "tailZone") {
      setEditorStatus("尾巴危險區不可刪除，只能調整位置與大小");
      return;
    }
    if (selected.type === "darkBoss") {
      setEditorStatus("闇黑龍王本體圖不可刪除，只能調整位置與大小");
      return;
    }
    if (selected.type === "platform") {
      if (selected.id === "ground") {
        setEditorStatus("地面不可刪除");
        return;
      }
      const p = getPlatformById(selected.id);
      if (!p) return;
      if (!confirm(`確定刪除平台「${p.label}」？\n刪除後可按「還原預設」恢復。`)) return;
      platforms = platforms.filter((item) => item.id !== selected.id);
    } else {
      const r = getRopeById(selected.id);
      if (!r) return;
      if (!confirm(`確定刪除繩索「${r.label}」？\n刪除後可按「還原預設」恢復。`)) return;
      ropes = ropes.filter((item) => item.id !== selected.id);
    }
    selected = null;
    buildEditorSelect();
    if (platforms.length) selectItem("platform", platforms[0].id);
    else syncEditorFields();
    savePlatforms();
    setEditorStatus("已刪除");
  }

  function getGroundY() {
    const g = platforms.find((p) => p.id === "ground");
    return g ? g.y : GROUND_Y;
  }

  const player = {
    x: 480,
    y: 430,
    w: 28,
    h: 40,
    vx: 0,
    vy: 0,
    onGround: false,
    layer: "ground",
    hp: 5000,
    maxHp: 5000,
    mp: 30000,
    maxMp: 30000,
    elec: 0,
    bleed: 0,
    slow: 0,
    seduced: 0,
    seduceDir: 0,
    invuln: 0,
    dead: false,
    dropThrough: 0,
    dropThroughPlatform: null,
    onPlatform: null,
    facing: 1,
  };

  const npcs = [
    { x: 120, y: 394, w: 24, h: 36, elec: 3 },
    { x: 280, y: 146, w: 24, h: 36, elec: 5 },
    { x: 720, y: 280, w: 24, h: 36, elec: 2 },
  ];

  const editorUi = {
    card: document.getElementById("editorCard"),
    status: document.getElementById("editorStatus"),
    x: document.getElementById("edX"),
    y: document.getElementById("edY"),
    w: document.getElementById("edW"),
    h: document.getElementById("edH"),
    select: document.getElementById("edSelect"),
    toggle: document.getElementById("editToggleBtn"),
    save: document.getElementById("savePlatformsBtn"),
    setDefault: document.getElementById("setDefaultPlatformsBtn"),
    del: document.getElementById("deletePlatformBtn"),
    reset: document.getElementById("resetPlatformsBtn"),
    resetBuiltin: document.getElementById("resetBuiltinPlatformsBtn"),
    stage: document.querySelector(".stage-wrap"),
  };

  const state = {
    stompIndex: 0,
    redBiteTimer: 5,
    fireTimer: 45,
    blackChainTimer: 22,
    leftIceTimer: 8,
    rightBoltTimer: 6,
    handRedTimer: 12,
    leftSeduceTimer: 18,
    rightSeduceTimer: 22,
    leftDispelTimer: 26,
    rightDispelTimer: 30,
    tailSweepTimer: 14,
    tailMistTimer: 20,
    wingFlutterTimer: 25,
    dragonTimer: 30,
    altarHintIndex: 0,
    wingBelowHalf: false,
    rightHeadBelowHalf: false,
    midHeadBelowHalf: false,
    rightRageLeft: 0,
    attacks: [],
    fireFloors: [],
    mists: [],
    dragons: [],
    particles: [],
    currentAttackLabel: "準備中…",
    currentAttackHint: "按「開始練習」進入本體全機制",
    bleedTick: 0,
    conductionFlash: 0,
    petHealTimer: 0,
    redBite: null,
    redBiteTrack: null,
    redBiteLive: null,
  };

  function loadPlayerSettings() {
    try {
      const raw = localStorage.getItem("artale-ht-player");
      if (raw) {
        const data = { ...DEFAULT_PLAYER_SETTINGS, ...JSON.parse(raw) };
        if (data.potionId && !data.petHpPotionId) data.petHpPotionId = data.potionId;
        if (data.petPotionId && !data.petHpPotionId) data.petHpPotionId = data.petPotionId;
        if (!data.manualHpPotionId) data.manualHpPotionId = data.petHpPotionId || "ramen";
        if (!data.manualMpPotionId) data.manualMpPotionId = "shaved_ice";
        if (!MP_POTIONS.some((p) => p.id === data.manualMpPotionId)) data.manualMpPotionId = "shaved_ice";
        if (!data.maxMp) data.maxMp = 30000;
        if (data.petAutoHeal === undefined) data.petAutoHeal = true;
        return data;
      }
    } catch (_) {}
    return { ...DEFAULT_PLAYER_SETTINGS };
  }

  function savePlayerSettings() {
    localStorage.setItem("artale-ht-player", JSON.stringify(playerSettings));
  }

  function getCurrentClass() {
    return playerClass ? CLASSES[playerClass] : null;
  }

  function isMage() {
    return playerClass === "mage";
  }

  function getKeyLabels() {
    const labels = { ...BASE_KEY_LABELS };
    if (!isMage()) delete labels.manualMp;
    const cls = getCurrentClass();
    if (cls) {
      cls.skills.forEach((sk) => {
        labels[sk.key] = sk.name;
      });
    }
    return labels;
  }

  function recalcMaxHp() {
    const base = playerSettings.maxHp;
    player.maxHp = skillState.holyFire > 0 ? Math.floor(base * HOLY_FIRE_MULT) : base;
    player.hp = Math.min(player.hp, player.maxHp);
  }

  function applyHolyFireEffect() {
    const base = playerSettings.maxHp;
    player.maxHp = Math.floor(base * HOLY_FIRE_MULT);
    player.hp = Math.min(player.maxHp, Math.floor(player.hp * HOLY_FIRE_MULT));
  }

  function removeHolyFireEffect() {
    if (skillState.holyFire <= 0) return;
    player.hp = Math.max(1, Math.floor(player.hp / HOLY_FIRE_MULT));
    skillState.holyFire = 0;
    player.maxHp = playerSettings.maxHp;
    player.hp = Math.min(player.hp, player.maxHp);
  }

  function syncMpToSettings(fullHeal) {
    if (!isMage()) return;
    player.maxMp = playerSettings.maxMp;
    if (fullHeal) player.mp = player.maxMp;
    else player.mp = Math.min(player.mp, player.maxMp);
  }

  function syncPlayerSettingsToPlayer(fullHeal) {
    recalcMaxHp();
    syncMpToSettings(fullHeal);
    if (fullHeal) player.hp = player.maxHp;
    else player.hp = Math.min(player.hp, player.maxHp);
  }

  function getSelectedPetHpPotion() {
    return HP_POTIONS.find((p) => p.id === playerSettings.petHpPotionId) || HP_POTIONS[0];
  }

  function getSelectedManualHpPotion() {
    return HP_POTIONS.find((p) => p.id === playerSettings.manualHpPotionId) || HP_POTIONS[0];
  }

  function getSelectedManualMpPotion() {
    return MP_POTIONS.find((p) => p.id === playerSettings.manualMpPotionId) || MP_POTIONS[0];
  }

  function getMpRestoreAmount(pot) {
    if (pot.restorePercent != null) return Math.floor(player.maxMp * pot.restorePercent);
    return pot.restore || 0;
  }

  function formatHpPotionHeal(pot) {
    if (pot.mpRestore && isMage()) return `+${pot.heal} · MP +${pot.mpRestore}`;
    return `+${pot.heal}`;
  }

  function formatMpPotionRestore(pot) {
    if (pot.restorePercent != null) return `+${Math.round(pot.restorePercent * 100)}% MP`;
    if (pot.heal) return `+${pot.restore} MP · HP +${pot.heal}`;
    return `+${pot.restore} MP`;
  }

  function formatMpPotionRestoreShort(pot) {
    if (pot.restorePercent != null) return `+${Math.round(pot.restorePercent * 100)}% MP`;
    return `+${getMpRestoreAmount(pot)} MP`;
  }

  function buildHpPotionList(container, name, selectedId, onSelect) {
    container.innerHTML = "";
    for (const pot of HP_POTIONS) {
      const label = document.createElement("label");
      label.className = "potion-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = pot.id;
      input.checked = selectedId === pot.id;
      input.addEventListener("change", () => {
        if (!input.checked) return;
        onSelect(pot.id);
      });
      const potName = document.createElement("span");
      potName.textContent = pot.name;
      const heal = document.createElement("span");
      heal.className = "potion-heal";
      heal.textContent = formatHpPotionHeal(pot);
      label.append(input, potName, heal);
      container.appendChild(label);
    }
  }

  function buildMpPotionList() {
    ui.manualMpPotionList.innerHTML = "";
    for (const pot of MP_POTIONS) {
      const label = document.createElement("label");
      label.className = "potion-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "manualMpPotionChoice";
      input.value = pot.id;
      input.checked = playerSettings.manualMpPotionId === pot.id;
      input.addEventListener("change", () => {
        if (!input.checked) return;
        playerSettings.manualMpPotionId = pot.id;
        savePlayerSettings();
        refreshPotionLabels();
      });
      const potName = document.createElement("span");
      potName.textContent = pot.name;
      const heal = document.createElement("span");
      heal.className = "potion-heal";
      heal.textContent = formatMpPotionRestore(pot);
      label.append(input, potName, heal);
      ui.manualMpPotionList.appendChild(label);
    }
  }

  function buildPotionList() {
    buildHpPotionList(ui.petHpPotionList, "petHpPotionChoice", playerSettings.petHpPotionId, (id) => {
      playerSettings.petHpPotionId = id;
      savePlayerSettings();
      refreshPotionLabels();
    });
    buildHpPotionList(ui.manualHpPotionList, "manualHpPotionChoice", playerSettings.manualHpPotionId, (id) => {
      playerSettings.manualHpPotionId = id;
      savePlayerSettings();
      refreshPotionLabels();
    });
    buildMpPotionList();
    if (ui.petAutoHeal) ui.petAutoHeal.checked = playerSettings.petAutoHeal;
  }

  function refreshPotionLabels() {
    const petPot = getSelectedPetHpPotion();
    const manualHpPot = getSelectedManualHpPotion();
    const manualMpPot = getSelectedManualMpPotion();
    ui.potionSelectedText.textContent = playerSettings.petAutoHeal
      ? `寵物補血：${petPot.name} +${petPot.heal} · 每 ${PET_HEAL_INTERVAL} 秒`
      : `寵物自動補血已關閉（已選 ${petPot.name} +${petPot.heal}）`;
    ui.manualHpSelectedText.textContent = `手動補血：${manualHpPot.name} ${formatHpPotionHeal(manualHpPot)}`;
    ui.manualMpSelectedText.textContent = `手動補 MP：${manualMpPot.name} ${formatMpPotionRestoreShort(manualMpPot)}`;
    ui.useManualHpBtn.textContent = `手動補血（${manualHpPot.name}）`;
    ui.useManualMpBtn.textContent = `手動補 MP（${manualMpPot.name}）`;
    ui.maxHpInput.value = playerSettings.maxHp;
    ui.maxMpInput.value = playerSettings.maxMp;
    if (ui.potionQuickSummary) {
      const parts = [
        playerSettings.petAutoHeal ? `寵物 ${petPot.name}` : "寵物關",
        `手動 ${manualHpPot.name}`,
      ];
      if (isMage()) parts.push(`MP ${manualMpPot.name}`);
      ui.potionQuickSummary.textContent = parts.join(" · ");
    }
  }

  function showPotionOverlay() {
    if (!ui.potionOverlay) return;
    ui.potionOverlay.classList.remove("hidden");
  }

  function hidePotionOverlay() {
    if (!ui.potionOverlay) return;
    ui.potionOverlay.classList.add("hidden");
  }

  function updateClassUi() {
    const mage = isMage();
    if (ui.mpRow) ui.mpRow.hidden = !mage;
    if (ui.maxMpConfig) ui.maxMpConfig.hidden = !mage;
    if (ui.mpPotionSection) ui.mpPotionSection.hidden = !mage;
    if (!mage && ui.mpBar) ui.mpBar.style.width = "0%";
    buildKeyGrid();
    buildPotionList();
    refreshPotionLabels();
    updateUI();
  }

  function applyPetHeal() {
    if (player.dead || !playerSettings.petAutoHeal) return;
    const pot = getSelectedPetHpPotion();
    const before = player.hp;
    if (before >= player.maxHp) {
      ui.potionMsg.textContent = `寵物 · ${pot.name}：HP 已滿`;
      return;
    }
    player.hp = Math.min(player.maxHp, player.hp + pot.heal);
    const gained = Math.floor(player.hp - before);
    updateUI();
    ui.potionMsg.textContent = `寵物補血 · ${pot.name} +${gained} HP（${Math.floor(player.hp)} / ${player.maxHp}）`;
  }

  function useManualHpPotion() {
    if (player.dead) {
      ui.potionMsg.textContent = "已陣亡，請重新開始";
      return;
    }
    const pot = getSelectedManualHpPotion();
    const before = player.hp;
    if (before >= player.maxHp) {
      ui.potionMsg.textContent = `手動 · ${pot.name}：HP 已滿`;
      return;
    }
    player.hp = Math.min(player.maxHp, player.hp + pot.heal);
    const gained = Math.floor(player.hp - before);
    let msg = `手動補血 · ${pot.name} +${gained} HP（${Math.floor(player.hp)} / ${player.maxHp}）`;
    if (pot.mpRestore && isMage()) {
      const mpBefore = player.mp;
      player.mp = Math.min(player.maxMp, player.mp + pot.mpRestore);
      const mpGained = Math.floor(player.mp - mpBefore);
      if (mpGained > 0) msg += ` · MP +${mpGained}`;
    }
    updateUI();
    ui.potionMsg.textContent = msg;
  }

  function useManualMpPotion() {
    if (!isMage()) return;
    if (player.dead) {
      ui.potionMsg.textContent = "已陣亡，請重新開始";
      return;
    }
    const pot = getSelectedManualMpPotion();
    const before = player.mp;
    if (before >= player.maxMp) {
      ui.potionMsg.textContent = `手動 · ${pot.name}：MP 已滿`;
      return;
    }
    const restore = getMpRestoreAmount(pot);
    player.mp = Math.min(player.maxMp, player.mp + restore);
    const gained = Math.floor(player.mp - before);
    let msg = `手動補 MP · ${pot.name} +${gained} MP（${Math.floor(player.mp)} / ${player.maxMp}）`;
    if (pot.heal) {
      const hpBefore = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + pot.heal);
      const hpGained = Math.floor(player.hp - hpBefore);
      if (hpGained > 0) msg += ` · HP +${hpGained}`;
    }
    updateUI();
    ui.potionMsg.textContent = msg;
  }

  function updatePetHeal(dt) {
    if (!running || paused || editMode || player.dead || !playerSettings.petAutoHeal) return;
    state.petHealTimer += dt;
    if (state.petHealTimer < PET_HEAL_INTERVAL) return;
    state.petHealTimer -= PET_HEAL_INTERVAL;
    applyPetHeal();
  }

  function applyMaxHpFromInput() {
    let value = parseInt(ui.maxHpInput.value, 10);
    if (Number.isNaN(value)) {
      ui.potionMsg.textContent = "請輸入有效 HP 數值";
      return;
    }
    value = Math.max(500, Math.min(99999, value));
    playerSettings.maxHp = value;
    ui.maxHpInput.value = value;
    savePlayerSettings();
    syncPlayerSettingsToPlayer(!running);
    updateUI();
    ui.potionMsg.textContent = running ? `最大 HP 已設為 ${value}` : `最大 HP ${value}，已補滿`;
  }

  function applyMaxMpFromInput() {
    if (!isMage()) return;
    let value = parseInt(ui.maxMpInput.value, 10);
    if (Number.isNaN(value)) {
      ui.potionMsg.textContent = "請輸入有效 MP 數值";
      return;
    }
    value = Math.max(100, Math.min(99999, value));
    playerSettings.maxMp = value;
    ui.maxMpInput.value = value;
    savePlayerSettings();
    syncMpToSettings(!running);
    updateUI();
    ui.potionMsg.textContent = running ? `最大 MP 已設為 ${value}` : `最大 MP ${value}，已補滿`;
  }

  function loadKeys() {
    try {
      const raw = localStorage.getItem("artale-ht-keys");
      if (raw) return { ...DEFAULT_KEYS, ...JSON.parse(raw) };
    } catch (_) {}
    return { ...DEFAULT_KEYS };
  }

  function saveKeys() {
    localStorage.setItem("artale-ht-keys", JSON.stringify(keys));
  }

  function keyDisplay(code) {
    if (!code) return "未設定";
    if (code.startsWith("Arrow")) return code.replace("Arrow", "");
    if (code === "Space") return "Space";
    if (code.length === 1) return code.toUpperCase();
    return code;
  }

  function buildKeyGrid() {
    const grid = document.getElementById("keyGrid");
    grid.innerHTML = "";
    const labels = getKeyLabels();
    for (const action of Object.keys(labels)) {
      const row = document.createElement("div");
      row.className = "key-row";
      const label = document.createElement("label");
      label.textContent = labels[action];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key-btn";
      btn.dataset.action = action;
      btn.textContent = keyDisplay(keys[action]);
      btn.addEventListener("click", () => startListening(action, btn));
      row.append(label, btn);
      grid.appendChild(row);
    }
  }

  function buildClassGrid() {
    ui.classGrid.innerHTML = "";
    for (const cls of Object.values(CLASSES)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "class-btn";
      btn.dataset.classId = cls.id;
      const skillText = cls.skills.map((s) => s.name).join(" · ");
      btn.innerHTML = `<strong>${cls.name}</strong><span>${skillText}</span>`;
      btn.addEventListener("click", () => selectClass(cls.id));
      ui.classGrid.appendChild(btn);
    }
  }

  function showClassOverlay() {
    ui.classOverlay.classList.remove("hidden");
  }

  function hideClassOverlay() {
    ui.classOverlay.classList.add("hidden");
  }

  function selectClass(classId) {
    if (!CLASSES[classId]) return;
    playerClass = classId;
    hideClassOverlay();
    resetSkillState();
    buildKeyGrid();
    renderSkillBar();
    ui.classNameBadge.textContent = CLASSES[classId].name;
    if (isMage()) syncMpToSettings(true);
    updateClassUi();
    setSkillMsg(`已選擇 ${CLASSES[classId].name}`);
  }

  function clearActiveBuffs() {
    removeHolyFireEffect();
    skillState.powerDispel = 0;
    skillState.magicGuard = 0;
    skillState.mesoShield = 0;
    skillState.puppet = null;
    recalcMaxHp();
  }

  function resetSkillState() {
    skillState.holyFire = 0;
    skillState.powerDispel = 0;
    skillState.magicGuard = 0;
    skillState.mesoShield = 0;
    skillState.puppet = null;
    skillState.msg = "";
    skillState.msgTimer = 0;
    recalcMaxHp();
  }

  function setSkillMsg(text) {
    skillState.msg = text;
    skillState.msgTimer = 2.5;
    if (!running) ui.potionMsg.textContent = text;
  }

  function renderSkillBar() {
    ui.skillBar.innerHTML = "";
    const cls = getCurrentClass();
    if (!cls) {
      ui.classNameBadge.textContent = "未選職業";
      return;
    }
    ui.classNameBadge.textContent = cls.name;
    cls.skills.forEach((skill, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn secondary skill-btn";
      btn.dataset.skillIndex = String(index);
      const keyName = keyDisplay(keys[skill.key]);
      btn.innerHTML = `<strong>${skill.name}</strong> [${keyName}]<small>${skill.desc}</small>`;
      btn.addEventListener("click", () => useSkill(index));
      ui.skillBar.appendChild(btn);
    });
  }

  function updateSkillTimers(dt) {
    if (skillState.holyFire > 0) {
      skillState.holyFire = Math.max(0, skillState.holyFire - dt);
      if (skillState.holyFire <= 0) {
        removeHolyFireEffect();
        setSkillMsg("聖火結束：HP ÷1.6");
        updateUI();
      }
    }
    if (skillState.powerDispel > 0) skillState.powerDispel = Math.max(0, skillState.powerDispel - dt);
    if (skillState.magicGuard > 0) skillState.magicGuard = Math.max(0, skillState.magicGuard - dt);
    if (skillState.puppet) {
      skillState.puppet.t += dt;
      if (skillState.puppet.t >= skillState.puppet.duration) skillState.puppet = null;
    }
    if (skillState.msgTimer > 0) {
      skillState.msgTimer -= dt;
      if (skillState.msgTimer <= 0) skillState.msg = "";
    }
  }

  function useSkill(index) {
    const cls = getCurrentClass();
    if (!cls || player.dead) return;
    const skill = cls.skills[index];
    if (!skill) return;

    let ok = false;
    if (skill.id === "holyFire") ok = castHolyFire(skill);
    else if (skill.id === "powerDispel") ok = castPowerDispel(skill);
    else if (skill.id === "magicGuard") ok = castMagicGuard(skill);
    else if (skill.id === "mesoGuard") ok = castMesoGuard(skill);
    else if (skill.id === "puppet") ok = castPuppet(skill);
    else if (skill.id === "flashFist") ok = castFlashFist(skill);

    if (ok) renderSkillBar();
  }

  function castHolyFire(skill) {
    if (skillState.holyFire > 0) {
      setSkillMsg("聖火仍在生效中");
      return false;
    }
    skillState.holyFire = 90;
    applyHolyFireEffect();
    updateUI();
    setSkillMsg(`聖火：${playerSettings.maxHp} ×1.6 → ${player.maxHp} HP`);
    return true;
  }

  function castPowerDispel(skill) {
    skillState.powerDispel = 15;
    setSkillMsg("力消：15 秒內物理傷害 -35%");
    return true;
  }

  function castMagicGuard(skill) {
    skillState.magicGuard = 45;
    setSkillMsg("魔心：受傷 80% 扣 MP、20% 扣 HP（45 秒）");
    return true;
  }

  function castMesoGuard(skill) {
    if (skillState.mesoShield > 0) {
      setSkillMsg("楓幣護盾已存在");
      return false;
    }
    skillState.mesoShield = 1;
    setSkillMsg("楓幣護盾：抵擋下一次傷害");
    return true;
  }

  function castPuppet(skill) {
    if (skillState.puppet) {
      setSkillMsg("已有稻草人");
      return false;
    }
    skillState.puppet = {
      x: player.x - 8,
      y: player.y,
      w: 24,
      h: 44,
      t: 0,
      duration: 30,
      hp: 1,
    };
    setSkillMsg("稻草人已放置");
    return true;
  }

  function castFlashFist(skill) {
    if (!state.dragons.length) {
      setSkillMsg("目前沒有翼龍可拉");
      return false;
    }
    const anchorX = player.x + player.w / 2;
    const anchorY = player.y + player.h;
    state.dragons.forEach((d, i) => {
      d.vx = 0;
      d.stunned = 0;
      d.pullTimer = 1.2;
      d.pullTargetX = anchorX - d.w / 2 + (i - (state.dragons.length - 1) / 2) * 26;
      d.pullTargetY = anchorY - d.h + 4;
    });
    setSkillMsg("閃索命：翼龍拉向你的位置");
    return true;
  }

  function puppetBlocksAttack(atk) {
    const pup = skillState.puppet;
    if (!pup || pup.hp <= 0) return false;
    if (!inRect(pup.x, pup.y, atk)) return false;
    pup.hp = 0;
    skillState.puppet = null;
    setSkillMsg("稻草人吸收了攻擊");
    dodgeCount++;
    return true;
  }

  function applySkillDamageMods(atk, dmg) {
    let out = dmg;
    if (skillState.powerDispel > 0 && PHYSICAL_ATTACK_TYPES.has(atk.type)) {
      out *= 0.65;
    }
    return out;
  }

  function applyDamageSplit(dmg) {
    if (skillState.magicGuard > 0 && isMage()) {
      const toMp = dmg * 0.8;
      const toHp = dmg * 0.2;
      player.mp -= toMp;
      player.hp -= toHp;
      if (player.mp < 0) {
        player.hp += player.mp;
        player.mp = 0;
      }
    } else {
      player.hp -= dmg;
    }
  }

  function applyDamageAmount(rawDmg, options = {}) {
    if (player.dead || rawDmg <= 0) return;
    applyDamageSplit(rawDmg);
    if (options.invuln !== false) player.invuln = 0.35;
    if (options.countHit !== false) hitCount++;
    if (player.hp <= 0) {
      player.dead = true;
      gameOver(options.label || options.reason || "HP 歸零");
    }
    updateUI();
  }

  function startListening(action, btn) {
    listeningAction = action;
    document.querySelectorAll(".key-btn").forEach((b) => b.classList.remove("listening"));
    btn.classList.add("listening");
    btn.textContent = "按下任意鍵…";
  }

  function stopListening() {
    listeningAction = null;
    buildKeyGrid();
  }

  document.getElementById("resetKeys").addEventListener("click", () => {
    keys = { ...DEFAULT_KEYS };
    saveKeys();
    buildKeyGrid();
  });

  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("pauseBtn").addEventListener("click", togglePause);
  document.getElementById("restartBtn").addEventListener("click", () => {
    ui.overlay.classList.add("hidden");
    resetGame();
    startGame();
  });

  window.addEventListener("keydown", (e) => {
    if (listeningAction) {
      e.preventDefault();
      if (["Shift", "Control", "Alt", "Meta"].includes(e.code)) return;
      keys[listeningAction] = e.code;
      saveKeys();
      stopListening();
      return;
    }
    if (e.code === "Escape" && ui.potionOverlay && !ui.potionOverlay.classList.contains("hidden")) {
      hidePotionOverlay();
      e.preventDefault();
      return;
    }
    if (e.code === "KeyE" && !e.repeat && !listeningAction) {
      toggleEditMode();
      e.preventDefault();
      return;
    }
    if (editMode && handleEditorKey(e)) return;
    if (e.code === keys.manualHp && !e.repeat && !listeningAction) {
      useManualHpPotion();
      e.preventDefault();
      return;
    }
    if (isMage() && e.code === keys.manualMp && !e.repeat && !listeningAction) {
      useManualMpPotion();
      e.preventDefault();
      return;
    }
    if (playerClass && !e.repeat && !listeningAction) {
      const cls = getCurrentClass();
      if (cls) {
        cls.skills.forEach((skill, index) => {
          if (e.code === keys[skill.key]) {
            useSkill(index);
            e.preventDefault();
          }
        });
      }
    }
    pressed.add(e.code);
    const boundKeys = [
      keys.left,
      keys.right,
      keys.up,
      keys.down,
      keys.jump,
      keys.skill1,
      keys.skill2,
      keys.manualHp,
      keys.manualMp,
    ];
    if (boundKeys.includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => pressed.delete(e.code));

  function resetGame() {
    const gy = getGroundY();
    player.x = 430;
    player.y = gy - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.onPlatform = platforms[0];
    player.dropThrough = 0;
    player.dropThroughPlatform = null;
    resetSkillState();
    syncPlayerSettingsToPlayer(true);
    player.elec = 0;
    player.bleed = 0;
    player.slow = 0;
    player.seduced = 0;
    player.facing = 1;
    player.dead = false;
    player.invuln = 0;
    surviveMs = 0;
    dodgeCount = 0;
    hitCount = 0;
    state.stompIndex = 0;
    state.redBiteTimer = 5;
    state.fireTimer = 45;
    state.blackChainTimer = 22;
    state.leftIceTimer = 8;
    state.rightBoltTimer = 6;
    state.handRedTimer = 12;
    state.leftSeduceTimer = 18;
    state.rightSeduceTimer = 22;
    state.leftDispelTimer = 26;
    state.rightDispelTimer = 30;
    state.tailSweepTimer = 14;
    state.tailMistTimer = 20;
    state.wingFlutterTimer = 25;
    state.dragonTimer = 30;
    state.wingBelowHalf = false;
    state.rightHeadBelowHalf = false;
    state.midHeadBelowHalf = false;
    state.rightRageLeft = 0;
    state.attacks = [];
    state.redBite = null;
    state.redBiteTrack = null;
    state.redBiteLive = null;
    state.fireFloors = [];
    state.mists = [];
    state.dragons = [];
    state.particles = [];
    state.bleedTick = 0;
    state.petHealTimer = 0;
    updateUI();
  }

  function startGame() {
    if (!playerClass) {
      showClassOverlay();
      setSkillMsg("請先選擇職業");
      return;
    }
    resetGame();
    running = true;
    paused = false;
    lastTs = performance.now();
    document.getElementById("startBtn").disabled = true;
    document.getElementById("pauseBtn").disabled = false;
    document.getElementById("restartBtn").disabled = false;
    ui.overlay.classList.add("hidden");
    setAttackInfo("本體全機制啟動", "熟悉腳踩循環、紅咬 7 秒、分散站位避免導電");
    requestAnimationFrame(loop);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    document.getElementById("pauseBtn").textContent = paused ? "繼續" : "暫停";
    if (!paused) {
      lastTs = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function gameOver(reason) {
    running = false;
    document.getElementById("startBtn").disabled = false;
    document.getElementById("pauseBtn").disabled = true;
    document.getElementById("pauseBtn").textContent = "暫停";
    document.getElementById("restartBtn").disabled = false;
    ui.overlayTitle.textContent = "練習結束";
    ui.overlayMsg.textContent = reason + "\n\n請按地圖下方的「重新開始」";
    ui.overlay.classList.remove("hidden");
  }

  function setAttackInfo(name, hint) {
    state.currentAttackLabel = name;
    state.currentAttackHint = hint;
    ui.attackName.textContent = name;
    ui.attackHint.textContent = hint;
    const next = STOMP_CYCLE.map((s, i) => (i === state.stompIndex ? `[${s.name}]` : s.name)).join(" → ");
    ui.stompSeq.textContent = "腳踩順序：" + next;
  }

  function updateUI() {
    const pct = Math.max(0, player.hp / player.maxHp) * 100;
    ui.hpBar.style.width = pct + "%";
    ui.hpText.textContent = `${Math.max(0, Math.floor(player.hp))} / ${player.maxHp}`;
    if (isMage() && ui.mpBar && ui.mpText) {
      const mpPct = Math.max(0, player.mp / player.maxMp) * 100;
      ui.mpBar.style.width = mpPct + "%";
      ui.mpText.textContent = `${Math.max(0, Math.floor(player.mp))} / ${player.maxMp}`;
    }
    ui.elec.textContent = getElecLayers();
    ui.bleed.textContent = player.bleed;
    ui.slow.textContent = player.slow;
    ui.elec.parentElement.style.borderColor = getElecLayers() >= 10 ? "#f85149" : "#30363d";
    const sec = Math.floor(surviveMs / 1000);
    ui.survive.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
    ui.dodges.textContent = dodgeCount;
    ui.hits.textContent = hitCount;
  }

  function addElecLayers(amount) {
    const layers = Math.floor(amount);
    if (layers <= 0) return;
    player.elec = Math.min(15, Math.floor(player.elec) + layers);
  }

  function getElecLayers() {
    return Math.floor(player.elec);
  }

  function inRect(px, py, r) {
    return px + player.w > r.x && px < r.x + r.w && py + player.h > r.y && py < r.y + r.h;
  }

  function playerCenter() {
    return { x: player.x + player.w / 2, y: player.y + player.h / 2 };
  }

  function sideOf(x) {
    return x < W / 2 ? "left" : "right";
  }

  function playerLayer() {
    const feet = player.y + player.h;
    if (feet <= 225) return "high";
    if (feet <= 400) return "mid";
    return "ground";
  }

  function onPlatformSurface(p) {
    const margin = 2;
    const cx = player.x + player.w / 2;
    return cx >= p.x + margin && cx <= p.x + p.w - margin;
  }

  function resolvePlatformLanding(prevFeet) {
    player.onGround = false;
    player.onPlatform = null;
    const feet = player.y + player.h;

    if (player.vy < 0) return;

    let best = null;
    for (const p of platforms) {
      if (player.dropThrough > 0 && player.dropThroughPlatform === p.id) continue;
      if (!onPlatformSurface(p)) continue;
      const top = p.y;
      if (prevFeet <= top + 8 && feet >= top - 2) {
        if (!best || top < best.y) best = p;
      }
    }

    if (best) {
      player.y = best.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.onPlatform = best;
    }
  }

  function addAttack(atk) {
    state.attacks.push(atk);
  }

  function spawnWarning(x, y, w, h, duration, color, label) {
    addAttack({
      type: "warning",
      x, y, w, h,
      t: 0,
      duration,
      color,
      label,
      hit: false,
    });
  }

  function resolveStomp(step) {
    const warn = 1.4;
    setAttackInfo(step.name, step.hint);
    if (step.heavy) {
      spawnWarning(step.side === "left" ? 0 : W / 2, 300, W / 2, 170, warn, "rgba(255,200,80,0.35)", step.name);
      setTimeout(() => {
        addAttack({
          type: "stomp",
          side: step.side,
          heavy: true,
          x: step.side === "left" ? 0 : W / 2,
          y: 300,
          w: W / 2,
          h: 170,
          t: 0,
          duration: 0.35,
          damage: 3200,
          elec: 1,
          label: step.name,
        });
      }, warn * 1000);
    } else {
      spawnWarning(step.side === "left" ? 0 : W / 2, 430, W / 2, 110, warn, "rgba(255,120,80,0.35)", step.name);
      setTimeout(() => {
        addAttack({
          type: "stomp",
          side: step.side,
          heavy: false,
          x: step.side === "left" ? 0 : W / 2,
          y: 430,
          w: W / 2,
          h: 110,
          t: 0,
          duration: 0.35,
          damage: 2400,
          elec: 1,
          label: step.name,
        });
      }, warn * 1000);
    }
    state.stompIndex = (state.stompIndex + 1) % STOMP_CYCLE.length;
  }

  function getPlayerFacing() {
    if (player.facing === 1 || player.facing === -1) return player.facing;
    return player.x + player.w / 2 < W / 2 ? 1 : -1;
  }

  function computeRedBiteRect(feetY) {
    const facing = getPlayerFacing();
    const w = player.w + 4;
    const h = player.h - 6;
    const frontShift = 12;
    const cx = player.x + player.w / 2 + facing * frontShift;
    let x = Math.round(cx - w / 2);
    x = Math.max(8, Math.min(W - w - 8, x));
    const y = Math.round(feetY - h + 4);
    return { x, y, w, h };
  }

  function updateRedBiteLive(dt) {
    const live = state.redBiteLive;
    if (!live) return;

    live.t += dt;

    if (live.phase === "warn") {
      if (live.t < live.warn) return;
      live.phase = "bite";
      live.t = 0;
    }

    if (live.phase === "bite") {
      if (!live.hitPlayer) {
        const atk = {
          type: "bite",
          x: live.x,
          y: live.y,
          w: live.w,
          h: live.h,
          damage: 1800,
          bleed: 1,
          label: "紅咬",
        };
        if (inRect(player.x, player.y, atk)) {
          damagePlayer(atk);
          live.hitPlayer = true;
        }
      }
      if (live.t >= live.biteDur) {
        if (!live.hitPlayer) dodgeCount++;
        state.redBiteLive = null;
      }
    }
  }

  function drawRedBiteLive() {
    const live = state.redBiteLive;
    if (!live) return;
    if (live.phase === "warn") {
      drawAttack({
        type: "warning",
        x: live.x,
        y: live.y,
        w: live.w,
        h: live.h,
        color: "rgba(255,60,60,0.4)",
        label: "紅咬",
      });
      return;
    }
    drawAttack({
      type: "bite",
      x: live.x,
      y: live.y,
      w: live.w,
      h: live.h,
      label: "紅咬",
    });
  }

  function triggerRedBite() {
    const warn = 0.85;
    const feetY = player.onGround ? player.y + player.h : getGroundY();
    const box = computeRedBiteRect(feetY);
    setAttackInfo("中頭 · 紅咬", "鎖定出現當下腳下位置 — 走開或跳躍可躲");
    state.redBiteLive = {
      phase: "warn",
      t: 0,
      warn,
      biteDur: 0.25,
      hitPlayer: false,
      ...box,
    };
  }

  function triggerFire() {
    setAttackInfo("中頭 · 噴火", "第一下後留火焰地板 5 秒 — 可踩火消寒氣，踩完立刻離開");
    spawnWarning(280, 430, 400, 50, 1.8, "rgba(255,140,40,0.35)", "噴火");
    setTimeout(() => {
      addAttack({
        type: "fireBlast",
        x: 280,
        y: 430,
        w: 400,
        h: 50,
        t: 0,
        duration: 0.3,
        damage: 2200,
        elec: 1,
        label: "噴火直擊",
      });
      state.fireFloors.push({
        x: 280,
        y: 455,
        w: 400,
        h: 20,
        t: 0,
        duration: 5,
      });
    }, 1800);
  }

  function triggerBlackChain() {
    const chainW = 100;
    const chainX = Math.floor((W - chainW) / 2);
    setAttackInfo("中頭 · 黑色鎖鏈", "中間垂直鎖鏈（寬約 100）— 移到鎖鏈外");
    spawnWarning(chainX, 0, chainW, H, 1.0, "rgba(80,40,120,0.45)", "黑鎖鏈");
    setTimeout(() => {
      addAttack({
        type: "chain",
        x: chainX,
        y: 0,
        w: chainW,
        h: H,
        t: 0,
        duration: 0.4,
        damage: 2800,
        bleed: 4,
        label: "黑色鎖鏈",
      });
    }, 1000);
  }

  function triggerLeftIceCone() {
    setAttackInfo("左頭 · 冰錐", "吐石 1 秒後冰錐 — 跳開，中招 +2 寒氣");
    spawnWarning(80, 400, 120, 80, 0.6, "rgba(120,200,255,0.35)", "冰錐");
    setTimeout(() => {
      addAttack({
        type: "iceCone",
        x: 80,
        y: 400,
        w: 120,
        h: 80,
        t: 0,
        duration: 0.3,
        damage: 800,
        slow: 2,
        label: "冰錐",
      });
    }, 1000);
  }

  function triggerLeftIceFloor() {
    setAttackInfo("左頭 · 冰地板", "角亮後結冰 — 跳起躲避，中招 +4 寒氣");
    spawnWarning(40, 430, 220, 45, 1.2, "rgba(100,180,255,0.35)", "冰地板");
    setTimeout(() => {
      addAttack({
        type: "iceFloor",
        x: 40,
        y: 430,
        w: 220,
        h: 45,
        t: 0,
        duration: 0.35,
        damage: 600,
        slow: 4,
        label: "冰地板",
      });
    }, 1200);
  }

  function triggerRightBolt() {
    if (state.rightRageLeft > 0) {
      setAttackInfo("右頭 · 狂暴大雷", "50% 以下每 10 秒 — 單人去吃 +3 電，勿群站");
      spawnWarning(680, 300, 200, 180, 0.7, "rgba(180,120,255,0.45)", "大雷");
      setTimeout(() => {
        addAttack({
          type: "bigBolt",
          x: 680,
          y: 300,
          w: 200,
          h: 180,
          t: 0,
          duration: 0.35,
          damage: 4000,
          elec: 3,
          label: "狂暴大雷",
        });
      }, 700);
      state.rightRageLeft--;
      return;
    }
    setAttackInfo("右頭 · 落石雷", "落石 1 秒後電擊 — +1 帶電");
    spawnWarning(700, 420, 80, 60, 0.5, "rgba(200,180,255,0.3)", "落石");
    setTimeout(() => {
      addAttack({
        type: "bolt",
        x: 700,
        y: 420,
        w: 80,
        h: 60,
        t: 0,
        duration: 0.25,
        damage: 1500,
        elec: 1,
        label: "落石雷",
      });
    }, 1000);
  }

  function triggerHandRed(side) {
    const name = side === "left" ? "左手 · 紅雷" : "右手 · 紅雷";
    setAttackInfo(name, "固定位置劈下 — +2 電 +2 流血");
    const zones =
      side === "left"
        ? [{ x: 50, y: 320, w: 100, h: 90 }, { x: 160, y: 400, w: 90, h: 80 }]
        : [{ x: 710, y: 320, w: 100, h: 90 }, { x: 620, y: 400, w: 90, h: 80 }];
    zones.forEach((z, i) => {
      spawnWarning(z.x, z.y, z.w, z.h, 0.9, "rgba(255,50,80,0.4)", name);
      setTimeout(() => {
        addAttack({
          type: "redLightning",
          side,
          ...z,
          t: 0,
          duration: 0.3,
          damage: 2000,
          elec: 2,
          bleed: 2,
          label: name,
        });
      }, 900 + i * 200);
    });
  }

  function triggerSeduce(side) {
    const name = side === "left" ? "左手 · 魅惑" : "右手 · 魅惑";
    setAttackInfo(name, "光圈內中招 — 強制往" + (side === "left" ? "左" : "右") + "跳，本體只能用楓葉淨化解");
    const x = side === "left" ? 60 : 720;
    spawnWarning(x, 360, 180, 100, 1.0, "rgba(120,80,255,0.35)", "魅惑");
    setTimeout(() => {
      addAttack({
        type: "seduce",
        side,
        x,
        y: 360,
        w: 180,
        h: 100,
        t: 0,
        duration: 0.2,
        label: name,
      });
    }, 1000);
  }

  function playerSide() {
    return player.x + player.w / 2 < W / 2 ? "left" : "right";
  }

  function triggerDispel(side) {
    const isLeft = side === "left";
    const name = isLeft ? "左手 · 消技" : "右手 · 消技";
    const x = isLeft ? 0 : W / 2;
    setAttackInfo(
      name,
      `以中線分左右 — 消${isLeft ? "左" : "右"}半邊增益（被消後可立即重補技能）`
    );
    spawnWarning(x, 0, W / 2, H, 1.5, "rgba(255,220,80,0.22)", "消技");
    setTimeout(() => {
      addAttack({
        type: "dispel",
        side,
        x,
        y: 0,
        w: W / 2,
        h: H,
        t: 0,
        duration: 0.35,
        label: name,
      });
    }, 1500);
  }

  function applyDispel(atk) {
    if (playerSide() !== atk.side) return false;
    const hadHolyFire = skillState.holyFire > 0;
    clearActiveBuffs();
    if (hadHolyFire) {
      setSkillMsg(`${atk.label}：增益已消除，聖火 HP 已 ÷1.6`);
    } else {
      setSkillMsg(`${atk.label}：增益已消除，可立即重補`);
    }
    renderSkillBar();
    hitCount++;
    updateUI();
    return true;
  }

  function triggerTailSweep() {
    const z = tailZone;
    setAttackInfo("尾巴 · 下甩", "尾巴危險區必死 — 微調模式可調整範圍");
    spawnWarning(z.x, z.y, z.w, z.h, 0.9, "rgba(255,80,40,0.45)", "下甩");
    setTimeout(() => {
      addAttack({
        type: "tail",
        x: z.x,
        y: z.y,
        w: z.w,
        h: z.h,
        t: 0,
        duration: 0.35,
        damage: 20000,
        label: "尾巴下甩",
        lethal: true,
      });
    }, 900);
  }

  function triggerMist() {
    setAttackInfo("尾巴 · 綠霧", "範圍持續傷害 — 離開霧區");
    state.mists.push({ x: 760, y: 420, w: 160, h: 60, t: 0, duration: 6 });
  }

  function triggerWingFlutter() {
    setAttackInfo("翅膀 · 振翅", "50% 以下 — 中上層被推飛，站穩後回位");
    spawnWarning(250, 200, 460, 180, 1.2, "rgba(255,255,200,0.25)", "振翅");
    setTimeout(() => {
      addAttack({
        type: "flutter",
        x: 250,
        y: 200,
        w: 460,
        h: 180,
        t: 0,
        duration: 0.5,
        damage: 1200,
        knock: 180,
        label: "振翅",
      });
    }, 1200);
  }

  function spawnDragons() {
    const colors = ["red", "blue", "black"];
    const altar = ["white", "red", "blue"][Math.floor(Math.random() * 3)];
    const rule = state.wingBelowHalf
      ? `祭壇${altar === "white" ? "白" : altar === "red" ? "紅" : "藍"} → 推相同色龍（50%以下）`
      : ALTAR_RULES[["white", "red", "blue"].indexOf(altar)];
    setAttackInfo("翅膀 · 召喚飛龍", rule + " — 閃開飛龍，練習時記住規則");
    colors.forEach((c, i) => {
      state.dragons.push({
        color: c,
        x: 40 + i * 30,
        y: 440 - i * 20,
        w: 36,
        h: 24,
        vx: 55 + i * 8,
        t: 0,
      });
    });
  }

  function countNearbyElectric() {
    let n = getElecLayers() > 0 ? 1 : 0;
    const c = playerCenter();
    for (const npc of npcs) {
      const dx = c.x - (npc.x + npc.w / 2);
      const dy = c.y - (npc.y + npc.h / 2);
      if (Math.hypot(dx, dy) < 90 && npc.elec > 0) n++;
    }
    return n;
  }

  function applyConduction(baseDmg) {
    const nearby = countNearbyElectric();
    if (nearby < 3) return baseDmg;
    state.conductionFlash = 0.4;
    const extra = (nearby - 2) * 800 + getElecLayers() * 120;
    return baseDmg + extra;
  }

  function damagePlayer(atk) {
    if (player.dead || player.invuln > 0) return;
    if (puppetBlocksAttack(atk)) return;
    if (!inRect(player.x, player.y, atk)) return;

    const layer = playerLayer();
    if (atk.type === "stomp") {
      if (sideOf(player.x + player.w / 2) !== atk.side) return;
      if (atk.heavy && layer === "ground") return;
      if (!atk.heavy && layer !== "ground") return;
    }
    if (atk.type === "flutter" && layer === "ground") return;
    if (atk.type === "bite") {
      if (!player.onGround || player.vy < 0) return;
    }

    if (skillState.mesoShield > 0) {
      skillState.mesoShield = 0;
      setSkillMsg("楓幣護盾抵擋了傷害");
      dodgeCount++;
      return;
    }

    let dmg = atk.damage || 0;
    if (atk.elec) dmg = applyConduction(dmg);
    if (player.bleed > 10) dmg *= 1 + player.bleed * 0.04;
    dmg = applySkillDamageMods(atk, dmg);

    applyDamageSplit(dmg);
    player.invuln = 0.35;
    hitCount++;

    if (atk.elec) addElecLayers(atk.elec);
    if (atk.bleed) player.bleed = Math.min(20, player.bleed + (atk.bleed || 0));
    if (atk.slow) player.slow = Math.min(20, player.slow + (atk.slow || 0));

    if (getElecLayers() >= 11) {
      player.hp = 0;
      gameOver(`帶電 ${getElecLayers()} 層 — Artale 11 層以上即死機制`);
    } else if (atk.lethal || player.hp <= 0) {
      player.dead = true;
      gameOver(atk.label ? `被「${atk.label}」命中` : "HP 歸零");
    }
    updateUI();
  }

  function applySeduce(atk) {
    if (!inRect(player.x, player.y, atk)) return;
    player.seduced = 4;
    player.seduceDir = atk.side === "left" ? -1 : 1;
    hitCount++;
    updateUI();
  }

  function tickBleed(dt) {
    state.bleedTick += dt;
    if (state.bleedTick >= 1) {
      state.bleedTick = 0;
      if (player.bleed > 0) {
        const dot = 80 + player.bleed * 45;
        applyDamageSplit(dot);
        if (player.hp <= 0) {
          player.dead = true;
          gameOver(`流血 ${player.bleed} 層持續傷害`);
        }
        updateUI();
      }
    }
  }

  function updateTimers(dt) {
    state.redBiteTimer -= dt;
    if (state.redBiteTimer <= 0) {
      triggerRedBite();
      state.redBiteTimer = 7;
    }

    state.fireTimer -= dt;
    if (state.fireTimer <= 0) {
      triggerFire();
      state.fireTimer = 60;
    }

    if (surviveMs > 35000) state.midHeadBelowHalf = true;
    if (state.midHeadBelowHalf) {
      state.blackChainTimer -= dt;
      if (state.blackChainTimer <= 0) {
        triggerBlackChain();
        state.blackChainTimer = 30;
      }
    }

    state.leftIceTimer -= dt;
    if (state.leftIceTimer <= 0) {
      Math.random() > 0.5 ? triggerLeftIceCone() : triggerLeftIceFloor();
      state.leftIceTimer = 10;
    }

    state.rightBoltTimer -= dt;
    if (state.rightBoltTimer <= 0) {
      if (surviveMs > 50000 && !state.rightHeadBelowHalf) {
        state.rightHeadBelowHalf = true;
        state.rightRageLeft = 8;
      }
      triggerRightBolt();
      state.rightBoltTimer = state.rightRageLeft > 0 ? 10 : 7;
    }

    state.handRedTimer -= dt;
    if (state.handRedTimer <= 0) {
      triggerHandRed(Math.random() > 0.5 ? "left" : "right");
      state.handRedTimer = 14;
    }

    state.leftSeduceTimer -= dt;
    if (state.leftSeduceTimer <= 0) {
      triggerSeduce("left");
      state.leftSeduceTimer = 20;
    }

    state.rightSeduceTimer -= dt;
    if (state.rightSeduceTimer <= 0) {
      triggerSeduce("right");
      state.rightSeduceTimer = 24;
    }

    state.leftDispelTimer -= dt;
    if (state.leftDispelTimer <= 0) {
      triggerDispel("left");
      state.leftDispelTimer = 28;
    }

    state.rightDispelTimer -= dt;
    if (state.rightDispelTimer <= 0) {
      triggerDispel("right");
      state.rightDispelTimer = 32;
    }

    state.tailSweepTimer -= dt;
    if (state.tailSweepTimer <= 0) {
      triggerTailSweep();
      state.tailSweepTimer = 16;
    }

    state.tailMistTimer -= dt;
    if (state.tailMistTimer <= 0) {
      triggerMist();
      state.tailMistTimer = 22;
    }

    if (surviveMs > 42000) state.wingBelowHalf = true;
    state.wingFlutterTimer -= dt;
    if (state.wingFlutterTimer <= 0) {
      triggerWingFlutter();
      state.wingFlutterTimer = 28;
    }

    state.dragonTimer -= dt;
    if (state.dragonTimer <= 0) {
      spawnDragons();
      state.dragonTimer = 35;
    }

    if (!state._stompAcc) state._stompAcc = 0;
    state._stompAcc += dt;
    if (state._stompAcc >= 5.5) {
      resolveStomp(STOMP_CYCLE[state.stompIndex]);
      state._stompAcc = 0;
    }
  }

  function updatePlayer(dt) {
    if (player.dead) return;

    const slowFactor = 1 - Math.min(0.55, player.slow * 0.04);
    const moveSpeed = 220 * slowFactor;

    if (player.seduced > 0) {
      player.seduced -= dt;
      player.vx = player.seduceDir * 260;
    } else {
      player.vx = 0;
      if (pressed.has(keys.left)) {
        player.vx -= moveSpeed;
        player.facing = -1;
      }
      if (pressed.has(keys.right)) {
        player.vx += moveSpeed;
        player.facing = 1;
      }
    }

    if (pressed.has(keys.jump) && player.onGround) {
      player.vy = -380;
      player.onGround = false;
    }

    player.vy += 980 * dt;
    const prevFeet = player.y + player.h;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (pressed.has(keys.up)) {
      for (const r of ropes) {
        if (Math.abs(player.x + player.w / 2 - r.x) < 22 && player.y + player.h > r.y + 20) {
          player.y -= 200 * dt;
          player.vy = Math.min(player.vy, 0);
          player.onGround = false;
        }
      }
    }

    if (pressed.has(keys.down)) {
      if (player.onGround && player.onPlatform && player.onPlatform.layer !== "ground") {
        player.dropThrough = 0.35;
        player.dropThroughPlatform = player.onPlatform.id;
        player.onGround = false;
        player.y += 6;
      } else if (player.y + player.h < getGroundY() - 4) {
        for (const r of ropes) {
          if (Math.abs(player.x + player.w / 2 - r.x) < 22) {
            player.y += 160 * dt;
            player.vy = Math.max(player.vy, 80);
          }
        }
      }
    }

    if (player.dropThrough > 0) player.dropThrough -= dt;

    resolvePlatformLanding(prevFeet);

    if (!player.onGround && player.vy >= 0 && player.y + player.h > getGroundY()) {
      if (player.dropThrough <= 0 || player.dropThroughPlatform !== "ground") {
        player.y = getGroundY() - player.h;
        player.vy = 0;
        player.onGround = true;
        player.onPlatform = platforms[0];
      }
    }

    player.x = Math.max(20, Math.min(W - player.w - 20, player.x));
    if (player.invuln > 0) player.invuln -= dt;

    for (const ff of state.fireFloors) {
      if (inRect(player.x, player.y, ff)) {
        player.slow = 0;
      }
    }

    for (const m of state.mists) {
      if (inRect(player.x, player.y, m)) {
        applyDamageSplit(350 * dt);
        if (player.hp <= 0) gameOver("綠霧持續傷害");
      }
    }

    for (const d of state.dragons) {
      if (d.stunned > 0) continue;
      if (inRect(player.x, player.y, d)) {
        applyDamageSplit(800 * dt);
        if (player.hp <= 0) gameOver("飛龍接觸傷害");
      }
    }

    tickBleed(dt);
  }

  function updateAttacks(dt) {
    const active = [];
    for (const atk of state.attacks) {
      atk.t += dt;
      if (atk.type === "warning") {
        if (atk.t < atk.duration) active.push(atk);
        continue;
      }
      if (!atk.resolved) {
        if (atk.type === "seduce") {
          if (inRect(player.x, player.y, atk)) {
            applySeduce(atk);
            atk.resolved = true;
            atk.hitPlayer = true;
          }
        } else if (atk.type === "dispel") {
          if (applyDispel(atk)) atk.hitPlayer = true;
          atk.resolved = true;
        } else if (inRect(player.x, player.y, atk)) {
          const hpBefore = player.hp;
          damagePlayer(atk);
          if (player.hp < hpBefore || player.seduced > 0) {
            atk.hitPlayer = true;
          }
          if (atk.type === "flutter") {
            player.vx += (player.x < W / 2 ? -1 : 1) * (atk.knock || 100);
            player.y -= 40;
          }
          atk.resolved = true;
        }
      }
      if (atk.t < atk.duration) {
        active.push(atk);
      } else if (!atk.hitPlayer) {
        dodgeCount++;
      }
    }
    state.attacks = active;

    state.fireFloors = state.fireFloors.filter((f) => {
      f.t += dt;
      return f.t < f.duration;
    });
    state.mists = state.mists.filter((m) => {
      m.t += dt;
      return m.t < m.duration;
    });
    state.dragons.forEach((d) => {
      d.t += dt;
      if (d.pullTimer > 0) {
        d.pullTimer -= dt;
        const tx = d.pullTargetX;
        const ty = d.pullTargetY;
        const dx = tx - d.x;
        const dy = ty - d.y;
        const dist = Math.hypot(dx, dy);
        const speed = 420;
        if (dist > 3) {
          const step = Math.min(dist, speed * dt);
          d.x += (dx / dist) * step;
          d.y += (dy / dist) * step;
        } else {
          d.x = tx;
          d.y = ty;
        }
        if (d.pullTimer <= 0) d.stunned = 2.5;
        return;
      }
      if (d.stunned > 0) {
        d.stunned -= dt;
        return;
      }
      d.x += (d.vx || 0) * dt;
    });
    state.dragons = state.dragons.filter((d) => d.x < W + 50);

    if (state.conductionFlash > 0) state.conductionFlash -= dt;
  }

  function drawBackground() {
    if (bgReady) {
      ctx.drawImage(bgImage, 0, 0, W, H);
    } else {
      ctx.fillStyle = "#120a18";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#8b949e";
      ctx.font = "14px 'Microsoft JhengHei', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("背景載入中…", W / 2, H / 2);
      ctx.textAlign = "left";
    }

    if (!editMode) {
      ctx.fillStyle = "rgba(255,80,40,0.18)";
      ctx.fillRect(tailZone.x, tailZone.y, tailZone.w, tailZone.h);
      ctx.fillStyle = "rgba(255,120,80,0.85)";
      ctx.font = "11px 'Microsoft JhengHei', sans-serif";
      ctx.fillText(tailZone.label, tailZone.x + 8, tailZone.y + 16);
    }

    drawDarkBossSprite();

    if (editMode) drawPlatformMarkers();
  }

  function drawDarkBossSprite() {
    if (!darkBossReady) {
      ctx.fillStyle = "rgba(120,80,160,0.35)";
      ctx.fillRect(darkBoss.x, darkBoss.y, darkBoss.w, darkBoss.h);
      ctx.strokeStyle = "rgba(180,140,220,0.8)";
      ctx.strokeRect(darkBoss.x + 0.5, darkBoss.y + 0.5, darkBoss.w - 1, darkBoss.h - 1);
      ctx.fillStyle = "#ddd";
      ctx.font = "12px 'Microsoft JhengHei', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("dark.png 載入中…", darkBoss.x + darkBoss.w / 2, darkBoss.y + darkBoss.h / 2);
      ctx.textAlign = "left";
      return;
    }
    ctx.drawImage(darkBossImage, darkBoss.x, darkBoss.y, darkBoss.w, darkBoss.h);
  }

  function drawDarkBossMarker() {
    if (!editMode) return;
    const isSelected = selected && selected.type === "darkBoss";
    ctx.strokeStyle = isSelected ? "#c084fc" : "rgba(168, 85, 247, 0.75)";
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(darkBoss.x + 0.5, darkBoss.y + 0.5, darkBoss.w - 1, darkBoss.h - 1);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(darkBoss.x + 4, darkBoss.y - 18, 72, 16);
    ctx.fillStyle = "#e9d5ff";
    ctx.font = "bold 10px 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(darkBoss.label, darkBoss.x + 8, darkBoss.y - 7);

    if (isSelected) {
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.arc(darkBoss.x + darkBoss.w, darkBoss.y + darkBoss.h, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTailZoneMarker() {
    const isSelected = selected && selected.type === "tailZone";
    const fill = isSelected ? "rgba(255, 100, 60, 0.42)" : "rgba(255, 80, 40, 0.28)";
    const stroke = isSelected ? "#ff7043" : "rgba(255, 120, 80, 0.95)";

    ctx.fillStyle = fill;
    ctx.fillRect(tailZone.x, tailZone.y, tailZone.w, tailZone.h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(tailZone.x + 0.5, tailZone.y + 0.5, tailZone.w - 1, tailZone.h - 1);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(tailZone.x + 4, tailZone.y - 18, 88, 16);
    ctx.fillStyle = "#ffb199";
    ctx.font = "bold 10px 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(tailZone.label, tailZone.x + 8, tailZone.y - 7);

    if (isSelected) {
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.arc(tailZone.x + tailZone.w, tailZone.y + tailZone.h / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlatformMarkers() {
    ctx.save();
    ctx.font = "bold 11px 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const p of platforms) {
      const isGround = p.layer === "ground";
      const isSelected = selected && selected.type === "platform" && selected.id === p.id;
      const fill = isSelected
        ? "rgba(255, 210, 80, 0.38)"
        : isGround
          ? "rgba(63, 185, 80, 0.22)"
          : p.layer === "high"
            ? "rgba(88, 166, 255, 0.28)"
            : "rgba(88, 166, 255, 0.24)";
      const stroke = isSelected ? "#ffd54f" : isGround ? "rgba(63, 185, 80, 0.85)" : "rgba(88, 166, 255, 0.9)";

      ctx.fillStyle = fill;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      ctx.strokeStyle = stroke;
      ctx.lineWidth = isGround ? 3 : 2;
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);

      // 站立線（平台頂部）
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 0.5);
      ctx.lineTo(p.x + p.w, p.y + 0.5);
      ctx.lineWidth = 3;
      ctx.strokeStyle = isGround ? "#3fb950" : "#58a6ff";
      ctx.stroke();

      const lx = p.x + p.w / 2;
      const ly = p.y + Math.max(10, p.h / 2);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(lx - 18, ly - 9, 36, 18);
      ctx.fillStyle = "#fff";
      ctx.fillText(p.label, lx, ly);

      if (isSelected && editMode) {
        ctx.fillStyle = "#ffd54f";
        ctx.fillRect(p.x + p.w - 6, p.y + 2, 6, Math.max(p.h - 4, 6));
      }
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    for (const r of ropes) {
      const isSelected = selected && selected.type === "rope" && selected.id === r.id;
      ctx.strokeStyle = isSelected ? "rgba(255, 210, 80, 0.95)" : "rgba(255, 210, 80, 0.75)";
      ctx.lineWidth = isSelected ? 6 : 4;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y + r.h);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(r.x - 14, r.y + 8, 28, 16);
      ctx.fillStyle = "#ffd54f";
      ctx.font = "10px 'Microsoft JhengHei', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("↑繩", r.x, r.y + 18);
    }

    drawTailZoneMarker();
    drawDarkBossMarker();

    ctx.restore();
  }

  function drawAttack(atk) {
    if (atk.type === "warning") {
      ctx.strokeStyle = atk.color.replace("0.35", "0.9").replace("0.4", "0.9").replace("0.45", "0.9").replace("0.25", "0.8").replace("0.2", "0.7").replace("0.3", "0.8");
      ctx.fillStyle = atk.color;
      ctx.lineWidth = 2;
      ctx.fillRect(atk.x, atk.y, atk.w, atk.h);
      ctx.strokeRect(atk.x, atk.y, atk.w, atk.h);
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.fillText(atk.label || "!", atk.x + 6, atk.y + 18);
      return;
    }
    ctx.fillStyle = "rgba(255,80,80,0.55)";
    if (atk.type === "bolt" || atk.type === "bigBolt" || atk.type === "redLightning") ctx.fillStyle = "rgba(200,80,255,0.6)";
    if (atk.type === "iceCone" || atk.type === "iceFloor") ctx.fillStyle = "rgba(100,200,255,0.55)";
    if (atk.type === "chain") ctx.fillStyle = "rgba(60,20,90,0.65)";
    if (atk.type === "tail") ctx.fillStyle = "rgba(255,40,0,0.75)";
    if (atk.type === "dispel") ctx.fillStyle = "rgba(255,220,80,0.38)";
    ctx.fillRect(atk.x, atk.y, atk.w, atk.h);
    if (atk.type === "dispel") {
      ctx.strokeStyle = "rgba(255,200,60,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = "#ffe066";
      ctx.font = "bold 14px 'Microsoft JhengHei', sans-serif";
      ctx.fillText(atk.side === "left" ? "← 消左半" : "消右半 →", atk.x + 12, 28);
    }
  }

  function drawEntities() {
    for (const m of state.mists) {
      ctx.fillStyle = "rgba(80,200,80,0.35)";
      ctx.fillRect(m.x, m.y, m.w, m.h);
    }
    for (const f of state.fireFloors) {
      ctx.fillStyle = "rgba(255,120,40,0.5)";
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = "#ffd";
      ctx.font = "10px sans-serif";
      ctx.fillText("踩火消寒氣", f.x + 8, f.y + 14);
    }
    for (const d of state.dragons) {
      const colors = { red: "#e44", blue: "#48f", black: "#333" };
      ctx.fillStyle = colors[d.color] || "#888";
      if (d.pullTimer > 0) ctx.globalAlpha = 0.85;
      else if (d.stunned > 0) ctx.globalAlpha = 0.55;
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.globalAlpha = 1;
      if (d.pullTimer > 0) {
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const cx = d.x + d.w / 2;
        const cy = d.y + d.h / 2;
        ctx.strokeStyle = "rgba(255,220,100,0.7)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (skillState.puppet) {
      const pup = skillState.puppet;
      ctx.fillStyle = "#c4a35a";
      ctx.fillRect(pup.x, pup.y, pup.w, pup.h);
      ctx.strokeStyle = "#8b6914";
      ctx.strokeRect(pup.x, pup.y, pup.w, pup.h);
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.fillText("稻草", pup.x + 2, pup.y - 4);
    }

    for (const npc of npcs) {
      ctx.fillStyle = "rgba(100,180,255,0.5)";
      ctx.fillRect(npc.x, npc.y, npc.w, npc.h);
      ctx.fillStyle = "#adf";
      ctx.font = "10px sans-serif";
      ctx.fillText("⚡" + npc.elec, npc.x, npc.y - 4);
    }

    for (const atk of state.attacks) {
      drawAttack(atk);
    }

    if (state.conductionFlash > 0) {
      ctx.fillStyle = `rgba(255,255,100,${state.conductionFlash})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff0";
      ctx.font = "16px sans-serif";
      ctx.fillText("導電串燒！三人以上靠近", W / 2 - 100, 40);
    }

    ctx.fillStyle = player.invuln > 0 ? "rgba(255,220,100,0.85)" : "#58a6ff";
    if (player.seduced > 0) ctx.fillStyle = "#c678dd";
    if (skillState.mesoShield > 0) ctx.strokeStyle = "#ffd700";
    else if (skillState.magicGuard > 0) ctx.strokeStyle = "#a78bfa";
    else if (skillState.powerDispel > 0) ctx.strokeStyle = "#f97316";
    else if (skillState.holyFire > 0) ctx.strokeStyle = "#fde047";
    else ctx.strokeStyle = "#fff";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.strokeRect(player.x, player.y, player.w, player.h);

    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.fillText("你", player.x + 6, player.y - 6);

    drawRedBiteLive();
  }

  function drawHud() {
    if (editMode) {
      drawEditorOverlay();
      return;
    }
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    const hudH = isMage() ? (skillState.msg ? 108 : 88) : skillState.msg ? 88 : 68;
    ctx.fillRect(8, 8, 300, hudH);
    ctx.fillStyle = "#ccc";
    ctx.font = "12px 'Microsoft JhengHei', sans-serif";
    ctx.fillText(`帶電 ${getElecLayers()}  流血 ${player.bleed}  寒氣 ${player.slow}`, 16, 28);
    const cls = getCurrentClass();
    const clsName = cls ? cls.name : "未選職";
    if (isMage()) {
      ctx.fillText(`MP ${Math.floor(player.mp)} / ${player.maxMp}`, 16, 48);
      ctx.fillText(`${clsName} · X 魔心 · Z 補血 · V 補 MP · E 微調`, 16, 68);
      ctx.fillText(`寵物每 ${PET_HEAL_INTERVAL}s 補血 · 平台 ${platforms.length} 個`, 16, 86);
      if (skillState.msg) {
        ctx.fillStyle = "#f0c14b";
        ctx.fillText(skillState.msg, 16, 104);
      }
    } else {
      ctx.fillText(`${clsName} · X/C 技能 · Z 手動補血 · 寵物每 ${PET_HEAL_INTERVAL}s`, 16, 48);
      ctx.fillText(`平台 ${platforms.length} 個均可站立`, 16, 66);
      if (skillState.msg) {
        ctx.fillStyle = "#f0c14b";
        ctx.fillText(skillState.msg, 16, 84);
      }
    }
  }

  function canvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  }

  function getPlatformById(id) {
    return platforms.find((p) => p.id === id);
  }

  function getRopeById(id) {
    return ropes.find((r) => r.id === id);
  }

  function setEditorStatus(text) {
    editorUi.status.textContent = text;
  }

  function buildEditorSelect() {
    const sel = editorUi.select;
    sel.innerHTML = "";
    const g1 = document.createElement("optgroup");
    g1.label = "平台";
    platforms.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = `platform:${p.id}`;
      opt.textContent = `${p.label} (${p.id})`;
      g1.appendChild(opt);
    });
    const g2 = document.createElement("optgroup");
    g2.label = "繩索";
    ropes.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = `rope:${r.id}`;
      opt.textContent = `${r.label} (${r.id})`;
      g2.appendChild(opt);
    });
    sel.append(g1, g2);
    const g3 = document.createElement("optgroup");
    g3.label = "機制";
    const tailOpt = document.createElement("option");
    tailOpt.value = "tailZone:tail-danger";
    tailOpt.textContent = `${tailZone.label} (下甩必死區)`;
    g3.appendChild(tailOpt);
    const bossOpt = document.createElement("option");
    bossOpt.value = "darkBoss:dark-boss";
    bossOpt.textContent = `${darkBoss.label} (dark.png)`;
    g3.appendChild(bossOpt);
    sel.appendChild(g3);
  }

  function selectItem(type, id) {
    selected = { type, id };
    const key = `${type}:${id}`;
    if ([...editorUi.select.options].some((o) => o.value === key)) {
      editorUi.select.value = key;
    }
    syncEditorFields();
    if (type === "tailZone") {
      setEditorStatus(`已選：${tailZone.label}`);
      return;
    }
    if (type === "darkBoss") {
      setEditorStatus(`已選：${darkBoss.label}`);
      return;
    }
    const item = type === "platform" ? getPlatformById(id) : getRopeById(id);
    setEditorStatus(`已選：${item ? item.label : id}`);
  }

  function syncEditorFields() {
    if (!selected) {
      editorUi.x.value = "";
      editorUi.y.value = "";
      editorUi.w.value = "";
      editorUi.h.value = "";
      editorUi.w.disabled = true;
      editorUi.h.disabled = true;
      return;
    }
    if (selected.type === "platform") {
      const p = getPlatformById(selected.id);
      if (!p) return;
      editorUi.x.value = Math.round(p.x);
      editorUi.y.value = Math.round(p.y);
      editorUi.w.value = Math.round(p.w);
      editorUi.h.value = Math.round(p.h);
      editorUi.w.disabled = false;
      editorUi.h.disabled = false;
    } else if (selected.type === "tailZone") {
      editorUi.x.value = Math.round(tailZone.x);
      editorUi.y.value = Math.round(tailZone.y);
      editorUi.w.value = Math.round(tailZone.w);
      editorUi.h.value = Math.round(tailZone.h);
      editorUi.w.disabled = false;
      editorUi.h.disabled = false;
    } else if (selected.type === "darkBoss") {
      editorUi.x.value = Math.round(darkBoss.x);
      editorUi.y.value = Math.round(darkBoss.y);
      editorUi.w.value = Math.round(darkBoss.w);
      editorUi.h.value = Math.round(darkBoss.h);
      editorUi.w.disabled = false;
      editorUi.h.disabled = false;
    } else {
      const r = getRopeById(selected.id);
      if (!r) return;
      editorUi.x.value = Math.round(r.x);
      editorUi.y.value = Math.round(r.y);
      editorUi.w.value = "";
      editorUi.h.value = Math.round(r.h);
      editorUi.w.disabled = true;
      editorUi.h.disabled = false;
    }
  }

  function applyEditorFields() {
    if (!selected) return;
    const x = Number(editorUi.x.value);
    const y = Number(editorUi.y.value);
    if (selected.type === "platform") {
      const p = getPlatformById(selected.id);
      if (!p) return;
      if (!Number.isNaN(x)) p.x = Math.max(0, Math.min(W - 8, x));
      if (!Number.isNaN(y)) p.y = Math.max(0, Math.min(H - 4, y));
      const w = Number(editorUi.w.value);
      const h = Number(editorUi.h.value);
      if (!Number.isNaN(w)) p.w = Math.max(8, w);
      if (!Number.isNaN(h)) p.h = Math.max(4, h);
      if (p.id === "ground") {
        p.x = 0;
        p.w = W;
      }
    } else if (selected.type === "tailZone") {
      if (!Number.isNaN(x)) tailZone.x = Math.max(0, Math.min(W - 8, x));
      if (!Number.isNaN(y)) tailZone.y = Math.max(0, Math.min(H - 4, y));
      const w = Number(editorUi.w.value);
      const h = Number(editorUi.h.value);
      if (!Number.isNaN(w)) tailZone.w = Math.max(8, Math.min(W - tailZone.x, w));
      if (!Number.isNaN(h)) tailZone.h = Math.max(4, Math.min(H - tailZone.y, h));
    } else if (selected.type === "darkBoss") {
      if (!Number.isNaN(x)) darkBoss.x = Math.max(0, Math.min(W - 32, x));
      if (!Number.isNaN(y)) darkBoss.y = Math.max(0, Math.min(H - 32, y));
      const w = Number(editorUi.w.value);
      const h = Number(editorUi.h.value);
      if (!Number.isNaN(w)) darkBoss.w = Math.max(32, Math.min(W - darkBoss.x, w));
      if (!Number.isNaN(h)) darkBoss.h = Math.max(32, Math.min(H - darkBoss.y, h));
      darkBossCustomLayout = true;
    } else {
      const r = getRopeById(selected.id);
      if (!r) return;
      if (!Number.isNaN(x)) r.x = Math.max(0, Math.min(W, x));
      if (!Number.isNaN(y)) r.y = Math.max(0, Math.min(H - 20, y));
      const h = Number(editorUi.h.value);
      if (!Number.isNaN(h)) r.h = Math.max(20, h);
    }
  }

  function hitTestPlatform(px, py) {
    const hits = platforms.filter(
      (p) => px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h
    );
    if (!hits.length) return null;
    hits.sort((a, b) => a.w * a.h - b.w * b.h);
    return hits[0];
  }

  function hitTestRope(px, py) {
    for (const r of ropes) {
      if (Math.abs(px - r.x) <= 14 && py >= r.y && py <= r.y + r.h) return r;
    }
    return null;
  }

  function hitTestTailZone(px, py) {
    const z = tailZone;
    if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return z;
    return null;
  }

  function hitTestDarkBoss(px, py) {
    const d = darkBoss;
    if (px >= d.x && px <= d.x + d.w && py >= d.y && py <= d.y + d.h) return d;
    return null;
  }

  function nudgeSelected(dx, dy) {
    if (!selected) return;
    if (selected.type === "darkBoss") {
      darkBoss.x = Math.max(0, Math.min(W - darkBoss.w, darkBoss.x + dx));
      darkBoss.y = Math.max(0, Math.min(H - darkBoss.h, darkBoss.y + dy));
      darkBossCustomLayout = true;
    } else if (selected.type === "tailZone") {
      tailZone.x = Math.max(0, Math.min(W - tailZone.w, tailZone.x + dx));
      tailZone.y = Math.max(0, Math.min(H - tailZone.h, tailZone.y + dy));
    } else if (selected.type === "platform") {
      const p = getPlatformById(selected.id);
      if (!p) return;
      p.x = Math.max(0, Math.min(W - p.w, p.x + dx));
      p.y = Math.max(0, Math.min(H - p.h, p.y + dy));
      if (p.id === "ground") {
        p.x = 0;
        p.w = W;
      }
    } else {
      const r = getRopeById(selected.id);
      if (!r) return;
      r.x = Math.max(0, Math.min(W, r.x + dx));
      r.y = Math.max(0, Math.min(H - 20, r.y + dy));
    }
    syncEditorFields();
  }

  function handleEditorKey(e) {
    if (!selected) return false;
    const step = e.shiftKey ? 5 : 1;
    if (e.code === "ArrowLeft") {
      nudgeSelected(-step, 0);
      e.preventDefault();
      return true;
    }
    if (e.code === "ArrowRight") {
      nudgeSelected(step, 0);
      e.preventDefault();
      return true;
    }
    if (e.code === "ArrowUp") {
      nudgeSelected(0, -step);
      e.preventDefault();
      return true;
    }
    if (e.code === "ArrowDown") {
      nudgeSelected(0, step);
      e.preventDefault();
      return true;
    }
    if (selected.type === "platform" || selected.type === "tailZone" || selected.type === "darkBoss") {
      const box =
        selected.type === "platform"
          ? getPlatformById(selected.id)
          : selected.type === "tailZone"
            ? tailZone
            : darkBoss;
      if (!box) return false;
      if (e.code === "BracketLeft") {
        box.w = Math.max(8, box.w - step);
        syncEditorFields();
        e.preventDefault();
        return true;
      }
      if (e.code === "BracketRight") {
        box.w = Math.min(W - box.x, box.w + step);
        syncEditorFields();
        e.preventDefault();
        return true;
      }
    }
    if (e.code === "Tab" && !e.repeat) {
      e.preventDefault();
      const items = [
        ...platforms.map((p) => ({ type: "platform", id: p.id })),
        ...ropes.map((r) => ({ type: "rope", id: r.id })),
        { type: "darkBoss", id: darkBoss.id },
        { type: "tailZone", id: tailZone.id },
      ];
      let idx = items.findIndex((it) => it.type === selected.type && it.id === selected.id);
      idx = e.shiftKey ? (idx - 1 + items.length) % items.length : (idx + 1) % items.length;
      selectItem(items[idx].type, items[idx].id);
      return true;
    }
    if ((e.code === "Delete" || e.code === "Backspace") && !e.repeat) {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return false;
      deleteSelectedItem();
      e.preventDefault();
      return true;
    }
    return false;
  }

  function setEditorButtonsEnabled(on) {
    editorUi.save.disabled = !on;
    editorUi.setDefault.disabled = !on;
    editorUi.del.disabled = !on;
    editorUi.reset.disabled = !on;
    editorUi.resetBuiltin.disabled = !on;
  }

  function toggleEditMode() {
    editMode = !editMode;
    editorUi.card.classList.toggle("editing", editMode);
    editorUi.stage.classList.toggle("editing", editMode);
    editorUi.toggle.textContent = editMode ? "離開微調模式" : "進入微調模式";
    setEditorButtonsEnabled(editMode);

    if (editMode) {
      if (running) paused = true;
      ui.overlay.classList.add("hidden");
      if (!selected && platforms.length) selectItem("platform", platforms[0].id);
      setEditorStatus("拖曳移動 · Del 刪除 · 方向鍵微調 · [ ] 改寬度 · Tab 切換");
      editAnim = requestAnimationFrame(editLoop);
    } else {
      savePlatforms();
      cancelAnimationFrame(editAnim);
      paintPreview();
      if (running && paused) {
        paused = false;
        lastTs = performance.now();
        requestAnimationFrame(loop);
      }
    }
  }

  function drawEditorOverlay() {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(8, 8, 420, 88);
    ctx.fillStyle = "#ffd54f";
    ctx.font = "bold 13px 'Microsoft JhengHei', sans-serif";
    ctx.fillText("微調模式", 16, 28);
    ctx.fillStyle = "#ccc";
    ctx.font = "12px 'Microsoft JhengHei', sans-serif";
    ctx.fillText("拖曳框線移動 · 拖右側黃/橘點改寬 · Del 刪除選取", 16, 48);
    ctx.fillText("含本體圖 / 尾巴危險區 · [ ] 調寬度 · Tab 下一個 · E 離開並自動儲存", 16, 68);
    ctx.fillText("「設為預設」= 還原預設用的配置 · 地面不可刪", 16, 86);
  }

  function editLoop() {
    if (!editMode) return;
    drawBackground();
    drawHud();
    requestAnimationFrame(editLoop);
  }

  function onCanvasMouseDown(evt) {
    if (!editMode) return;
    const { x, y } = canvasPoint(evt);
    const plat = hitTestPlatform(x, y);
    if (plat) {
      selectItem("platform", plat.id);
      const mode = x >= plat.x + plat.w - 10 ? "resize" : "move";
      dragState = {
        type: "platform",
        id: plat.id,
        mode,
        startX: x,
        startY: y,
        origX: plat.x,
        origY: plat.y,
        origW: plat.w,
      };
      return;
    }
    const rope = hitTestRope(x, y);
    if (rope) {
      selectItem("rope", rope.id);
      dragState = {
        type: "rope",
        id: rope.id,
        mode: "move",
        startX: x,
        startY: y,
        origX: rope.x,
        origY: rope.y,
      };
      return;
    }
    const boss = hitTestDarkBoss(x, y);
    if (boss) {
      selectItem("darkBoss", boss.id);
      const onCorner = x >= boss.x + boss.w - 12 && y >= boss.y + boss.h - 12;
      dragState = {
        type: "darkBoss",
        mode: onCorner ? "resize" : "move",
        startX: x,
        startY: y,
        origX: boss.x,
        origY: boss.y,
        origW: boss.w,
        origH: boss.h,
      };
      return;
    }
    const tail = hitTestTailZone(x, y);
    if (tail) {
      selectItem("tailZone", tail.id);
      const mode = x >= tail.x + tail.w - 10 ? "resize" : "move";
      dragState = {
        type: "tailZone",
        mode,
        startX: x,
        startY: y,
        origX: tail.x,
        origY: tail.y,
        origW: tail.w,
      };
    }
  }

  function onCanvasMouseMove(evt) {
    if (!editMode || !dragState) return;
    const { x, y } = canvasPoint(evt);
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;
    if (dragState.type === "platform") {
      const p = getPlatformById(dragState.id);
      if (!p) return;
      if (dragState.mode === "resize") {
        p.w = Math.max(8, dragState.origW + dx);
        if (p.id === "ground") p.w = W;
      } else {
        p.x = dragState.origX + dx;
        p.y = dragState.origY + dy;
        if (p.id === "ground") {
          p.x = 0;
          p.w = W;
        }
        p.x = Math.max(0, Math.min(W - p.w, p.x));
        p.y = Math.max(0, Math.min(H - p.h, p.y));
      }
    } else if (dragState.type === "tailZone") {
      if (dragState.mode === "resize") {
        tailZone.w = Math.max(8, Math.min(W - tailZone.x, dragState.origW + dx));
      } else {
        tailZone.x = Math.max(0, Math.min(W - tailZone.w, dragState.origX + dx));
        tailZone.y = Math.max(0, Math.min(H - tailZone.h, dragState.origY + dy));
      }
    } else if (dragState.type === "darkBoss") {
      if (dragState.mode === "resize") {
        darkBoss.w = Math.max(32, Math.min(W - darkBoss.x, dragState.origW + dx));
        darkBoss.h = Math.max(32, Math.min(H - darkBoss.y, dragState.origH + dy));
      } else {
        darkBoss.x = Math.max(0, Math.min(W - darkBoss.w, dragState.origX + dx));
        darkBoss.y = Math.max(0, Math.min(H - darkBoss.h, dragState.origY + dy));
      }
      darkBossCustomLayout = true;
    } else {
      const r = getRopeById(dragState.id);
      if (!r) return;
      r.x = Math.max(0, Math.min(W, dragState.origX + dx));
      r.y = Math.max(0, Math.min(H - 20, dragState.origY + dy));
    }
    syncEditorFields();
  }

  function onCanvasMouseUp() {
    if (dragState) {
      dragState = null;
      savePlatforms();
    }
  }

  function paintPreview() {
    drawBackground();
    drawHud();
  }

  function loop(ts) {
    if (!running || paused || editMode) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    surviveMs += dt * 1000;

    updateTimers(dt);
    updateSkillTimers(dt);
    updatePetHeal(dt);
    updatePlayer(dt);
    updateRedBiteLive(dt);
    updateAttacks(dt);
    updateUI();

    drawBackground();
    drawEntities();
    drawHud();

    requestAnimationFrame(loop);
  }

  loadPlatforms();
  syncPlayerSettingsToPlayer(true);
  buildClassGrid();
  buildKeyGrid();
  buildPotionList();
  refreshPotionLabels();
  updateClassUi();
  renderSkillBar();
  showClassOverlay();
  ui.changeClassBtn.addEventListener("click", () => {
    if (running && !paused) togglePause();
    showClassOverlay();
  });
  buildEditorSelect();
  syncEditorFields();
  setEditorButtonsEnabled(false);
  if (hasUserDefaultTemplate()) {
    setEditorStatus("已有自訂預設 · 進入微調模式可編輯");
  }

  ui.applyHpBtn.addEventListener("click", applyMaxHpFromInput);
  ui.maxHpInput.addEventListener("change", applyMaxHpFromInput);
  ui.applyMpBtn.addEventListener("click", applyMaxMpFromInput);
  ui.maxMpInput.addEventListener("change", applyMaxMpFromInput);
  ui.useManualHpBtn.addEventListener("click", useManualHpPotion);
  ui.useManualMpBtn.addEventListener("click", useManualMpPotion);
  if (ui.openPotionBtn) ui.openPotionBtn.addEventListener("click", showPotionOverlay);
  if (ui.closePotionBtn) ui.closePotionBtn.addEventListener("click", hidePotionOverlay);
  if (ui.potionOverlay) {
    ui.potionOverlay.addEventListener("click", (e) => {
      if (e.target === ui.potionOverlay) hidePotionOverlay();
    });
  }
  if (ui.petAutoHeal) {
    ui.petAutoHeal.addEventListener("change", () => {
      playerSettings.petAutoHeal = ui.petAutoHeal.checked;
      savePlayerSettings();
      refreshPotionLabels();
    });
  }

  editorUi.toggle.addEventListener("click", toggleEditMode);
  editorUi.save.addEventListener("click", savePlatforms);
  editorUi.setDefault.addEventListener("click", () => {
    if (confirm("將「目前畫面上所有平台與繩索」設為預設？\n之後按「還原預設」會回到這組配置。")) {
      setCurrentAsDefault();
    }
  });
  editorUi.del.addEventListener("click", deleteSelectedItem);
  editorUi.reset.addEventListener("click", () => {
    const msg = hasUserDefaultTemplate()
      ? "確定還原到你設定的預設配置？（會覆蓋目前調整）"
      : "尚未設自訂預設，將還原到程式內建初始位置。確定？";
    if (confirm(msg)) resetPlatformsToDefault();
  });
  editorUi.resetBuiltin.addEventListener("click", () => {
    if (confirm("確定還原到程式內建初始位置？（不會刪除你設定的預設）")) {
      resetPlatformsToBuiltin();
    }
  });
  editorUi.select.addEventListener("change", () => {
    const [type, id] = editorUi.select.value.split(":");
    selectItem(type, id);
  });
  ["x", "y", "w", "h"].forEach((k) => {
    editorUi[k].addEventListener("change", () => {
      applyEditorFields();
      savePlatforms();
    });
  });
  canvas.addEventListener("mousedown", onCanvasMouseDown);
  window.addEventListener("mousemove", onCanvasMouseMove);
  window.addEventListener("mouseup", onCanvasMouseUp);

  updateUI();
  paintPreview();
})();
