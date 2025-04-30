import { log } from "./utils.js";

export function updateUI(game) {
  updateEntityUI(game.hero, "user", game.enemy, game.useAction.bind(game));
  updateEntityUI(
    game.enemy,
    "target",
    game.hero,
    game.useAction.bind(game),
    true
  );

  updateUserInventory(game, game.hero);
}

function createButton(text, onClick, disable = false) {
  const button = document.createElement("button");
  button.textContent = text;
  button.onclick = onClick;
  button.disabled = disable;
  return button;
}

function updateEntityUI(
  entity,
  entityId,
  otherEntity,
  useAction,
  disableActions = false
) {
  document.getElementById(`${entityId}-name`).textContent = entity.name;
  document.getElementById(`${entityId}-hp`).textContent = entity.hp;
  document.getElementById(`${entityId}-effects`).textContent =
    entity.getActiveEffects();
  document.getElementById(`${entityId}-conditions`).textContent =
    entity.getConditions();
  const actionsDiv = document.getElementById(`${entityId}-actions`);
  actionsDiv.innerHTML = "";

  entity.getActions().forEach((action) => {
    actionsDiv.appendChild(
      createButton(
        `${action.name} (${action.cost})`,
        () => useAction(action, entity, otherEntity),
        disableActions
      )
    );
  });
}

function createInventoryRow(
  slot,
  equiped,
  onEquip,
  onEquipTwoHanded,
  onUnequip
) {
  const row = document.createElement("tr");
  const { item } = slot;
  const quantity =
    slot.maxQuantity !== Infinity
      ? `${slot.quantity}/${slot.maxQuantity}`
      : slot.quantity;

  row.innerHTML = `
    <td>${equiped ? "*" : ""}${item.name}</td>
    <td title="Item Weight: ${item.weight}">${slot.weight.toFixed(1)}</td>
    <td title="Item Value: ${item.value}">${slot.value.toFixed(1)}</td>
    <td>${quantity}</td>
    <td></td>
  `;

  const actionsCell = row.querySelector("td:last-child");

  if (item.id.includes("weapon")) {
    if (equiped) {
      actionsCell.appendChild(createButton("Unequip", () => onUnequip(item)));
    } else {
      actionsCell.appendChild(createButton("Equip", () => onEquip(item)));
    }

    if (item.tags?.includes("two-handed")) {
      actionsCell.appendChild(
        createButton("Equip (2H)", () => onEquipTwoHanded(item))
      );
    }
  }

  return row;
}

function updateUserInventory(game, user) {
  const inventoryTableBody = document.querySelector("#inventory tbody");
  inventoryTableBody.innerHTML = "";

  user.inventory.listItems().forEach((slot) => {
    const { item } = slot;
    const row = createInventoryRow(
      slot,
      user.weapon?.id === item.id,
      (item) => {
        user.weapon = item;
        user.facts.add("one-handed");
        user.facts.add("unarmed");
        user.facts.delete("two-handed");
        log(`Hero equipped the ${item.name}!`);
        game.render();
      },
      (item) => {
        user.weapon = item;
        user.facts.add("two-handed");
        user.facts.delete("one-handed");
        user.facts.delete("unarmed");
        log(`Hero equipped the ${item.name} two-handed!`);
        game.render();
      },
      (item) => {
        user.weapon = null;
        user.facts.add("unarmed");
        user.facts.delete("one-handed");
        user.facts.delete("two-handed");
        log(`Hero unequipped the ${item.name}!`);
        game.render();
      }
    );
    inventoryTableBody.appendChild(row);
  });

  // Add a row for total weight and value
  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `
    <td><strong>Total</strong></td>
    <td>${user.inventory.totalWeight.toFixed(1)}</td>
    <td>${user.inventory.totalValue.toFixed(1)}</td>
    <td></td>
  `;
  inventoryTableBody.appendChild(totalRow);
}
