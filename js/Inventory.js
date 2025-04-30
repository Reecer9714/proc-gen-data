// InventorySlot class to represent a single item in the inventory
class InventorySlot {
  constructor(item, quantity) {
    this.item = item; // The item object
    this.quantity = quantity; // The quantity of the item
    this.maxQuantity = item.maxQuantity || Infinity; // Maximum quantity allowed for the item
  }

  get remainingSpace() {
    return this.maxQuantity - this.quantity; // Calculate remaining space in the slot
  }
  get weight() {
    return this.item.weight * this.quantity; // Calculate total weight of the items in the slot
  }
  get value() {
    return this.item.value * this.quantity; // Calculate total value of the items in the slot
  }
}

export class Inventory {
  constructor() {
    this.slots = []; // Stores items with their quantities
    this.maxSlots = 10; // Maximum number of slots in the inventory
    this.maxWeight = 100; // Maximum weight the inventory can hold
  }

  get totalWeight() {
    return this.slots.reduce((total, slot) => total + slot.weight, 0); // Calculate total weight of all items in the inventory
  }
  get totalValue() {
    return this.slots.reduce((total, slot) => total + slot.value, 0); // Calculate total value of all items in the inventory
  }

  addItem(itemToAdd, quantity = 1) {
    let remainingQuantityToAdd = quantity;

    // get all slots that contain the item to add, then filter them to find the ones that have space
    const existingSlots = this.slots
      .filter((slot) => slot.item.id === itemToAdd.id)
      .filter((slot) => slot.remainingSpace > 0)
      .sort((a, b) => a.remainingSpace - b.remainingSpace);

    // Iterate through the existing slots and add the item to them if they have space
    for (const slot of existingSlots) {
      if (remainingQuantityToAdd <= 0) break; // Stop if no more quantity to add

      const addQuantity = Math.min(remainingQuantityToAdd, slot.remainingSpace);
      slot.quantity += addQuantity;
      remainingQuantityToAdd -= addQuantity;
    }

    // If there's still quantity left to add, create new slots for the item
    while (remainingQuantityToAdd > 0) {
      const addQuantity = Math.min(
        remainingQuantityToAdd,
        itemToAdd.maxQuantity || Infinity
      );
      this.slots.push(new InventorySlot(itemToAdd, addQuantity));
      remainingQuantityToAdd -= addQuantity;
    }
  }

  removeItem(itemId, quantity = 1) {
    let remainingQuantityToRemove = quantity;

    // Create a sorted copy of the slots array
    const sortedSlots = [...this.slots].sort((a, b) => a.quantity - b.quantity);

    sortedSlots.forEach((slot) => {
      if (slot.item.id === itemId && remainingQuantityToRemove > 0) {
        const removeQuantity = Math.min(
          slot.quantity,
          remainingQuantityToRemove
        );
        slot.quantity -= removeQuantity;
        remainingQuantityToRemove -= removeQuantity;
      }
    });

    // Remove empty slots from the original array
    this.slots = this.slots.filter((slot) => slot.quantity > 0);
  }

  getItem(itemId) {
    return this.slots.find((i) => i.item.id === itemId) || null;
  }

  hasItem(itemId) {
    return this.slots.some((i) => i.item.id === itemId);
  }

  listItems() {
    return this.slots;
  }
}
