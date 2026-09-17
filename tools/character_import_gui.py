#!/usr/bin/env python3
"""Emora 角色卡批量导入 GUI。

执行与管理后台“导入 JSON”完全相同的接口链路：
上传策略 -> 对象存储直传 -> 媒体登记 -> 角色创建。
"""

from __future__ import annotations

import json
import mimetypes
import os
import queue
import re
import sys
import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable
from urllib.parse import unquote, urlparse

try:
    import requests
except ImportError as exc:  # pragma: no cover - 启动环境缺依赖时提供明确提示
    raise SystemExit(
        "缺少 requests 依赖，请先执行：python -m pip install -r "
        "tools/character_import_requirements.txt"
    ) from exc

import tkinter as tk
from tkinter import filedialog, messagebox, ttk


APP_TITLE = "Emora 角色卡批量导入"
ENVIRONMENTS = {
    "测试环境": "https://testapi.weshow.cc/api",
    "生产环境": "https://api.emoraai.net/api",
}
SUPPORTED_IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
MAX_BATCH_SIZE = 500
JSON_TIMEOUT = (10, 60)
UPLOAD_TIMEOUT = (15, 120)


def resource_path(filename: str) -> Path | None:
    """同时兼容源码目录和 PyInstaller 解包目录中的静态资源。"""
    source_directory = Path(__file__).resolve().parent
    bundle_directory = Path(getattr(sys, "_MEIPASS", source_directory))
    for candidate in (bundle_directory / filename, source_directory / "assets" / filename):
        if candidate.is_file():
            return candidate
    return None


class ImportValidationError(ValueError):
    """角色卡或本地文件不满足导入协议。"""


