import { log, formatText, randomChoice, rollDice } from "./utils.js";
import { ItemLoader, EntityLoader } from "./loaders";
import { Entity } from "./Entity.js";
import { updateUI } from "./ui.js";

export class GameLoader {
  static async load() {
    await Entity.initializeBaseActions();
    await ItemLoader.loadSimpleItems();

    const dagger = await ItemLoader.load("weapon/dagger");
    const staff = await ItemLoader.load("weapon/staff");
    const shortbow = await ItemLoader.load("weapon/shortbow");
    const battleaxe = await ItemLoader.load("weapon/battleaxe");
    const arrow = await ItemLoader.load("ammo/arrow");

    const hero = new Entity("Hero", 10);

    const enemy = new Entity("Training Dummy", 20);

    hero.addItemsToInventory([
      dagger,
      dagger,
      staff,
      shortbow,
      battleaxe,
      await ItemLoader.load("armor/leather"),
    ]); // Use Entity's method to add items
    hero.inventory.addItem(arrow, 30);
    hero.inventory.addItem(await ItemLoader.load("currency/gold"), 20);

    return new Game(hero, enemy);
  }
}

export class Game {
  enemies = ["training_dummy", "goblin", "skeleton", "giant"];
  lootDrops = [];

  constructor(hero, enemy) {
    this.hero = hero;
    this.enemy = enemy;
  }

  /**
   * Generates loot based on the provided loot table.
   * @param {Array<{item: string, quantity: string | number, chance: number}>} table
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
    if (randomEnemy.loadouts) {
      const randomLoadout = randomChoice(randomEnemy.loadouts);
      // combine with root equipment and inventory, they may be undefined initially
      randomEnemy.equipment = [
        ...randomEnemy.equipment,
        ...(await Promise.all(
          randomLoadout.equipment.map(
            async (itemId) => await ItemLoader.load(itemId)
          )
        )),
      ];
      if (randomLoadout.inventory?.length) {
        randomEnemy.inventory = [
          ...randomEnemy.inventory,
          ...(await Promise.all(
            randomLoadout.inventory.map(async ({ item, quantity }) => ({
              item: await ItemLoader.load(item),
              quantity: quantity,
            }))
          )),
        ];
      }
    }
    if (randomEnemy.equipment?.length) {
      this.enemy.addItemsToInventory(randomEnemy.equipment);
      const randomWeapon = randomChoice(
        randomEnemy.equipment.filter(({ id }) => id.includes("weapon"))
      );
      const randomArmor = randomChoice(
        randomEnemy.equipment.filter(({ id }) => id.includes("armor"))
      );
      if (randomWeapon) this.enemy.equipItem("weapon", randomWeapon);
      if (randomArmor) this.enemy.equipItem("armor", randomArmor);
    }
    if (randomEnemy.inventory?.length) {
      randomEnemy.inventory.forEach(({ item, quantity }) => {
        this.enemy.inventory.addItem(item, rollDice(quantity));
      });
    }
    if (randomEnemy.treasure?.length) {
      this.lootDrops.push(...(await this.generateLoot(randomEnemy.treasure)));
    }
    if (randomEnemy.harvest?.length) {
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
