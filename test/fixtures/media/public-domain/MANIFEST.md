# Public-Domain / Project-Generated Media Test Pack

Purpose: small, license-clean media fixtures for manual and automated regression testing.

License basis:

- NASA- and U.S. federal-government-origin assets are public domain in the United States under NASA policy / 17 U.S.C. 105, as stated on the linked Wikimedia Commons file pages.
- Synthetic edge-case files in this pack are project-generated test artifacts.

## Inventory

| File | Type | Source page | Basis | Derivative action | Final spec | Intended test purpose |
| --- | --- | --- | --- | --- | --- | --- |
| `earth-from-space-landscape-1920x1080.jpg` | Image | <https://commons.wikimedia.org/wiki/File:Earth_from_Space.jpg> | NASA public domain | Resized/cropped from the source JPEG to 1920x1080 | JPEG, 1920x1080, 765206 bytes | Landscape containment and aspect-ratio check |
| `don-pettit-portrait-1080x1440.jpg` | Image | <https://commons.wikimedia.org/wiki/File:Don_Pettit_2024_(portrait_crop).jpg> | NASA public domain | Resized/cropped from the source JPEG to 1080x1440 | JPEG, 1080x1440, 1468007 bytes | Portrait containment and navigation check |
| `jupiter-square-1024x1024.jpg` | Image | <https://commons.wikimedia.org/wiki/File:Map_of_Jupiter_(square).jpg> | NASA public domain | Resized to 1024x1024 | JPEG, 1024x1024, 213786 bytes | Square image layout check |
| `transparent-canvas-320x240.png` | Image | Project-generated | Project-generated | Created locally as a transparent RGBA PNG | PNG, 320x240, 5502 bytes | Transparency handling |
| `animated-orbit-320x180.gif` | Image | Project-generated | Project-generated | Created locally from `ffmpeg` `testsrc2` output | GIF, 320x180, 2.0 s, 122686 bytes | Animated image handling |
| `thermohaline-landscape-1920x1080-20s.mp4` | Video | <https://commons.wikimedia.org/wiki/File:Thermohaline_assembled.1920x1080.webm> | NASA public domain | Transcoded to browser-compatible MP4/H.264 and trimmed to 20 s | MP4/H.264, 1920x1080, 20.0 s, 2866009 bytes | 1080p video playback and panel controls |
| `ionosphere-portrait-1080x1920-5s.mp4` | Video | <https://commons.wikimedia.org/wiki/File:Radio_Signal_Reflection_%26_Refraction_on_a_Simple_Ionosphere_Model_(SVS5240_-_polar_propagation_basic_sample_1080x1920_p30).webm> | NASA public domain | Transcoded to browser-compatible MP4/H.264 and trimmed to source length | MP4/H.264, 1080x1920, 5.3 s, 62066 bytes | Portrait video layout and scaling |
| `silent-square-640x640-2s.mp4` | Video | Project-generated | Project-generated | Created locally as a synthetic silent MP4 | MP4/H.264, 640x640, 2.0 s, 93775 bytes | Silent-video path and no-audio handling |
| `nixon-resignation-20s.mp3` | Audio | <https://commons.wikimedia.org/wiki/File:Nixon_resignation_audio_with_buzz_removed.ogg> | U.S. federal government / public domain in the U.S. | Transcoded to MP3 and trimmed to under 20 s | MP3, mono, 44.1 kHz, 19.9 s, 149649 bytes | Supported audio playback/control |
| `negative/tiny-note.pdf` | Negative | Project-generated | Project-generated | Plain text saved with a `.pdf` name | Text file, 64 bytes | Rejection path for non-media input |
| `negative/weird name - mañana.mp3` | Negative | Project-generated | Project-generated | Plain text saved with spaces and Unicode in the name | Text file, 78 bytes | Filename edge case and extension sniffing gap check |
| `negative/unsupported-container.mkv` | Negative | Project-generated | Project-generated | Synthetic Matroska file with H.264 video | MKV, 30160 bytes | Container support rejection path |
| `negative/corrupt-truncated.mp4` | Negative | Project-generated | Project-generated | MP4 truncated after creation | MP4, 2048 bytes | Corrupt-media rejection path |
| `negative/jupiter-320x320.heic` | Edge case | <https://commons.wikimedia.org/wiki/File:Map_of_Jupiter_(square).jpg> | NASA public domain | Resized and converted to HEIC with `sips` | HEIC/HEVC, 320x320, 13662 bytes | Accepted by `image/*` filter but renders only in Safari; broken image elsewhere |
| `negative/jupiter-320x320.avif` | Edge case | <https://commons.wikimedia.org/wiki/File:Map_of_Jupiter_(square).jpg> | NASA public domain | Resized and converted to AVIF with `sips` | AVIF, 320x320, 17202 bytes | Modern format; renders in current Chrome/Firefox/Safari, broken in older browsers |
| `negative/jupiter-320x320.tiff` | Edge case | <https://commons.wikimedia.org/wiki/File:Map_of_Jupiter_(square).jpg> | NASA public domain | Resized and converted to TIFF with `sips` | TIFF, 320x320, 310772 bytes | Accepted by `image/*` filter but renders only in Safari; broken image elsewhere |
| `negative/jupiter-320x320.bmp` | Edge case | <https://commons.wikimedia.org/wiki/File:Map_of_Jupiter_(square).jpg> | NASA public domain | Resized and converted to BMP with `sips` | BMP, 320x320, 307254 bytes | Legacy format; should render in all browsers |
| `negative/vector-orbit.svg` | Edge case | Project-generated | Project-generated | Hand-written SVG drawing | SVG, 320x240 viewBox, 483 bytes | Accepted as `image/svg+xml`; checks vector rendering and scaling via blob URL |

Notes:

- The negative files are intentionally tiny and may be accepted or rejected differently depending on the browser's file-type inference.
- The synthetic assets are meant to expose gaps without introducing copyright risk.
- Animated WebP is not included because local tooling (`sips`, this `ffmpeg` build) cannot write WebP; the animated GIF covers the animated-image case.
