import assert from 'node:assert/strict';
import test from 'node:test';

import { parseExif } from '../src/exif.ts';

/**
 * Builds a minimal little-endian JPEG+EXIF buffer with Make, DateTimeOriginal and GPS, so the
 * parser is exercised against a real byte layout rather than a fixture we can't inspect.
 */
function buildJpegWithExif(): Uint8Array {
  const heap: number[] = []; // data pool that IFD entries point into (relative to tiffStart)
  const enc = (s: string) => [...s].map((c) => c.charCodeAt(0)).concat(0);
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const rational = (num: number, den: number) => [...u32(num), ...u32(den)];

  // TIFF: header(8) + IFD0 + ExifIFD + GPSIFD, then the heap.
  // IFD0 has 3 entries (12b each) + count(2) + next(4) = 42, starting at offset 8 => ends 50.
  const ifd0 = 8;
  const exifIfd = 50;
  // ExifIFD: 1 entry => 2 + 12 + 4 = 18 => ends 68.
  const gpsIfd = 68;
  // GPSIFD: 4 entries => 2 + 48 + 4 = 54 => ends 122.
  const heapStart = 122;

  const push = (bytes: number[]) => {
    const at = heapStart + heap.length;
    heap.push(...bytes);
    return at;
  };
  const makeOff = push(enc('TestCam')); // 8 bytes
  const dateOff = push(enc('2021:06:15 10:20:30')); // 20 bytes
  const latOff = push([...rational(37, 1), ...rational(48, 1), ...rational(30, 1)]); // 37°48'30"
  const lonOff = push([...rational(122, 1), ...rational(16, 1), ...rational(0, 1)]); // 122°16'0"

  const entry = (tag: number, type: number, count: number, value: number[]) => {
    const v = [...value];
    while (v.length < 4) v.push(0);
    return [...u16(tag), ...u16(type), ...u32(count), ...v.slice(0, 4)];
  };

  const tiff: number[] = [];
  tiff.push(0x49, 0x49, 0x2a, 0x00, ...u32(ifd0)); // II, 42, IFD0 offset
  // IFD0
  tiff.push(...u16(3));
  tiff.push(...entry(0x010f, 2, 8, u32(makeOff))); // Make (ASCII, offset)
  tiff.push(...entry(0x8769, 4, 1, u32(exifIfd))); // Exif IFD pointer
  tiff.push(...entry(0x8825, 4, 1, u32(gpsIfd))); // GPS IFD pointer
  tiff.push(...u32(0)); // next IFD = 0
  // ExifIFD
  tiff.push(...u16(1));
  tiff.push(...entry(0x9003, 2, 20, u32(dateOff))); // DateTimeOriginal
  tiff.push(...u32(0));
  // GPSIFD
  tiff.push(...u16(4));
  tiff.push(...entry(0x0001, 2, 2, enc('N'))); // lat ref inline
  tiff.push(...entry(0x0002, 5, 3, u32(latOff))); // latitude rationals
  tiff.push(...entry(0x0003, 2, 2, enc('W'))); // lon ref inline (west)
  tiff.push(...entry(0x0004, 5, 3, u32(lonOff))); // longitude rationals
  tiff.push(...u32(0));
  tiff.push(...heap);

  // Wrap in a JPEG: FFD8, APP1(FFE1, size, "Exif\0\0", tiff), FFD9.
  const app1Payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const size = app1Payload.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, (size >> 8) & 0xff, size & 0xff, ...app1Payload, 0xff, 0xd9]);
}

test('extracts GPS, date and camera from a JPEG with EXIF', () => {
  const r = parseExif(buildJpegWithExif());
  assert.equal(r.parsed, true);
  assert.equal(r.hasExif, true);
  assert.ok(r.gps, 'expected GPS');
  assert.ok(Math.abs(r.gps!.lat - 37.80833) < 0.001, `lat ${r.gps!.lat}`);
  assert.ok(Math.abs(r.gps!.lon - -122.26667) < 0.001, `lon ${r.gps!.lon}`); // W => negative
  assert.equal(r.dateTimeOriginal, '2021:06:15 10:20:30');
  assert.equal(r.make, 'TestCam');
  assert.ok(r.fields.some((f) => f.key === 'gps'));
});

test('a JPEG without EXIF parses but reports no metadata', () => {
  const r = parseExif(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]));
  assert.equal(r.parsed, true);
  assert.equal(r.hasExif, false);
  assert.equal(r.gps, undefined);
  assert.equal(r.fields.length, 0);
});

test('a non-JPEG file is rejected', () => {
  const r = parseExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47])); // PNG header
  assert.equal(r.parsed, false);
  assert.equal(r.hasExif, false);
});

test('a truncated EXIF segment does not throw', () => {
  assert.doesNotThrow(() => parseExif(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x20, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x49, 0x49])));
});
