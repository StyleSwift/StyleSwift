/**
 * Chrome Native Messaging 帧：4 字节小端长度 + UTF-8 JSON
 */

export const MAX_STRING = 20000; // host → 扩展单条消息上限 1MB

function truncateStrings(_key, value) {
  return typeof value === "string" && value.length > MAX_STRING
    ? value.slice(0, MAX_STRING) + "…[truncated]"
    : value;
}

/** truncate 只用于展示用的 event；tool_call 必须原样传输 */
export function encodeMessage(msg, { truncate = false } = {}) {
  const body = Buffer.from(JSON.stringify(msg, truncate ? truncateStrings : undefined));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

export function createDecoder(onMessage) {
  let buf = Buffer.alloc(0);
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 4) {
      const len = buf.readUInt32LE(0);
      if (buf.length < 4 + len) return;
      const body = buf.subarray(4, 4 + len);
      buf = buf.subarray(4 + len);
      onMessage(JSON.parse(body.toString("utf8")));
    }
  };
}
