import esbuild from 'esbuild';
import esbuildPluginTsc from 'esbuild-plugin-tsc';
import fs from 'node:fs/promises';
import packageJSON from './package.json' with { type: "json" };

await esbuild.build({
  entryPoints: ['./src/index.ts'],
  outfile: './lib/index.js',
  bundle: true,
  minify: true,
  platform: 'node',
  loader: {
    '.dll': 'file',
    '.node': 'copy',
  },
  plugins: [
    esbuildPluginTsc({
      force: true,
    }),
  ],
});

// write manifest.json
await fs.writeFile('lib/manifest.json', JSON.stringify({
  id: '4d1dbc41-6788-4d3c-b712-94382296c8f5',
  name: 'osu-lyrics Source Provider',
  description: packageJSON.description,
  author: packageJSON.author,
  version: packageJSON.version,
  versionCode: 1,
  manifestVersion: 1,
  main: 'index.js',
}));
