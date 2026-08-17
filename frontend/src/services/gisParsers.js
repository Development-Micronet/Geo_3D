/**
 * Pure Open-Source Client-Side GIS Parsers
 * 100% Free, Local & Offline — Zero External Utility Server Dependencies
 * Supports: KML, KMZ, Shapefiles (.shp / .zip), GeoTIFF / Rasters, GPX, CSV, GeoJSON, GroundOverlays, DSM / DEM Grids
 */

/**
 * Standard-compliant ZIP unpacker using Central Directory and Web DecompressionStream
 * Handles archives with Bit 3 Data Descriptors (Google Earth / Satellite KMZ files, Shapefile ZIPs)
 */
export async function parseZipArchive(buffer) {
  const bytes = new Uint8Array(buffer);
  const dataView = new DataView(buffer);
  const files = {};

  // 1. Check if the file is already plain text XML/KML
  const textPrefix = new TextDecoder("utf-8").decode(bytes.subarray(0, 150)).trim();
  if (textPrefix.startsWith("<?xml") || textPrefix.includes("<kml") || textPrefix.includes("<Document")) {
    files["doc.kml"] = bytes;
    return files;
  }

  // 2. Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  const searchLimit = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= searchLimit; i--) {
    if (dataView.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  // 3. Parse Central Directory if EOCD found
  if (eocdOffset !== -1) {
    const numEntries = dataView.getUint16(eocdOffset + 10, true);
    const centralDirOffset = dataView.getUint32(eocdOffset + 16, true);
    let cdOffset = centralDirOffset;

    for (let entry = 0; entry < numEntries; entry++) {
      if (cdOffset >= bytes.length - 46) break;
      const cdSig = dataView.getUint32(cdOffset, true);
      if (cdSig !== 0x02014b50) break;

      const compression = dataView.getUint16(cdOffset + 10, true);
      const compressedSize = dataView.getUint32(cdOffset + 20, true);
      const fileNameLength = dataView.getUint16(cdOffset + 28, true);
      const extraFieldLength = dataView.getUint16(cdOffset + 30, true);
      const fileCommentLength = dataView.getUint16(cdOffset + 32, true);
      const localHeaderOffset = dataView.getUint32(cdOffset + 42, true);

      const fileNameBytes = bytes.subarray(cdOffset + 46, cdOffset + 46 + fileNameLength);
      const fileName = new TextDecoder("utf-8").decode(fileNameBytes);

      // Locate data from Local Header
      if (localHeaderOffset < bytes.length - 30) {
        const localFileNameLen = dataView.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = dataView.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
        const fileData = bytes.subarray(dataStart, dataStart + compressedSize);

        if (compressedSize > 0) {
          if (compression === 0) {
            files[fileName] = fileData;
          } else if (compression === 8) {
            try {
              const ds = new DecompressionStream("deflate-raw");
              const writer = ds.writable.getWriter();
              writer.write(fileData);
              writer.close();
              const response = new Response(ds.readable);
              const decompressed = await response.arrayBuffer();
              files[fileName] = new Uint8Array(decompressed);
            } catch (e) {
              console.warn("Decompression error for:", fileName, e);
              files[fileName] = fileData;
            }
          } else {
            files[fileName] = fileData;
          }
        }
      }

      cdOffset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
    }
  }

  // 4. Fallback scan of Local Headers
  if (Object.keys(files).length === 0) {
    let offset = 0;
    while (offset < bytes.length - 30) {
      const sig = dataView.getUint32(offset, true);
      if (sig !== 0x04034b50) {
        offset++;
        continue;
      }

      const compression = dataView.getUint16(offset + 8, true);
      let compressedSize = dataView.getUint32(offset + 18, true);
      const fileNameLength = dataView.getUint16(offset + 26, true);
      const extraFieldLength = dataView.getUint16(offset + 28, true);
      const fileName = new TextDecoder("utf-8").decode(bytes.subarray(offset + 30, offset + 30 + fileNameLength));
      const dataStart = offset + 30 + fileNameLength + extraFieldLength;

      if (compressedSize === 0) {
        let nextHeader = bytes.length;
        for (let j = dataStart; j < bytes.length - 4; j++) {
          const s = dataView.getUint32(j, true);
          if (s === 0x04034b50 || s === 0x02014b50 || s === 0x08074b50) {
            nextHeader = j;
            break;
          }
        }
        compressedSize = nextHeader - dataStart;
      }

      const fileData = bytes.subarray(dataStart, dataStart + compressedSize);
      if (compression === 0) {
        files[fileName] = fileData;
      } else if (compression === 8) {
        try {
          const ds = new DecompressionStream("deflate-raw");
          const writer = ds.writable.getWriter();
          writer.write(fileData);
          writer.close();
          const response = new Response(ds.readable);
          const decompressed = await response.arrayBuffer();
          files[fileName] = new Uint8Array(decompressed);
        } catch (e) {
          files[fileName] = fileData;
        }
      }

      offset = dataStart + compressedSize;
    }
  }

  return files;
}

/**
 * Convert KML AABBGGRR color format to RGBA [r, g, b, a]
 */
function parseKmlColor(kmlHex) {
  if (!kmlHex) return null;
  const hex = kmlHex.trim().toLowerCase();
  if (hex.length < 6) return null;
  const full = hex.padStart(8, "f");
  const a = parseInt(full.substring(0, 2), 16) / 255;
  const b = parseInt(full.substring(2, 4), 16);
  const g = parseInt(full.substring(4, 6), 16);
  const r = parseInt(full.substring(6, 8), 16);
  return [r, g, b, isNaN(a) ? 1 : Math.min(1, Math.max(0, a))];
}

/**
 * Free KML to GeoJSON Parser
 * Parses Placemarks, Styles, LineStyle, PolyStyle, IconStyle, and GroundOverlays
 */
export function parseKml(kmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, "application/xml");
  const features = [];

  // Parse Document Styles
  const styles = {};
  doc.querySelectorAll("Style").forEach((s) => {
    const id = s.getAttribute("id");
    if (!id) return;
    const lineStyle = s.querySelector("LineStyle");
    const polyStyle = s.querySelector("PolyStyle");
    const iconStyle = s.querySelector("IconStyle");

    const parsed = {};
    if (lineStyle) {
      const col = lineStyle.querySelector("color")?.textContent?.trim();
      const width = parseFloat(lineStyle.querySelector("width")?.textContent?.trim());
      if (col) parsed.lineColor = parseKmlColor(col);
      if (!isNaN(width)) parsed.lineWidth = width;
    }
    if (polyStyle) {
      const col = polyStyle.querySelector("color")?.textContent?.trim();
      const fill = polyStyle.querySelector("fill")?.textContent?.trim();
      const outline = polyStyle.querySelector("outline")?.textContent?.trim();
      if (col) parsed.polyColor = parseKmlColor(col);
      if (fill !== undefined) parsed.polyFill = fill === "1" || fill === "true";
      if (outline !== undefined) parsed.polyOutline = outline === "1" || outline === "true";
    }
    if (iconStyle) {
      const col = iconStyle.querySelector("color")?.textContent?.trim();
      const scale = parseFloat(iconStyle.querySelector("scale")?.textContent?.trim());
      const href = iconStyle.querySelector("Icon href, href")?.textContent?.trim();
      if (col) parsed.iconColor = parseKmlColor(col);
      if (!isNaN(scale)) parsed.iconScale = scale;
      if (href) parsed.iconHref = href;
    }
    styles[id] = parsed;
    styles["#" + id] = parsed;
  });

  function parseCoordString(str) {
    if (!str) return [];
    return str
      .trim()
      .split(/\s+/)
      .map((c) => c.split(",").map((p) => parseFloat(p.trim())))
      .filter((p) => p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]))
      .map((p) => (p.length === 2 ? [p[0], p[1], 0] : [p[0], p[1], p[2] || 0]));
  }

  function getPlacemarkStyle(pm) {
    const styleUrl = pm.querySelector("styleUrl")?.textContent?.trim();
    let style = styleUrl && styles[styleUrl] ? { ...styles[styleUrl] } : {};
    const inlineStyle = pm.querySelector("Style");
    if (inlineStyle) {
      const lineStyle = inlineStyle.querySelector("LineStyle");
      const polyStyle = inlineStyle.querySelector("PolyStyle");
      if (lineStyle) {
        const col = lineStyle.querySelector("color")?.textContent?.trim();
        const width = parseFloat(lineStyle.querySelector("width")?.textContent?.trim());
        if (col) style.lineColor = parseKmlColor(col);
        if (!isNaN(width)) style.lineWidth = width;
      }
      if (polyStyle) {
        const col = polyStyle.querySelector("color")?.textContent?.trim();
        const fill = polyStyle.querySelector("fill")?.textContent?.trim();
        const outline = polyStyle.querySelector("outline")?.textContent?.trim();
        if (col) style.polyColor = parseKmlColor(col);
        if (fill !== undefined) style.polyFill = fill === "1" || fill === "true";
        if (outline !== undefined) style.polyOutline = outline === "1" || outline === "true";
      }
    }
    return style;
  }

  // 1. Placemarks
  const placemarks = doc.querySelectorAll("Placemark");
  placemarks.forEach((pm) => {
    const name = pm.querySelector("name")?.textContent?.trim() || "KML Feature";
    const description = pm.querySelector("description")?.textContent?.trim() || "";
    const style = getPlacemarkStyle(pm);

    const properties = { name, description, _style: style };
    pm.querySelectorAll("SimpleData, Data").forEach((d) => {
      const key = d.getAttribute("name");
      const val = d.querySelector("value")?.textContent?.trim() || d.textContent?.trim();
      if (key && val) properties[key] = val;
    });

    // Point
    const point = pm.querySelector("Point");
    if (point) {
      const coords = parseCoordString(point.querySelector("coordinates")?.textContent?.trim());
      if (coords.length > 0) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: coords[0] },
          properties,
        });
      }
    }

    // LineString
    const lineString = pm.querySelector("LineString");
    if (lineString) {
      const coords = parseCoordString(lineString.querySelector("coordinates")?.textContent?.trim());
      if (coords.length > 0) {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties,
        });
      }
    }

    // Polygon
    const polygon = pm.querySelector("Polygon");
    if (polygon) {
      const outerRing =
        polygon.querySelector("outerBoundaryIs coordinates")?.textContent?.trim() ||
        polygon.querySelector("coordinates")?.textContent?.trim();
      const coords = parseCoordString(outerRing);
      if (coords.length > 0) {
        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [coords] },
          properties,
        });
      }
    }

    // MultiGeometry
    const multiGeo = pm.querySelector("MultiGeometry");
    if (multiGeo) {
      multiGeo.querySelectorAll("Point").forEach((pt) => {
        const coords = parseCoordString(pt.querySelector("coordinates")?.textContent?.trim());
        if (coords.length > 0) {
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: coords[0] },
            properties,
          });
        }
      });
      multiGeo.querySelectorAll("LineString").forEach((ls) => {
        const coords = parseCoordString(ls.querySelector("coordinates")?.textContent?.trim());
        if (coords.length > 0) {
          features.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties,
          });
        }
      });
      multiGeo.querySelectorAll("Polygon").forEach((poly) => {
        const coords = parseCoordString(poly.querySelector("coordinates")?.textContent?.trim());
        if (coords.length > 0) {
          features.push({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [coords] },
            properties,
          });
        }
      });
    }
  });

  // 2. GroundOverlays (Satellite imagery footprints & bounds from Pleiades, Sentinel, Landsat, etc.)
  const groundOverlays = doc.querySelectorAll("GroundOverlay");
  groundOverlays.forEach((go) => {
    const name = go.querySelector("name")?.textContent?.trim() || "Satellite Ground Overlay";
    const description = go.querySelector("description")?.textContent?.trim() || "";

    const latLonBox = go.querySelector("LatLonBox");
    if (latLonBox) {
      const north = parseFloat(latLonBox.querySelector("north")?.textContent);
      const south = parseFloat(latLonBox.querySelector("south")?.textContent);
      const east = parseFloat(latLonBox.querySelector("east")?.textContent);
      const west = parseFloat(latLonBox.querySelector("west")?.textContent);

      if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [west, north, 0],
                [east, north, 0],
                [east, south, 0],
                [west, south, 0],
                [west, north, 0],
              ],
            ],
          },
          properties: {
            name,
            description,
            type: "GroundOverlay",
            north,
            south,
            east,
            west,
          },
        });
      }
    }

    const latLonQuad = go.querySelector("LatLonQuad coordinates");
    if (latLonQuad) {
      const coords = parseCoordString(latLonQuad.textContent);
      if (coords.length >= 4) {
        const closed = [...coords, coords[0]];
        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [closed] },
          properties: { name, description, type: "GroundOverlay" },
        });
      }
    }
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Free KMZ (Zipped KML) Parser
 * Extracts doc.kml from archive and parses to GeoJSON
 */
