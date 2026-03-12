export interface Track {
  /** Composite key: albumId + '-' + trackNumber */
  id: string;
  albumId: string;
  trackNumber: number;
  title: string;
  /** Duration in seconds */
  duration: number;
  /** mp3-128 stream URL from bcbits.com */
  streamUrl: string;
  /** Relative path to track page, e.g. "/track/aid-kit" */
  trackPath?: string;
  /** Number of fans who purchased/supported this track */
  collectorCount?: number;
}
