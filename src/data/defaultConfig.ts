import type { GameConfig, Mission, PartType, MemoryEventType, MemoryTendencyType } from '../types';

export const DEFAULT_CONFIG: GameConfig = {
  rarities: {
    common: {
      name: '普通',
      probability: 0.5,
      color: '#6B7280',
      bgColor: 'rgba(107, 114, 128, 0.2)',
      glowColor: 'rgba(107, 114, 128, 0.5)',
    },
    uncommon: {
      name: '优秀',
      probability: 0.3,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.2)',
      glowColor: 'rgba(16, 185, 129, 0.5)',
    },
    rare: {
      name: '稀有',
      probability: 0.15,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.2)',
      glowColor: 'rgba(59, 130, 246, 0.5)',
    },
    epic: {
      name: '史诗',
      probability: 0.04,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.2)',
      glowColor: 'rgba(139, 92, 246, 0.5)',
    },
    legendary: {
      name: '传说',
      probability: 0.01,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.2)',
      glowColor: 'rgba(245, 158, 11, 0.5)',
    },
  },
  setBonuses: {
    industrial: {
      name: '工业套装',
      description: '重型工业零件组合，提升负载能力',
      requiredParts: 3,
      effects: {
        weightBonus: 20,
        durabilityBonus: 15,
      },
    },
    stealth: {
      name: '潜行套装',
      description: '轻量化设计，降低能耗',
      requiredParts: 3,
      effects: {
        energyBonus: -15,
        skillBonus: 2,
      },
    },
    combat: {
      name: '战斗套装',
      description: '军事化改装，全方位强化',
      requiredParts: 4,
      effects: {
        weightBonus: 10,
        energyBonus: 10,
        skillBonus: 3,
        durabilityBonus: 10,
      },
    },
    medical: {
      name: '医疗套装',
      description: '救援专用模块，提升耐久度',
      requiredParts: 3,
      effects: {
        durabilityBonus: 30,
        skillBonus: 1,
      },
    },
  },
  overloadRules: {
    threshold: 100,
    durabilityPenalty: 20,
    performancePenalty: 30,
  },
  repairRules: {
    baseSuccessRate: 0.9,
    degradeRate: 0.1,
    maxRepairs: 5,
    materialCostPerPoint: 2,
  },
  missionWeights: {
    transport: {
      weight: 0.4,
      energy: 0.2,
      skillSlots: 0.1,
      durability: 0.3,
    },
    cleaning: {
      weight: 0.1,
      energy: 0.3,
      skillSlots: 0.4,
      durability: 0.2,
    },
    rescue: {
      weight: 0.2,
      energy: 0.2,
      skillSlots: 0.3,
      durability: 0.3,
    },
    combat: {
      weight: 0.3,
      energy: 0.3,
      skillSlots: 0.2,
      durability: 0.2,
    },
  },
  recyclingRates: {
    common: 0.3,
    uncommon: 0.5,
    rare: 0.6,
    epic: 0.7,
    legendary: 0.8,
  },
  memory: {
    tendencyEffects: {
      timid: {
        name: '胆怯',
        description: '经历多次失败后变得谨慎，成功率更高但奖励减少',
        color: 'neon-cyan',
        icon: 'Shield',
        successBonus: 15,
        rewardBonus: -20,
        durabilityPenaltyReduction: 20,
        paranoiaChance: 0.15,
      },
      adventurous: {
        name: '冒险',
        description: '多次成功后变得激进，奖励更丰厚但成功率降低',
        color: 'neon-orange',
        icon: 'Flame',
        successBonus: -10,
        rewardBonus: 30,
        durabilityPenaltyReduction: -10,
        paranoiaChance: 0.2,
      },
      guardian: {
        name: '守护',
        description: '经过多次维修后懂得自我保护，耐久损耗显著降低',
        color: 'neon-green',
        icon: 'Heart',
        successBonus: 5,
        rewardBonus: 0,
        durabilityPenaltyReduction: 40,
        paranoiaChance: 0.05,
      },
      ambitious: {
        name: '贪功',
        description: '积累了大量成功经验后追求极致回报，偏执风险较高',
        color: 'neon-purple',
        icon: 'Trophy',
        successBonus: -5,
        rewardBonus: 50,
        durabilityPenaltyReduction: 5,
        paranoiaChance: 0.3,
      },
    },
    maxMemoriesPerRobot: 50,
    intensityThreshold: 50,
    compressionIntensityMultiplier: 0.5,
  },
};

export const PART_TYPE_NAMES: Record<PartType, string> = {
  head: '头部',
  body: '躯干',
  arm: '手臂',
  leg: '腿部',
  core: '核心',
  tool: '工具',
};

export const PART_TYPE_ICONS: Record<PartType, string> = {
  head: 'Cpu',
  body: 'Shield',
  arm: 'Hand',
  leg: 'Footprints',
  core: 'Zap',
  tool: 'Wrench',
};

