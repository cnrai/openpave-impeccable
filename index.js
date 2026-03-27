#!/usr/bin/env node
/**
 * OpenPAVE Impeccable
 *
 * Executable wrapper for pbakaus/impeccable SKILL.md agent skills.
 * When invoked, outputs the skill's SKILL.md content (+ reference files)
 * back to the AI so it follows those design instructions.
 *
 * This makes the skills discoverable in the slash command menu while
 * preserving the full SKILL.md instruction set.
 *
 * Commands map 1:1 to impeccable skills:
 *   design polish [target]       -> outputs polish/SKILL.md
 *   design audit [area]          -> outputs audit/SKILL.md
 *   design animate [target]      -> outputs animate/SKILL.md
 *   design teach                 -> outputs teach-impeccable/SKILL.md
 *   ... etc
 */

var fs = require('fs');
var path = require('path');

var args = process.argv.slice(2);

// ===================================================================
// Paths
// ===================================================================

var HOME = process.env.HOME || process.env.USERPROFILE || '/tmp';
var AGENT_SKILLS_DIR = path.join(HOME, '.pave', 'agent-skills');
var REPO_DIR = path.join(AGENT_SKILLS_DIR, 'pbakaus--impeccable');
var REPO_KEY = 'pbakaus/impeccable';

// Command name -> SKILL.md directory name mapping
// Most are 1:1, except "teach" maps to "teach-impeccable"
var COMMAND_MAP = {
  'polish': 'polish',
  'audit': 'audit',
  'animate': 'animate',
  'adapt': 'adapt',
  'arrange': 'arrange',
  'bolder': 'bolder',
  'clarify': 'clarify',
  'colorize': 'colorize',
  'critique': 'critique',
  'delight': 'delight',
  'distill': 'distill',
  'extract': 'extract',
  'frontend-design': 'frontend-design',
  'harden': 'harden',
  'normalize': 'normalize',
  'onboard': 'onboard',
  'optimize': 'optimize',
  'overdrive': 'overdrive',
  'typeset': 'typeset',
  'teach': 'teach-impeccable'
};

// Short descriptions for list output
var DESCRIPTIONS = {
  'polish': 'Final quality pass — fixes alignment, spacing, consistency, and detail issues',
  'audit': 'Comprehensive quality audit across accessibility, performance, theming, and responsive design',
  'animate': 'Add purposeful animations, micro-interactions, and motion effects',
  'adapt': 'Adapt interface for a specific target (mobile, tablet, desktop, print, email)',
  'arrange': 'Improve layout, alignment, and spatial relationships',
  'bolder': 'Amplify safe or boring designs to be more visually striking',
  'clarify': 'Fix unclear copy, labels, and messaging',
  'colorize': 'Improve color usage, palette, and color relationships',
  'critique': 'Honest design review with actionable feedback',
  'delight': 'Add moments of joy and delightful interactions',
  'distill': 'Simplify and remove excess — less is more',
  'extract': 'Extract reusable components from existing code',
  'frontend-design': 'Build distinctive, production-grade frontend interfaces from scratch',
  'harden': 'Improve resilience, error handling, and edge cases',
  'normalize': 'Align with design system conventions and tokens',
  'onboard': 'Add onboarding UX — tooltips, walkthroughs, empty states',
  'optimize': 'Performance optimization — speed, bundle size, rendering',
  'overdrive': 'Push design to the extreme — maximum visual impact',
  'typeset': 'Improve typography — hierarchy, spacing, font choices',
  'teach': 'One-time setup — gathers design context and saves to .impeccable.md'
};

// ===================================================================
// Helpers
// ===================================================================

