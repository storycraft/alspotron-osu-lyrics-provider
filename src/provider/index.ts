import { PluginLogger } from 'alspotron/common/plugins';
import { BaseSourceProvider } from 'alspotron/src/provider/source/base-source-provider';
import { attach, OsuLyricsServerSource } from './source';
import { BeatmapDecoder } from 'osu-parsers';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export class OsuLyricsSourceProvider extends BaseSourceProvider {
  public name: string = "osu!Lyrics";

  private started: boolean = false;
  private source: OsuLyricsServerSource | null = null;
  constructor(
    private readonly logger: PluginLogger
  ) {
    super();
  }

  override start(options: Record<string, unknown>): void {
    if (!this.started) {
      this.started = true;
      const task = setInterval(async () => {
        if (!this.started) {
          clearInterval(task);
          return;
        }

        if (!this.source) {
          try {
            this.source = await attach();
            if (this.source) {
              this.setupSource(this.source);
            } else {
              this.logger.warn('cannot find osu! process');
            }
          } catch (e) {
            this.logger.error(`failed to inject server err: ${e}`);
          }
        }
      }, 5000);
    }

    super.start(options);
  }
  setupSource(source: OsuLyricsServerSource) {
    this.logger.info('attached to osu!');

    let beatmapProgressTask: NodeJS.Timeout | null = null;

    source.event.on('closed', () => {
      this.source = null;
      this.emit('update', {
        provider: this.name,
        data: {
          type: 'idle'
        },
      });

      if (beatmapProgressTask) {
        clearInterval(beatmapProgressTask);
      }
    });

    source.event.on('update', async (e) => {
      if (e.beatmapPath === '') {
        this.emit('update', {
          provider: this.name,
          data: {
            type: 'idle'
          },
        });
        return;
      }

      const decoder = new BeatmapDecoder();
      try {
        const beatmap = await decoder.decodeFromPath(e.beatmapPath);

        let coverUrl: string;
        if (beatmap.events.backgroundPath) {
          coverUrl = pathToFileURL(
            path.resolve(
              e.beatmapPath,
              '..',
              beatmap.events.backgroundPath,
            ),
          ).toString();
        } else {
          coverUrl = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        }

        const info = {
          id: `${beatmap.metadata.beatmapSetId}`,
          title: beatmap.metadata.titleUnicode,
          artists: [
            beatmap.metadata.artistUnicode
          ],
          progress: e.audioPlayTime * 1000,
          duration: beatmap.totalLength,
          coverUrl,
        };

        if (e.audioPlaySpeed === -100) {
          this.emit('update', {
            provider: this.name,
            data: {
              type: 'paused',
              ...info,
            },
          });
        } else {
          const startProgress = info.progress;
          const startTime = Date.now();
          const task = setInterval(() => {
            const currentTime = startProgress + (Date.now() - startTime) * (1 + e.audioPlaySpeed / 100);
            if (currentTime > info.duration) {
              clearInterval(task);
              beatmapProgressTask = null;
              this.emit('update', {
                provider: this.name,
                data: {
                  type: 'idle'
                },
              });
            }
            info.progress = currentTime;

            this.emit('update', {
              provider: this.name,
              data: {
                type: 'playing',
                ...info,
              },
            });
          }, 20);

          if (beatmapProgressTask) {
            clearInterval(beatmapProgressTask);
          }
          beatmapProgressTask = task;
        }
      } catch (err) {
        this.logger.error(`failed to load beatmap from ${e.beatmapPath}. err: ${err}`);
        return;
      }
    });
  }

  override close() {
    if (this.started) {
      this.started = false;
    }

    super.close();
  }

  public isRunning(): boolean {
    return this.started;
  }
}
