const assert = require('node:assert/strict');

// Evaluate only the integer set/operation and single-comparison execute commands
// used by these regression cases. This is not a Minecraft server emulator.
exports.executeScores = function executeScores(result, initial = []) {
  const scores = new Map(initial.map(([holder, objective, value]) => [`${holder} ${objective}`, value]));
  const read = key => {
    assert.ok(scores.has(key), `Uninitialized score reference: ${key}`);
    return scores.get(key);
  };
  const run = command => {
    if (!command) return;
    let match = /^execute (if|unless) score (\S+ \S+) ([<>=]+) (\S+ \S+) run (.+)$/.exec(command);
    if (match) {
      const [, mode, left, comparison, right, inner] = match;
      const a = read(left);
      const b = read(right);
      const comparisons = { '=': a === b, '<': a < b, '<=': a <= b, '>': a > b, '>=': a >= b };
      assert.ok(Object.hasOwn(comparisons, comparison), `Unsupported comparison: ${comparison}`);
      if (comparisons[comparison] === (mode === 'if')) run(inner);
      return;
    }
    match = /^scoreboard players set (\S+ \S+) (-?\d+)$/.exec(command);
    if (match) {
      scores.set(match[1], Number(match[2]));
      return;
    }
    match = /^scoreboard players operation (\S+ \S+) (=|\+=|-=|\*=|\/=|%=) (\S+ \S+)$/.exec(command);
    assert.ok(match, `Unsupported command: ${command}`);
    const [, target, operation, source] = match;
    const right = read(source);
    if (operation === '=') scores.set(target, right);
    else {
      const left = read(target);
      if (operation === '/=' || operation === '%=') {
        assert.ok(left >= 0 && right > 0, 'Division/remainder tests support nonnegative dividends and positive divisors only');
        scores.set(target, operation === '/=' ? Math.floor(left / right) : left % right);
      } else scores.set(target, operation === '+=' ? left + right : operation === '-=' ? left - right : left * right);
    }
  };
  for (const command of [...result.resValues, ...result.resFormulas]) run(command);
  return scores;
};
