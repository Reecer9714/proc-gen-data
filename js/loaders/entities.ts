import type { ItemData } from "./items";
import { ItemLoader } from ".";
import { Loader, type LoadedDataMeta } from "./loaders";

interface RawEntityData extends LoadedDataMeta {
  level: number;
  hd: string;
  loadouts?: {
    equipment: string[];
    inventory: { item: string; quantity: number }[];
  };
  equipment?: string[];
  inventory?: { item: string; quantity: number }[];
  treasure?: { item: string; quantity: number; chance: number }[];
  harvest?: { item: string; quantity: number; chance: number }[];
}

export interface ProcessedEntityData
  extends Omit<RawEntityData, "equipment" | "inventory"> {
  equipment: ItemData[];
  inventory: { item: ItemData; quantity: number }[];
}

export class EntityLoader extends Loader<RawEntityData, ProcessedEntityData> {
  scope = "entity";

  override async handleData(entity: RawEntityData) {
    return {
      ...entity,
      equipment: await Promise.all(
        (entity.equipment ?? []).map(async (itemId) => {
          let item = await ItemLoader.load(itemId, entity.module);
          return item;
        })
      ),
      inventory: await Promise.all(
        (entity.inventory ?? []).map(async (item) => {
          return {
            item: await ItemLoader.load(item.item, entity.module),
            quantity: item.quantity,
          };
        })
      ),
    } as ProcessedEntityData;
  }
}
