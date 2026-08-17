import type { EquipType } from '../types';

export type ControllerId = 'a35' | 'hide';

export interface ControllerMeta {
  id: ControllerId;
  label: string;
  equipType: EquipType;
  model: string;
  equipIdPrefix: string;
}

export const CONTROLLERS: ControllerMeta[] = [
  { id: 'a35', label: 'Colorlight A35', equipType: 'a35', model: 'Colorlight A35', equipIdPrefix: 'EQ-A35' },
  { id: 'hide', label: 'Hide', equipType: 'hide', model: 'Hide', equipIdPrefix: 'EQ-HIDE' },
];

export function controllerMeta(id: string): ControllerMeta {
  return CONTROLLERS.find((c) => c.id === id) ?? CONTROLLERS[0];
}

export function isControllerEquipType(type: EquipType): boolean {
  return type === 'a35' || type === 'hide';
}
