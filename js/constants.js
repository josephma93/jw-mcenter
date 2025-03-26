export const PRESENTER_WINDOW_DATA = {
    FILE_PATH: 'presenter.html',
    REFERER: 'presenterWindow',
};

export const WORKER_EVENT_TYPES = {
    UPDATE_MEDIA: 'update_media',          // { mediaUrl, mediaType } where mediaType is "image", "video", or "audio"
    KEEP_ALIVE: 'keep_alive',              // heartbeat from presenter
    PRESENTER_READY: 'presenter_ready',    // indicates presenter is loaded
    PLAY: 'play',                          // instructs to play media
    PAUSE: 'pause',                        // instructs to pause media
    FAST_FORWARD: 'fast_forward',          // instructs to advance 10 seconds
    REWIND: 'rewind',                      // instructs to go back 10 seconds
    MEDIA_TIME_UPDATE: 'media_time_update' // reports current media time and duration
};
