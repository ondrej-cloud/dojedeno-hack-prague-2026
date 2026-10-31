/* Lightweight presence detector. It detects a stable foreground change, not food
 * or a semantic plate. Calibrate with an empty station; feed a small frame/crop.
 * No models, dependencies, image retention outside this instance, or networking.
 */
(function (root) {
  'use strict';
  class PlatePresence {
    constructor(options = {}) {
      this.options = Object.assign({
        calibrationMs: 2000,
        arrivalMs: 900,
        removalMs: 700,
        presenceCoverage: 0.16,
        removalCoverage: 0.08,
        pixelThreshold: 30,
        maxMotion: 0.08,
        calibrationMaxMotion: 0.04,
        baselineAdaptation: 0.015,
      }, options);
      const o = this.options;
      if (!(o.calibrationMs > 0 && o.arrivalMs > 0 && o.removalMs > 0 &&
          o.presenceCoverage > o.removalCoverage && o.presenceCoverage <= 1 &&
          o.removalCoverage >= 0 && o.pixelThreshold > 0 &&
          o.maxMotion >= 0 && o.maxMotion <= 1 &&
          o.calibrationMaxMotion >= 0 && o.calibrationMaxMotion <= 1 &&
          o.baselineAdaptation >= 0 && o.baselineAdaptation <= 1)) {
        throw new RangeError('Invalid PlatePresence options');
      }
      this.reset();
    }

    reset() {
      this.state = 'calibrating';
      this.baseline = null;
      this.previous = null;
      this.width = 0;
      this.height = 0;
      this.lastTime = null;
      this.calibrationSince = null;
      this.arrivalSince = null;
      this.arrivalAnchor = null;
      this.removalSince = null;
    }

    // Median channel shifts reject mild whole-frame exposure/white-balance
    // changes. Clamp compensation so a large lighting change cannot hide itself.
    difference(frame, reference, mask = null) {
      const shifts = [];
      for (let c = 0; c < 3; c++) {
        const bins = new Uint32Array(511);
        for (let i = c; i < frame.length; i += 3) {
          bins[Math.max(0, Math.min(510, Math.round(frame[i] - reference[i]) + 255))]++;
        }
        let seen = 0, median = 0;
        for (let b = 0; b < bins.length; b++) {
          seen += bins[b];
          if (seen >= frame.length / 6) { median = b - 255; break; }
        }
        shifts.push(Math.max(-24, Math.min(24, median)));
      }
      let changed = 0;
      for (let i = 0; i < frame.length; i += 3) {
        const r = frame[i] - reference[i] - shifts[0];
        const g = frame[i + 1] - reference[i + 1] - shifts[1];
        const b = frame[i + 2] - reference[i + 2] - shifts[2];
        const foreground = Math.sqrt((r*r + g*g + b*b) / 3) >= this.options.pixelThreshold;
        if (foreground) changed++;
        if (mask) mask[i / 3] = foreground ? 1 : 0;
      }
      return changed / (frame.length / 3);
    }

    // Largest 8-connected foreground component; normalized pixel-edge bounds.
    // Isolated noise cannot enlarge the box. This is object location, not a
    // semantic plate classifier; a connected hand/shadow can be included.
    componentBounds(mask, width, height) {
      const minimum = Math.max(9, Math.ceil(mask.length * 0.01));
      const queue = new Int32Array(mask.length);
      let largest = 0, bounds = null;
      for (let start = 0; start < mask.length; start++) {
        if (mask[start] !== 1) continue;
        let head = 0, tail = 1, minX = width, minY = height, maxX = -1, maxY = -1;
        queue[0] = start;
        mask[start] = 2;
        while (head < tail) {
          const current = queue[head++], x = current % width, y = Math.floor(current / width);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny++) {
            for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx++) {
              const neighbor = ny * width + nx;
              if (mask[neighbor] === 1) { mask[neighbor] = 2; queue[tail++] = neighbor; }
            }
          }
        }
        const boxWidth = maxX - minX + 1, boxHeight = maxY - minY + 1;
        if (tail >= minimum && tail > largest && boxWidth >= 3 && boxHeight >= 3) {
          largest = tail;
          bounds = { x: minX / width, y: minY / height, width: boxWidth / width, height: boxHeight / height };
        }
      }
      return bounds;
    }

    sample(rgba, width, height, timestamp) {
      if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 ||
          !rgba || rgba.length !== width * height * 4 || !Number.isFinite(timestamp)) {
        throw new TypeError('Expected width × height RGBA frame and finite millisecond timestamp');
      }
      if (width !== this.width || height !== this.height ||
          (this.lastTime !== null && timestamp < this.lastTime)) this.reset();
      this.width = width;
      this.height = height;
      this.lastTime = timestamp;
      const frame = new Float32Array(width * height * 3);
      for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
        frame[j] = rgba[i]; frame[j + 1] = rgba[i + 1]; frame[j + 2] = rgba[i + 2];
      }
      const motion = this.previous ? this.difference(frame, this.previous) : 0;
      this.previous = frame;
      let event = null;
      if (this.state === 'calibrating') {
        if (!this.baseline || motion > this.options.calibrationMaxMotion ||
            this.difference(frame, this.baseline) > this.options.calibrationMaxMotion) {
          this.baseline = new Float32Array(frame);
          this.calibrationSince = timestamp;
        }
        const progress = Math.min(1, (timestamp - this.calibrationSince) / this.options.calibrationMs);
        if (progress === 1) this.state = 'empty';
        return { state: this.state, event, coverage: 0, motion, calibrationProgress: progress, bounds: null };
      }
      const mask = new Uint8Array(width * height);
      const coverage = this.difference(frame, this.baseline, mask);
      const bounds = this.componentBounds(mask, width, height);
      const stable = motion <= this.options.maxMotion;
      if (this.state === 'empty') {
        if (coverage >= this.options.presenceCoverage && stable) {
          if (this.arrivalSince === null || this.difference(frame, this.arrivalAnchor) > this.options.maxMotion) {
            this.arrivalSince = timestamp;
            this.arrivalAnchor = frame;
          }
          if (timestamp - this.arrivalSince >= this.options.arrivalMs) {
            this.state = 'present';
            this.arrivalSince = null;
            this.arrivalAnchor = null;
            event = 'arrived';
          }
        } else {
          this.arrivalSince = null;
          this.arrivalAnchor = null;
        }
        // Only adapt while confidently empty, never absorb a held object.
        if (coverage < 0.03 && stable && !bounds) {
          const alpha = this.options.baselineAdaptation;
          for (let i = 0; i < frame.length; i++) this.baseline[i] += alpha * (frame[i] - this.baseline[i]);
        }
      } else {
        if (coverage <= this.options.removalCoverage && stable) {
          if (this.removalSince === null) this.removalSince = timestamp;
          if (timestamp - this.removalSince >= this.options.removalMs) {
            this.state = 'empty';
            this.removalSince = null;
            event = 'removed';
          }
        } else {
          this.removalSince = null;
        }
      }
      return { state: this.state, event, coverage, motion, calibrationProgress: 1, bounds };
    }
  }
  root.PlatePresence = PlatePresence;
  if (typeof module !== 'undefined' && module.exports) module.exports = PlatePresence;
})(typeof globalThis !== 'undefined' ? globalThis : this);
