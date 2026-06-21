import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Bot,
  Sparkles,
  Shield,
  Flame,
  Heart,
  Trophy,
  Package,
  Wrench,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  Bookmark,
  AlertTriangle,
  Clock,
  ChevronRight,
  Zap,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { PageContainer } from '../components/PageContainer';
import { StatBar } from '../components/StatBar';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/useGameStore';
import {
  MEMORY_EVENT_LABELS,
  TENDENCY_LABELS,
  MEMORY_STATUS_LABELS,
} from '../data/defaultConfig';
import { formatDate } from '../utils/helpers';
import type {
  Robot,
  MemoryFragment,
  MemoryEventType,
  MemoryTendencyType,
  MemoryStatus,
} from '../types';

const eventIcons: Record<MemoryEventType, typeof Package> = {
  unbox: Package,
  assembly: Wrench,
  repair: Heart,
  mission_success: CheckCircle,
  mission_failure: XCircle,
};

const tendencyIcons: Record<MemoryTendencyType, typeof Shield> = {
  timid: Shield,
  adventurous: Flame,
  guardian: Heart,
  ambitious: Trophy,
};

const tendencyTextClasses: Record<MemoryTendencyType, string> = {
  timid: 'text-neon-cyan',
  adventurous: 'text-neon-orange',
  guardian: 'text-neon-green',
  ambitious: 'text-neon-purple',
};

const tendencyBgClasses: Record<MemoryTendencyType, string> = {
  timid: 'bg-neon-cyan/20',
  adventurous: 'bg-neon-orange/20',
  guardian: 'bg-neon-green/20',
  ambitious: 'bg-neon-purple/20',
};

const eventTextClasses: Record<MemoryEventType, string> = {
  unbox: 'text-neon-purple',
  assembly: 'text-neon-blue',
  repair: 'text-neon-green',
  mission_success: 'text-neon-orange',
  mission_failure: 'text-neon-red',
};

const eventBgClasses: Record<MemoryEventType, string> = {
  unbox: 'bg-neon-purple/20',
  assembly: 'bg-neon-blue/20',
  repair: 'bg-neon-green/20',
  mission_success: 'bg-neon-orange/20',
  mission_failure: 'bg-neon-red/20',
};

const statusColorClasses: Record<MemoryStatus, string> = {
  pending: 'text-white/50',
  kept: 'text-neon-blue',
  compressed: 'text-neon-purple',
  cleared: 'text-white/20',
};

