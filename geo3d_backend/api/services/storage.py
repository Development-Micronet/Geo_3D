"""
Package registry and disk storage manager for Django backend.
"""
from __future__ import annotations

import shutil
import threading
import uuid
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Any
from django.conf import settings


@dataclass
class PackageDetail:
    id: str
    filename: str
    size_bytes: int
    status: str  # "uploaded" | "extracting" | "ready" | "error"
    error: Optional[str] = None
    layer_url: Optional[str] = None
    scene_layer_info: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


_lock = threading.Lock()
_packages: Dict[str, PackageDetail] = {}


def new_package_id() -> str:
    return uuid.uuid4().hex[:12]


def upload_path_for(package_id: str, filename: str) -> Path:
    safe_name = Path(filename).name
    return settings.UPLOAD_DIR / f"{package_id}_{safe_name}"


def extract_path_for(package_id: str) -> Path:
    return settings.EXTRACT_DIR / package_id


def save_package(pkg: PackageDetail) -> None:
    with _lock:
        _packages[pkg.id] = pkg


def get_package(package_id: str) -> Optional[PackageDetail]:
    with _lock:
        return _packages.get(package_id)


def list_packages() -> List[PackageDetail]:
    with _lock:
        return list(_packages.values())


def delete_package(package_id: str) -> bool:
    with _lock:
        pkg = _packages.pop(package_id, None)
    if pkg is None:
        return False
    upload_path_for(package_id, pkg.filename).unlink(missing_ok=True)
    ex = extract_path_for(package_id)
    if ex.exists():
        shutil.rmtree(ex, ignore_errors=True)
    return True


def rebuild_index_from_disk() -> None:
    """Rebuild the in-memory index from files on disk."""
    upload_dir = settings.UPLOAD_DIR
    if not upload_dir.exists():
        return

    from api.services.slpk_extractor import read_scene_layer_info, _find_layer_root

    for upload_file in upload_dir.iterdir():
        if upload_file.is_dir() or not upload_file.name.endswith(".slpk"):
            continue

        parts = upload_file.name.split("_", 1)
        if len(parts) != 2:
            continue
        package_id, filename = parts

        dest_dir = extract_path_for(package_id)
        layer_root = _find_layer_root(dest_dir)

        if layer_root is not None:
            try:
                info = read_scene_layer_info(layer_root)
                rel = layer_root.relative_to(dest_dir)
                rel_str = "" if str(rel) == "." else f"/{rel.as_posix()}"
                layer_url = f"{settings.PUBLIC_BASE_URL}/api/layers/{package_id}{rel_str}"
                pkg = PackageDetail(
                    id=package_id,
                    filename=filename,
                    size_bytes=upload_file.stat().st_size,
                    status="ready",
                    layer_url=layer_url,
                    scene_layer_info=info,
                )
                _packages[package_id] = pkg
            except Exception:
                pkg = PackageDetail(
                    id=package_id,
                    filename=filename,
                    size_bytes=upload_file.stat().st_size,
                    status="error",
                    error="Failed to reconstruct metadata on startup",
                )
                _packages[package_id] = pkg
        else:
            pkg = PackageDetail(
                id=package_id,
                filename=filename,
                size_bytes=upload_file.stat().st_size,
                status="uploaded",
            )
            _packages[package_id] = pkg
