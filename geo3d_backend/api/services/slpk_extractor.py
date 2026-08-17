"""
SLPK extraction module.
Handles unzipping SLPK archives, gzip stream decompression, and parsing 3dSceneLayer.json.
"""
from __future__ import annotations

import gzip
import json
import shutil
import zipfile
from pathlib import Path
from typing import Any, Dict, Optional

GZIP_MAGIC = b"\x1f\x8b"


class SlpkExtractionError(Exception):
    pass


def _maybe_gunzip_bytes(data: bytes) -> bytes:
    """Return decompressed bytes if data looks gzip-compressed, else return as-is."""
    if len(data) >= 2 and data[:2] == GZIP_MAGIC:
        try:
            return gzip.decompress(data)
        except OSError:
            return data
    return data


def extract_slpk(slpk_path: Path, dest_dir: Path) -> Path:
    """
    Extract + decompress an SLPK file into dest_dir.
    Returns the path to the directory that contains 3dSceneLayer.json.
    """
    if not slpk_path.exists():
        raise SlpkExtractionError(f"SLPK file not found: {slpk_path}")

    if dest_dir.exists():
        shutil.rmtree(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(slpk_path, "r") as zf:
            for entry in zf.infolist():
                if entry.is_dir():
                    continue
                raw = zf.read(entry.filename)
                data = _maybe_gunzip_bytes(raw)

                out_name = entry.filename
                if out_name.endswith(".gz"):
                    out_name = out_name[: -len(".gz")]

                out_path = dest_dir / out_name
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(data)
    except zipfile.BadZipFile as e:
        raise SlpkExtractionError(f"Not a valid SLPK/ZIP file: {e}") from e

    layer_root = _find_layer_root(dest_dir)
    if layer_root is None:
        raise SlpkExtractionError(
            "Extracted archive does not contain a 3dSceneLayer.json — "
            "this does not look like a valid SLPK package."
        )
    return layer_root


def _find_layer_root(dest_dir: Path) -> Optional[Path]:
    """Find directory containing 3dSceneLayer.json."""
    direct = dest_dir / "3dSceneLayer.json"
    if direct.exists():
        return dest_dir
    matches = list(dest_dir.rglob("3dSceneLayer.json"))
    if matches:
        return matches[0].parent
    return None


def read_scene_layer_info(layer_root: Path) -> Dict[str, Any]:
    """Parse 3dSceneLayer.json for lightweight metadata to show in the UI."""
    scene_layer_path = layer_root / "3dSceneLayer.json"
    try:
        with open(scene_layer_path, "r", encoding="utf-8") as f:
            full = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        raise SlpkExtractionError(f"Could not parse 3dSceneLayer.json: {e}") from e

    store = full.get("store", {}) or {}
    return {
        "name": full.get("name"),
        "layerType": full.get("layerType"),
        "spatialReference": full.get("spatialReference"),
        "extent": full.get("fullExtent") or full.get("store", {}).get("extent"),
        "profile": full.get("profile"),
        "geometryEncoding": store.get("defaultGeometrySchema", {}).get("geometryType"),
        "nodeCount": None,
    }
