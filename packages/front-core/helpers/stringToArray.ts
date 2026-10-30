export default (bufferString: string): Uint8Array => new TextEncoder().encode(bufferString);
