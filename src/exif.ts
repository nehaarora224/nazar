/**
 * A small, self-contained EXIF reader for JPEG files. It extracts only the privacy-relevant
 * fields Nazar reports: GPS coordinates, capture date/time, and camera make/model. It never
 * uploads anything — parsing happens on the bytes in memory on the device.
 *
 * It reads the JPEG APP1 (Exif) segment, the TIFF header, IFD0, the Exif sub-IFD and the GPS
 * sub-IFD. Unknown tags are ignored. Non-JPEG or stripped files yield an empty result.
 *
 * This file is pure (no React Native imports) so it can be unit-tested under Node. The native
 * file reader lives in exifReader.ts.
 */
export type ExifData = {
  /** True when the file is a JPEG we could parse (even if it carried no EXIF). */
  parsed: boolean;
  hasExif: boolean;
  gps?: { lat: number; lon: number };
  dateTimeOriginal?: string;
  make?: string;
  model?: string;
  /** Tags we recognised, for an honest "what was found" list. */
  fields: { key: string; value: string }[];
};

const EMPTY: ExifData = { parsed: false, hasExif: false, fields: [] };

export function parseExif(bytes: Uint8Array): ExifData {
  // JPEG starts with FFD8.
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return EMPTY;

  // Walk JPEG markers to find APP1 (FFE1) carrying "Exif\0\0".
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (size < 2) break;
    if (marker === 0xe1) {
      const start = offset + 4;
      if (
        bytes[start] === 0x45 && // E
        bytes[start + 1] === 0x78 && // x
        bytes[start + 2] === 0x69 && // i
        bytes[start + 3] === 0x66 // f
      ) {
        return parseTiff(bytes, start + 6);
      }
    }
    if (marker === 0xda) break; // Start of scan: no more metadata.
    offset += 2 + size;
  }
  return { ...EMPTY, parsed: true };
}

function parseTiff(bytes: Uint8Array, tiffStart: number): ExifData {
  const out: ExifData = { parsed: true, hasExif: true, fields: [] };
  if (tiffStart + 8 > bytes.length) return out;
  const little = bytes[tiffStart] === 0x49; // "II" = little-endian, "MM" = big-endian.
  const u16 = (o: number) => (little ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1]);
  const u32 = (o: number) =>
    (little
      ? bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)
      : (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;

  const readAscii = (o: number, count: number) => {
    let s = '';
    for (let i = 0; i < count && bytes[o + i]; i++) s += String.fromCharCode(bytes[o + i]);
    return s.trim();
  };
  const readRational = (o: number) => {
    const n = u32(o);
    const d = u32(o + 4);
    return d === 0 ? 0 : n / d;
  };

  // Each IFD entry: tag(2) type(2) count(4) value/offset(4).
  const readIFD = (ifdOffset: number, handler: (tag: number, type: number, count: number, valOff: number) => void) => {
    const base = tiffStart + ifdOffset;
    if (base + 2 > bytes.length) return 0;
    const entries = u16(base);
    for (let i = 0; i < entries; i++) {
      const e = base + 2 + i * 12;
      if (e + 12 > bytes.length) break;
      handler(u16(e), u16(e + 2), u32(e + 4), e + 8);
    }
    const nextOff = base + 2 + entries * 12;
    return nextOff + 4 <= bytes.length ? u32(nextOff) : 0;
  };

  let exifIFD = 0;
  let gpsIFD = 0;
  readIFD(u32(tiffStart + 4), (tag, type, count, valOff) => {
    if (tag === 0x8769) exifIFD = u32(valOff);
    else if (tag === 0x8825) gpsIFD = u32(valOff);
    else if (tag === 0x010f) out.make = readAscii(tiffStart + (count > 4 ? u32(valOff) : valOff - tiffStart), count);
    else if (tag === 0x0110) out.model = readAscii(tiffStart + (count > 4 ? u32(valOff) : valOff - tiffStart), count);
    void type;
  });

  if (exifIFD) {
    readIFD(exifIFD, (tag, type, count, valOff) => {
      if (tag === 0x9003 || tag === 0x9004) {
        // DateTimeOriginal / DateTimeDigitized (20 bytes, stored at an offset).
        const o = count > 4 ? tiffStart + u32(valOff) : valOff;
        const v = readAscii(o, count);
        if (v && !out.dateTimeOriginal) out.dateTimeOriginal = v;
      }
      void type;
    });
  }

  if (gpsIFD) {
    let latRef = 'N';
    let lonRef = 'E';
    let lat: number | undefined;
    let lon: number | undefined;
    const dms = (o: number) => readRational(o) + readRational(o + 8) / 60 + readRational(o + 16) / 3600;
    readIFD(gpsIFD, (tag, _type, count, valOff) => {
      if (tag === 0x0001) latRef = readAscii(valOff, 2) || 'N';
      else if (tag === 0x0003) lonRef = readAscii(valOff, 2) || 'E';
      else if (tag === 0x0002 && count === 3) lat = dms(tiffStart + u32(valOff));
      else if (tag === 0x0004 && count === 3) lon = dms(tiffStart + u32(valOff));
    });
    if (lat !== undefined && lon !== undefined && (lat !== 0 || lon !== 0)) {
      out.gps = { lat: latRef === 'S' ? -lat : lat, lon: lonRef === 'W' ? -lon : lon };
    }
  }

  if (out.gps) out.fields.push({ key: 'gps', value: `${out.gps.lat.toFixed(5)}, ${out.gps.lon.toFixed(5)}` });
  if (out.dateTimeOriginal) out.fields.push({ key: 'datetime', value: out.dateTimeOriginal });
  if (out.make || out.model) out.fields.push({ key: 'camera', value: [out.make, out.model].filter(Boolean).join(' ') });
  out.hasExif = out.fields.length > 0;
  return out;
}
