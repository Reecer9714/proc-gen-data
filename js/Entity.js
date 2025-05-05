import { log, formatText, randomChoice, rollDice } from "./utils.js";
import { ActionLoader } from "./loaders";
import { Inventory } from "./Inventory.js";

class EquipmentSlot {
  constructor(name) {
    this.name = name;
    this.item = null;
    this.facts = new Set();
  }

  equip(item, facts = []) {
    if (this.item) {
      this.unequip(); // Unequip current item if any
    }
    this.item = item;
    this.facts = new Set(facts);
    return `Equipped ${this.name}: ${item.name}`;
  }

  unequip() {
    if (this.item) {
      const unequippedItem = this.item;
      this.item = null;
      this.facts.clear();
      return `Unequipped ${this.name}: ${unequippedItem.name}`;
    }
    return `No ${this.name} to unequip.`;
  }
}

export class Entity {
  constructor(name, hp) {
    this.name = name;
    this.hp = rollDice(hp); // Roll for HP
    this.maxHp = hp; // Store max HP for reference
    this.equipmentSlots = {
      weapon: new EquipmentSlot("weapon"),
      offHand: new EquipmentSlot("offHand"),
      armor: new EquipmentSlot("armor"),
    };
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
          // if the item is equipped, unequip it
          const slot = Object.values(this.equipmentSlots).find(
            // TODO item.id is not specific enough
            (slot) => slot.item && slot.item.id === effect.item
          );
          if (slot) {
            this.unequipItem(slot.name);
          }
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
        if (!action.conditional) {
          return true; // No requirements, so include the action
        }
        return this.resolveConditional(action.conditional);
      });

    const equipmentActions = this.equipmentSlots.weapon.item
      ? filterActions(this.equipmentSlots.weapon.item.actions)
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

  equipItem(slotName, item, facts = []) {
    if (!this.equipmentSlots[slotName]) {
      throw new Error(`Invalid equipment slot: ${slotName}`);
    }
    const message = this.equipmentSlots[slotName].equip(item, facts);
    facts.forEach((fact) => this.facts.add(fact)); // Add item facts
    return message;
  }

  unequipItem(slotName) {
    if (!this.equipmentSlots[slotName]) {
      throw new Error(`Invalid equipment slot: ${slotName}`);
    }
    const slot = this.equipmentSlots[slotName];
    const message = slot.unequip();
    slot.facts.forEach((fact) => this.facts.delete(fact)); // Remove item facts
    return message;
  }

  isEquipped(itemId) {
    return Object.values(this.equipmentSlots).some(
      (slot) => slot.item && slot.item.id === itemId
    );
  }

  getEquippedItems() {
    return Object.entries(this.equipmentSlots).reduce(
      (acc, [slotName, slot]) => {
        acc[slotName] = slot.item ? slot.item.name : "None";
        return acc;
      },
      {}
    );
  }
}
// Static property for baseActions
Entity.baseActions = null;
