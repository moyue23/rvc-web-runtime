/**
 * Apply median filter to an F0 array.
 *
 * @param f0 - Raw F0 values in Hz (0 = unvoiced)
 * @param windowSize - Filter window size (must be odd, default 3)
 * @returns New Float32Array with filtered F0 values
 */
export function medianFilterF0(f0: Float32Array, windowSize = 3): Float32Array {
  if (windowSize < 3 || windowSize % 2 === 0) {
    windowSize = 3;
  }

  const len = f0.length;
  if (len <= windowSize) return new Float32Array(f0);

  const result = new Float32Array(len);
  const halfWindow = Math.floor(windowSize / 2);
  const window: number[] = new Array(windowSize);

  // Track statistics for debugging
  let maxDelta = 0;
  let maxDeltaIndex = -1;
  let totalDelta = 0;
  let changedFrames = 0;

  for (let i = 0; i < len; i++) {
    // Unvoiced frames pass through unchanged
    if (f0[i] <= 0) {
      result[i] = 0;
      continue;
    }

    // Collect window values (only voiced frames contribute)
    let count = 0;
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < len && f0[idx] > 0) {
        window[count++] = f0[idx];
      }
    }

    if (count === 0) {
      result[i] = 0;
    } else {
      // Sort the collected values and take the median
      const slice = window.slice(0, count);
      slice.sort((a, b) => a - b);
      const median = slice[Math.floor(count / 2)];
      result[i] = median;

      // Track changes
      const delta = Math.abs(f0[i] - median);
      if (delta > 0.1) { // Only count meaningful changes
        changedFrames++;
        totalDelta += delta;
        if (delta > maxDelta) {
          maxDelta = delta;
          maxDeltaIndex = i;
        }
      }
    }
  }

  // Enhanced debug output
  if (changedFrames > 0) {
    const avgDelta = totalDelta / changedFrames;
    const percentChanged = (changedFrames / len * 100).toFixed(1);
    console.log(`[F0 Median Filter] window=${windowSize}, frames=${len}`);
    console.log(`  Changed: ${changedFrames}/${len} (${percentChanged}%)`);
    console.log(`  Total delta: ${totalDelta.toFixed(1)}Hz, Avg: ${avgDelta.toFixed(1)}Hz`);
    console.log(`  Max delta: ${maxDelta.toFixed(1)}Hz at frame ${maxDeltaIndex}`);
    
    // Show example of a significant change
    if (maxDeltaIndex >= 0 && maxDelta > 5) {
      console.log(`  Example: frame ${maxDeltaIndex}: ${f0[maxDeltaIndex].toFixed(1)}Hz → ${result[maxDeltaIndex].toFixed(1)}Hz (Δ${maxDelta.toFixed(1)}Hz)`);
    }
  } else {
    console.log(`[F0 Median Filter] window=${windowSize}, frames=${len}, no significant changes`);
  }

  return result;
}


/**
 * Apply aggressive median filter with larger window and additional smoothing.
 * This is more effective at removing pitch spikes but may over-smooth.
 *
 * @param f0 - Raw F0 values in Hz (0 = unvoiced)
 * @param windowSize - Filter window size (must be odd, default 5)
 * @returns New Float32Array with filtered F0 values
 */
export function aggressiveMedianFilterF0(f0: Float32Array, windowSize = 5): Float32Array {
  if (windowSize < 5 || windowSize % 2 === 0) {
    windowSize = 5;
  }

  const len = f0.length;
  if (len <= windowSize) return new Float32Array(f0);

  const result = new Float32Array(len);
  const halfWindow = Math.floor(windowSize / 2);
  const window: number[] = new Array(windowSize);

  // Track statistics for debugging
  let maxDelta = 0;
  let maxDeltaIndex = -1;
  let totalDelta = 0;
  let changedFrames = 0;

  for (let i = 0; i < len; i++) {
    // Unvoiced frames pass through unchanged
    if (f0[i] <= 0) {
      result[i] = 0;
      continue;
    }

    // Collect window values (only voiced frames contribute)
    let count = 0;
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < len && f0[idx] > 0) {
        window[count++] = f0[idx];
      }
    }

    if (count === 0) {
      result[i] = 0;
    } else {
      // Sort the collected values
      const slice = window.slice(0, count);
      slice.sort((a, b) => a - b);
      
      // For aggressive filtering, we can use a weighted approach
      // or apply multiple passes. Here we use a simple median.
      const median = slice[Math.floor(count / 2)];
      result[i] = median;

      // Track changes
      const delta = Math.abs(f0[i] - median);
      if (delta > 0.1) { // Only count meaningful changes
        changedFrames++;
        totalDelta += delta;
        if (delta > maxDelta) {
          maxDelta = delta;
          maxDeltaIndex = i;
        }
      }
    }
  }

  // Enhanced debug output
  if (changedFrames > 0) {
    const avgDelta = totalDelta / changedFrames;
    const percentChanged = (changedFrames / len * 100).toFixed(1);
    console.log(`[F0 Aggressive Median Filter] window=${windowSize}, frames=${len}`);
    console.log(`  Changed: ${changedFrames}/${len} (${percentChanged}%)`);
    console.log(`  Total delta: ${totalDelta.toFixed(1)}Hz, Avg: ${avgDelta.toFixed(1)}Hz`);
    console.log(`  Max delta: ${maxDelta.toFixed(1)}Hz at frame ${maxDeltaIndex}`);
    
    // Show example of a significant change
    if (maxDeltaIndex >= 0 && maxDelta > 5) {
      console.log(`  Example: frame ${maxDeltaIndex}: ${f0[maxDeltaIndex].toFixed(1)}Hz → ${result[maxDeltaIndex].toFixed(1)}Hz (Δ${maxDelta.toFixed(1)}Hz)`);
    }
  } else {
    console.log(`[F0 Aggressive Median Filter] window=${windowSize}, frames=${len}, no significant changes`);
  }

  return result;
}