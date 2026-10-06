import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import renderHTML from 'helpers/renderHTML';

const html = (input: string | null | undefined): string =>
  renderToStaticMarkup(createElement(Fragment, null, renderHTML(input)));

describe('renderHTML', () => {
  it('renders allowed markup', () => {
    expect(html('<p>Hello <b>world</b></p>')).toBe('<p>Hello <b>world</b></p>');
  });

  it('renders nothing for empty, null and undefined input', () => {
    expect(html('')).toBe('');
    expect(html(null)).toBe('');
    expect(html(undefined)).toBe('');
  });

  it('drops script tags and their content', () => {
    expect(html('<p>a</p><script>alert(1)</script>')).toBe('<p>a</p>');
  });

  it('drops tags that are not allowed but keeps their text', () => {
    expect(html('<p>a <marquee>b</marquee></p>')).toBe('<p>a b</p>');
  });

  it('drops event handler attributes', () => {
    expect(html('<p onclick="alert(1)" id="x">a</p>')).toBe('<p id="x">a</p>');
  });

  it('keeps href, target and download on links, and drops javascript: hrefs', () => {
    expect(html('<a href="https://a.b" target="_blank" download="f">x</a>')).toBe(
      '<a href="https://a.b" target="_blank" download="f">x</a>',
    );
    expect(html('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('keeps data, http and https image sources and drops other schemes', () => {
    expect(html('<img src="data:image/png;base64,AAAA" alt="a" />')).toContain('src="data:image/png;base64,AAAA"');
    expect(html('<img src="https://a.b/i.png" />')).toContain('src="https://a.b/i.png"');
    expect(html('<img src="ftp://a.b/i.png" />')).not.toContain('src=');
  });

  it('allows only the listed attributes on other tags', () => {
    expect(html('<span style="color:red" class="c" title="t">a</span>')).toBe('<span style="color:red" class="c">a</span>');
  });

  it('does not allow href on non-link tags', () => {
    expect(html('<p href="https://a.b">a</p>')).toBe('<p>a</p>');
  });
});
