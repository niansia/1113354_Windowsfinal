export type PowerAction = 'lock' | 'sleep' | 'shutdown' | 'restart';

export interface PowerActionDefinition {
  id: PowerAction;
  label: string;
}

export interface HostSystemActionMessage {
  type: 'FUSION_SYSTEM_ACTION';
  data: {
    action: 'shutdown' | 'restart';
  };
}

export const POWER_ACTIONS: readonly PowerActionDefinition[] = [
  { id: 'lock', label: '鎖定' },
  { id: 'sleep', label: '睡眠' },
  { id: 'shutdown', label: '關機' },
  { id: 'restart', label: '重新啟動' }
];

export const toHostSystemAction = (action: PowerAction): HostSystemActionMessage | null =>
  action === 'shutdown' || action === 'restart'
    ? {
        type: 'FUSION_SYSTEM_ACTION',
        data: { action }
      }
    : null;
