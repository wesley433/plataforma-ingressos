import { test } from 'node:test';
import assert from 'node:assert/strict';

// sanitize-html só existe depois do npm install (roda no CI); localmente sem node_modules o teste é pulado.
const mod = await import('./sanitize.ts').catch(() => null);

test('remove scripts, eventos e estilos; mantém formatação', { skip: !mod }, () => {
  const out = mod!.sanitizeDescription(
    '<h2>Programação</h2><p onclick="x()">Olá <strong>mundo</strong><script>alert(1)</script></p><img src=x onerror=alert(1)><p style="color:red">ok</p>',
  );
  assert.equal(out, '<h2>Programação</h2><p>Olá <strong>mundo</strong></p><p>ok</p>');
});

test('links abrem em nova aba e não aceitam javascript:', { skip: !mod }, () => {
  const out = mod!.sanitizeDescription('<a href="https://ex.com">site</a><a href="javascript:alert(1)">x</a>');
  assert.match(out, /<a href="https:\/\/ex.com" target="_blank" rel="noopener noreferrer nofollow">site<\/a>/);
  assert.ok(!out.includes('javascript'));
});

test('texto puro resumido', { skip: !mod }, () => {
  assert.equal(mod!.plainText('<p>Um <strong>show</strong></p><p>incrível</p>'), 'Um show incrível');
  assert.equal(mod!.plainText('<p>' + 'a'.repeat(300) + '</p>', 10).length, 10);
});