export async function parseKmz(fileBuffer) {
  const files = await parseZipArchive(fileBuffer);
  let kmlFileName = Object.keys(files).find((name) => name.toLowerCase().endsWith(".kml"));
  if (!kmlFileName) {
    for (const [name, data] of Object.entries(files)) {
      const sample = new TextDecoder("utf-8").decode(data.subarray(0, 150));
      if (sample.includes("<kml") || sample.includes("<Document")) {
        kmlFileName = name;
        break;
      }
    }
  }

  if (!kmlFileName) {
    throw new Error("No .kml file found inside the KMZ package");
  }

  const kmlBytes = files[kmlFileName];
  const kmlText = new TextDecoder("utf-8").decode(kmlBytes);
  return parseKml(kmlText);
}

/**
 * Free ESRI Shapefile Binary Parser (.shp, .zip)
 * Reads Point, PolyLine, Polygon and dBASE (.dbf) attributes
 */
export async function parseShapefile(buffer) {
  let shpBytes = null;
  let dbfBytes = null;

  const dataViewTest = new DataView(buffer);
  if (dataViewTest.getUint32(0, true) === 0x04034b50) {
    const files = await parseZipArchive(buffer);
    const shpName = Object.keys(files).find((n) => n.toLowerCase().endsWith(".shp"));
    const dbfName = Object.keys(files).find((n) => n.toLowerCase().endsWith(".dbf"));
    if (!shpName) throw new Error("No .shp file found inside the Shapefile ZIP package");
    shpBytes = files[shpName];
    if (dbfName) dbfBytes = files[dbfName];
  } else {
    shpBytes = new Uint8Array(buffer);
  }

  // Parse DBF Attributes
  const attributesList = [];
  if (dbfBytes) {
    try {
      const dbfView = new DataView(dbfBytes.buffer, dbfBytes.byteOffset, dbfBytes.byteLength);
      const numRecords = dbfView.getUint32(4, true);
      const headerLen = dbfView.getUint16(8, true);
      const recordLen = dbfView.getUint16(10, true);

      const fields = [];
      let fieldOffset = 32;
      while (fieldOffset < headerLen - 1) {
        if (dbfBytes[fieldOffset] === 0x0d) break;
        const nameBytes = dbfBytes.subarray(fieldOffset, fieldOffset + 11);
        const nullIdx = nameBytes.indexOf(0);
        const name = new TextDecoder("ascii").decode(nameBytes.subarray(0, nullIdx !== -1 ? nullIdx : 11)).trim();
        const length = dbfBytes[fieldOffset + 16];
        fields.push({ name, length });
        fieldOffset += 32;
      }

      let recOffset = headerLen;
      for (let r = 0; r < numRecords; r++) {
        if (recOffset + recordLen > dbfBytes.byteLength) break;
        const recProps = {};
        let colOffset = recOffset + 1;
        for (const field of fields) {
          const valBytes = dbfBytes.subarray(colOffset, colOffset + field.length);
          const valStr = new TextDecoder("utf-8").decode(valBytes).trim();
          recProps[field.name] = valStr;
          colOffset += field.length;
        }
        attributesList.push(recProps);
        recOffset += recordLen;
      }
    } catch (e) {
      console.warn("DBF parse fallback error:", e);
    }
  }

  // Parse SHP Binary
  const view = new DataView(shpBytes.buffer, shpBytes.byteOffset, shpBytes.byteLength);
  const fileCode = view.getInt32(0, false);
  if (fileCode !== 9994) {
    throw new Error("Invalid Shapefile header (code is not 9994)");
  }

  const features = [];
  let offset = 100;
  let recIdx = 0;

  while (offset < shpBytes.byteLength - 8) {
    const recNumber = view.getInt32(offset, false);
    const contentLength = view.getInt32(offset + 4, false) * 2;
    const recStart = offset + 8;
    if (recStart + contentLength > shpBytes.byteLength) break;

    const shapeType = view.getInt32(recStart, true);
    const properties = attributesList[recIdx] || { Record: recNumber };

    if (shapeType === 1 || shapeType === 11 || shapeType === 21) {
      const x = view.getFloat64(recStart + 4, true);
      const y = view.getFloat64(recStart + 12, true);
      const z = shapeType === 11 ? view.getFloat64(recStart + 20, true) : 0;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [x, y, z] },
        properties,
      });
    } else if (shapeType === 3 || shapeType === 13 || shapeType === 23) {
      const numParts = view.getInt32(recStart + 36, true);
      const numPoints = view.getInt32(recStart + 40, true);
      const parts = [];
      for (let p = 0; p < numParts; p++) {
        parts.push(view.getInt32(recStart + 44 + p * 4, true));
      }
      parts.push(numPoints);

      const pointsStart = recStart + 44 + numParts * 4;
      for (let p = 0; p < numParts; p++) {
        const startPt = parts[p];
        const endPt = parts[p + 1];
        const coords = [];
        for (let pt = startPt; pt < endPt; pt++) {
          const px = view.getFloat64(pointsStart + pt * 16, true);
          const py = view.getFloat64(pointsStart + pt * 16 + 8, true);
          coords.push([px, py, 0]);
        }
        if (coords.length > 0) {
          features.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties,
          });
        }
      }
    } else if (shapeType === 5 || shapeType === 15 || shapeType === 25) {
      const numParts = view.getInt32(recStart + 36, true);
      const numPoints = view.getInt32(recStart + 40, true);
      const parts = [];
      for (let p = 0; p < numParts; p++) {
        parts.push(view.getInt32(recStart + 44 + p * 4, true));
      }
      parts.push(numPoints);

      const pointsStart = recStart + 44 + numParts * 4;
      const rings = [];
      for (let p = 0; p < numParts; p++) {
        const startPt = parts[p];
        const endPt = parts[p + 1];
        const coords = [];
        for (let pt = startPt; pt < endPt; pt++) {
          const px = view.getFloat64(pointsStart + pt * 16, true);
          const py = view.getFloat64(pointsStart + pt * 16 + 8, true);
          coords.push([px, py, 0]);
        }
        if (coords.length > 0) {
          rings.push(coords);
        }
      }
      if (rings.length > 0) {
        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: rings },
          properties,
        });
      }
    }

    offset = recStart + contentLength;
    recIdx++;
  }

  if (features.length === 0) {
    throw new Error("No readable geometric features found in Shapefile");
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Free GeoTIFF & Raster Decoder
 * Decodes GeoTIFF tags, coordinate georeferencing, and renders raster pixels to Canvas
 */
/**
 * TIFF LZW Decompressor (Compression = 5)
 */
function decodeTiffLZW(bytes) {
  const output = [];
  const dictionary = [];

  function initDict() {
    dictionary.length = 258;
    for (let i = 0; i < 256; i++) {
      dictionary[i] = [i];
    }
    dictionary[256] = [];
    dictionary[257] = [];
  }

  initDict();
  let codeSize = 9;
  let bitPos = 0;

  function getNextCode() {
    const bytePos = bitPos >> 3;
    const bitOffset = bitPos & 7;
    if (bytePos >= bytes.length) return 257;

    const b0 = bytes[bytePos] || 0;
    const b1 = bytes[bytePos + 1] || 0;
    const b2 = bytes[bytePos + 2] || 0;
    let acc = (b0 << 16) | (b1 << 8) | b2;
    acc = (acc >>> (24 - bitOffset - codeSize)) & ((1 << codeSize) - 1);
    bitPos += codeSize;
    return acc;
  }

  let oldCode = -1;
  while (bitPos + codeSize <= bytes.length * 8 + 7) {
    const code = getNextCode();
    if (code === 257) break; // End of Information
    if (code === 256) {
      initDict();
      codeSize = 9;
      oldCode = getNextCode();
      if (oldCode === 257) break;
      if (dictionary[oldCode]) {
        for (let k = 0; k < dictionary[oldCode].length; k++) {
          output.push(dictionary[oldCode][k]);
        }
      }
      continue;
    }

    let entry;
    if (code < dictionary.length && dictionary[code]) {
      entry = dictionary[code];
    } else if (code === dictionary.length && oldCode >= 0 && dictionary[oldCode]) {
      entry = [...dictionary[oldCode], dictionary[oldCode][0]];
    } else {
      break;
    }

    for (let k = 0; k < entry.length; k++) {
      output.push(entry[k]);
    }

    if (oldCode >= 0 && dictionary[oldCode]) {
      dictionary.push([...dictionary[oldCode], entry[0]]);
      if (dictionary.length === (1 << codeSize) - 1 && codeSize < 12) {
        codeSize++;
      }
    }
    oldCode = code;
  }

  return new Uint8Array(output);
}

/**
 * TIFF PackBits Decompressor (Compression = 32773)
 */
function decodeTiffPackBits(bytes) {
  const output = [];
  let i = 0;
  while (i < bytes.length) {
    const header = bytes[i++];
    if (header === undefined) break;
    const n = header > 127 ? header - 256 : header;
    if (n >= 0 && n <= 127) {
      for (let j = 0; j <= n; j++) {
        if (i < bytes.length) output.push(bytes[i++]);
      }
    } else if (n >= -127 && n <= -1) {
      if (i < bytes.length) {
        const val = bytes[i++];
        for (let j = 0; j <= -n; j++) {
          output.push(val);
        }
      }
    }
  }
  return new Uint8Array(output);
}

/**
 * Free GeoTIFF & Normal TIFF Raster Decoder
 * Decodes standard photographic .tif/.tiff images and georeferenced GeoTIFFs directly to HTML5 Canvas
 * Supports: Uncompressed (1), LZW (5), Deflate (8, 32946), PackBits (32773), Multi-band RGB/RGBA, Grayscale, Colormaps & DEM Grids
 */
export async function parseGeoTiffRaster(buffer) {
  const view = new DataView(buffer);
  const isLittleEndian = view.getUint16(0) === 0x4949;
  const magic = view.getUint16(2, isLittleEndian);
  if (magic !== 42) {
    throw new Error("Not a valid TIFF/GeoTIFF raster file");
  }

  const ifdOffset = view.getUint32(4, isLittleEndian);
  const numEntries = view.getUint16(ifdOffset, isLittleEndian);

  let width = 0,
    height = 0;
  let samplesPerPixel = 1;
  let bitsPerSample = 8;
  let compression = 1;
  let photometric = 2; // 0=WhiteIsZero, 1=BlackIsZero, 2=RGB, 3=Palette, 5=CMYK
  let stripOffsets = [];
  let stripByteCounts = [];
  let tiepoints = [];
  let pixelScale = [];
  let modelTransform = [];
  let colorMap = [];
  let detectedWkid = 0;
  let sampleFormat = 1;
  let noDataVal = -9999;

  function readTagValues(tag, count, valOrOffset, type) {
    const vals = [];
    const typeSize = type === 3 ? 2 : type === 4 ? 4 : type === 12 ? 8 : 4;
    const isOffset = count * typeSize > 4;
    const baseOffset = isOffset ? valOrOffset : ifdOffset + 2 + tagIndex * 12 + 8;

    for (let k = 0; k < count; k++) {
      if (type === 3) vals.push(view.getUint16(baseOffset + k * 2, isLittleEndian));
      else if (type === 4) vals.push(view.getUint32(baseOffset + k * 4, isLittleEndian));
      else if (type === 12) vals.push(view.getFloat64(baseOffset + k * 8, isLittleEndian));
      else vals.push(view.getUint32(baseOffset + k * 4, isLittleEndian));
    }
    return vals;
  }

  let tagIndex = 0;
  for (let i = 0; i < numEntries; i++) {
    tagIndex = i;
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > buffer.byteLength) break;

    const tag = view.getUint16(entryOffset, isLittleEndian);
    const type = view.getUint16(entryOffset + 2, isLittleEndian);
    const count = view.getUint32(entryOffset + 4, isLittleEndian);
    const valOrOffset = view.getUint32(entryOffset + 8, isLittleEndian);

    if (tag === 256) width = count === 1 ? valOrOffset : view.getUint16(entryOffset + 8, isLittleEndian);
    if (tag === 257) height = count === 1 ? valOrOffset : view.getUint16(entryOffset + 8, isLittleEndian);
    if (tag === 258) bitsPerSample = count === 1 ? valOrOffset : view.getUint16(entryOffset + 8, isLittleEndian);
    if (tag === 259) compression = count === 1 ? valOrOffset : view.getUint16(entryOffset + 8, isLittleEndian);
    if (tag === 262) photometric = count === 1 ? valOrOffset : view.getUint16(entryOffset + 8, isLittleEndian);
    if (tag === 277) samplesPerPixel = count === 1 ? valOrOffset : view.getUint16(entryOffset + 8, isLittleEndian);
    if (tag === 320) colorMap = readTagValues(tag, count, valOrOffset, 3); // Colormap

    if (tag === 273) {
      // StripOffsets
      stripOffsets = readTagValues(tag, count, valOrOffset, type);
    }
    if (tag === 279) {
      // StripByteCounts
      stripByteCounts = readTagValues(tag, count, valOrOffset, type);
    }
    if (tag === 339) {
      // SampleFormat (1=unsigned int, 2=signed int, 3=float)
      sampleFormat = count === 1 ? valOrOffset : view.getUint16(entryOffset + 8, isLittleEndian);
    }
    if (tag === 42113) {
      // GDAL_NODATA
      const str = readTagValues(tag, count, valOrOffset, type);
      noDataVal = parseFloat(str);
    }
    if (tag === 33550) {
      // ModelPixelScaleTag
      pixelScale = readTagValues(tag, count, valOrOffset, 12);
    }
    if (tag === 33922) {
      // ModelTiepointTag
      tiepoints = readTagValues(tag, count, valOrOffset, 12);
    }
    if (tag === 34264) {
      // ModelTransformationTag (16 double values)
      modelTransform = readTagValues(tag, count, valOrOffset, 12);
    }
    if (tag === 34735) {
      // GeoKeyDirectoryTag
      const geoKeys = readTagValues(tag, count, valOrOffset, 3);
      if (geoKeys.length >= 4) {
        const numKeys = geoKeys[3];
        for (let k = 0; k < numKeys; k++) {
          const keyId = geoKeys[4 + k * 4];
          const val = geoKeys[4 + k * 4 + 3];
          if (keyId === 3072 && val > 0) {
            detectedWkid = val;
          } else if (keyId === 2048 && val > 0 && !detectedWkid) {
            detectedWkid = val;
          }
        }
      }
    }
  }

  if (width === 0 || height === 0) {
    throw new Error("Invalid TIFF dimensions");
  }

  // Georeference detection
  let hasGeoreference = false;
  let originX = 0,
    originY = 0,
    scaleX = 0.001,
    scaleY = 0.001;

  if (modelTransform && modelTransform.length >= 16) {
    hasGeoreference = true;
    originX = modelTransform[3];
    originY = modelTransform[7];
    scaleX = Math.abs(modelTransform[0]) || 0.001;
    scaleY = Math.abs(modelTransform[5]) || 0.001;
  } else if (tiepoints.length >= 6 && pixelScale.length >= 2) {
    hasGeoreference = true;
    originX = tiepoints[3];
    originY = tiepoints[4];
    scaleX = pixelScale[0];
    scaleY = pixelScale[1];
  }

  if (!detectedWkid) {
    if (Math.abs(originX) <= 180 && Math.abs(originY) <= 90) {
      detectedWkid = 4326;
    } else if (originX >= 100000 && originX <= 1000000 && originY >= 0 && originY <= 10000000) {
      detectedWkid = 32643;
    } else {
      detectedWkid = 3857;
    }
  }

  // Render pixels to Canvas
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(2048, width);
  canvas.height = Math.min(2048, height);
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  try {
    const rawBytes = new Uint8Array(buffer);
    let allStripsData = [];

    for (let s = 0; s < stripOffsets.length; s++) {
      const offset = stripOffsets[s];
      const byteCount = stripByteCounts[s] || rawBytes.length - offset;
      if (offset + byteCount > rawBytes.length) break;

      let stripData = rawBytes.subarray(offset, offset + byteCount);

      if (compression === 8 || compression === 32946) {
        // Deflate
        try {
          const ds = new DecompressionStream("deflate-raw");
          const writer = ds.writable.getWriter();
          writer.write(stripData);
          writer.close();
          const res = new Response(ds.readable);
          const decompressed = await res.arrayBuffer();
          stripData = new Uint8Array(decompressed);
        } catch (e) {
          console.warn("Deflate strip decompression fallback:", e);
        }
      } else if (compression === 5) {
        // LZW
        try {
          stripData = decodeTiffLZW(stripData);
        } catch (e) {
          console.warn("LZW strip decompression error:", e);
        }
      } else if (compression === 32773) {
        // PackBits
        try {
          stripData = decodeTiffPackBits(stripData);
        } catch (e) {
          console.warn("PackBits strip decompression error:", e);
        }
      }

      allStripsData.push(stripData);
    }

    // Combine strips
    const totalBytes = allStripsData.reduce((acc, curr) => acc + curr.length, 0);
    const combinedBytes = new Uint8Array(totalBytes);
    let curPos = 0;
    for (const strip of allStripsData) {
      combinedBytes.set(strip, curPos);
      curPos += strip.length;
    }

    const isFloat = bitsPerSample === 32 || sampleFormat === 3;
    const is16Bit = bitsPerSample === 16;

    let typedValues;
    if (isFloat) {
      typedValues = new Float32Array(combinedBytes.buffer, combinedBytes.byteOffset, Math.floor(combinedBytes.byteLength / 4));
    } else if (is16Bit) {
      typedValues = new Uint16Array(combinedBytes.buffer, combinedBytes.byteOffset, Math.floor(combinedBytes.byteLength / 2));
    } else {
      typedValues = combinedBytes;
    }

    const isDsmDem = (samplesPerPixel === 1 && (isFloat || is16Bit)) || (samplesPerPixel === 1 && hasGeoreference && photometric === 1 && Math.max(...typedValues.subarray(0, 100)) > 255);

    if (isDsmDem) {
      // Elevation DEM/DSM Heatmap Rendering
      let minVal = Infinity;
      let maxVal = -Infinity;

      for (let i = 0; i < typedValues.length; i++) {
        const val = typedValues[i];
        if (!isNaN(val) && val !== noDataVal && val > -9000 && val < 90000) {
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }
      }

      if (minVal === Infinity || maxVal === -Infinity || minVal === maxVal) {
        minVal = 0;
        maxVal = 255;
      }

      const range = maxVal - minVal;
      const stepX = width / canvas.width;
      const stepY = height / canvas.height;

      for (let y = 0; y < canvas.height; y++) {
        const srcY = Math.floor(y * stepY);
        for (let x = 0; x < canvas.width; x++) {
          const srcX = Math.floor(x * stepX);
          const srcIdx = srcY * width + srcX;
          const dstIdx = (y * canvas.width + x) * 4;

          if (srcIdx < typedValues.length) {
            const val = typedValues[srcIdx];
            if (isNaN(val) || val === noDataVal || val <= -9000 || val >= 90000) {
              data[dstIdx + 3] = 0; // Transparent NoData
            } else {
              const norm = Math.max(0, Math.min(1, (val - minVal) / range));
              let r = 0,
                g = 0,
                b = 0;

              if (norm < 0.25) {
                const t = norm / 0.25;
                r = 0;
                g = Math.floor(t * 255);
                b = 255;
              } else if (norm < 0.5) {
                const t = (norm - 0.25) / 0.25;
                r = 0;
                g = 255;
                b = Math.floor((1 - t) * 255);
              } else if (norm < 0.75) {
                const t = (norm - 0.5) / 0.25;
                r = Math.floor(t * 255);
                g = 255;
                b = 0;
              } else {
                const t = (norm - 0.75) / 0.25;
                r = 255;
                g = Math.floor((1 - t) * 255);
                b = 0;
              }

              data[dstIdx] = r;
              data[dstIdx + 1] = g;
              data[dstIdx + 2] = b;
              data[dstIdx + 3] = 230;
            }
          }
        }
      }
    } else if (photometric === 3 && colorMap.length >= 768) {
      // Palette-indexed color TIFF
      const numColors = colorMap.length / 3;
      const stepX = width / canvas.width;
      const stepY = height / canvas.height;

      for (let y = 0; y < canvas.height; y++) {
        const srcY = Math.floor(y * stepY);
        for (let x = 0; x < canvas.width; x++) {
          const srcX = Math.floor(x * stepX);
          const srcIdx = srcY * width + srcX;
          const dstIdx = (y * canvas.width + x) * 4;

          if (srcIdx < typedValues.length) {
            const palIdx = typedValues[srcIdx];
            if (palIdx < numColors) {
              data[dstIdx] = (colorMap[palIdx] >> 8) & 0xff;
              data[dstIdx + 1] = (colorMap[palIdx + numColors] >> 8) & 0xff;
              data[dstIdx + 2] = (colorMap[palIdx + numColors * 2] >> 8) & 0xff;
              data[dstIdx + 3] = 255;
            }
          }
        }
      }
    } else {
      // Multi-band RGB / RGBA or Grayscale photographic image
      const stepX = width / canvas.width;
      const stepY = height / canvas.height;

      for (let y = 0; y < canvas.height; y++) {
        const srcY = Math.floor(y * stepY);
        for (let x = 0; x < canvas.width; x++) {
          const srcX = Math.floor(x * stepX);
          const srcIdx = (srcY * width + srcX) * samplesPerPixel;
          const dstIdx = (y * canvas.width + x) * 4;

          if (srcIdx < typedValues.length) {
            if (samplesPerPixel === 1) {
              let val = typedValues[srcIdx];
              if (photometric === 0) val = 255 - val; // WhiteIsZero inverted
              data[dstIdx] = val;
              data[dstIdx + 1] = val;
              data[dstIdx + 2] = val;
              data[dstIdx + 3] = 255;
            } else {
              data[dstIdx] = typedValues[srcIdx];
              data[dstIdx + 1] = typedValues[srcIdx + 1] !== undefined ? typedValues[srcIdx + 1] : typedValues[srcIdx];
              data[dstIdx + 2] = typedValues[srcIdx + 2] !== undefined ? typedValues[srcIdx + 2] : typedValues[srcIdx];
              data[dstIdx + 3] = samplesPerPixel >= 4 && typedValues[srcIdx + 3] !== undefined ? typedValues[srcIdx + 3] : 255;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Pixel raster decoding notice:", e);
  }

  ctx.putImageData(imgData, 0, 0);

  return {
    isRasterImage: true,
    canvas,
    hasGeoreference,
    originX,
    originY,
    scaleX,
    scaleY,
    wkid: detectedWkid || 4326,
    width,
    height,
  };
}

/**
 * Free GPX Parser
 */
export function parseGpx(gpxText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxText, "application/xml");
  const features = [];

  doc.querySelectorAll("wpt").forEach((w) => {
    const lat = parseFloat(w.getAttribute("lat"));
    const lon = parseFloat(w.getAttribute("lon"));
    const name = w.querySelector("name")?.textContent?.trim() || "Waypoint";
    const ele = parseFloat(w.querySelector("ele")?.textContent?.trim() || "0");
    if (!isNaN(lat) && !isNaN(lon)) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lon, lat, isNaN(ele) ? 0 : ele],
        },
        properties: { name, elevation: ele },
      });
    }
  });

  doc.querySelectorAll("trk").forEach((t) => {
    const name = t.querySelector("name")?.textContent?.trim() || "Track";
    const coords = [];
    t.querySelectorAll("trkpt").forEach((pt) => {
      const lat = parseFloat(pt.getAttribute("lat"));
      const lon = parseFloat(pt.getAttribute("lon"));
      const ele = parseFloat(pt.querySelector("ele")?.textContent || "0");
      if (!isNaN(lat) && !isNaN(lon)) {
        coords.push([lon, lat, isNaN(ele) ? 0 : ele]);
      }
    });
    if (coords.length > 0) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
        properties: { name },
      });
    }
  });

  doc.querySelectorAll("rte").forEach((r) => {
    const name = r.querySelector("name")?.textContent?.trim() || "Route";
    const coords = [];
    r.querySelectorAll("rtept").forEach((pt) => {
      const lat = parseFloat(pt.getAttribute("lat"));
      const lon = parseFloat(pt.getAttribute("lon"));
      const ele = parseFloat(pt.querySelector("ele")?.textContent || "0");
      if (!isNaN(lat) && !isNaN(lon)) {
        coords.push([lon, lat, isNaN(ele) ? 0 : ele]);
      }
    });
    if (coords.length > 0) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
        properties: { name },
      });
    }
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Free CSV / TXT to GeoJSON Parser
 */
