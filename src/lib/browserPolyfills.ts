import { Buffer } from "buffer";

const root = globalThis as Record<string, unknown>;

const processShim = (root.process ?? {}) as { env?: Record<string, string | undefined> };

root.Buffer = root.Buffer ?? Buffer;
root.global = root.global ?? globalThis;
processShim.env = processShim.env ?? {};
root.process = processShim;