import { Loader, LoadedDataMeta } from "./loaders";

export interface ActionData extends LoadedDataMeta {
  params?: Record<string, string>; // Parameters for the action (optional)
}

export class ActionLoader extends Loader<ActionData> {
  scope = "action";

  validateParams(params: any[]): Record<string, string> {
    const [inputParams, _] = params;
    if (inputParams && typeof inputParams !== "object") {
      throw new Error("Params must be an object");
    }

    return inputParams;
  }

  mergeParams(action: ActionData, params: Record<string, string>) {
    return { ...action.params, ...params };
  }

  override async handleData(action: ActionData, params) {
    const inputParams = this.validateParams(params);

    // Apply params
    if (action.params) {
      const mergedParams = this.mergeParams(action, inputParams);

      // Stringify the action
      // Find and replace all params that are marked with a starting $
      // Reparse the JSON
      const actionString = JSON.stringify(action);
      const actionStringWithParams = actionString.replace(
        /(\$[a-zA-Z0-9_]+)/g,
        (_, paramKey) => {
          // Remove the $ from the key
          const paramKeyWithoutDollar = paramKey.substring(1);
          const paramValue = mergedParams[paramKeyWithoutDollar];
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
