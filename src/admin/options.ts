import { AdminJSOptions } from 'adminjs';

import componentLoader from './component-loader.js';
import Material from '../db/models/Material.js';

const options: AdminJSOptions = {
  componentLoader,
  rootPath: '/admin',
  resources: [Material],
  databases: [],
};

export default options;
