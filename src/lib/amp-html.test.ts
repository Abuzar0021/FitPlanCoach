import { test } from "node:test";
import assert from "node:assert/strict";
import { toAmpHtml, usesAmpYoutube, escapeHtml } from "./amp-html.ts";

const sampleContentHtml = `
<h2>Getting started</h2>
<p>Some <strong>bold</strong> and <em>italic</em> text with a <a href="https://example.com">link</a>.</p>
<img src="https://cdn.example.com/photo.jpg" alt="A cover photo">
<div data-youtube-video=""><iframe width="640" height="360" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" frameborder="0" allow="accelerometer; autoplay" allowfullscreen="true"></iframe></div>
<div data-callout="tip" class="callout callout-tip"><p>Pro tip: drink water.</p></div>
<blockquote><p>Quoted text</p></blockquote>
<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>
<pre><code>const x = 1;</code></pre>
`;

test("toAmpHtml converts <img> to <amp-img> with required width/height", () => {
  const out = toAmpHtml(sampleContentHtml);
  assert.match(
    out,
    /<amp-img src="https:\/\/cdn\.example\.com\/photo\.jpg" alt="A cover photo" width="1200" height="675" layout="responsive"><\/amp-img>/,
  );
  assert.doesNotMatch(out, /<img\b/);
});

test("toAmpHtml converts the rich-text editor's YouTube embed to <amp-youtube>", () => {
  const out = toAmpHtml(sampleContentHtml);
  assert.match(
    out,
    /<amp-youtube data-videoid="dQw4w9WgXcQ" layout="responsive" width="480" height="270"><\/amp-youtube>/,
  );
  assert.doesNotMatch(out, /<iframe\b/);
  assert.doesNotMatch(out, /data-youtube-video/);
});

test("toAmpHtml leaves callouts, blockquotes, tables, and code untouched", () => {
  const out = toAmpHtml(sampleContentHtml);
  assert.match(out, /<div data-callout="tip" class="callout callout-tip">/);
  assert.match(out, /<blockquote><p>Quoted text<\/p><\/blockquote>/);
  assert.match(out, /<table>/);
  assert.match(out, /<pre><code>const x = 1;<\/code><\/pre>/);
});

test("usesAmpYoutube detects amp-youtube presence", () => {
  assert.equal(usesAmpYoutube(toAmpHtml(sampleContentHtml)), true);
  assert.equal(usesAmpYoutube(toAmpHtml("<p>no video here</p>")), false);
});

test("toAmpHtml strips a stray non-YouTube iframe as a safety net", () => {
  const html = `<p>before</p><iframe src="https://evil.example.com/x"></iframe><p>after</p>`;
  const out = toAmpHtml(html);
  assert.doesNotMatch(out, /<iframe\b/);
  assert.match(out, /<p>before<\/p>/);
  assert.match(out, /<p>after<\/p>/);
});

test("escapeHtml escapes ampersand, angle brackets, and quotes", () => {
  assert.equal(
    escapeHtml(`<a href="x">&'AT&T'</a>`),
    "&lt;a href=&quot;x&quot;&gt;&amp;'AT&amp;T'&lt;/a&gt;",
  );
});
