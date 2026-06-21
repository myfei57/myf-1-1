import { v4 as uuidv4 } from 'uuid';
import type {
  Part,
  PartType,
  Rarity,
  Robot,
  Mission,
  GameConfig,
  MemoryFragment,
  MemoryTendencyType,
  RobotTendency,
  MemoryEventType,
} from '../types';
import { PART_TEMPLATES } from '../data/defaultConfig';

const PART_TYPES: PartType[] = ['head', 'body', 'arm', 'leg', 'core', 'tool'];
const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const SET_BONUS_OPTIONS = [null, 'industrial', 'stealth', 'combat', 'medical'];

export function generateId(): string {
  return uuidv4();
}

export function getRandomRarity(config: GameConfig, minRarity?: Rarity): Rarity {
  const rarities = Object.entries(config.rarities) as [Rarity, typeof config.rarities[Rarity]][];
  
  let filteredRarities = rarities;
  if (minRarity) {
    const minIndex = RARITY_ORDER.indexOf(minRarity);
    filteredRarities = rarities.filter(([r]) => RARITY_ORDER.indexOf(r) >= minIndex);
  }

  const totalProb = filteredRarities.reduce((sum, [, cfg]) => sum + cfg.probability, 0);
  let random = Math.random() * totalProb;

  for (const [rarity, cfg] of filteredRarities) {
    random -= cfg.probability;
    if (random <= 0) return rarity;
  }

  return filteredRarities[filteredRarities.length - 1][0];
}

export function getRarityMultiplier(rarity: Rarity): number {
  const multipliers: Record<Rarity, number> = {
    common: 1,
    uncommon: 1.5,
    rare: 2,
    epic: 3,
    legendary: 5,
  };
  return multipliers[rarity];
}

export function generateRandomPart(config: GameConfig, minRarity?: Rarity): Part {
  const type = PART_TYPES[Math.floor(Math.random() * PART_TYPES.length)];
  const rarity = getRandomRarity(config, minRarity);
  const multiplier = getRarityMultiplier(rarity);
  
  const templates = PART_TEMPLATES[type];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  const setBonus = rarity !== 'common' && Math.random() < 0.3
    ? SET_BONUS_OPTIONS[Math.floor(Math.random() * SET_BONUS_OPTIONS.length)]
    : null;

  const baseWeight = Math.floor(Math.random() * 15) + 5;
  const baseEnergy = Math.floor(Math.random() * 15) + 5;
  const baseSkill = Math.floor(Math.random() * 3);
  const baseDurability = Math.floor(Math.random() * 30) + 40;

  const compatibility: PartType[] = PART_TYPES.filter(
    () => Math.random() < 0.7
  );

  return {
    id: generateId(),
    name: template.name,
    type,
    rarity,
    weight: Math.floor(baseWeight * multiplier),
    energy: Math.floor(baseEnergy * multiplier),
    skillSlots: Math.floor(baseSkill * multiplier) + (rarity === 'legendary' ? 2 : 0),
    compatibility,
    setBonus,
    durability: Math.floor(baseDurability * multiplier),
    maxDurability: Math.floor(baseDurability * multiplier),
    description: template.description,
    icon: type,
  };
}

