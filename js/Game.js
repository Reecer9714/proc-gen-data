import { log, formatText, randomChoice } from "./utils.js";
import { EquipmentLoader } from "./loaders.js";
import { Entity } from "./Entity.js";
import { updateUI } from "./ui.js";

export class Game {
  constructor() {}

  async initialize() {
    const dagger = await EquipmentLoader.load("weapon/dagger");
    const staff = await EquipmentLoader.load("weapon/staff");
    const shortbow = await EquipmentLoader.load("weapon/shortbow");
    const battleaxe = await EquipmentLoader.load("weapon/battleaxe");
    const arrow = await EquipmentLoader.load("ammo/arrow");

    this.enemies = [
      { name: "Training Dummy", hp: "3d6", equipment: [] },
      {
        name: "Goblin",
        hp: "2d6",
        equipment: [dagger, shortbow],
        inventory: [{ item: arrow, quantity: arrow.maxQuantity }],
      },
      { name: "Orc", hp: "3d8", equipment: [battleaxe] },
      {
        name: "Skeleton",
        hp: "2d8",
        equipment: [shortbow],
        inventory: [{ item: arrow, quantity: arrow.maxQuantity }],
      },
      { name: "Giant", hp: "5d10" },
      { name: "Troll", hp: "4d10" },
      { name: "Dragon", hp: "5d12" },
    ];

    await Entity.initializeBaseActions();
    this.hero = new Entity("Hero", 10);
    this.hero.attributes = { strength: 10 };
    this.hero.weapon = null;

    this.enemy = new Entity("Training Dummy", 20);

    this.hero.addItemsToInventory([dagger, staff, shortbow, battleaxe]); // Use Entity's method to add items
    this.hero.inventory.addItem(arrow, 30);
    this.hero.inventory.addItem(
      await EquipmentLoader.load("currency/gold"),
      20
    );
  }

  // Create a new enemy for the next round
  resetRound() {
    log("A new foe appears!");
    const randomEnemy = randomChoice(this.enemies);
    this.enemy = new Entity(randomEnemy.name, randomEnemy.hp);
    if (randomEnemy.equipment) {
      this.enemy.addItemsToInventory(randomEnemy.equipment);
      this.enemy.weapon = randomChoice(randomEnemy.equipment);
    }
    if (randomEnemy.inventory) {
      randomEnemy.inventory.forEach(({ item, quantity }) => {
        this.enemy.inventory.addItem(item, quantity);
      });
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

  nextRound() {
    this.hero.tickEffects();
    this.enemy.tickEffects();
    if (this.hero.hp <= 0) {
      log("Hero has fallen!");
    } else if (this.enemy.hp <= 0) {
      log("The enemy has been defeated!");
      // Create a new Target for the next round
      const randomEnemy = randomChoice(this.enemies);
      this.enemy = new Entity(randomEnemy.name, randomEnemy.hp);
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
