# Emora 角色卡批量导入工具 macOS 构建说明

PyInstaller 不是交叉编译器，Windows 不能直接生成有效的 macOS `.app`。请将本构建包复制到 Mac，再执行下面的命令。

构建包内的 `app-icon.icns` 用于 macOS 应用、Dock 和 Finder 图标，`app-icon.png` 用于程序窗口图标。

## 环境要求

- macOS 12 或更高版本；
- Python 3.11 或 3.12，且包含 Tkinter；
- 首次构建前执行 `xcode-select --install` 安装 Apple 命令行工具；
- 网络可以访问 Python 包索引。

## 构建当前 Python 架构

在终端进入解压后的目录：

```bash
bash build_macos.sh
```

脚本会自动创建独立虚拟环境并生成：

```text
dist-macos/EmoraCharacterImporter.app
dist-macos/EmoraCharacterImporter-macOS-<架构>-<时间>.zip
```

Apple Silicon Mac 上使用 arm64 Python 时生成 arm64 版本；Intel Mac 上使用 x86_64 Python 时生成 Intel 版本。

## universal2 版本

只有当前 Python 和所有二进制依赖本身支持 universal2 时才能构建：

```bash
TARGET_ARCH=universal2 bash build_macos.sh
```

如果 PyInstaller 报告架构不兼容，应分别在 Apple Silicon 和 Intel 环境构建，不要强行合并二进制。

## 正式签名

默认使用本机临时签名，适合本机测试。拥有 Apple Developer ID 时可以指定证书：

```bash
MACOS_SIGN_IDENTITY="Developer ID Application: Company Name (TEAMID)" bash build_macos.sh
```

对外分发还需要使用 Apple 的 `notarytool` 完成公证和装订。本脚本不会保存证书密码或 Apple ID 凭据。

## 首次运行

未经过 Apple 公证的本地构建可能被 Gatekeeper 拦截。请在 Finder 中右键应用并选择“打开”，确认应用来源后运行。不要在来源不可信的机器上绕过系统安全提示。