export function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV file must have a header and at least one data row");
  }

  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";")) delimiter = ";";
  else if (firstLine.includes("|")) delimiter = "|";

  const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));

  const latKeywords = ["latitude", "lat", "y", "point_y", "lat_deg", "northing", "ycoord", "y_coord"];
  const lonKeywords = ["longitude", "lon", "lng", "long", "x", "point_x", "lon_deg", "easting", "xcoord", "x_coord"];
  const eleKeywords = ["elevation", "ele", "alt", "altitude", "z", "height", "zcoord"];

  let latIdx = headers.findIndex((h) => latKeywords.includes(h.toLowerCase()));
  let lonIdx = headers.findIndex((h) => lonKeywords.includes(h.toLowerCase()));
  let eleIdx = headers.findIndex((h) => eleKeywords.includes(h.toLowerCase()));

  if (latIdx === -1) latIdx = headers.findIndex((h) => h.toLowerCase().includes("lat"));
  if (lonIdx === -1) lonIdx = headers.findIndex((h) => h.toLowerCase().includes("lon") || h.toLowerCase().includes("lng"));

  if (latIdx === -1 || lonIdx === -1) {
    throw new Error("Could not automatically detect Latitude and Longitude columns in CSV. Please ensure column headers include 'lat' and 'lon'.");
  }

  const features = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (rawCols.length <= Math.max(latIdx, lonIdx)) continue;

    const lat = parseFloat(rawCols[latIdx]);
    const lon = parseFloat(rawCols[lonIdx]);
    const ele = eleIdx !== -1 ? parseFloat(rawCols[eleIdx]) || 0 : 0;

    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      const properties = {};
      headers.forEach((h, idx) => {
        properties[h] = rawCols[idx] !== undefined ? rawCols[idx] : "";
      });

      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lon, lat, ele],
        },
        properties,
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Free ASCII Grid / XYZ DSM / DEM Parser
 */
