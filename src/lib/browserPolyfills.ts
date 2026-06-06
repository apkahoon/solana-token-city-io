import { Buffer } from "buffer";

const root = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
  process?: { env?: Record<string, string | undefined> };
};

root.Buffer = root.Buffer ?? Buffer;
root.global = root.global ?? root;
root.process = root.process ?? { env: {} };
root.process.env = root.process.env ?? {};