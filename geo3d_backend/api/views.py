import json
import mimetypes
import threading
from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate
from django.http import JsonResponse, HttpResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import User
from api.services import storage
from api.services.slpk_extractor import (
    extract_slpk,
    read_scene_layer_info,
    SlpkExtractionError,
    _find_layer_root,
)


def _get_json_body(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except Exception:
        return {}


def _get_requester_user(request):
    user_id_header = request.headers.get("X-User-Id") or request.META.get("HTTP_X_USER_ID")
    if not user_id_header:
        return None
    try:
        user_id = int(user_id_header)
        return User.objects.filter(id=user_id).first()
    except (ValueError, TypeError):
        return None


def _check_admin(request):
    user = _get_requester_user(request)
    if not user or (user.role not in ("admin", "superadmin") and not user.is_staff and not user.is_superuser):
        return None
    return user


def _check_superadmin(request):
    user = _get_requester_user(request)
    if not user or (user.role != "superadmin" and not user.is_superuser):
        return None
    return user


# --- Health Check ---
@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def health_check(request):
    return JsonResponse({"status": "ok"})


# --- Authentication ---
@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def login_view(request):
    body = _get_json_body(request)
    username = body.get("username")
    password = body.get("password")

    if not username or not password:
        return JsonResponse({"detail": "Username and password are required"}, status=400)

    user = User.objects.filter(username=username).first()
    if not user or not user.check_password(password):
        return JsonResponse({"detail": "Invalid username or password"}, status=401)

    role = user.role
    if (user.is_superuser or user.is_staff) and role == "user":
        role = "superadmin" if user.is_superuser else "admin"

    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "role": role,
        "permissions": user.permissions or []
    })


# --- Users Management ---
@csrf_exempt
@require_http_methods(["GET", "POST", "OPTIONS"])
def users_view(request):
    admin = _check_admin(request)
    if not admin:
        return JsonResponse({"detail": "Admin permissions required"}, status=403)

    if request.method == "GET":
        users = User.objects.all()
        data = [
            {
                "id": u.id,
                "username": u.username,
                "role": "superadmin" if u.is_superuser else ("admin" if u.is_staff else u.role),
                "permissions": u.permissions or []
            }
            for u in users
        ]
        return JsonResponse(data, safe=False)

    elif request.method == "POST":
        superadmin = _check_superadmin(request)
        if not superadmin:
            return JsonResponse({"detail": "Only superadmin can create user accounts"}, status=403)

        body = _get_json_body(request)
        username = body.get("username")
        password = body.get("password")
        role = body.get("role", "user")
        permissions = body.get("permissions", [])

        if not username or not password:
            return JsonResponse({"detail": "Username and password required"}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({"detail": "Username already exists"}, status=400)

        is_staff = role in ("admin", "superadmin")
        is_superuser = role == "superadmin"

        new_user = User.objects.create_user(
            username=username,
            password=password,
            role=role,
            permissions=permissions,
            is_staff=is_staff,
            is_superuser=is_superuser
        )

        return JsonResponse({
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role,
            "permissions": new_user.permissions or []
        })


@csrf_exempt
@require_http_methods(["PUT", "OPTIONS"])
def user_permissions_view(request, user_id):
    admin = _check_admin(request)
    if not admin:
        return JsonResponse({"detail": "Admin permissions required"}, status=403)

    user = User.objects.filter(id=user_id).first()
    if not user:
        return JsonResponse({"detail": "User not found"}, status=404)

    body = _get_json_body(request)
    user.permissions = body.get("permissions", [])
    user.save()

    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "permissions": user.permissions or []
    })


@csrf_exempt
@require_http_methods(["DELETE", "OPTIONS"])
def user_detail_view(request, user_id):
    superadmin = _check_superadmin(request)
    if not superadmin:
        return JsonResponse({"detail": "Only superadmin can delete user accounts"}, status=403)

    user = User.objects.filter(id=user_id).first()
    if not user:
        return JsonResponse({"detail": "User not found"}, status=404)

    if user.id == superadmin.id:
        return JsonResponse({"detail": "Cannot delete your own account"}, status=400)

    user.delete()
    return JsonResponse({"deleted": user_id})


# --- Package Listing & Deletion ---
@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def packages_view(request):
    pkgs = storage.list_packages()
    data = []
    for p in pkgs:
        layer_url = p.layer_url
        if layer_url and layer_url.startswith("/"):
            layer_url = request.build_absolute_uri(layer_url)
        if layer_url and not layer_url.endswith("/") and "." not in layer_url.split("?")[0].split("/")[-1]:
            layer_url += "/"
        data.append({
            "id": p.id,
            "filename": p.filename,
            "size_bytes": p.size_bytes,
            "status": p.status,
            "error": p.error,
            "layer_url": layer_url
        })
    return JsonResponse(data, safe=False)


