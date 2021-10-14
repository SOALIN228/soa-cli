const pathExists = require('path-exists');

export function exists(p) {
  return pathExists.sync(p);
}
