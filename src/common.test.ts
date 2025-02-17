import { delayToIterator, delayToMs, formatMillis, resolvePath, TreeBox } from "./common.ts";
import { assertEquals } from "./deps.test.ts";
import { path } from "./deps.ts";

Deno.test("should get delay value", () => {
  assertEquals(delayToMs(10), 10);
  assertEquals(delayToMs(`10s`), 10_000);
  assertEquals(delayToMs(`10.5s`), 10_500);
  assertEquals(delayToMs(`10.123s`), 10_123);
  assertEquals(delayToMs(`10ms`), 10);
  assertEquals(delayToMs(`10000ms`), 10_000);
});

Deno.test("should get delay iterator", () => {
  let iterator = delayToIterator("1s");
  assertEquals(iterator.next(), 1000);
  assertEquals(iterator.next(), 1000);
  iterator = delayToIterator(10);
  assertEquals(iterator.next(), 10);
  assertEquals(iterator.next(), 10);
  let value = 0;
  iterator = delayToIterator({
    next() {
      return value++;
    },
  });
  assertEquals(iterator.next(), 0);
  assertEquals(iterator.next(), 1);
  assertEquals(iterator.next(), 2);
});

Deno.test("should format milliseconds", () => {
  assertEquals(formatMillis(10), "10 milliseconds");
  assertEquals(formatMillis(1), "1 millisecond");
  assertEquals(formatMillis(1000), "1 second");
  assertEquals(formatMillis(2000), "2 seconds");
  assertEquals(formatMillis(1500), "1.5 seconds");
});

Deno.test("should resolve absolute and relative paths", () => {
  assertEquals(
    resolvePath("/some/path", "./below"),
    path.resolve("/some/path/below"),
  );
  assertEquals(
    resolvePath("/some/path", "../above"),
    path.resolve("/some/above"),
  );
  assertEquals(
    resolvePath("/some/path", "/some/other/path"),
    path.resolve("/some/other/path"),
  );
});

Deno.test("tree box should work storing values in a tree", () => {
  const box = new TreeBox(1);
  const childA = box.createChild();
  const childB = box.createChild();

  box.setValue(2);
  assertEquals(box.getValue(), 2);
  assertEquals(childA.getValue(), 2);
  assertEquals(childB.getValue(), 2);

  childA.setValue(3);
  assertEquals(childA.getValue(), 3);
  assertEquals(box.getValue(), 2);
  assertEquals(childB.getValue(), 2);

  box.setValue(4);
  const grandChildA1 = childA.createChild();
  const grandChildA2 = childA.createChild();
  grandChildA2.setValue(5);
  assertEquals(childA.getValue(), 3);
  assertEquals(grandChildA1.getValue(), 3);
  assertEquals(grandChildA2.getValue(), 5);
  assertEquals(box.getValue(), 4);
  assertEquals(childB.getValue(), 4);
});
