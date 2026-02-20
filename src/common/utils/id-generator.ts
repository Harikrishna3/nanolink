// Removed crypto import as we are moving back to sequential time-based IDs

export class IdGenerator {
  private lastTimestamp = 0;
  private sequence = 0;
  // Maximum value for the sequence counter before it rolls over.
  // E.g., 1000 means we can generate 1000 IDs per millisecond.
  private readonly maxSequence = 1000;

  nextId(): bigint {
    let currentTimestamp = Date.now();

    if (currentTimestamp === this.lastTimestamp) {
      this.sequence++;
      if (this.sequence >= this.maxSequence) {
        currentTimestamp = this.waitForNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = currentTimestamp;

    // Shift timestamp to the left by enough bits to hold the sequence
    // 1000 fits in 10 bits (2^10 = 1024), but let's use BigInt math for simplicity
    // and to keep reading base 10 IDs easy.
    // timestamp * 1000n + sequence
    const bigTimestamp = BigInt(currentTimestamp);
    const bigSequence = BigInt(this.sequence);
    
    return (bigTimestamp * 1000n) + bigSequence;
  }

  private waitForNextMillis(lastTimestamp: number): number {
    let timestamp = Date.now();
    while (timestamp <= lastTimestamp) {
      timestamp = Date.now();
    }
    return timestamp;
  }
}

// Export a singleton instance if you want to use it globally.
export const idGenerator = new IdGenerator();