function shellEscape(s) {
  if (!s) return "''";
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function execCommand(cmd) {
  if (typeof __ipc__ === 'function') {
    var safeCmd = 'unset NODE_OPTIONS; ' + cmd;
    var result = __ipc__('system.exec', safeCmd);
    if (result.err) throw new Error(result.err);
    return { stdout: result.stdout || '', stderr: result.stderr || '', exitCode: result.exitCode || 0 };
  }
  try {
    var cp = require('child_process');
    var out = cp.execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return { stdout: out, stderr: '', exitCode: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', exitCode: e.status || 1 };
  }
}

function httpGet(urlStr) {
  var r = execCommand('curl -sL -H "Accept: application/vnd.github.v3+json" ' + shellEscape(urlStr));
  if (r.exitCode !== 0) throw new Error('HTTP GET failed: ' + r.stderr);
  return r.stdout;
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    try { execCommand('mkdir -p ' + shellEscape(dir)); } catch (e2) {}
  }
}

function listFilesRecursive(dir, baseDir, prefix) {
  prefix = prefix || '';
  var results = [];
  try {
    var entries = fs.readdirSync(dir);
    for (var i = 0; i < entries.length; i++) {
      var fullPath = path.join(dir, entries[i]);
      var relPath = prefix ? prefix + '/' + entries[i] : entries[i];
      try {
        var stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          var sub = listFilesRecursive(fullPath, baseDir, relPath);
          for (var j = 0; j < sub.length; j++) results.push(sub[j]);
        } else {
          results.push(relPath);
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

// ===================================================================
// Check if skills are installed, auto-install if not
// ===================================================================

function isInstalled() {
  try {
    fs.statSync(REPO_DIR);
    return true;
  } catch (e) {
    return false;
  }
}

function autoInstall() {
  console.error('Impeccable skills not found locally. Downloading from GitHub...');

  var branch = 'main';
  var treeUrl = 'https://api.github.com/repos/pbakaus/impeccable/git/trees/' + branch + '?recursive=1';
  var raw = httpGet(treeUrl);
  var data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error('Failed to fetch repository tree from GitHub');
  }

  if (!data.tree) {
    throw new Error('Could not read repository. Check network connection.');
  }

  // Find all SKILL.md files
  var skillFiles = [];
  for (var i = 0; i < data.tree.length; i++) {
    var node = data.tree[i];
    if (node.type === 'blob' && node.path.match(/SKILL\.md$/i)) {
      skillFiles.push(node.path);
    }
  }

  // Deduplicate by skill name, prefer .claude/ paths
  var byName = {};
  for (var i = 0; i < skillFiles.length; i++) {
    var sf = skillFiles[i];
    var sDir = path.dirname(sf);
    var sName = path.basename(sDir);
    if (!byName[sName]) {
      byName[sName] = { path: sf, dir: sDir };
    } else if (sf.match(/^\.(claude|cursor|agents)\//)) {
      byName[sName] = { path: sf, dir: sDir };
    }
  }

  var names = Object.keys(byName);
  console.error('Found ' + names.length + ' skills. Installing...');

  ensureDir(REPO_DIR);

  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var info = byName[name];
    var localDir = path.join(REPO_DIR, name);
    ensureDir(localDir);

    // Download SKILL.md
    var content = httpGet('https://raw.githubusercontent.com/pbakaus/impeccable/' + branch + '/' + info.path);
    fs.writeFileSync(path.join(localDir, 'SKILL.md'), content);

    // Download companion files
    for (var j = 0; j < data.tree.length; j++) {
      var node = data.tree[j];
      if (node.type !== 'blob') continue;
      if (node.path.indexOf(info.dir + '/') === 0 && !node.path.match(/SKILL\.md$/i)) {
        if (node.path.match(/\.(md|txt|yaml|yml|json)$/i)) {
          var relPath = node.path.substring(info.dir.length + 1);
          var localPath = path.join(localDir, relPath);
          ensureDir(path.dirname(localPath));
          var fileContent = httpGet('https://raw.githubusercontent.com/pbakaus/impeccable/' + branch + '/' + node.path);
          fs.writeFileSync(localPath, fileContent);
        }
      }
    }
  }

  // Update manifest so openpave-skills also knows about them
  var manifestPath = path.join(AGENT_SKILLS_DIR, 'manifest.json');
  var manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    manifest = { version: 1, repos: {} };
  }

  var installedSkills = [];
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var info = byName[name];
    var content = fs.readFileSync(path.join(REPO_DIR, name, 'SKILL.md'), 'utf8');
    var meta = parseFrontmatter(content);
    installedSkills.push({
      name: meta.name || name,
      path: info.path,
      description: meta.description || '',
      license: meta.license || '',
      companions: 0
    });
  }

  manifest.repos[REPO_KEY] = {
    owner: 'pbakaus',
    repo: 'impeccable',
    branch: branch,
    installedAt: new Date().toISOString(),
    skills: installedSkills
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.error('Installed ' + names.length + ' skills from pbakaus/impeccable');
}

function parseFrontmatter(content) {
  var meta = {};
  var match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (match) {
    var lines = match[1].split('\n');
    for (var i = 0; i < lines.length; i++) {
      var idx = lines[i].indexOf(':');
      if (idx > 0) {
        var key = lines[i].substring(0, idx).trim();
        var val = lines[i].substring(idx + 1).trim();
        meta[key] = val;
      }
    }
  }
  return meta;
}

// ===================================================================
// Core: load and output SKILL.md content
// ===================================================================

function loadSkillContent(skillDirName) {
  var skillDir = path.join(REPO_DIR, skillDirName);
  var skillMd = path.join(skillDir, 'SKILL.md');

  try {
    fs.statSync(skillMd);
  } catch (e) {
    return null;
  }

  var content = fs.readFileSync(skillMd, 'utf8');

  // Also load reference/companion files
  var files = listFilesRecursive(skillDir, skillDir);
  var refs = [];
  for (var i = 0; i < files.length; i++) {
    if (files[i] === 'SKILL.md') continue;
    try {
      var refContent = fs.readFileSync(path.join(skillDir, files[i]), 'utf8');
      refs.push({ path: files[i], content: refContent });
    } catch (e) {}
  }

  return { content: content, refs: refs };
}

// ===================================================================
// Commands
// ===================================================================

function invokeSkill(command, targetArgs, options) {
  var skillDirName = COMMAND_MAP[command];
  if (!skillDirName) {
    console.error('Unknown command: ' + command);
    console.error('Available: ' + Object.keys(COMMAND_MAP).join(', '));
    process.exit(1);
  }

  // Auto-install if needed
  if (!isInstalled()) {
    try {
      autoInstall();
    } catch (e) {
      console.error('Error installing impeccable skills: ' + e.message);
      console.error('Install manually: pave run skills add pbakaus/impeccable');
      process.exit(1);
    }
  }

  var skill = loadSkillContent(skillDirName);
  if (!skill) {
    console.error('Skill not found: ' + skillDirName);
    console.error('Try reinstalling: pave run skills add pbakaus/impeccable');
    process.exit(1);
  }

  if (options.json) {
    var result = {
      skill: command,
      target: targetArgs || null,
      instructions: skill.content,
      references: skill.refs.map(function(r) { return { path: r.path, content: r.content }; })
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Output the skill instructions for the AI to follow
  // This is what the AI reads as the tool result
  var output = [];

  output.push('# Design Skill: ' + command);
  if (targetArgs) {
    output.push('Target: ' + targetArgs);
  }
  output.push('');
  output.push('Follow these instructions to ' + command + (targetArgs ? ' ' + targetArgs : '') + ':');
  output.push('');
  output.push(skill.content);

  // Append reference files
  for (var i = 0; i < skill.refs.length; i++) {
    output.push('');
    output.push('---');
    output.push('## Reference: ' + skill.refs[i].path);
    output.push('');
    output.push(skill.refs[i].content);
  }

  console.log(output.join('\n'));
}

// ===================================================================
// Argument parsing + main
// ===================================================================

var command = args[0];
var options = {};
var positional = [];

for (var i = 1; i < args.length; i++) {
  if (args[i] === '--json') {
    options.json = true;
  } else if (args[i].charAt(0) !== '-') {
    positional.push(args[i]);
  }
}

var targetArgs = positional.join(' ') || null;

if (!command || command === 'help' || command === '--help') {
  console.log('OpenPAVE Design v1.0.0');
  console.log('Design skills for AI agents\n');
  console.log('Usage: design <command> [target]\n');
  console.log('Commands:');
  var cmds = Object.keys(COMMAND_MAP);
  for (var i = 0; i < cmds.length; i++) {
    var name = cmds[i];
    var pad = '                    ';
    var label = '  ' + name + pad.substring(name.length);
    console.log(label + (DESCRIPTIONS[name] || ''));
  }
  console.log('\nExamples:');
  console.log('  design polish the hero section');
  console.log('  design audit the checkout flow');
  console.log('  design animate the card transitions');
  console.log('  design frontend-design a pricing page');
  console.log('  design teach');
} else if (COMMAND_MAP[command]) {
  invokeSkill(command, targetArgs, options);
} else {
  console.error('Unknown command: ' + command);
  console.error('Run "design help" for available commands');
  process.exit(1);
}