export function parseDsmGrid(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) throw new Error("Empty elevation grid file");

  const headerMap = {};
  let dataStartIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length === 2 && !isNaN(parseFloat(parts[1]))) {
      headerMap[parts[0].toLowerCase()] = parseFloat(parts[1]);
      dataStartIdx = i + 1;
    }
  }

  const features = [];
  if (headerMap.ncols && headerMap.nrows && (headerMap.xllcorner !== undefined || headerMap.xllcenter !== undefined)) {
    const ncols = headerMap.ncols;
    const nrows = headerMap.nrows;
    const xll = headerMap.xllcorner !== undefined ? headerMap.xllcorner : headerMap.xllcenter;
    const yll = headerMap.yllcorner !== undefined ? headerMap.yllcorner : headerMap.yllcenter;
    const cellsize = headerMap.cellsize || 0.001;
    const nodata = headerMap.nodata_value !== undefined ? headerMap.nodata_value : -9999;

    let minZ = Infinity;
    let maxZ = -Infinity;
    const sampleStep = Math.max(1, Math.floor(Math.max(ncols, nrows) / 35));

    for (let r = dataStartIdx; r < lines.length; r++) {
      const vals = lines[r].trim().split(/\s+/).map(Number);
      const rowIdx = r - dataStartIdx;
      for (let c = 0; c < vals.length; c += sampleStep) {
        const z = vals[c];
        if (z !== nodata && !isNaN(z)) {
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
          if (rowIdx % sampleStep === 0) {
            const lon = xll + c * cellsize;
            const lat = yll + (nrows - rowIdx) * cellsize;
            features.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [lon, lat, z] },
              properties: { elevation: z, row: rowIdx, col: c },
            });
          }
        }
      }
    }

    const west = xll;
    const east = xll + ncols * cellsize;
    const south = yll;
    const north = yll + nrows * cellsize;

    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, north, maxZ],
            [east, north, maxZ],
            [east, south, minZ],
            [west, south, minZ],
            [west, north, maxZ],
          ],
        ],
      },
      properties: {
        name: "DSM Elevation Footprint",
        minElevation: minZ,
        maxElevation: maxZ,
        resolution: cellsize,
        gridSize: `${ncols}x${nrows}`,
      },
    });
  } else {
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].trim().split(/[\s,]+/).map(Number);
      if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [parts[0], parts[1], parts[2]] },
          properties: { elevation: parts[2] },
        });
      }
    }
  }

  if (features.length === 0) {
    throw new Error("No valid elevation data found in DSM/DEM file.");
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