class ApiError(RuntimeError):
    """后台接口或对象存储返回失败。"""

    def __init__(self, message: str, status: int = 0, code: Any = None, data: Any = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.data = data


def clean_text(value: Any) -> str:
    return value if isinstance(value, str) else ""


def normalize_mes_examples(value: Any) -> list[dict[str, str]]:
    if isinstance(value, str):
        values = [value]
    elif isinstance(value, list):
        values = value
    else:
        values = []

    examples: list[dict[str, str]] = []
    for item in values:
        if isinstance(item, str):
            character = item.strip()
            if character:
                examples.append({"user": "", "character": character})
            continue
        if not isinstance(item, dict):
            continue
        user = clean_text(item.get("user")).strip()
        character = clean_text(item.get("character")).strip()
        if user or character:
            examples.append({"user": user, "character": character})
    return examples


def parse_character_card(path: Path) -> tuple[str, str, dict[str, Any], dict[str, Any]]:
    try:
        with path.open("r", encoding="utf-8-sig") as file:
            root = json.load(file)
    except json.JSONDecodeError as exc:
        raise ImportValidationError(f"JSON 格式错误：第 {exc.lineno} 行，第 {exc.colno} 列") from exc
    except OSError as exc:
        raise ImportValidationError(f"无法读取 JSON：{exc}") from exc

    if not isinstance(root, dict) or root.get("spec") != "chara_card_v2":
        raise ImportValidationError("仅支持 spec=chara_card_v2 的角色卡")
    card = root.get("data")
    if not isinstance(card, dict):
        raise ImportValidationError("缺少 data 角色数据")

    name = clean_text(card.get("name")).strip()
    version = clean_text(root.get("spec_version")).strip()
    if not name:
        raise ImportValidationError("缺少 data.name")
    if len(name) > 64:
        raise ImportValidationError("data.name 不能超过 64 个字符")
    if not version:
        raise ImportValidationError("缺少 spec_version")
    if len(version) > 64:
        raise ImportValidationError("spec_version 不能超过 64 个字符")

    greetings: list[str] = []
    first_message = clean_text(card.get("first_mes")).strip()
    if first_message:
        greetings.append(first_message)
    alternate_greetings = card.get("alternate_greetings")
    if isinstance(alternate_greetings, list):
        greetings.extend(
            value.strip()
            for value in alternate_greetings
            if isinstance(value, str) and value.strip()
        )

    prompt = "\n\n".join(
        value.strip()
        for value in (
            clean_text(card.get("description")),
            clean_text(card.get("personality")),
            clean_text(card.get("scenario")),
            clean_text(card.get("system_prompt")),
            clean_text(card.get("post_history_instructions")),
        )
        if value.strip()
    )
    tags = card.get("tags")
    normalized_data = {
        "name": name,
        "character_version": clean_text(card.get("character_version")),
        "creator": clean_text(card.get("creator")),
        "creator_notes": clean_text(card.get("creator_notes")),
        "tagline": clean_text(card.get("creator_notes")),
        "description": clean_text(card.get("description")),
        "personality": clean_text(card.get("personality")),
        "scenario": clean_text(card.get("scenario")),
        "prompt": prompt,
        "avatar_notes": "",
        "mes_example": normalize_mes_examples(card.get("mes_example")),
        "greetings": greetings,
        "tags": [tag.strip() for tag in tags if isinstance(tag, str) and tag.strip()]
        if isinstance(tags, list)
        else [],
    }
    return name, version, normalized_data, root


def local_avatar_candidate(json_path: Path, root: dict[str, Any]) -> Path | None:
    card = root.get("data") if isinstance(root.get("data"), dict) else {}
    avatar = clean_text(card.get("avatar")).strip()
    if not avatar:
        return None

    parsed = urlparse(avatar)
    if parsed.scheme in ("http", "https", "data"):
        return None
    if parsed.scheme == "file":
        raw_path = unquote(parsed.path)
        if os.name == "nt" and re.match(r"^/[A-Za-z]:", raw_path):
            raw_path = raw_path[1:]
        candidate = Path(raw_path)
    else:
        candidate = Path(avatar)
        if not candidate.is_absolute():
            candidate = json_path.parent / candidate
    return candidate.resolve() if candidate.exists() else None


def find_cover(json_path: Path, root: dict[str, Any], character_name: str) -> Path | None:
    avatar_path = local_avatar_candidate(json_path, root)
    if avatar_path and avatar_path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
        return avatar_path

    directory = json_path.parent
    image_files = sorted(
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
    )
    if not image_files:
        return None

    normalized_name = re.sub(r"[^a-z0-9]+", "", character_name.lower())
    json_stem = json_path.stem.lower()
    priorities = (
        lambda path: path.stem.lower() in {"cover", "avatar", "image"},
        lambda path: path.stem.lower() == json_stem,
        lambda path: re.sub(r"[^a-z0-9]+", "", path.stem.lower()) == normalized_name,
    )
    for matches in priorities:
        candidate = next((path for path in image_files if matches(path)), None)
        if candidate:
            return candidate.resolve()
    return image_files[0].resolve() if len(image_files) == 1 else None


def validate_cover(path: Path) -> str:
    if not path.is_file():
        raise ImportValidationError("封面文件不存在")
    if path.suffix.lower() not in SUPPORTED_IMAGE_EXTENSIONS:
        raise ImportValidationError("封面仅支持 PNG、JPG、JPEG、WEBP")
    if path.stat().st_size <= 0:
        raise ImportValidationError("封面文件为空")
    mime, _ = mimetypes.guess_type(path.name)
    fallback = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }
    return mime or fallback[path.suffix.lower()]


@dataclass
class ImportItem:
    item_id: str
    json_path: Path
    name: str = ""
    version: str = ""
    data: dict[str, Any] = field(default_factory=dict)
    cover_path: Path | None = None
    status: str = "待导入"
    error: str = ""
    asset_id: int | str | None = None
    is_valid: bool = True


def load_import_item(path: Path) -> ImportItem:
    item = ImportItem(item_id=uuid.uuid4().hex, json_path=path.resolve())
    try:
        item.name, item.version, item.data, root = parse_character_card(item.json_path)
        item.cover_path = find_cover(item.json_path, root, item.name)
        if item.cover_path is None:
            raise ImportValidationError("未自动找到封面，请在角色目录放置 cover.png")
        validate_cover(item.cover_path)
    except ImportValidationError as exc:
        item.is_valid = False
        item.status = "待修正"
        item.error = str(exc)
    return item


def first_validation_error(data: Any) -> str | None:
    if not isinstance(data, dict):
        return None
    for field_name, messages in data.items():
        if isinstance(messages, list):
            message = next((value for value in messages if isinstance(value, str)), None)
        else:
            message = messages if isinstance(messages, str) else None
        if message:
            if re.search(r"already been taken|already exists", message, re.IGNORECASE):
                return f"{field_name} 已存在"
            return f"{field_name}：{message}"
    return None


