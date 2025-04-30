import { log, formatText, randomChoice, rollDice } from "./utils.js";
import { ActionLoader } from "./loaders.js";
import { Inventory } from "./Inventory.js";

export class Entity {
  constructor(name, hp) {
    this.name = name;
    this.hp = rollDice(hp); // Roll for HP
    this.maxHp = hp; // Store max HP for reference
    this.weapon = null;
    this.inventory = new Inventory(); // Inventory now stores items with quantities
    this.activeEffects = [];
    this.conditions = new Set();
    this.facts = new Set(); // Facts about the entity
    this.facts.add("unarmed"); // Default fact for unarmed state
  }

  static async initializeBaseActions() {
    if (!Entity.baseActions) {
      Entity.baseActions = [
        await ActionLoader.load("basic/stand", "base"),
        await ActionLoader.load("basic/unarmed", "base"),
      ];
    }
  }
  // Method to apply damage to the entity
  // Takes an amount and type of damage (e.g., "slashing", "fire")
  // Returns the damage dealt
  damage(amount, type) {
    const damage = rollDice(amount);
    this.hp = Math.max(this.hp - damage, 0);
    return damage;
  }

  applyEffect(effect) {
    switch (effect.id) {
      case "damage":
        const damageTaken = this.damage(effect.amount, effect.type);
        return {
          context: { damageTaken },
          messages: [`Damage taken ${damageTaken}`],
        };
      case "condition":
        if (effect.action === "remove") {
          this.conditions.delete(effect.type);
        } else if (effect.action === "add") {
          this.conditions.add(effect.type);
        } else if (effect.action === "removeAll") {
          this.conditions.clear();
        }
        return {
          context: {},
          messages: [`Condition ${effect.action}ed: ${effect.type}`],
        };
      case "status":
        const effects = effect.effects;
        for (const effect of effects) {
          this.activeEffects.push({ ...effect });
        }
        return {
          context: {},
          messages: [
            `Applied status effect: ${effect.effects
              .map((e) => e.type)
              .join(", ")}`,
          ],
        };
      case "inventory":
        if (effect.action === "add") {
          this.inventory.addItem(effect.item, 1);
          return {
            context: {},
            messages: [`Added item to inventory: ${effect.item}`],
          };
        }
        if (effect.action === "remove") {
          this.inventory.removeItem(effect.item);
          return {
            context: {},
            messages: [`Removed item from inventory: ${effect.item}`],
          };
        }
      default:
        console.warn(`Unknown effect ID: ${effect.id}`);
    }
  }

  tickEffects() {
    this.activeEffects = this.activeEffects.filter((effect) => {
      effect.duration--;
      this.applyEffect(effect);
      const message = formatText(randomChoice(effect.display), this);
      log(message);
      if (effect.duration <= 0) {
        return false; // Remove expired effects
      }
      return true;
    });
  }

  getActions() {
    const filterActions = (actions) =>
      actions.filter((action) => {
        if (!action.requires) {
          return true; // No requirements, so include the action
        }
        return this.resolveConditional(action.requires);
      });

    const equipmentActions = this.weapon
      ? filterActions(this.weapon.actions)
      : [];
    const baseActions = filterActions(Entity.baseActions);

    return [...equipmentActions, ...baseActions].sort(
      (a, b) => a.cost - b.cost
    ); // Sort by cost
  }

  getActiveEffects() {
    return this.activeEffects.map((effect) => effect.type).join(", ") || "None";
  }

  getConditions() {
    return Array.from(this.conditions).join(", ") || "None";
  }

  addItemsToInventory(items) {
    items.forEach((item) => {
      this.inventory.addItem(item, 1);
    });
  }

  resolveConditional(conditionals) {
    return conditionals.every((requirement) => {
      const [type, ...values] = requirement.split(":");
      switch (type) {
        case "condition":
          return this.conditions.has(values[0]);
        case "status":
          return this.activeEffects.some((effect) =>
            values.includes(effect.type)
          );
        case "item":
          return this.inventory.hasItem(values[0]);
        case "is":
          return this.facts.has(values[0]);
        default:
          console.warn(`Unknown action requirement type: ${type}`);
          return false;
      }
    });
  }
}
// Static property for baseActions
Entity.baseActions = null;
