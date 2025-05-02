import { PluginContext } from 'alspotron/common/plugins';
import { OsuLyricsSourceProvider } from './provider';

module.exports = (cx: PluginContext) => {
  const provider = new OsuLyricsSourceProvider(cx.logger);
  cx.registerSourceProvider(provider);

  // TODO: remove after alspotron sourceProvider bug fixed
  const [config, setConfig] = cx.useConfig();
  if (config().sourceProvider === provider.name) {
    setConfig({
      sourceProvider: 'tuna-obs',
    });
    setConfig({
      sourceProvider: provider.name,
    });
  }

  cx.logger.log('Plugin initialized');
}
