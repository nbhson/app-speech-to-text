import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("index.html tồn tại và tham chiếu script.js", () => {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /<script\s+src="script\.js"><\/script>/, "index.html phải load script.js local");
});

test("mọi asset local được tham chiếu trong index.html đều tồn tại", () => {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !/^(https?:)?\/\//.test(u) && !u.startsWith("data:") && !u.startsWith("/"))
    .filter((u) => /\.[a-z0-9]+$/i.test(u.split("?")[0]));
  assert.ok(refs.includes("script.js"), "phải có tham chiếu script.js");
  for (const ref of refs) {
    const p = path.join(root, decodeURIComponent(ref.split("?")[0].split("#")[0]));
    assert.ok(existsSync(p), `thiếu asset "${ref}"`);
  }
});

test("script.js pass node --check (syntax hợp lệ)", () => {
  execFileSync(process.execPath, ["--check", path.join(root, "script.js")], { stdio: "pipe" });
});