export function calculateRobotStats(
  parts: Record<PartType, Part | null>,
  config: GameConfig
): {
  totalWeight: number;
  totalEnergy: number;
  totalSkillSlots: number;
  maxDurability: number;
  isOverloaded: boolean;
  compatibilityIssues: string[];
  activeSetBonuses: string[];
} {
  const installedParts = Object.values(parts).filter(Boolean) as Part[];
  
  let totalWeight = 0;
  let totalEnergy = 0;
  let totalSkillSlots = 0;
  let maxDurability = 100;
  const compatibilityIssues: string[] = [];

  const setBonusCounts: Record<string, number> = {};

  for (const part of installedParts) {
    totalWeight += part.weight;
    totalEnergy += part.energy;
    totalSkillSlots += part.skillSlots;
    
    if (part.durability < maxDurability) {
      maxDurability = part.durability;
    }

    if (part.setBonus) {
      setBonusCounts[part.setBonus] = (setBonusCounts[part.setBonus] || 0) + 1;
    }
  }

  for (const part of installedParts) {
    for (const otherPart of installedParts) {
      if (part.id !== otherPart.id && !part.compatibility.includes(otherPart.type)) {
        const issue = `${part.name} 与 ${otherPart.name} 不兼容`;
        if (!compatibilityIssues.includes(issue)) {
          compatibilityIssues.push(issue);
        }
      }
    }
  }

  const activeSetBonuses: string[] = [];
  for (const [setId, count] of Object.entries(setBonusCounts)) {
    const setConfig = config.setBonuses[setId];
    if (setConfig && count >= setConfig.requiredParts) {
      activeSetBonuses.push(setId);
      
      if (setConfig.effects.weightBonus) {
        totalWeight = Math.floor(totalWeight * (1 + setConfig.effects.weightBonus / 100));
      }
      if (setConfig.effects.energyBonus) {
        totalEnergy = Math.max(1, Math.floor(totalEnergy * (1 + setConfig.effects.energyBonus / 100)));
      }
      if (setConfig.effects.skillBonus) {
        totalSkillSlots += setConfig.effects.skillBonus;
      }
      if (setConfig.effects.durabilityBonus) {
        maxDurability = Math.floor(maxDurability * (1 + setConfig.effects.durabilityBonus / 100));
      }
    }
  }

  const isOverloaded = totalEnergy > config.overloadRules.threshold;

  return {
    totalWeight,
    totalEnergy,
    totalSkillSlots,
    maxDurability,
    isOverloaded,
    compatibilityIssues,
    activeSetBonuses,
  };
}

