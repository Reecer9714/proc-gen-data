const actionCache = new Map(); // Cache for loaded actions

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
export class EquipmentLoader extends Loader {
  static scope = "item";

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
