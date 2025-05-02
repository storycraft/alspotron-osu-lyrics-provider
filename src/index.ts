import { PluginContext } from 'alspotron/common/plugins';
import { OsuLyricsSourceProvider } from './provider';

module.exports = (cx: PluginContext) => {
  const provider = new OsuLyricsSourceProvider(cx.logger);
  cx.registerSourceProvider(provider);

  cx.logger.log('Plugin initialized');
}
