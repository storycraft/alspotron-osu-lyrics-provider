import path from 'node:path';
import * as net from 'node:net';
import { getInjector } from '../injector';
import serverDLLPath from '@asset/Server.dll';
import EventEmitter from 'node:events';
import { access, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { X_OK } from 'node:constants';
import { createInterface } from 'node:readline';

export type SourceEventEmitter = EventEmitter<{
  'update': [event: OsuLyricsEvent],
  'closed': [],
}>;

export interface OsuLyricsServerSource {
  readonly event: SourceEventEmitter;
  close(): void;
}

let tmpPath: string | null = null;
async function getTmpPathDll(): Promise<string> {
  if (tmpPath) {
    return tmpPath;
  }

  const targetPath = path.join(tmpdir(), 'alspotron-osu-lyrics-server.dll');
  try {
    await copyFile(path.resolve(__dirname, serverDLLPath), targetPath);
  } catch (e) {
    await access(targetPath, X_OK);
  }

  tmpPath = targetPath;
  return targetPath;
}

export async function attach(): Promise<OsuLyricsServerSource | null> {
  const injector = getInjector();

  if (!injector.inject(await getTmpPathDll())) {
    return null;
  }

  // wait for dll init
  await new Promise(resolve => setTimeout(resolve, 1000));

  const socket = net.createConnection('\\\\.\\pipe\\osu!Lyrics');
  socket.on('close', () => {
    event.emit('closed');
  });
  socket.setEncoding('utf-16le');

  const event: SourceEventEmitter = new EventEmitter();
  const rl = createInterface({ input: socket, terminal: false });
  (async () => {
    try {
      for await (const line of rl) {
        if (!line) {
          return;
        }
    
        event.emit('update', parseLineEvent(line));
      }
    } catch (e) {
      socket.destroy();
    }
  })();

  return {
    event,
    close() {
      socket.destroy();
    },
  }
}

export type OsuLyricsEvent = {
  audioPath: string;
  audioPlayTime: number;
  // -100 if paused
  audioPlaySpeed: number;
  beatmapPath: string;
};

function parseLineEvent(data: string): OsuLyricsEvent {
  const [
    _createdTime,
    audioPath,
    audioPlayTime,
    audioPlaySpeed,
    beatmapPath,
  ] = data.split('|');

  return {
    audioPath,
    audioPlayTime: Number.parseFloat(audioPlayTime),
    audioPlaySpeed: Number.parseFloat(audioPlaySpeed),
    beatmapPath,
  };
}
