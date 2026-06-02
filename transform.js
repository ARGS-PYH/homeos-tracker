import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Read the original data
const code = fs.readFileSync('./src/data.js', 'utf8');

// We have to extract the arrays manually or mock export
// Since it's an ES module we can just import it dynamically
const dataUrl = 'file://' + path.resolve('./src/data.js').replace(/\\/g, '/');

import(dataUrl).then((module) => {
  const { BUSINESS, DEV } = module;

  const transform = (data, prefix) => {
    return data.map((group, gi) => ({
      id: `${prefix}_group_${gi}`,
      phase: group.phase,
      title: group.title,
      items: group.items.map((text, ii) => ({
        id: `${prefix}__${gi}__${ii}`,
        text
      }))
    }));
  };

  const newBusiness = transform(BUSINESS, 'business');
  const newDev = transform(DEV, 'dev');

  const newContent = `export const BUSINESS = ${JSON.stringify(newBusiness, null, 2)};\n\nexport const DEV = ${JSON.stringify(newDev, null, 2)};\n`;

  fs.writeFileSync('./src/data.js', newContent, 'utf8');
  console.log('Successfully transformed data.js');
});