class EmoraApiClient:
    def __init__(self, api_base_url: str, token: str = "") -> None:
        self.api_base_url = api_base_url.rstrip("/")
        self.token = token.strip()
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "User-Agent": "EmoraCharacterImporter/1.0",
        })

    def close(self) -> None:
        self.session.close()

    def post(
        self,
        path: str,
        body: dict[str, Any],
        *,
        with_token: bool = True,
        request_id: str | None = None,
    ) -> Any:
        headers = {"Content-Type": "application/json"}
        if with_token:
            if not self.token:
                raise ApiError("请填写管理员 Token")
            headers["Authorization"] = f"Bearer {self.token}"
        if request_id:
            headers["X-Request-Id"] = request_id
        try:
            response = self.session.post(
                f"{self.api_base_url}{path}",
                json=body,
                headers=headers,
                timeout=JSON_TIMEOUT,
            )
        except requests.RequestException as exc:
            raise ApiError(f"网络请求失败：{exc}") from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise ApiError(f"接口返回非 JSON 内容（HTTP {response.status_code}）", response.status_code) from exc
        if not response.ok or payload.get("c") != 0:
            message = first_validation_error(payload.get("d")) or payload.get("m")
            raise ApiError(
                str(message or f"请求失败（HTTP {response.status_code}）"),
                response.status_code,
                payload.get("c"),
                payload.get("d"),
            )
        return payload.get("d")

    def validate_admin(self) -> None:
        self.post("/admin/characters/list", {"page": 1, "page_size": 1})

    def send_email_code(self, email: str) -> dict[str, Any]:
        return self.post("/auth/email/code", {"email": email}, with_token=False)

    def email_login(self, email: str, challenge_id: str, code: str) -> dict[str, Any]:
        return self.post(
            "/auth/email/login",
            {"email": email, "challenge_id": challenge_id, "code": code},
            with_token=False,
        )

    def upload_cover(self, cover_path: Path, character_name: str) -> int | str:
        mime = validate_cover(cover_path)
        policy = self.post(
            "/admin/media/upload-policy",
            {
                "type": "image",
                "mime": mime,
                "filename": cover_path.name,
                "char_code": character_name,
            },
        )
        upload_url = str(policy.get("url") or "").strip()
        object_key = str(policy.get("key") or "").strip()
        fields = policy.get("fields")
        if not upload_url or not object_key or not isinstance(fields, dict):
            raise ApiError("上传凭证无效，请重新获取")

        try:
            with cover_path.open("rb") as file:
                response = self.session.post(
                    upload_url,
                    data={key: str(value) for key, value in fields.items()},
                    files={"file": (cover_path.name, file, mime)},
                    timeout=UPLOAD_TIMEOUT,
                )
        except (OSError, requests.RequestException) as exc:
            raise ApiError(f"封面上传失败：{exc}") from exc
        if not response.ok:
            raise ApiError(f"封面上传失败（HTTP {response.status_code}）", response.status_code)

        registered = self.post(
            "/admin/media/upload",
            {"type": "image", "mime": mime, "ref": object_key},
        )
        asset = registered.get("asset") if isinstance(registered, dict) else None
        asset_id = asset.get("id") if isinstance(asset, dict) else None
        if asset_id in (None, ""):
            raise ApiError("媒体登记成功但未返回 asset.id")
        return asset_id

    def create_character(self, item: ImportItem) -> Any:
        if item.asset_id in (None, ""):
            raise ApiError("缺少已登记的封面资源 ID")
        return self.post(
            "/admin/characters/create",
            {
                "char_code": item.name,
                "ver": item.version,
                "ai": True,
                "data": item.data,
                "cover_asset_id": item.asset_id,
                "assets": [
                    {
                        "asset_id": item.asset_id,
                        "role": "cover",
                        "access": "public",
                        "state": "online",
                        "sort": 0,
                    }
                ],
            },
            request_id=str(uuid.uuid4()),
        )


class CharacterImportApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title(APP_TITLE)
        self.root.geometry("1180x760")
        self.root.minsize(980, 680)
        self.window_icon: tk.PhotoImage | None = None
        self.icon_load_error = ""
        icon_path = resource_path("app-icon.png")
        if icon_path:
            try:
                self.window_icon = tk.PhotoImage(file=str(icon_path))
                self.root.iconphoto(True, self.window_icon)
            except tk.TclError as exc:
                # 图标加载失败不应阻断批量导入，界面初始化后在执行日志中提示。
                self.icon_load_error = str(exc)

        self.items: dict[str, ImportItem] = {}
        self.challenge_id = ""
        self.worker: threading.Thread | None = None
        self.stop_event = threading.Event()
        self.events: queue.Queue[tuple[str, Any]] = queue.Queue()

        self.environment_var = tk.StringVar(value="测试环境")
        self.email_var = tk.StringVar()
        self.code_var = tk.StringVar()
        self.token_var = tk.StringVar()
        self.summary_var = tk.StringVar(value="共 0 个角色")
        self.progress_var = tk.DoubleVar(value=0)
        self._build_ui()
        self.root.after(100, self._process_events)
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_ui(self) -> None:
        style = ttk.Style()
        style.configure("Treeview", rowheight=30)

        environment_frame = ttk.LabelFrame(self.root, text="环境与管理员登录", padding=12)
        environment_frame.pack(fill=tk.X, padx=14, pady=(14, 8))
        ttk.Label(environment_frame, text="环境").grid(row=0, column=0, sticky=tk.W)
        self.environment_box = ttk.Combobox(
            environment_frame,
            textvariable=self.environment_var,
            values=list(ENVIRONMENTS),
            state="readonly",
            width=12,
        )
        self.environment_box.grid(row=0, column=1, padx=(6, 18), sticky=tk.W)
        self.environment_box.bind("<<ComboboxSelected>>", self._on_environment_changed)
        ttk.Label(environment_frame, text="管理员邮箱").grid(row=0, column=2, sticky=tk.W)
        ttk.Entry(environment_frame, textvariable=self.email_var, width=28).grid(
            row=0, column=3, padx=6, sticky=tk.EW
        )
        self.send_code_button = ttk.Button(environment_frame, text="发送验证码", command=self._send_code)
        self.send_code_button.grid(row=0, column=4, padx=(0, 18))
        ttk.Label(environment_frame, text="验证码").grid(row=0, column=5, sticky=tk.W)
        ttk.Entry(environment_frame, textvariable=self.code_var, width=10).grid(row=0, column=6, padx=6)
        self.login_button = ttk.Button(environment_frame, text="登录", command=self._login)
        self.login_button.grid(row=0, column=7)

        ttk.Label(environment_frame, text="管理员 Token（明文，仅保存在当前进程）").grid(
            row=1, column=0, columnspan=2, pady=(12, 0), sticky=tk.W
        )
        self.token_entry = ttk.Entry(environment_frame, textvariable=self.token_var)
        self.token_entry.grid(
            row=1, column=2, columnspan=5, padx=6, pady=(12, 0), sticky=tk.EW
        )
        self.verify_button = ttk.Button(environment_frame, text="验证权限", command=self._verify_token)
        self.verify_button.grid(row=1, column=7, pady=(12, 0))
        environment_frame.columnconfigure(3, weight=1)

        toolbar = ttk.Frame(self.root, padding=(14, 6))
        toolbar.pack(fill=tk.X)
        self.select_directory_button = ttk.Button(toolbar, text="选择导入目录", command=self._select_folder)
        self.select_directory_button.pack(side=tk.LEFT)
        self.clear_button = ttk.Button(toolbar, text="清空", command=self._clear_items)
        self.clear_button.pack(side=tk.LEFT, padx=6)
        ttk.Label(toolbar, textvariable=self.summary_var).pack(side=tk.RIGHT)

        tree_frame = ttk.Frame(self.root, padding=(14, 0))
        tree_frame.pack(fill=tk.BOTH, expand=True)
        columns = ("name", "version", "json", "cover", "status", "detail")
        self.tree = ttk.Treeview(tree_frame, columns=columns, show="headings", selectmode="extended")
        headings = {
            "name": "角色",
            "version": "版本",
            "json": "JSON 文件",
            "cover": "封面",
            "status": "状态",
            "detail": "说明",
        }
        widths = {"name": 145, "version": 70, "json": 230, "cover": 190, "status": 85, "detail": 320}
        for column in columns:
            self.tree.heading(column, text=headings[column])
            self.tree.column(column, width=widths[column], minwidth=60, stretch=column in {"json", "cover", "detail"})
        scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.tag_configure("success", foreground="#14804a")
        self.tree.tag_configure("error", foreground="#c62828")
        self.tree.tag_configure("running", foreground="#1677ff")

        progress_frame = ttk.Frame(self.root, padding=(14, 8))
        progress_frame.pack(fill=tk.X)
        self.progress = ttk.Progressbar(progress_frame, variable=self.progress_var, maximum=100)
        self.progress.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.start_button = ttk.Button(progress_frame, text="开始批量导入", command=self._start_import)
        self.start_button.pack(side=tk.LEFT, padx=(12, 6))
        self.retry_button = ttk.Button(progress_frame, text="重试失败项", command=self._retry_failed)
        self.retry_button.pack(side=tk.LEFT, padx=6)
        self.stop_button = ttk.Button(progress_frame, text="停止", command=self._stop_import, state=tk.DISABLED)
        self.stop_button.pack(side=tk.LEFT, padx=(6, 0))

        log_frame = ttk.LabelFrame(self.root, text="执行日志（不会记录 Token 和上传签名）", padding=8)
        log_frame.pack(fill=tk.BOTH, padx=14, pady=(0, 14))
        self.log_text = tk.Text(log_frame, height=8, wrap=tk.WORD, state=tk.DISABLED)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        self._log("请选择环境，可使用管理员邮箱登录，也可直接填写该环境的管理员 Token。")
        if self.icon_load_error:
            self._log(f"应用图标加载失败：{self.icon_load_error}")

    def _api_client(self) -> EmoraApiClient:
        return EmoraApiClient(ENVIRONMENTS[self.environment_var.get()], self.token_var.get())

    def _run_async(self, action: Callable[[], Any], success_event: str) -> None:
        # 登录类请求执行期间锁定环境，避免测试环境响应被误写入生产环境会话。
        self.environment_box.configure(state=tk.DISABLED)

        def run() -> None:
            try:
                result = action()
                self.events.put((success_event, result))
            except Exception as exc:  # GUI 边界统一转为可读失败消息
                self.events.put(("action_error", str(exc)))

        threading.Thread(target=run, daemon=True).start()

    def _send_code(self) -> None:
        email = self.email_var.get().strip()
        if not email:
            messagebox.showwarning(APP_TITLE, "请输入管理员邮箱")
            return
        self.send_code_button.configure(state=tk.DISABLED)
        environment = self.environment_var.get()

        def action() -> dict[str, Any]:
            client = EmoraApiClient(ENVIRONMENTS[environment])
            try:
                return client.send_email_code(email)
            finally:
                client.close()

        self._run_async(action, "code_sent")

    def _login(self) -> None:
        email = self.email_var.get().strip()
        code = self.code_var.get().strip()
        if not email or not code or not self.challenge_id:
            messagebox.showwarning(APP_TITLE, "请先发送验证码，再填写收到的验证码")
            return
        self.login_button.configure(state=tk.DISABLED)
        environment = self.environment_var.get()
        challenge_id = self.challenge_id

        def action() -> dict[str, Any]:
            client = EmoraApiClient(ENVIRONMENTS[environment])
            try:
                login_data = client.email_login(email, challenge_id, code)
                token = str(login_data.get("access_token") or "").strip()
                if not token:
                    raise ApiError("登录成功但未返回 access_token")
                client.token = token
                client.validate_admin()
                return {"token": token, "user": login_data.get("user")}
            finally:
                client.close()

        self._run_async(action, "login_success")

    def _verify_token(self) -> None:
        if not self.token_var.get().strip():
            messagebox.showwarning(APP_TITLE, "请填写管理员 Token")
            return
        self.verify_button.configure(state=tk.DISABLED)

        def action() -> bool:
            client = self._api_client()
            try:
                client.validate_admin()
                return True
            finally:
                client.close()

        self._run_async(action, "token_verified")

    def _select_folder(self) -> None:
        folder = filedialog.askdirectory(title="选择导入目录")
        if not folder:
            return
        paths = sorted(Path(folder).rglob("*.json"))
        if not paths:
            messagebox.showinfo(APP_TITLE, "所选目录中没有 JSON 文件")
            return
        if len(paths) > MAX_BATCH_SIZE:
            messagebox.showerror(APP_TITLE, f"单次最多加入 {MAX_BATCH_SIZE} 个 JSON")
            return
        self._add_paths(paths)

    def _add_paths(self, paths: list[Path]) -> None:
        existing_paths = {item.json_path for item in self.items.values()}
        added = 0
        for path in paths:
            resolved = path.resolve()
            if resolved in existing_paths or len(self.items) >= MAX_BATCH_SIZE:
                continue
            item = load_import_item(resolved)
            self.items[item.item_id] = item
            existing_paths.add(resolved)
            self._render_item(item)
            added += 1
        self._mark_duplicate_names()
        self._update_summary()
        self._log(f"已加入 {added} 个 JSON；封面会优先自动匹配同目录 cover.*。")

    def _mark_duplicate_names(self) -> None:
        for item in self.items.values():
            if item.error == "批次内角色名称重复":
                item.is_valid = True
                item.status = "待导入"
                item.error = ""
                self._render_item(item)
        groups: dict[str, list[ImportItem]] = {}
        for item in self.items.values():
            if item.name:
                groups.setdefault(item.name.casefold(), []).append(item)
        for group in groups.values():
            if len(group) <= 1:
                continue
            for item in group:
                item.is_valid = False
                item.status = "待修正"
                item.error = "批次内角色名称重复"
                self._render_item(item)

    def _clear_items(self) -> None:
        if self.worker and self.worker.is_alive():
            return
        self.items.clear()
        for item_id in self.tree.get_children():
            self.tree.delete(item_id)
        self.progress_var.set(0)
        self._update_summary()

    def _start_import(self, failed_only: bool = False) -> None:
        if self.worker and self.worker.is_alive():
            return
        token = self.token_var.get().strip()
        if not token:
            messagebox.showwarning(APP_TITLE, "请填写管理员 Token")
            return
        candidates = [
            item
            for item in self.items.values()
            if item.is_valid
            and item.status != "导入成功"
            and (not failed_only or item.status == "导入失败")
        ]
        if not candidates:
            messagebox.showinfo(APP_TITLE, "没有可导入的角色，请检查封面、JSON 或失败状态")
            return
        environment = self.environment_var.get()
        if environment == "生产环境" and not messagebox.askyesno(
            APP_TITLE,
            f"将向生产环境导入 {len(candidates)} 个角色，确认继续吗？",
            icon=messagebox.WARNING,
        ):
            return

        self.stop_event.clear()
        self._set_running(True)
        self.progress_var.set(0)
        self.worker = threading.Thread(
            target=self._import_worker,
            args=(candidates, ENVIRONMENTS[environment], token),
            daemon=True,
        )
        self.worker.start()

    def _retry_failed(self) -> None:
        self._start_import(failed_only=True)

    def _stop_import(self) -> None:
        self.stop_event.set()
        self._log("已请求停止；当前正在执行的网络请求完成后停止。")

    def _import_worker(self, candidates: list[ImportItem], api_url: str, token: str) -> None:
        client = EmoraApiClient(api_url, token)
        try:
            client.validate_admin()
            total = len(candidates)
            for index, item in enumerate(candidates, start=1):
                if self.stop_event.is_set():
                    self.events.put(("batch_stopped", None))
                    return
                try:
                    if item.asset_id in (None, ""):
                        self.events.put(("item_status", (item.item_id, "上传封面", "", "running")))
                        item.asset_id = client.upload_cover(item.cover_path, item.name)  # type: ignore[arg-type]
                    self.events.put(("item_status", (item.item_id, "导入角色", "", "running")))
                    client.create_character(item)
                    self.events.put(("item_status", (item.item_id, "导入成功", "", "success")))
                except Exception as exc:
                    # 已登记的 asset_id 保留在内存中，重试时直接创建角色，避免重复上传封面。
                    self.events.put(("item_status", (item.item_id, "导入失败", str(exc), "error")))
                self.events.put(("progress", index * 100 / total))
            self.events.put(("batch_finished", None))
        except Exception as exc:
            self.events.put(("batch_error", str(exc)))
        finally:
            client.close()

    def _render_item(self, item: ImportItem, tag: str | None = None) -> None:
        values = (
            item.name or "—",
            item.version or "—",
            item.json_path.name,
            item.cover_path.name if item.cover_path else "未找到",
            item.status,
            item.error or "—",
        )
        tags = (tag,) if tag else (("error",) if not item.is_valid else ())
        if self.tree.exists(item.item_id):
            self.tree.item(item.item_id, values=values, tags=tags)
        else:
            self.tree.insert("", tk.END, iid=item.item_id, values=values, tags=tags)

    def _process_events(self) -> None:
        try:
            while True:
                event, payload = self.events.get_nowait()
                if event == "action_error":
                    self._log(f"操作失败：{payload}")
                    messagebox.showerror(APP_TITLE, str(payload))
                    self.send_code_button.configure(state=tk.NORMAL)
                    self.login_button.configure(state=tk.NORMAL)
                    self.verify_button.configure(state=tk.NORMAL)
                    self.environment_box.configure(state="readonly")
                elif event == "code_sent":
                    self.challenge_id = str(payload.get("challenge_id") or "")
                    self.send_code_button.configure(state=tk.NORMAL)
                    self.environment_box.configure(state="readonly")
                    self._log("验证码已发送，请查收邮箱。")
                elif event == "login_success":
                    self.token_var.set(payload["token"])
                    self.login_button.configure(state=tk.NORMAL)
                    self.environment_box.configure(state="readonly")
                    self._log("登录成功，管理员权限验证通过，Token 已填入输入框。")
                elif event == "token_verified":
                    self.verify_button.configure(state=tk.NORMAL)
                    self.environment_box.configure(state="readonly")
                    self._log("管理员 Token 有效。")
                elif event == "item_status":
                    item_id, status, error, tag = payload
                    item = self.items[item_id]
                    item.status = status
                    item.error = error
                    self._render_item(item, tag)
                    self._log(f"{item.name}：{status}{(' - ' + error) if error else ''}")
                elif event == "progress":
                    self.progress_var.set(payload)
                elif event == "batch_finished":
                    self._set_running(False)
                    self._log("批量导入执行完成，请检查每个角色的状态。")
                    self._update_summary()
                elif event == "batch_stopped":
                    self._set_running(False)
                    self._log("批量导入已停止。")
                    self._update_summary()
                elif event == "batch_error":
                    self._set_running(False)
                    self._log(f"批量导入中止：{payload}")
                    messagebox.showerror(APP_TITLE, str(payload))
        except queue.Empty:
            pass
        self.root.after(100, self._process_events)

    def _set_running(self, is_running: bool) -> None:
        normal_state = tk.DISABLED if is_running else tk.NORMAL
        for button in (
            self.select_directory_button,
            self.clear_button,
            self.start_button,
            self.retry_button,
            self.send_code_button,
            self.login_button,
            self.verify_button,
        ):
            button.configure(state=normal_state)
        self.stop_button.configure(state=tk.NORMAL if is_running else tk.DISABLED)
        self.environment_box.configure(state=tk.DISABLED if is_running else "readonly")

    def _on_environment_changed(self, _event: Any = None) -> None:
        if self.worker and self.worker.is_alive():
            return
        # 登录挑战和 Token 不能跨测试/生产环境复用，切换时主动清空，避免误操作。
        self.challenge_id = ""
        self.code_var.set("")
        self.token_var.set("")
        self._log(f"已切换到{self.environment_var.get()}，请重新登录或填写该环境的管理员 Token。")

    def _update_summary(self) -> None:
        success = sum(item.status == "导入成功" for item in self.items.values())
        failed = sum(item.status == "导入失败" for item in self.items.values())
        invalid = sum(not item.is_valid for item in self.items.values())
        self.summary_var.set(
            f"共 {len(self.items)} 个角色 · 成功 {success} · 失败 {failed} · 待修正 {invalid}"
        )

    def _log(self, message: str) -> None:
        self.log_text.configure(state=tk.NORMAL)
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.log_text.configure(state=tk.DISABLED)

    def _on_close(self) -> None:
        if self.worker and self.worker.is_alive():
            if not messagebox.askyesno(APP_TITLE, "导入仍在执行，确认关闭窗口吗？"):
                return
            self.stop_event.set()
        self.token_var.set("")
        self.root.destroy()


def main() -> None:
    root = tk.Tk()
    CharacterImportApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
