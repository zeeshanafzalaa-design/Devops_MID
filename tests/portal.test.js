const test = require("node:test");
const assert = require("node:assert");
const Portal = require("../portal.js");

// In-memory replacement for the browser's localStorage
function memoryStorage() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); }
  };
}

const VALID = {
  name: "Ali Khan",
  reg_no: "FA22-BCS-001",
  title: "DevOps Assignment 1",
  url: "https://github.com/ali/devops-assignment"
};

test("valid submission is saved and appears in the submission list", () => {
  const store = Portal.createStore(memoryStorage());
  const result = store.add(VALID);
  assert.strictEqual(result.ok, true);
  const items = store.list();
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].reg_no, "FA22-BCS-001");
  assert.strictEqual(items[0].title, "DevOps Assignment 1");
});

test("missing registration number is rejected with a message and not saved", () => {
  const store = Portal.createStore(memoryStorage());
  const result = store.add({ ...VALID, reg_no: "" });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.errors.reg_no, "Registration number is required.");
  assert.strictEqual(store.list().length, 0);
});

test("invalid submission URL is rejected with a message and not saved", () => {
  const store = Portal.createStore(memoryStorage());
  const result = store.add({ ...VALID, url: "not-a-valid-url" });
  assert.strictEqual(result.ok, false);
  assert.match(result.errors.url, /invalid/i);
  assert.strictEqual(store.list().length, 0);
});
