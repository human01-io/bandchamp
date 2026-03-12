/**
 * BroadcastChannel-based messaging between PWA and extension.
 * Both sides listen on the same channel name.
 */
const CHANNEL_NAME = 'bandchamp-sync';

export interface SyncMessage {
  type: 'ALBUM_ADDED' | 'ALBUM_RATED' | 'ALBUM_TAGGED' | 'WISHLIST_TOGGLE' | 'COLLECTION_STATUS_REQUEST' | 'COLLECTION_STATUS_RESPONSE';
  payload: unknown;
}

let channel: BroadcastChannel | null = null;

export function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

export function sendMessage(msg: SyncMessage) {
  getChannel().postMessage(msg);
}

export function onMessage(handler: (msg: SyncMessage) => void) {
  getChannel().addEventListener('message', (e) => {
    handler(e.data as SyncMessage);
  });
}
