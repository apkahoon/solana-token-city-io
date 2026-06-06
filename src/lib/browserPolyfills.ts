import { Buffer } from "buffer";

const root = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
  process?: unknown;
};

const processShim = (root.process ?? {}) as { env?: Record<string, string | undefined> };

root.Buffer = root.Buffer ?? Buffer;
root.global = root.global ?? root;
processShim.env = processShim.env ?? {};
root.process = processShim;