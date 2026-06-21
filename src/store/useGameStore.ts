import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Store,
  Part,
  PartType,
  Rarity,
  Robot,
  MissionRecord,
  RepairRecord,
  AssemblyPlan,
  GameConfig,
  MemoryFragment,
  MemoryStatus,
  MemoryEventType,
} from '../types';
import {
  DEFAULT_CONFIG,
  MISSIONS,
  INITIAL_CREDITS,
  INITIAL_MATERIALS,
  BLIND_BOX_PRICES,
} from '../data/defaultConfig';
import {
  generateId,
  generateRandomPart,
  calculateRobotStats as calcStats,
  calculateAdaptability as calcAdapt,
  clamp,
  createInitialTendency,
  calculateTendencyFromMemories,
  getTendencyModifiers,
  generateMemoryDescription,
} from '../utils/helpers';

const EMPTY_SELECTED_PARTS: Record<PartType, Part | null> = {
  head: null,
  body: null,
  arm: null,
  leg: null,
  core: null,
  tool: null,
};

export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      parts: [],
      robots: [],
      credits: INITIAL_CREDITS,
      materials: INITIAL_MATERIALS,
      missionRecords: [],
      repairRecords: [],
      assemblyPlans: [],
      config: DEFAULT_CONFIG,
      selectedParts: { ...EMPTY_SELECTED_PARTS },

      addPart: (part) => set((state) => ({ parts: [...state.parts, part] })),

      removePart: (partId) =>
        set((state) => ({
          parts: state.parts.filter((p) => p.id !== partId),
        })),

      updatePart: (partId, updates) =>
        set((state) => ({
          parts: state.parts.map((p) =>
            p.id === partId ? { ...p, ...updates } : p
          ),
        })),

      addRobot: (robot) => {
        const state = get();
        const memData = generateMemoryDescription('assembly');
        const assemblyMemory: MemoryFragment = {
          id: generateId(),
          robotId: robot.id,
          eventType: 'assembly',
          title: memData.title,
          description: memData.description,
          intensity: memData.intensity,
          status: 'pending',
          createdAt: Date.now(),
        };
        const robotWithMemory: Robot = {
          ...robot,
          memories: [assemblyMemory],
          tendency: robot.tendency || createInitialTendency(),
        };
        set({ robots: [...state.robots, robotWithMemory] });
      },

      removeRobot: (robotId) =>
        set((state) => ({
          robots: state.robots.filter((r) => r.id !== robotId),
        })),

      updateRobot: (robotId, updates) =>
        set((state) => ({
          robots: state.robots.map((r) =>
            r.id === robotId ? { ...r, ...updates } : r
          ),
        })),

      addCredits: (amount) =>
        set((state) => ({ credits: state.credits + amount })),

      spendCredits: (amount) => {
        const state = get();
        if (state.credits >= amount) {
          set({ credits: state.credits - amount });
          return true;
        }
        return false;
      },

      addMaterials: (amount) =>
        set((state) => ({ materials: state.materials + amount })),

      spendMaterials: (amount) => {
        const state = get();
        if (state.materials >= amount) {
          set({ materials: state.materials - amount });
          return true;
        }
        return false;
      },

      addMissionRecord: (record) =>
        set((state) => ({ missionRecords: [...state.missionRecords, record] })),

      addRepairRecord: (record) =>
        set((state) => ({ repairRecords: [...state.repairRecords, record] })),

      addAssemblyPlan: (plan) =>
        set((state) => ({ assemblyPlans: [...state.assemblyPlans, plan] })),

      removeAssemblyPlan: (planId) =>
        set((state) => ({
          assemblyPlans: state.assemblyPlans.filter((p) => p.id !== planId),
        })),

      updateConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),

      resetConfig: () => set({ config: DEFAULT_CONFIG }),

      setSelectedPart: (slot, part) =>
        set((state) => ({
          selectedParts: {
            ...state.selectedParts,
            [slot]: part,
          },
        })),

      clearSelectedParts: () => set({ selectedParts: { ...EMPTY_SELECTED_PARTS } }),

      recyclePart: (partId) => {
        const state = get();
        const part = state.parts.find((p) => p.id === partId);
        if (!part) return;

        const recycleRate = state.config.recyclingRates[part.rarity];
        const materialsGained = Math.floor(part.maxDurability * recycleRate);

        set((s) => ({
          parts: s.parts.filter((p) => p.id !== partId),
          materials: s.materials + materialsGained,
        }));
      },

      repairRobot: (robotId) => {
        const state = get();
        const robot = state.robots.find((r) => r.id === robotId);
        if (!robot) return { success: false, cost: 0, restored: 0 };

        const { repairRules } = state.config;
        
        if (robot.repairCount >= repairRules.maxRepairs) {
          return { success: false, cost: 0, restored: 0 };
        }

        const durabilityNeeded = robot.maxDurability - robot.durability;
        const cost = durabilityNeeded * repairRules.materialCostPerPoint;

        if (!state.spendMaterials(cost)) {
          return { success: false, cost, restored: 0 };
        }

        const successRate = clamp(
          repairRules.baseSuccessRate - robot.repairCount * repairRules.degradeRate,
          0.1,
          repairRules.baseSuccessRate
        );
        const success = Math.random() < successRate;

        let restored = 0;
        if (success) {
          restored = durabilityNeeded;
          state.updateRobot(robotId, {
            durability: robot.maxDurability,
            repairCount: robot.repairCount + 1,
          });
        } else {
          state.updateRobot(robotId, {
            repairCount: robot.repairCount + 1,
          });
        }

        const record: RepairRecord = {
          id: generateId(),
          robotId: robot.id,
          robotName: robot.name,
          materialCost: cost,
          success,
          durabilityRestored: restored,
          repairedAt: Date.now(),
        };
        state.addRepairRecord(record);

        const memData = generateMemoryDescription('repair', { repairSuccess: success });
        state.addMemory(robotId, {
          eventType: 'repair',
          title: memData.title,
          description: memData.description,
          intensity: memData.intensity,
          status: 'pending',
          metadata: { repairSuccess: success },
        });

        return { success, cost, restored };
      },

      executeMission: (robotId, missionId) => {
        const state = get();
        const robot = state.robots.find((r) => r.id === robotId);
        const mission = MISSIONS.find((m) => m.id === missionId);

        if (!robot || !mission) {
          throw new Error('Robot or mission not found');
        }

        const modifiers = state.getTendencyModifier(robot, mission);
        const adaptability = clamp(
          state.calculateAdaptability(robot, mission) + modifiers.successBonus,
          0,
          100
        );
        const successChance = clamp(adaptability / 100, 0.05, 0.95);
        const success = modifiers.isParanoid ? false : Math.random() < successChance;

        let durabilityLoss = Math.floor(mission.difficulty * 5 * Math.random() + 5);
        if (robot.isOverloaded) {
          durabilityLoss += state.config.overloadRules.durabilityPenalty;
        }
        durabilityLoss = Math.max(
          1,
          Math.round(durabilityLoss * (1 - modifiers.durabilityReduction / 100))
        );

        const newDurability = clamp(robot.durability - durabilityLoss, 0, robot.maxDurability);
        state.updateRobot(robotId, { durability: newDurability });

        let rewards = { credits: 0, materials: 0 };
        if (success) {
          const rewardMultiplier = 1 + modifiers.rewardBonus / 100;
          rewards = {
            credits: Math.round(mission.rewards.credits * rewardMultiplier),
            materials: Math.round(mission.rewards.materials * rewardMultiplier),
          };
          state.addCredits(rewards.credits);
          state.addMaterials(rewards.materials);

          if (mission.rewards.blindBox) {
            const bonusParts = state.openBlindBox(mission.rewards.blindBox, true);
            bonusParts.forEach((p) => state.addPart(p));
          }
        }

        const eventType: MemoryEventType = success ? 'mission_success' : 'mission_failure';
        const memData = generateMemoryDescription(eventType, {
          missionName: mission.name,
          missionType: mission.type,
          difficulty: mission.difficulty,
          durabilityLoss,
          rewards,
        });
        state.addMemory(robotId, {
          eventType,
          title: memData.title,
          description: memData.description,
          intensity: memData.intensity,
          status: 'pending',
          metadata: {
            missionName: mission.name,
            missionType: mission.type,
            difficulty: mission.difficulty,
            durabilityLoss,
            rewards,
          },
        });

        const record: MissionRecord = {
          id: generateId(),
          robotId: robot.id,
          robotName: robot.name,
          missionId: mission.id,
          missionName: mission.name,
          success,
          adaptability,
          rewards,
          durabilityLoss,
          completedAt: Date.now(),
        };
        state.addMissionRecord(record);

        return record;
      },

      calculateRobotStats: (parts) => {
        const state = get();
        return calcStats(parts, state.config);
      },

      calculateAdaptability: (robot, mission) => {
        const state = get();
        return calcAdapt(robot, mission, state.config);
      },

      generateRandomPart: (minRarity) => {
        const state = get();
        return generateRandomPart(state.config, minRarity);
      },

      openBlindBox: (type, free = false) => {
        const state = get();
        const price = BLIND_BOX_PRICES[type];

        if (!free && !state.spendCredits(price)) {
          return [];
        }

        const parts: Part[] = [];
        const count = type === 'legendary' ? 5 : type === 'epic' ? 4 : type === 'rare' ? 3 : 2;

        for (let i = 0; i < count; i++) {
          const part = generateRandomPart(state.config, type);
          parts.push(part);
        }

        return parts;
      },

      loadFromStorage: () => {},

      addMemory: (robotId, memory) => {
        const state = get();
        const robot = state.robots.find((r) => r.id === robotId);
        if (!robot) return;

        const newMemory: MemoryFragment = {
          ...memory,
          id: generateId(),
          robotId,
          createdAt: Date.now(),
        };

        let newMemories = [...(robot.memories || []), newMemory];
        if (newMemories.length > state.config.memory.maxMemoriesPerRobot) {
          const keptOrCompressed = newMemories.filter(
            (m) => m.status === 'kept' || m.status === 'compressed'
          );
          const pending = newMemories.filter((m) => m.status === 'pending');
          const excess =
            newMemories.length - state.config.memory.maxMemoriesPerRobot;
          pending.splice(0, excess);
          newMemories = [...keptOrCompressed, ...pending];
        }

        const newTendency = calculateTendencyFromMemories(newMemories, state.config);

        state.updateRobot(robotId, {
          memories: newMemories,
          tendency: newTendency,
        });
      },

      updateMemoryStatus: (robotId, memoryId, status) => {
        const state = get();
        const robot = state.robots.find((r) => r.id === robotId);
        if (!robot) return;

        const newMemories = robot.memories.map((m) =>
          m.id === memoryId ? { ...m, status } : m
        );
        const newTendency = calculateTendencyFromMemories(newMemories, state.config);

        state.updateRobot(robotId, {
          memories: newMemories,
          tendency: newTendency,
        });
      },

      compressMemories: (robotId) => {
        const state = get();
        const robot = state.robots.find((r) => r.id === robotId);
        if (!robot) return;

        const newMemories = robot.memories.map((m) => {
          if (m.status === 'pending' || m.status === 'kept') {
            return {
              ...m,
              status: 'compressed' as MemoryStatus,
              intensity: Math.round(m.intensity * state.config.memory.compressionIntensityMultiplier),
            };
          }
          return m;
        });
        const newTendency = calculateTendencyFromMemories(newMemories, state.config);

        state.updateRobot(robotId, {
          memories: newMemories,
          tendency: newTendency,
        });
      },

      clearAllMemories: (robotId) => {
        const state = get();
        const robot = state.robots.find((r) => r.id === robotId);
        if (!robot) return;

        const newMemories = robot.memories.map((m) => ({
          ...m,
          status: 'cleared' as MemoryStatus,
        }));

        state.updateRobot(robotId, {
          memories: newMemories,
          tendency: createInitialTendency(),
        });
      },

      recalculateTendency: (robotId) => {
        const state = get();
        const robot = state.robots.find((r) => r.id === robotId);
        if (!robot) return createInitialTendency();

        const newTendency = calculateTendencyFromMemories(
          robot.memories || [],
          state.config
        );
        state.updateRobot(robotId, { tendency: newTendency });
        return newTendency;
      },

      getTendencyModifier: (robot, _mission) => {
        const state = get();
        return getTendencyModifiers(robot, state.config);
      },

      resetGame: () =>
        set({
          parts: [],
          robots: [],
          credits: INITIAL_CREDITS,
          materials: INITIAL_MATERIALS,
          missionRecords: [],
          repairRecords: [],
          assemblyPlans: [],
          selectedParts: { ...EMPTY_SELECTED_PARTS },
        }),
    }),
    {
      name: 'robot-workshop-storage',
      partialize: (state) => ({
        parts: state.parts,
        robots: state.robots,
        credits: state.credits,
        materials: state.materials,
        missionRecords: state.missionRecords,
        repairRecords: state.repairRecords,
        assemblyPlans: state.assemblyPlans,
        config: state.config,
      }),
    }
  )
);
