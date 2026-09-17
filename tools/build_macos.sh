#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "错误：macOS .app 必须在 Mac 上构建。" >&2
  exit 1
fi

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="$SCRIPT_DIR/.venv-macos"
DIST_DIR="$SCRIPT_DIR/dist-macos"
WORK_DIR="$SCRIPT_DIR/build-macos"
APP_PATH="$DIST_DIR/EmoraCharacterImporter.app"

if [[ ! -d "$VENV_DIR" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip
python -m pip install -r "$SCRIPT_DIR/character_import_requirements.txt" "pyinstaller==6.20.0"

PYTHON_ARCH="$(python -c 'import platform; print(platform.machine())')"
TARGET_ARCH="${TARGET_ARCH:-}"
PYINSTALLER_ARGS=(
  --noconfirm
  --clean
  --windowed
  --onedir
  --name EmoraCharacterImporter
  --icon "$SCRIPT_DIR/app-icon.icns"
  --add-data "$SCRIPT_DIR/app-icon.png:."
  --distpath "$DIST_DIR"
  --workpath "$WORK_DIR/work"
  --specpath "$WORK_DIR/spec"
)

if [[ -n "$TARGET_ARCH" ]]; then
  PYINSTALLER_ARGS+=(--target-arch "$TARGET_ARCH")
fi

echo "Python 架构：$PYTHON_ARCH"
echo "目标架构：${TARGET_ARCH:-跟随当前 Python}"
python -m PyInstaller "${PYINSTALLER_ARGS[@]}" "$SCRIPT_DIR/character_import_gui.py"

if [[ ! -d "$APP_PATH" ]]; then
  echo "错误：未生成 $APP_PATH" >&2
  exit 1
fi

# 未提供开发者证书时使用本机临时签名，可用于本机测试；正式分发仍需 Developer ID 和公证。
if [[ -n "${MACOS_SIGN_IDENTITY:-}" ]]; then
  codesign --deep --force --options runtime --timestamp \
    --sign "$MACOS_SIGN_IDENTITY" "$APP_PATH"
else
  codesign --deep --force --sign - "$APP_PATH"
fi
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

BUILD_ARCH="${TARGET_ARCH:-$PYTHON_ARCH}"
BUILD_TAG="$(date +%Y%m%d-%H%M%S)"
ZIP_PATH="$DIST_DIR/EmoraCharacterImporter-macOS-${BUILD_ARCH}-${BUILD_TAG}.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP_PATH" "$ZIP_PATH"

echo "构建完成：$APP_PATH"
echo "分发压缩包：$ZIP_PATH"
