const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { setup } = require('./mock.cjs');

test('host lifecycle initializes a fresh plugin and registers the board and ribbon', async () => {
  const s = setup(), registered = { commands: [], ribbons: [], views: [] };
  class HostPlugin {
    load() { this.onload(); }
    loadData() { return Promise.resolve({tasksFolder: 'Tasks', projectsFolder: 'Projects', freeLanguage: 'ru'}); }
    registerView(...args) { registered.views.push(args); }
    addRibbonIcon(...args) { registered.ribbons.push(args); }
    addCommand(command) { registered.commands.push(command); return command; }
    addSettingTab() {}
    registerEvent() {}
    registerInterval() {}
    registerDomEvent() {}
  }
  const api = {Plugin: HostPlugin, ItemView: class {}, Modal: class {}, PluginSettingTab: class {},
    Notice: class { constructor(message) { throw Error(message); } }, normalizePath: value => value,
    TFile: class {}, getLanguage: () => 'en'};
  const context = {module: {exports: {}}, require: name => {
    assert.equal(name, 'obsidian'); return api;
  }, window: {setInterval: () => 1}, document: {}, console, clearTimeout};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../my-project-tasks/main.js'), 'utf8'), context);
  const Plugin = context.module.exports;
  assert.equal(Plugin.prototype.load, HostPlugin.prototype.load);
  const plugin = new Plugin();
  let layoutReady;
  plugin.app = {...s.plugin.app, workspace: {getLeavesOfType: () => [], onLayoutReady: fn => {layoutReady = fn;}}};
  plugin.load();
  await plugin.ready;
  assert.equal(plugin.initialized, true);
  assert.equal(plugin.settings.freeLanguage, 'ru');
  assert.equal(registered.views.length, 1);
  assert.equal(registered.ribbons.length, 1);
  assert.equal(registered.commands.length, 2);
  assert.equal(typeof layoutReady, 'function');
  await layoutReady();
  assert.equal((await plugin.loadTasks()).length, 0);
  assert.equal((await plugin.loadProjects()).length, 0);
  plugin.onunload();
});

test('release version and compatibility metadata agree', () => {
  const root = require('../manifest.json');
  assert.deepEqual(require('../my-project-tasks/manifest.json'), root);
  assert.equal(require('../src/core.js').VERSION, root.version);
  assert.equal(require('../versions.json')[root.version], root.minAppVersion);
});