@csrf_exempt
@require_http_methods(["GET", "DELETE", "OPTIONS"])
def package_detail_view(request, package_id):
    pkg = storage.get_package(package_id)
    if pkg is None:
        return JsonResponse({"detail": "Package not found"}, status=404)

    if request.method == "GET":
        data = pkg.to_dict()
        layer_url = data.get("layer_url")
        if layer_url and layer_url.startswith("/"):
            layer_url = request.build_absolute_uri(layer_url)
        if layer_url and not layer_url.endswith("/") and "." not in layer_url.split("?")[0].split("/")[-1]:
            layer_url += "/"
        data["layer_url"] = layer_url
        return JsonResponse(data)

    elif request.method == "DELETE":
        admin_user = _check_admin(request)
        if not admin_user:
            return JsonResponse({"detail": "Only admin or superadmin can delete datasets"}, status=403)
        ok = storage.delete_package(package_id)
        if not ok:
            return JsonResponse({"detail": "Package not found"}, status=404)
        return JsonResponse({"deleted": package_id})


# --- Upload & Background Extraction ---
def _run_extraction(package_id: str) -> None:
    pkg = storage.get_package(package_id)
    if pkg is None:
        return
    pkg.status = "extracting"
    storage.save_package(pkg)

    slpk_path = storage.upload_path_for(package_id, pkg.filename)
    dest_dir = storage.extract_path_for(package_id)

    try:
        layer_root = extract_slpk(slpk_path, dest_dir)
        info = read_scene_layer_info(layer_root)
        rel = layer_root.relative_to(dest_dir)
        rel_str = "" if str(rel) == "." else f"/{rel.as_posix()}"
        base_prefix = settings.PUBLIC_BASE_URL.rstrip("/") if settings.PUBLIC_BASE_URL else ""
        pkg.layer_url = f"{base_prefix}/api/layers/{package_id}{rel_str}"
        pkg.scene_layer_info = info
        pkg.status = "ready"
    except SlpkExtractionError as e:
        pkg.status = "error"
        pkg.error = str(e)
    except Exception as e:
        pkg.status = "error"
        pkg.error = f"Unexpected extraction failure: {e}"
    finally:
        storage.save_package(pkg)


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def upload_view(request):
    admin_user = _check_admin(request)
    if not admin_user:
        return JsonResponse({"detail": "Only admin or superadmin has permission to upload datasets"}, status=403)

    if "file" not in request.FILES:
        return JsonResponse({"detail": "No file uploaded"}, status=400)

    upload_file = request.FILES["file"]
    if not upload_file.name.lower().endswith(".slpk"):
        return JsonResponse({"detail": "Only .slpk files are accepted"}, status=400)

    package_id = storage.new_package_id()
    dest = storage.upload_path_for(package_id, upload_file.name)

    size = 0
    with open(dest, "wb") as out:
        for chunk in upload_file.chunks(1024 * 1024):
            size += len(chunk)
            if size > settings.MAX_UPLOAD_SIZE:
                out.close()
                dest.unlink(missing_ok=True)
                return JsonResponse({"detail": "File exceeds maximum upload size"}, status=413)
            out.write(chunk)

    pkg = storage.PackageDetail(
        id=package_id,
        filename=upload_file.name,
        size_bytes=size,
        status="uploaded",
    )
    storage.save_package(pkg)

    # Launch background thread for extraction
    thread = threading.Thread(target=_run_extraction, args=(package_id,), daemon=True)
    thread.start()

    return JsonResponse({
        "id": package_id,
        "filename": upload_file.name,
        "status": "uploaded"
    })


# --- Static I3S Layer Resource Serving ---
def _safe_join(base_dir: Path, resource_path: str):
    if not resource_path:
        return base_dir.resolve() if base_dir.exists() else base_dir
    try:
        target = (base_dir / resource_path).resolve()
        base_resolved = base_dir.resolve()
        if base_resolved != target and base_resolved not in target.parents:
            return None
        return target
    except Exception:
        return base_dir / resource_path


