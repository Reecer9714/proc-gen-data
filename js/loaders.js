// Loader base class that enforces caching
class Loader {
  static cache = new Map(); // Single shared cache for all loaders
  static scope = "base"; // Default scope

  static async load(id, module = "dnd", ...params) {
    const cacheKey = `${this.name}:${module}:${id}:${JSON.stringify(params)}`; // Include class name in the key
    if (this.cache.has(cacheKey)) {
      console.log(`Using cached data: ${cacheKey}`);
      return this.cache.get(cacheKey);
    }
    console.log(`Fetching data: ${cacheKey}`);

    const response = await fetch(`data/${module}/${this.scope}/${id}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load data: ${id}`);
    }
    const json = await response.json();
    json.id = id; // Set metadata in the JSON data
    json.module = module;
    const data = await this.handleData(json, params);
    this.cache.set(cacheKey, data); // Cache the loaded data
    return data;
  }

  static async handleData(json, params) {
    throw new Error("handleData method must be implemented in subclasses");
  }
}

// Loader for equipment data
export class ItemLoader extends Loader {
  static scope = "item";

  static async loadSimpleItems(module = "dnd") {
    const response = await fetch(`data/${module}/simple_items.json`);
    if (!response.ok) {
      throw new Error(`Failed to load simple items`);
    }
    const json = await response.json();
    return Object.keys(json).map((itemId) => {
      // default weight and value to 1 if not set
      const simpleItem = {
        ...{ weight: 1, value: 1 },
        ...json[itemId],
        id: itemId,
        module: module,
        // Change itemId to sentence case

        name: itemId
          .split("/")
          .pop()
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        tags: ["simple"],
      };
      this.cache.set(`${this.name}:${module}:${itemId}:[]`, simpleItem);
    });
  }

  static async handleData(equipment) {
    // Load actions
    const loadedActions = [];
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

// Loader for action data
export class ActionLoader extends Loader {
  static scope = "action";

  static async handleData(action, params) {
    const [inputParams, _] = params;
    // Apply params
    if (action.params) {
      for (const paramKey of Object.keys(inputParams ?? {})) {
        const paramValue = inputParams[paramKey];
        if (paramValue) {
          action.params[paramKey] = paramValue;
        }
      }

      // Stringify the action
      // Find and replace all params that are marked with a starting $
      // Reparse the JSON
      const actionString = JSON.stringify(action);
      const actionStringWithParams = actionString.replace(
        /(\$[a-zA-Z0-9_]+)/g,
        (_, paramKey) => {
          // Remove the $ from the key
          const paramKeyWithoutDollar = paramKey.substring(1);
          const paramValue = action.params[paramKeyWithoutDollar];
          return paramValue ? `${paramValue}` : _; // Keep the original key if no value is found
        }
      );
      const actionStringParsed = JSON.parse(actionStringWithParams);
      action = {
        ...action,
        ...actionStringParsed,
      };
      delete action.params;
    }

    return action;
  }
}

export class EntityLoader extends Loader {
  static scope = "entity";

  static async handleData(entity) {
    // Load actions
    const loadedItems = [];
    for (const itemId of entity.equipment ?? []) {
      let action = await ItemLoader.load(itemId, entity.module);
      loadedItems.push(action);
    }
    entity.equipment = loadedItems;
    entity.inventory = entity.inventory
      ? await Promise.all(
          entity.inventory.map(async (item) => {
            item.item = await ItemLoader.load(item.item, entity.module);
            return item;
          })
        )
      : undefined;

    return entity;
  }
}