export function MemoryPage() {
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<MemoryFragment | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MemoryStatus | 'all'>('all');

  const robots = useGameStore((s) => s.robots);
  const config = useGameStore((s) => s.config);
  const updateMemoryStatus = useGameStore((s) => s.updateMemoryStatus);
  const compressMemories = useGameStore((s) => s.compressMemories);
  const clearAllMemories = useGameStore((s) => s.clearAllMemories);
  const getTendencyModifier = useGameStore((s) => s.getTendencyModifier);

  const liveRobot = useMemo(() => {
    if (!selectedRobot) return null;
    return robots.find((r) => r.id === selectedRobot.id) || null;
  }, [selectedRobot, robots]);

  const filteredMemories = useMemo(() => {
    if (!liveRobot) return [];
    const mems = [...(liveRobot.memories || [])].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    if (filterStatus === 'all') return mems;
    return mems.filter((m) => m.status === filterStatus);
  }, [liveRobot, filterStatus]);

  const modifiers = useMemo(() => {
    if (!liveRobot) return null;
    return getTendencyModifier(liveRobot);
  }, [liveRobot, getTendencyModifier]);

  const dominantTendency = useMemo(() => {
    if (!liveRobot) return null;
    const entries = Object.entries(liveRobot.tendency || {}) as [
      MemoryTendencyType,
      number
    ][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    if (sorted[0] && sorted[0][1] >= config.memory.intensityThreshold) {
      return sorted[0][0];
    }
    return null;
  }, [liveRobot, config]);

  const pendingCount = useMemo(() => {
    if (!liveRobot) return 0;
    return liveRobot.memories?.filter((m) => m.status === 'pending').length || 0;
  }, [liveRobot]);

  const handleKeepMemory = (memoryId: string) => {
    if (!liveRobot) return;
    updateMemoryStatus(liveRobot.id, memoryId, 'kept');
  };

  const handleCompressMemory = (memoryId: string) => {
    if (!liveRobot) return;
    updateMemoryStatus(liveRobot.id, memoryId, 'compressed');
  };

  const handleClearMemory = (memoryId: string) => {
    if (!liveRobot) return;
    updateMemoryStatus(liveRobot.id, memoryId, 'cleared');
  };

  const handleCompressAll = () => {
    if (!liveRobot) return;
    compressMemories(liveRobot.id);
  };

  const handleClearAll = () => {
    if (!liveRobot) return;
    clearAllMemories(liveRobot.id);
    setShowClearConfirm(false);
  };

  return (
    <PageContainer
      title="记忆回路"
      subtitle={`机器人总数: ${robots.length} | 待处理记忆碎片: ${robots.reduce(
        (sum, r) =>
          sum + (r.memories?.filter((m) => m.status === 'pending').length || 0),
        0
      )}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <div className="card p-4 sticky top-24">
            <h3 className="font-display font-bold text-neon-blue mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5" />
              机器人列表
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
              {robots.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无机器人</p>
                  <p className="text-xs mt-1">先去组装车间组装一个吧！</p>
                </div>
              ) : (
                robots.map((robot) => {
                  const robotPending =
                    robot.memories?.filter((m) => m.status === 'pending').length || 0;
                  const isSelected = liveRobot?.id === robot.id;
                  return (
                    <motion.div
                      key={robot.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedRobot(robot)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-neon-blue/15 border border-neon-blue/50'
                          : 'bg-background-tertiary hover:bg-background-tertiary/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neon-blue/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-neon-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{robot.name}</p>
                          <p className="text-xs text-white/50">
                            {robot.memories?.length || 0} 记忆
                            {robotPending > 0 && (
                              <span className="ml-2 text-neon-orange">
                                {robotPending} 待处理
                              </span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-9">
          {liveRobot ? (
            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-neon-blue/20 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-neon-blue" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-bold text-white">
                        {liveRobot.name}
                      </h2>
                      <p className="text-white/50 text-sm">
                        记忆回路诊断 · 创建于 {formatDate(liveRobot.createdAt)}
                      </p>
                      {dominantTendency && (
                        <div
                          className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${tendencyBgClasses[dominantTendency]}`}
                        >
                          {(() => {
                            const Icon = tendencyIcons[dominantTendency];
                            return <Icon className={`w-4 h-4 ${tendencyTextClasses[dominantTendency]}`} />;
                          })()}
                          <span className={`text-sm font-bold ${tendencyTextClasses[dominantTendency]}`}>
                            {TENDENCY_LABELS[dominantTendency]}倾向
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCompressAll}
                      className="btn btn-secondary"
                      disabled={pendingCount === 0}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      压缩全部
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="btn btn-danger"
                      disabled={(liveRobot.memories?.length || 0) === 0}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      清除全部
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {(
                    Object.entries(liveRobot.tendency || {}) as [
                      MemoryTendencyType,
                      number
                    ][]
                  ).map(([type, value]) => {
                    const Icon = tendencyIcons[type];
                    const isDominant = dominantTendency === type;
                    return (
                      <div
                        key={type}
                        className={`p-4 rounded-xl border transition-all ${
                          isDominant
                            ? `${tendencyBgClasses[type]} border-white/20`
                            : 'bg-background-tertiary/50 border-border-subtle'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={`w-5 h-5 ${tendencyTextClasses[type]}`} />
                          <span
                            className={`font-bold text-sm ${tendencyTextClasses[type]}`}
                          >
                            {TENDENCY_LABELS[type]}
                          </span>
                          {isDominant && (
                            <Sparkles className="w-4 h-4 text-neon-orange animate-pulse" />
                          )}
                        </div>
                        <StatBar
                          value={Math.round(value)}
                          max={100}
                          color={
                            type === 'timid'
                              ? 'cyan'
                              : type === 'adventurous'
                              ? 'orange'
                              : type === 'guardian'
                              ? 'green'
                              : 'purple'
                          }
                          showLabel={false}
                        />
                        <p className="text-xs text-white/40 mt-1">
                          {config.memory.tendencyEffects[type].description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {modifiers && modifiers.dominantTendency && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-background-tertiary/30 rounded-xl border border-border-subtle">
                    <div className="text-center">
                      <p className="text-xs text-white/50 mb-1">成功率修正</p>
                      <p
                        className={`font-mono font-bold text-lg ${
                          modifiers.successBonus >= 0
                            ? 'text-neon-green'
                            : 'text-neon-red'
                        }`}
                      >
                        {modifiers.successBonus >= 0 ? '+' : ''}
                        {modifiers.successBonus}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-white/50 mb-1">奖励修正</p>
                      <p
                        className={`font-mono font-bold text-lg ${
                          modifiers.rewardBonus >= 0
                            ? 'text-neon-green'
                            : 'text-neon-red'
                        }`}
                      >
                        {modifiers.rewardBonus >= 0 ? '+' : ''}
                        {modifiers.rewardBonus}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-white/50 mb-1">耐久减免</p>
                      <p className="font-mono font-bold text-lg text-neon-green">
                        {modifiers.durabilityReduction}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-white/50 mb-1">偏执风险</p>
                      <p
                        className={`font-mono font-bold text-lg flex items-center justify-center gap-1 ${
                          modifiers.isParanoid ? 'text-neon-red animate-pulse' : 'text-white/50'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {modifiers.isParanoid ? '触发' : '正常'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <h3 className="font-display font-bold text-neon-blue flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    记忆时间线
                    <span className="text-sm text-white/40 font-normal">
                      ({filteredMemories.length} 条)
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {(['all', 'pending', 'kept', 'compressed', 'cleared'] as const).map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={`px-3 py-1 rounded-lg text-xs transition-all ${
                            filterStatus === status
                              ? 'bg-neon-blue text-white'
                              : 'bg-background-tertiary text-white/60 hover:bg-background-tertiary/80'
                          }`}
                        >
                          {status === 'all' ? '全部' : MEMORY_STATUS_LABELS[status]}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {filteredMemories.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">暂无记忆碎片</p>
                    <p className="text-sm mt-1">
                      执行任务、维修机器人会产生新的记忆碎片
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-neon-blue/50 via-neon-blue/20 to-transparent" />
                    <div className="space-y-4">
                      {filteredMemories.map((memory, index) => {
                        const Icon = eventIcons[memory.eventType];
                        const isCleared = memory.status === 'cleared';
                        return (
                          <motion.div
                            key={memory.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`relative pl-16 ${
                              isCleared ? 'opacity-40' : ''
                            }`}
                          >
                            <div
                              className={`absolute left-4 top-4 w-5 h-5 rounded-full ${eventBgClasses[memory.eventType]} border-2 border-background-secondary flex items-center justify-center`}
                            >
                              <Icon
                                className={`w-3 h-3 ${eventTextClasses[memory.eventType]}`}
                              />
                            </div>
                            <div
                              className={`card p-4 ${
                                memory.status === 'pending'
                                  ? 'border-neon-blue/30'
                                  : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h4 className="font-bold text-white">
                                      {memory.title}
                                    </h4>
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full ${eventBgClasses[memory.eventType]} ${eventTextClasses[memory.eventType]}`}
                                    >
                                      {MEMORY_EVENT_LABELS[memory.eventType]}
                                    </span>
                                    <span
                                      className={`text-[10px] ${statusColorClasses[memory.status]}`}
                                    >
                                      · {MEMORY_STATUS_LABELS[memory.status]}
                                    </span>
                                  </div>
                                  <p className="text-sm text-white/60 mb-2">
                                    {memory.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-white/40">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDate(memory.createdAt)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Zap className="w-3 h-3" />
                                      强度 {memory.intensity}
                                    </span>
                                    {memory.metadata?.difficulty && (
                                      <span className="flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        难度 {memory.metadata.difficulty}
                                      </span>
                                    )}
                                    {memory.metadata?.durabilityLoss && (
                                      <span className="text-neon-red">
                                        -{memory.metadata.durabilityLoss} 耐久
                                      </span>
                                    )}
                                    {memory.metadata?.rewards &&
                                      memory.metadata.rewards.credits > 0 && (
                                        <span className="text-neon-orange">
                                          +{memory.metadata.rewards.credits} 信用
                                        </span>
                                      )}
                                  </div>
                                </div>
                                {memory.status === 'pending' && (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => handleKeepMemory(memory.id)}
                                      className="p-2 rounded-lg bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 transition-all"
                                      title="保留记忆"
                                    >
                                      <Bookmark className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleCompressMemory(memory.id)}
                                      className="p-2 rounded-lg bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 transition-all"
                                      title="压缩记忆"
                                    >
                                      <Archive className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleClearMemory(memory.id)}
                                      className="p-2 rounded-lg bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-all"
                                      title="清除记忆"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                                {memory.status === 'kept' && (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => handleCompressMemory(memory.id)}
                                      className="p-2 rounded-lg bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 transition-all"
                                      title="压缩记忆"
                                    >
                                      <Archive className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleClearMemory(memory.id)}
                                      className="p-2 rounded-lg bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-all"
                                      title="清除记忆"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                                {memory.status === 'compressed' && (
                                  <button
                                    onClick={() => handleClearMemory(memory.id)}
                                    className="p-2 rounded-lg bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-all flex-shrink-0"
                                    title="清除记忆"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-16 text-center">
              <Brain className="w-20 h-20 mx-auto mb-6 text-white/15" />
              <h3 className="font-display text-2xl text-white/50 mb-2">
                选择一台机器人
              </h3>
              <p className="text-white/30">
                从左侧列表中选择机器人查看其记忆回路
              </p>
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {(
                  ['timid', 'adventurous', 'guardian', 'ambitious'] as MemoryTendencyType[]
                ).map((type) => {
                  const Icon = tendencyIcons[type];
                  return (
                    <div
                      key={type}
                      className={`p-4 rounded-xl ${tendencyBgClasses[type]}`}
                    >
                      <Icon
                        className={`w-8 h-8 mx-auto mb-2 ${tendencyTextClasses[type]}`}
                      />
                      <p className={`text-sm font-bold ${tendencyTextClasses[type]}`}>
                        {TENDENCY_LABELS[type]}
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        {config.memory.tendencyEffects[type].description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="确认清除全部记忆"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-neon-red/10 rounded-xl border border-neon-red/30">
            <AlertTriangle className="w-8 h-8 text-neon-red flex-shrink-0" />
            <div>
              <p className="font-bold text-neon-red">此操作不可恢复</p>
              <p className="text-sm text-white/60">
                清除所有记忆后，机器人将恢复到稳定状态，但会丢失所有特殊修正加成。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-background-tertiary rounded-lg">
              <p className="text-white/50">稳定性</p>
              <p className="font-mono font-bold text-neon-green">恢复</p>
            </div>
            <div className="p-3 bg-background-tertiary rounded-lg">
              <p className="text-white/50">特殊修正</p>
              <p className="font-mono font-bold text-neon-red">丢失</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="btn btn-ghost"
            >
              取消
            </button>
            <button onClick={handleClearAll} className="btn btn-danger">
              <RotateCcw className="w-4 h-4 mr-2" />
              确认清除
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedMemory}
        onClose={() => setSelectedMemory(null)}
        title="记忆详情"
        size="md"
      >
        {selectedMemory && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl ${eventBgClasses[selectedMemory.eventType]}`}
            >
              <h4 className={`font-bold text-lg ${eventTextClasses[selectedMemory.eventType]}`}>
                {selectedMemory.title}
              </h4>
              <p className="text-sm text-white/70 mt-2">{selectedMemory.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-background-tertiary rounded-lg">
                <p className="text-white/50">事件类型</p>
                <p className="font-bold text-white">
                  {MEMORY_EVENT_LABELS[selectedMemory.eventType]}
                </p>
              </div>
              <div className="p-3 bg-background-tertiary rounded-lg">
                <p className="text-white/50">记忆状态</p>
                <p className={`font-bold ${statusColorClasses[selectedMemory.status]}`}>
                  {MEMORY_STATUS_LABELS[selectedMemory.status]}
                </p>
              </div>
              <div className="p-3 bg-background-tertiary rounded-lg">
                <p className="text-white/50">强度</p>
                <p className="font-mono font-bold text-white">
                  {selectedMemory.intensity}
                </p>
              </div>
              <div className="p-3 bg-background-tertiary rounded-lg">
                <p className="text-white/50">时间</p>
                <p className="font-bold text-white">
                  {formatDate(selectedMemory.createdAt)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