def _resolve_layer_directory(target: Path):
    if not target.exists() or not target.is_dir():
        return None
    for candidate_name in ("3dSceneLayer.json", "index.json", "3dNodeIndexDocument.json"):
        candidate = target / candidate_name
        if candidate.exists():
            return candidate
        for p in target.iterdir():
            if p.is_file() and p.name.lower() == candidate_name.lower():
                return p

    layer_root = _find_layer_root(target)
    if layer_root is not None and layer_root != target:
        for candidate_name in ("3dSceneLayer.json", "index.json", "3dNodeIndexDocument.json"):
            candidate = layer_root / candidate_name
            if candidate.exists():
                return candidate
            for p in layer_root.iterdir():
                if p.is_file() and p.name.lower() == candidate_name.lower():
                    return p
    return None


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def serve_layer_resource(request, package_id: str, resource_path: str = ""):
    if request.method == "OPTIONS":
        response = HttpResponse()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "*"
        return response

    base_dir = storage.extract_path_for(package_id)
    if not base_dir.exists():
        pkg = storage.get_package(package_id)
        if pkg is None or pkg.status != "ready":
            return JsonResponse({"detail": "Package not found or not ready"}, status=404)

    layer_root = _find_layer_root(base_dir) or base_dir

    clean_path = resource_path.strip("/")
    candidates = [clean_path]

    parts = clean_path.split("/", 1)
    if parts[0] == "layers" and len(parts) > 1:
        subparts = parts[1].split("/", 1)
        if subparts[0].isdigit():
            candidates.append(subparts[1] if len(subparts) > 1 else "")

    parts = clean_path.split("/", 1)
    if parts[0].isdigit():
        candidates.append(parts[1] if len(parts) > 1 else "")

    search_dirs = [base_dir]
    if layer_root != base_dir and layer_root not in search_dirs:
        search_dirs.append(layer_root)

    target = None
    for cand in candidates:
        cand_clean = cand.strip("/")
        bs_clean = cand_clean.replace("/", "\\")
        for sdir in search_dirs:
            resolved = _safe_join(sdir, cand_clean)
            resolved_bs = sdir / bs_clean

            if resolved is not None and resolved.exists():
                target = resolved
                break
            if resolved_bs.exists():
                target = resolved_bs
                break

            found = False
            for ext in (
                ".json",
                ".bin.dds",
                ".bin.ktx",
                ".bin.ktx2",
                ".bin",
                ".dds",
                ".ktx",
                ".ktx2",
                ".jpg",
                ".jpeg",
                ".png",
                ".draco",
            ):
                for check_res in (resolved, resolved_bs):
                    if check_res is None:
                        continue
                    alt = check_res.with_name(f"{check_res.name}{ext}")
                    if alt.exists():
                        target = alt
                        found = True
                        break
                if found:
                    break
            if found:
                break

            if "." in resolved.name:
                stem_name = resolved.name.rsplit(".", 1)[0]
                alt_stem = resolved.with_name(stem_name)
                if alt_stem.exists():
                    target = alt_stem
                    break

            if resolved.name in ("root", "0", "3dNodeIndexDocument", "3dNodeIndexDocument.json"):
                for n_cand in ("3dNodeIndexDocument.json", "index.json", "3dNodeIndexDocument"):
                    alt_node = resolved.parent / n_cand
                    if alt_node.exists():
                        target = alt_node
                        found = True
                        break
                if found:
                    break

            if resolved.parent.exists() and resolved.parent.is_dir():
                low_name = resolved.name.lower()
                for item in resolved.parent.iterdir():
                    if item.is_file() and (item.name.lower() == low_name or item.name.lower().startswith(low_name)):
                        target = item
                        found = True
                        break
                if found:
                    break
        if target is not None:
            break

    if target is None:
        print(f"[SLPK 404 DEBUG] package_id={package_id} resource_path='{resource_path}' base_dir={base_dir} (exists={base_dir.exists()}) layer_root={layer_root} candidates={candidates}", flush=True)
        return JsonResponse({"detail": f"Resource not found: {resource_path}"}, status=404)

    if target.is_dir():
        layer_resource = _resolve_layer_directory(target)
        if layer_resource is None:
            return JsonResponse({"detail": "Resource not found"}, status=404)
        target = layer_resource

    media_type, _ = mimetypes.guess_type(str(target))
    name_lower = target.name.lower()
    parent_lower = target.parent.name.lower()

    if name_lower.endswith(".json") or name_lower in ("3dscenelayer", "3dnodeindexdocument", "shareddocument", "index"):
        media_type = "application/json"
    elif parent_lower == "nodepages":
        media_type = "application/json"
    elif parent_lower == "textures" or name_lower.endswith((".jpg", ".jpeg", ".png", ".dds", ".ktx", ".ktx2", ".bin.dds", ".bin.ktx", ".bin.ktx2")):
        if name_lower.endswith((".dds", ".bin.dds")):
            media_type = "image/vnd.ms-dds"
        elif name_lower.endswith((".ktx", ".ktx2", ".bin.ktx", ".bin.ktx2")):
            media_type = "image/ktx2"
        elif name_lower.endswith((".jpg", ".jpeg")):
            media_type = "image/jpeg"
        elif name_lower.endswith(".png"):
            media_type = "image/png"
        else:
            try:
                with open(target, "rb") as f_head:
                    header = f_head.read(8)
                    if header.startswith(b"\xff\xd8\xff"):
                        media_type = "image/jpeg"
                    elif header.startswith(b"\x89PNG\r\n\x1a\n"):
                        media_type = "image/png"
                    elif header.startswith(b"DDS "):
                        media_type = "image/vnd.ms-dds"
                    elif header.startswith(b"\xabKTX"):
                        media_type = "image/ktx2"
                    else:
                        media_type = "application/octet-stream"
            except Exception:
                media_type = "application/octet-stream"
    elif parent_lower == "geometries" or name_lower.endswith((".bin", ".draco", ".bin.gz")):
        media_type = "application/octet-stream"
    elif target.suffix == ".json":
        media_type = "application/json"
    else:
        media_type = media_type or "application/octet-stream"

    response = FileResponse(open(target, "rb"), content_type=media_type)
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "*"
    response["Access-Control-Expose-Headers"] = "*"
    return response
