import assert from "node:assert/strict";
import test from "node:test";
import { isValidCpf, sanitizeCpf } from "./cpf.js";

test("sanitizeCpf removes non-digits", () => {
  assert.equal(sanitizeCpf("123.456.789-10"), "12345678910");
});

test("isValidCpf validates known valid cpf", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
});

test("isValidCpf rejects invalid cpf", () => {
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(isValidCpf("123.456.789-00"), false);
});