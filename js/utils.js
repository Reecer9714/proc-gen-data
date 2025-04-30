export function formatText(text, context) {
  return text.replace(/{(.*?)}/g, (_, key) => {
    const keys = key.split(".");
    let value = context;
    for (const k of keys) {
      value = value[k];
    }
    return value;
  });
}

export function randomChoice(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return null; // Return null if the array is empty or not an array
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

export function log(text) {
  const logDiv = document.getElementById("log");
  logDiv.textContent += text + "\n";
  logDiv.scrollTop = logDiv.scrollHeight;
}

export function rollDice(notation) {
  if (typeof notation === "number") {
    return notation;
  }
  //if notation is a string with a number, return the number
  if (typeof notation === "string" && !notation.includes("d")) {
    return Number(notation);
  }
  const [count, sides] = notation.split("d").map(Number);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}
