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
        this.setTracks(queue);
      }
    );

    this.element.key('i', (ch, key) => {
      this.customEmitter.emit('showImage', this.tracks[this.selectedIndex].album.images[0]);
    });

    this.element.on('select', (item, i) => {
      this.customEmitter.emit('playTrack', this.tracks[this.selectedIndex].uri);
    });
  }
}
