import { ActionLoader } from ".";
import type { ActionData } from "./actions";
import { Loader, type LoadedDataMeta } from "./loaders";

export interface ItemData extends LoadedDataMeta {
  weight?: number; // Weight of the item (optional)
  value?: number; // Value of the item (optional)
  actions?: any[]; // Actions associated with the item (optional)
  tags?: string[]; // Tags associated with the item (optional)
}

export class ItemLoader extends Loader<ItemData> {
  scope = "item";

  async loadSimpleItems(module = "dnd") {
    const response = await fetch(`data/${module}/simple_items.json`);
    if (!response.ok) {
      throw new Error(`Failed to load simple items`);
    }
    const json = await response.json();
    Object.keys(json).forEach((itemId) => {
      // Get the last part of the itemId (after the last /)
      const itemName = itemId.split("/").pop() ?? itemId;
      const simpleItem = {
        // default weight and value to 1 if not set
        ...{ weight: 1, value: 1 },
        ...json[itemId],
        id: itemId,
        module: module,
        // Change itemId to Sentence Case, converting _ to space
        name: itemName
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        tags: ["simple"],
      };
      this.cache.set(`${this.name}:${module}:${itemId}:[]`, simpleItem);
    });
  }

  override async handleData(equipment: ItemData) {
    // Load actions
    const loadedActions: ActionData[] = [];
    for (const equipmentAction of equipment.actions ?? []) {
      let action = await ActionLoader.load(
        equipmentAction.id,
        equipment.module,
        equipmentAction.params
      );
      loadedActions.push(action);
    }
    equipment.actions = loadedActions;
    equipment.tags = equipment.tags ?? []; // Ensure tags are always an array
    return equipment;
  }
}
