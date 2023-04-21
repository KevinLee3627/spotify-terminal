import type { Track } from './types';
import { TrackBox, type TrackBoxOptions } from './trackBox';

interface QueueBoxOptions extends TrackBoxOptions {}

export class QueueBox extends TrackBox {
  constructor(opts: QueueBoxOptions) {
    super(opts);

    this.customEmitter.on(
      'updateQueueBox',
      (queue: Track[], liked: Record<string, boolean>) => {
        this.updateList(queue, liked);
      }
    );
  }
}