export function calculateAdaptability(
  robot: Robot,
  mission: Mission,
  config: GameConfig
): number {
  const weights = config.missionWeights[mission.type];
  let score = 0;
  let maxScore = 0;

  const { requirements } = mission;
  const penalty = robot.isOverloaded ? config.overloadRules.performancePenalty / 100 : 0;

  if (requirements.weight !== undefined) {
    const weightScore = Math.min(1, robot.totalWeight / requirements.weight);
    score += weightScore * weights.weight;
    maxScore += weights.weight;
  }

  if (requirements.energy !== undefined) {
    const energyScore = Math.min(1, robot.totalEnergy / requirements.energy);
    score += energyScore * weights.energy;
    maxScore += weights.energy;
  }

  if (requirements.skillSlots !== undefined) {
    const skillScore = Math.min(1, robot.totalSkillSlots / requirements.skillSlots);
    score += skillScore * weights.skillSlots;
    maxScore += weights.skillSlots;
  }

  if (requirements.partTypes) {
    for (const partType of requirements.partTypes) {
      if (robot.parts[partType]) {
        score += 0.1;
      }
      maxScore += 0.1;
    }
  }

  const durabilityScore = robot.durability / robot.maxDurability;
  score += durabilityScore * weights.durability;
  maxScore += weights.durability;

  const baseScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const finalScore = Math.max(0, baseScore * (1 - penalty));

  return Math.round(finalScore);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRarityColorClass(rarity: Rarity): string {
  const classes: Record<Rarity, string> = {
    common: 'text-rarity-common',
    uncommon: 'text-rarity-uncommon',
    rare: 'text-rarity-rare',
    epic: 'text-rarity-epic',
    legendary: 'text-rarity-legendary',
  };
  return classes[rarity];
}

export function getRarityBorderClass(rarity: Rarity): string {
  const classes: Record<Rarity, string> = {
    common: 'rarity-border-common',
    uncommon: 'rarity-border-uncommon',
    rare: 'rarity-border-rare',
    epic: 'rarity-border-epic',
    legendary: 'rarity-border-legendary',
  };
  return classes[rarity];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createInitialTendency(): RobotTendency {
  return {
    timid: 0,
    adventurous: 0,
    guardian: 0,
    ambitious: 0,
  };
}

const EVENT_TO_TENDENCY_WEIGHTS: Record<MemoryEventType, Partial<Record<MemoryTendencyType, number>>> = {
  unbox: { adventurous: 5, ambitious: 3 },
  assembly: { adventurous: 3, guardian: 5 },
  repair: { guardian: 10, timid: 5 },
  mission_success: { adventurous: 8, ambitious: 12 },
  mission_failure: { timid: 15, guardian: 5 },
};

export function calculateTendencyFromMemories(
  memories: MemoryFragment[],
  config: GameConfig
): RobotTendency {
  const keptMemories = memories.filter((m) => m.status === 'kept');
  const compressedMemories = memories.filter((m) => m.status === 'compressed');
  const multiplier = config.memory.compressionIntensityMultiplier;

  const tendency: RobotTendency = createInitialTendency();

  for (const memory of keptMemories) {
    const weights = EVENT_TO_TENDENCY_WEIGHTS[memory.eventType];
    for (const [tendencyType, weight] of Object.entries(weights)) {
      tendency[tendencyType as MemoryTendencyType] +=
        (weight as number) * (memory.intensity / 100);
    }
  }

  for (const memory of compressedMemories) {
    const weights = EVENT_TO_TENDENCY_WEIGHTS[memory.eventType];
    for (const [tendencyType, weight] of Object.entries(weights)) {
      tendency[tendencyType as MemoryTendencyType] +=
        (weight as number) * (memory.intensity / 100) * multiplier;
    }
  }

  return tendency;
}

export function getDominantTendency(
  tendency: RobotTendency,
  threshold: number = 30
): MemoryTendencyType | null {
  const entries = Object.entries(tendency) as [MemoryTendencyType, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] >= threshold) {
    return sorted[0][0];
  }
  return null;
}

export function getTendencyModifiers(
  robot: Robot,
  config: GameConfig
): {
  successBonus: number;
  rewardBonus: number;
  durabilityReduction: number;
  isParanoid: boolean;
  dominantTendency: MemoryTendencyType | null;
} {
  const dominant = getDominantTendency(robot.tendency, config.memory.intensityThreshold);

  if (!dominant) {
    return {
      successBonus: 0,
      rewardBonus: 0,
      durabilityReduction: 0,
      isParanoid: false,
      dominantTendency: null,
    };
  }

  const effect = config.memory.tendencyEffects[dominant];
  const intensity = Math.min(1, robot.tendency[dominant] / 100);
  const isParanoid = Math.random() < effect.paranoiaChance * intensity;

  return {
    successBonus: Math.round(effect.successBonus * intensity),
    rewardBonus: Math.round(effect.rewardBonus * intensity),
    durabilityReduction: Math.round(effect.durabilityPenaltyReduction * intensity),
    isParanoid,
    dominantTendency: dominant,
  };
}

export function generateMemoryDescription(
  eventType: MemoryEventType,
  metadata?: MemoryFragment['metadata']
): { title: string; description: string; intensity: number } {
  switch (eventType) {
    case 'unbox':
      return {
        title: '初次启动',
        description: metadata?.partName
          ? `安装了新零件：${metadata.partName}，系统完成初始化校准。`
          : '传感器第一次捕捉到世界的光影，这是存在的开始。',
        intensity: 40,
      };
    case 'assembly':
      return {
        title: '躯体成形',
        description: '各部位零件紧密结合，核心模块开始第一次脉动。躯体的每一寸都诉说着工程师的心血。',
        intensity: 60,
      };
    case 'repair':
      if (metadata?.repairSuccess) {
        return {
          title: '伤痕愈合',
          description: '机械师的手拂过受损的线路，能量重新流转。每次修复都让自我保护意识更强烈。',
          intensity: 50,
        };
      }
      return {
        title: '修复失败',
        description: '尝试修复的努力付诸东流，磨损的部件提醒着：这个世界并不温柔。',
        intensity: 80,
      };
    case 'mission_success':
      return {
        title: `任务完成：${metadata?.missionName || '未知任务'}`,
        description: metadata?.difficulty && metadata.difficulty >= 4
          ? '在极端条件下圆满完成任务！胜利的滋味让人渴望更多挑战。'
          : '任务目标已达成。每一次成功都是能力的证明。',
        intensity: metadata?.difficulty ? 30 + metadata.difficulty * 15 : 50,
      };
    case 'mission_failure':
      return {
        title: `任务失败：${metadata?.missionName || '未知任务'}`,
        description: metadata?.durabilityLoss && metadata.durabilityLoss >= 30
          ? '惨痛的失败！严重的损伤刻入记忆深处，下次面对类似场景或许应该更加谨慎...'
          : '任务未能完成。失败的教训值得铭记。',
        intensity: metadata?.durabilityLoss ? 40 + metadata.durabilityLoss : 70,
      };
    default:
      return {
        title: '记忆碎片',
        description: '一段模糊的数据残片，意义不明。',
        intensity: 20,
      };
  }
}
