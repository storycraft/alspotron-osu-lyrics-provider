import path from 'node:path';
import * as net from 'node:net';
import { getInjector } from '../injector';
import serverDLLPath from '@asset/Server.dll';
import EventEmitter from 'node:events';

export type SourceEventEmitter = EventEmitter<{
  'update': [event: OsuLyricsEvent],
  'closed': [],
}>;

export interface OsuLyricsServerSource {
  readonly event: SourceEventEmitter;
  close(): void;
}

export async function attach(): Promise<OsuLyricsServerSource | null> {
  const injector = getInjector();

  if (!injector.inject(path.resolve(__dirname, serverDLLPath))) {
    return null;
  }

  // wait for dll init
  await new Promise(resolve => setTimeout(resolve, 1000));

  const socket = net.createConnection('\\\\.\\pipe\\osu!Lyrics');
  socket.on('error', () => {
    event.emit('closed');
    socket.destroy();
  });
  socket.setEncoding('utf-16le');

  const event: SourceEventEmitter = new EventEmitter();
  socket.on('data', (data) => {
    event.emit('update', parseLineEvent(data.toString().trim()));
  });

  return {
    event,
    close() {
      socket.destroy();
      event.emit('closed');
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
