import { log, formatText, randomChoice, rollDice } from "./utils.js";
import { ItemLoader, EntityLoader } from "./loaders.js";
import { Entity } from "./Entity.js";
import { updateUI } from "./ui.js";

export class Game {
  constructor() {}

  async initialize() {
    await Entity.initializeBaseActions();
    await ItemLoader.loadSimpleItems();

    const dagger = await ItemLoader.load("weapon/dagger");
    const staff = await ItemLoader.load("weapon/staff");
    const shortbow = await ItemLoader.load("weapon/shortbow");
    const battleaxe = await ItemLoader.load("weapon/battleaxe");
    const arrow = await ItemLoader.load("ammo/arrow");

    this.enemies = ["training_dummy", "goblin", "skeleton", "giant"];

    this.hero = new Entity("Hero", 10);
    this.hero.attributes = { strength: 10 };
    this.hero.weapon = null;

    this.enemy = new Entity("Training Dummy", 20);
    this.lootDrops = [];

    this.hero.addItemsToInventory([
      dagger,
      dagger,
      staff,
      shortbow,
      battleaxe,
      await ItemLoader.load("armor/leather"),
    ]); // Use Entity's method to add items
    this.hero.inventory.addItem(arrow, 30);
    this.hero.inventory.addItem(await ItemLoader.load("currency/gold"), 20);
  }

  /**
   * Generates loot based on the provided loot table.
   * @param {Array<{item: string, quantity: string | number, chance: number}>} table
   * @returns {Array<{item: Item, quantity: number}>}
   */
  generateLoot(table) {
    const loot = table.reduce((acc, { item, quantity, chance }) => {
      if (Math.random() < chance) {
        acc.push({
          item: item,
          quantity: rollDice(quantity),
        });
      }
      return acc;
    }, []);
    return loot;
  }

  // Create a new enemy for the next round
  async resetRound() {
    if (this.lootDrops.length) {
      log("Enemy drops loot:");
      this.lootDrops.forEach(({ item, quantity }) => {
        log(`${quantity}x ${item}`);
      });
    }
    log("A new foe appears!");
    this.lootDrops = []; // Reset loot drops for the next round
    const randomEnemy = await EntityLoader.load(randomChoice(this.enemies));
    this.enemy = new Entity(
      randomEnemy.name,
      `${randomEnemy.level}${randomEnemy.hd}`
    );
    if (randomEnemy.equipment) {
      this.enemy.addItemsToInventory(randomEnemy.equipment);
      this.enemy.weapon = randomChoice(randomEnemy.equipment);
    }
    if (randomEnemy.inventory) {
      randomEnemy.inventory.forEach(({ item, quantity }) => {
        this.enemy.inventory.addItem(item, quantity);
      });
    }
    if (randomEnemy.treasure) {
      this.lootDrops.push(...(await this.generateLoot(randomEnemy.treasure)));
    }
    if (randomEnemy.harvest) {
      this.lootDrops.push(...(await this.generateLoot(randomEnemy.harvest)));
    }
  }

  render() {
    updateUI(this);
  }

  useAction(action, user, target) {
    let context = { user, target };
    let messages = [];
    for (const effect of action.effects ?? []) {
      if (effect.conditional && !user.resolveConditional(effect.conditional)) {
        continue; // Skip this effect if the condition is not met
      }
      const { context: extraContext, messages: extraMessages } =
        target.applyEffect(effect);
      context = { ...context, ...extraContext };
      messages.push(...extraMessages);
    }
    for (const effect of action.userEffects ?? []) {
      const { context: extraContext, messages: extraMessages } =
        user.applyEffect(effect);
      context = { ...context, ...extraContext };
      messages.push(...extraMessages);
    }
    const message = formatText(randomChoice(action.display), context);
    log(message);
    messages.forEach((msg) => log(msg));
    this.render();
  }

  async nextRound() {
    this.hero.tickEffects();
    this.enemy.tickEffects();
    if (this.hero.hp <= 0) {
      log("Hero has fallen!");
    } else if (this.enemy.hp <= 0) {
      log("The enemy has been defeated!");
      // Create a new Target for the next round
      await this.resetRound();
    } else {
      log("A new round has started!");
      // Choose a random actions up to the total cost of 2 for the target
      let totalAp = 2;
      while (totalAp > 0) {
        const availableActions = this.enemy
          .getActions()
          .filter((action) => action.cost <= totalAp);
        if (availableActions.length === 0) {
          break; // No more actions available
        }
        const randomAction = randomChoice(availableActions);
        totalAp -= randomAction.cost;
        this.useAction(randomAction, this.enemy, this.hero);
      }
    }
    this.render();
  }
}