export const MISSIONS: Mission[] = [
  {
    id: 'transport-1',
    name: '货物搬运',
    type: 'transport',
    difficulty: 1,
    requirements: { weight: 30 },
    rewards: { credits: 100, materials: 20 },
    description: '将货物从仓库搬运到指定地点，需要强大的负载能力。',
    icon: 'Package',
  },
  {
    id: 'transport-2',
    name: '重型运输',
    type: 'transport',
    difficulty: 3,
    requirements: { weight: 80, durability: 60 },
    rewards: { credits: 300, materials: 60, blindBox: 'uncommon' },
    description: '运输重型机械部件，对负重和耐久度要求极高。',
    icon: 'Truck',
  },
  {
    id: 'cleaning-1',
    name: '区域清洁',
    type: 'cleaning',
    difficulty: 1,
    requirements: { skillSlots: 2 },
    rewards: { credits: 80, materials: 15 },
    description: '清洁指定区域，需要多功能工具支持。',
    icon: 'Sparkles',
  },
  {
    id: 'cleaning-2',
    name: '精密清洁',
    type: 'cleaning',
    difficulty: 2,
    requirements: { skillSlots: 4, energy: 40 },
    rewards: { credits: 180, materials: 35 },
    description: '对精密仪器进行无尘清洁，需要高度精确的操作。',
    icon: 'Droplets',
  },
  {
    id: 'rescue-1',
    name: '人员搜救',
    type: 'rescue',
    difficulty: 2,
    requirements: { skillSlots: 3, durability: 50 },
    rewards: { credits: 200, materials: 40 },
    description: '在废墟中搜救被困人员，需要良好的综合能力。',
    icon: 'Users',
  },
  {
    id: 'rescue-2',
    name: '灾害救援',
    type: 'rescue',
    difficulty: 4,
    requirements: { skillSlots: 5, durability: 80, weight: 50 },
    rewards: { credits: 500, materials: 100, blindBox: 'rare' },
    description: '在极端灾害环境中执行救援任务，要求全能型机器人。',
    icon: 'Heart',
  },
  {
    id: 'combat-1',
    name: '安保巡逻',
    type: 'combat',
    difficulty: 2,
    requirements: { weight: 40, energy: 50 },
    rewards: { credits: 150, materials: 30 },
    description: '在指定区域执行安保巡逻任务，需要一定的战斗力。',
    icon: 'ShieldAlert',
  },
  {
    id: 'combat-2',
    name: '格斗竞技',
    type: 'combat',
    difficulty: 5,
    requirements: { weight: 70, energy: 80, skillSlots: 4, durability: 70 },
    rewards: { credits: 800, materials: 150, blindBox: 'epic' },
    description: '参加机器人格斗大赛，与其他机器人一决高下！',
    icon: 'Swords',
  },
];

export const PART_TEMPLATES = {
  head: [
    { name: '基础扫描头', description: '基础光学扫描模块' },
    { name: '高级传感器', description: '多模式环境感知系统' },
    { name: '战术瞄准镜', description: '高精度目标锁定系统' },
    { name: '指挥模块', description: '团队协作指挥单元' },
    { name: '量子处理器', description: '超高速量子计算核心' },
  ],
  body: [
    { name: '标准躯干', description: '基础结构框架' },
    { name: '装甲外壳', description: '强化防护装甲' },
    { name: '隐形涂层', description: '低可探测性外壳' },
    { name: '能量护盾', description: '动能偏转护盾发生器' },
    { name: '纳米修复躯壳', description: '自修复纳米材料躯壳' },
  ],
  arm: [
    { name: '机械钳臂', description: '基础抓取装置' },
    { name: '液压巨臂', description: '大吨位液压动力臂' },
    { name: '精密操作臂', description: '微米级精密操作器' },
    { name: '多功能工具臂', description: '可快速更换工具接口' },
    { name: '等离子切割臂', description: '高温等离子切割装置' },
  ],
  leg: [
    { name: '标准行走腿', description: '双足行走机构' },
    { name: '履带底盘', description: '全地形履带移动系统' },
    { name: '悬浮推进器', description: '反重力悬浮装置' },
    { name: '跳跃强化腿', description: '高弹力跳跃机构' },
    { name: '量子跃迁腿', description: '短距离空间跃迁装置' },
  ],
  core: [
    { name: '电池核心', description: '标准锂离子电池组' },
    { name: '燃料电池', description: '高效氢燃料电池' },
    { name: '核能电池', description: '微型同位素电池' },
    { name: '聚变核心', description: '小型核聚变反应堆' },
    { name: '反物质核心', description: '反物质湮灭能量核心' },
  ],
  tool: [
    { name: '焊接工具', description: '多功能焊接装置' },
    { name: '医疗模块', description: '紧急医疗救援包' },
    { name: '探测雷达', description: '三维成像雷达系统' },
    { name: '黑客模块', description: '电子入侵和破解工具' },
    { name: '相位转移器', description: '物质相位调整装置' },
  ],
};

export const BLIND_BOX_PRICES: Record<string, number> = {
  common: 50,
  uncommon: 150,
  rare: 400,
  epic: 1200,
  legendary: 4000,
};

export const INITIAL_CREDITS = 500;
export const INITIAL_MATERIALS = 100;

export const MEMORY_EVENT_LABELS: Record<MemoryEventType, string> = {
  unbox: '开箱',
  assembly: '装配',
  repair: '维修',
  mission_success: '任务成功',
  mission_failure: '任务失败',
};

export const MEMORY_EVENT_COLORS: Record<MemoryEventType, string> = {
  unbox: 'neon-purple',
  assembly: 'neon-blue',
  repair: 'neon-green',
  mission_success: 'neon-orange',
  mission_failure: 'neon-red',
};

export const TENDENCY_LABELS: Record<MemoryTendencyType, string> = {
  timid: '胆怯',
  adventurous: '冒险',
  guardian: '守护',
  ambitious: '贪功',
};

export const TENDENCY_COLORS: Record<MemoryTendencyType, string> = {
  timid: 'neon-cyan',
  adventurous: 'neon-orange',
  guardian: 'neon-green',
  ambitious: 'neon-purple',
};

export const MEMORY_STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  kept: '已保留',
  compressed: '已压缩',
  cleared: '已清除',
};
