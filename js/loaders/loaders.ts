export interface LoadedDataMeta {
  id: string; // Unique identifier for the item
  name: string; // Name of the item
  module: string; // Module the item belongs to
}

/**
 * Loader base class that enforces caching
 */
export abstract class Loader<RawData, LoadedData = RawData> {
  cache = new Map(); // Single shared cache for all loaders
  scope = "base"; // Default scope
  name = this.constructor.name; // Set the name property to the class name

  async load(id, module = "dnd", ...params): Promise<LoadedData> {
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

  abstract handleData(json: RawData, params): Promise<LoadedData>; // Abstract method to handle data
}
