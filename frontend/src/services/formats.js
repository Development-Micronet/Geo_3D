export const SUPPORTED_GIS_FORMATS = [
  {
    id: "all",
    label: "All Supported Formats (*.kml *.kmz *.shp *.csv *.tpkx *.slpk *.mspk *.mmpk *.img *.tif *.3ds *.dae *.fbx *.obj *.gltf *.json *.geojson *.gpx *.gpkg *.geodatabase *.sqlite *.3tz *.dem *.asc *.xyz *.hgt)",
    accept: ".kml,.kmz,.shp,.zip,.csv,.txt,.tpk,.tpkx,.vtpk,.slpk,.spk,.mspk,.mmpk,.img,.tif,.tiff,.png,.dt0,.dt1,.dt2,.jpg,.jpeg,.jp2,.j2k,.j2c,.jpx,.hgt,.ntf,.gen,.3ds,.dae,.fbx,.obj,.gltf,.glb,.json,.geojson,.gpx,.gpkg,.geodatabase,.sqlite,.3tz,.dem,.asc,.xyz,.lerc",
  },
  {
    id: "dsm",
    label: "Digital Surface Model / Elevation (*.dem *.asc *.xyz *.hgt *.tif *.tiff)",
    accept: ".dem,.asc,.xyz,.hgt,.tif,.tiff,.lerc",
  },
  {
    id: "kml",
    label: "KML files (*.kml *.kmz)",
    accept: ".kml,.kmz",
  },
  {
    id: "shp",
    label: "Shapefile (*.shp)",
    accept: ".shp,.zip",
  },
  {
    id: "csv",
    label: "Text files (*.csv *.txt)",
    accept: ".csv,.txt",
  },
  {
    id: "tpk",
    label: "Tile Package (*.tpk *.tpkx)",
    accept: ".tpk,.tpkx",
  },
  {
    id: "vtpk",
    label: "Vector Tile Package (*.vtpk)",
    accept: ".vtpk",
  },
  {
    id: "slpk",
    label: "Scene Layer Package (*.spk *.slpk)",
    accept: ".spk,.slpk",
  },
  {
    id: "mspk",
    label: "Mobile Scene Package (*.mspk)",
    accept: ".mspk",
  },
  {
    id: "mmpk",
    label: "Mobile Map Package (*.mmpk)",
    accept: ".mmpk",
  },
  {
    id: "raster",
    label: "Raster (*.img *.tif *.png *.dt0 *.dt1 *.dt2 *.jpg *.jp2 *.j2k *.j2c *.jpx *.hgt *.ntf *.gen *.gn? *.on? *.hr?...)",
    accept: ".img,.tif,.tiff,.png,.dt0,.dt1,.dt2,.jpg,.jpeg,.jp2,.j2k,.j2c,.jpx,.hgt,.ntf,.gen",
  },
  {
    id: "model",
    label: "3D Model (*.3ds *.dae *.fbx *.obj *.gltf)",
    accept: ".3ds,.dae,.fbx,.obj,.gltf,.glb",
  },
  {
    id: "geojson",
    label: "GeoJSON (*.json *.geojson)",
    accept: ".json,.geojson",
  },
  {
    id: "gpx",
    label: "GPX files (*.gpx)",
    accept: ".gpx",
  },
  {
    id: "gpkg",
    label: "GeoPackage (*.gpkg)",
    accept: ".gpkg",
  },
  {
    id: "geodatabase",
    label: "Mobile Geodatabase (*.geodatabase *.sqlite)",
    accept: ".geodatabase,.sqlite",
  },
  {
    id: "3dtiles",
    label: "3D Tiles (*.3tz *.json)",
    accept: ".3tz,.json",
  },
];

export function getFileFormatBadge(filename) {
  if (!filename) return "LAYER";
  const fn = filename.toLowerCase();
  if (fn.endsWith(".dem") || fn.endsWith(".asc") || fn.endsWith(".xyz") || fn.endsWith(".hgt") || fn.includes("dsm") || fn.includes("dtm") || fn.includes("dem")) return "DSM";
  if (fn.endsWith(".slpk") || fn.endsWith(".spk")) return "SLPK";
  if (fn.endsWith(".geojson")) return "GeoJSON";
  if (fn.endsWith(".json")) return fn.includes("3d") || fn.includes("tileset") ? "3D Tiles" : "JSON";
  if (fn.endsWith(".kml")) return "KML";
  if (fn.endsWith(".kmz")) return "KMZ";
  if (fn.endsWith(".csv")) return "CSV";
  if (fn.endsWith(".txt")) return "TXT";
  if (fn.endsWith(".gpx")) return "GPX";
  if (fn.endsWith(".shp") || fn.endsWith(".zip")) return "SHP";
  if (fn.endsWith(".gltf") || fn.endsWith(".glb")) return "glTF";
  if (fn.endsWith(".obj")) return "OBJ";
  if (fn.endsWith(".3ds") || fn.endsWith(".dae") || fn.endsWith(".fbx")) return "3D Model";
  if (fn.endsWith(".3tz")) return "3D Tiles";
  if (fn.endsWith(".tpk") || fn.endsWith(".tpkx")) return "TPK";
  if (fn.endsWith(".vtpk")) return "VTPK";
  if (fn.endsWith(".mspk") || fn.endsWith(".mmpk")) return "MSPK";
  if (fn.endsWith(".tif") || fn.endsWith(".tiff") || fn.endsWith(".img") || fn.endsWith(".png") || fn.endsWith(".jpg")) return "Raster";
  if (fn.endsWith(".gpkg")) return "GeoPackage";
  if (fn.endsWith(".geodatabase") || fn.endsWith(".sqlite")) return "Geodatabase";
  return "GIS";
}
