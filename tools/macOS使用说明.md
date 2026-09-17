# Emora 角色卡批量导入工具：macOS 使用说明

## 1. 这个压缩包是什么

`EmoraCharacterImporter-macOS-build-kit.zip` 是 macOS 构建包。由于 macOS 应用必须在 Mac 上构建，第一次使用时需要在 Mac 终端执行一次构建脚本。构建成功后会得到可以双击启动的：

```text
EmoraCharacterImporter.app
```

后续使用时不需要再次构建，直接双击 `.app` 即可。

## 2. Mac 环境准备

需要：

- macOS 12 或更高版本；
- Python 3.11 或 Python 3.12，并包含 Tkinter；
- Apple 命令行工具；
- 首次构建时能够访问 Python 包索引。

打开 Mac 的“终端”，执行：

```bash
python3 --version
python3 -c "import tkinter; print('Tkinter OK')"
```

如果没有 Python，建议从 Python 官方网站安装 macOS 版本。安装 Apple 命令行工具：

```bash
xcode-select --install
```

系统提示已经安装时可以直接继续。

## 3. 解压并构建

1. 将 `EmoraCharacterImporter-macOS-build-kit.zip` 复制到 Mac。
2. 双击 ZIP 解压。
3. 打开“终端”。
4. 进入解压后的目录。假设文件位于“下载”目录：

```bash
cd ~/Downloads/EmoraCharacterImporter-macOS-build-kit
```

5. 执行构建：

```bash
bash build_macos.sh
```

第一次构建需要安装依赖，所需时间取决于网络。完成后终端会输出应用和分发压缩包路径：

```text
dist-macos/EmoraCharacterImporter.app
dist-macos/EmoraCharacterImporter-macOS-<架构>-<时间>.zip
```

## 4. 启动应用

可以在 Finder 中打开解压目录，再进入 `dist-macos`，双击：

```text
EmoraCharacterImporter.app
```

也可以在终端执行：

```bash
open dist-macos/EmoraCharacterImporter.app
```

如果首次启动被 macOS 拦截：

1. 在 Finder 中找到 `EmoraCharacterImporter.app`；
2. 右键应用；
3. 选择“打开”；
4. 在系统确认窗口中再次选择“打开”。

默认构建采用本机临时签名，适合本机使用。对外分发需要 Apple Developer ID 签名和公证。

## 5. 准备角色目录

推荐每个角色使用一个独立子目录，并在子目录中放置一个角色 JSON 和封面：

```text
角色
├── Nana
│   ├── Nana_v2.0_character.json
│   └── cover.png
└── Amamiya_Sayo
    ├── Amamiya_Sayo_v2.0_character.json
    └── cover.png
```

要求：

- JSON 必须是 `spec=chara_card_v2` 的角色卡；
- JSON 中必须存在 `data.name` 和 `spec_version`；
- 封面支持 PNG、JPG、JPEG、WEBP；
- 推荐将封面命名为 `cover.png`；
- 同一批次内不能包含两个相同的角色名称。

程序会递归读取所选目录中的所有 JSON，并按以下顺序自动寻找封面：

1. JSON 的 `data.avatar` 指向的本地图片；
2. 同目录中的 `cover.*`、`avatar.*` 或 `image.*`；
3. 与 JSON 文件或角色名称同名的图片；
4. 同目录只有一张支持的图片时使用该图片。

## 6. 登录或填写 Token

1. 先选择“测试环境”或“生产环境”。
2. 可以使用管理员邮箱接收验证码并登录。
3. 登录成功后，管理员 Token 会自动填入 Token 输入框。
4. 也可以直接把已有管理员 Token 粘贴到输入框。
5. 手动填写 Token 后，可以点击“验证权限”。

Token 按当前工具要求明文显示，但只保存在当前程序进程中，不会写入配置文件。请避免在屏幕共享时暴露 Token。

切换测试环境和生产环境时，程序会自动清空验证码、登录挑战和 Token，避免跨环境误操作。

## 7. 批量导入

1. 点击“选择导入目录”。
2. 选择包含全部角色子目录的上级目录。
3. 程序会把目录中的全部角色加入列表，并自动匹配封面。
4. 检查列表中的角色、版本、JSON、封面和状态。
5. 填写有效管理员 Token。
6. 点击“开始批量导入”。
7. 生产环境会再次弹窗确认，确认后才会上传。

实际执行顺序为：

```text
获取封面上传策略
→ 上传封面到对象存储
→ 登记媒体资源
→ 导入角色 JSON
```

单个角色失败不会阻断后续角色。失败项可以点击“重试失败项”；执行过程中点击“停止”，会在当前网络请求结束后停止后续角色。

## 8. 状态说明

- `待导入`：JSON 和封面检查通过，尚未执行；
- `待修正`：JSON 不合法、未找到封面或批次内名称重复；
- `上传封面`：正在上传并登记封面资源；
- `导入角色`：正在调用角色导入接口；
- `导入成功`：角色和封面均已处理完成；
- `导入失败`：接口或网络返回失败，可查看“说明”列和执行日志。

## 9. 常见问题

### 提示“未自动找到封面”

把封面放到对应角色 JSON 的同一目录，并命名为 `cover.png`，然后点击“清空”，重新选择导入目录。

### 提示角色名称已存在

环境中已经存在相同的 `data.name`。工具不会覆盖原角色，需要修改 JSON 中的角色名称或在后台确认已有数据。

### 提示 401 或 403

Token 已过期、环境选错或账号没有管理员权限。重新登录，或填写对应环境的有效管理员 Token。

### 构建时提示没有 Tkinter

当前 Python 不包含 Tkinter。安装 Python 官方 macOS 安装包后重新执行构建脚本。

### Apple Silicon 与 Intel 怎么选择

脚本默认跟随当前 Python 架构：

- M1/M2/M3/M4 Mac 使用 arm64 Python；
- Intel Mac 使用 x86_64 Python；
- 只有 Python 和依赖都支持 universal2 时，才使用：

```bash
TARGET_ARCH=universal2 bash build_macos.sh
```

## 10. 安全说明

- 不要把管理员 Token、验证码或账号信息放进角色 JSON；
- 不要把含 Token 的截图发送给无关人员；
- 工具日志不会主动记录 Token 和对象存储上传签名；
- 生产环境导入前请再次核对角色数量、角色名称和封面；
- 工具没有覆盖角色功能，同名角色会由服务端拒绝。
