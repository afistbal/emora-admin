# Emora 角色卡批量导入工具

该工具复用管理后台现有接口，按以下顺序执行：

1. 获取封面上传策略；
2. 将封面直传对象存储；
3. 登记媒体资源并取得 `asset.id`；
4. 调用 `/admin/characters/create` 导入 `chara_card_v2` JSON。

## Windows 可执行程序

已打包版本可以直接双击运行，无需安装 Python：

```text
C:\Users\admin\Desktop\tools\EmoraCharacterImporter.exe
```

Windows 首次启动时可能显示安全确认，这是未进行商业代码签名的本地工具；请核对文件路径后再运行。

## 安装与启动

在 `D:\work\emora-admin` 下执行：

```powershell
python -m pip install -r tools\character_import_requirements.txt
python tools\character_import_gui.py
```

## 目录格式

推荐每个角色使用一个子目录：

```text
角色目录
├─ Nana
│  ├─ Nana_v2.0_character.json
│  └─ cover.png
└─ Amamiya_Sayo
   ├─ Amamiya_Sayo_v2.0_character.json
   └─ cover.png
```

点击“选择导入目录”后，工具会递归读取该目录中的全部 JSON，并按以下优先级匹配同目录封面：

1. JSON `data.avatar` 指向的本地文件；
2. `cover.*`、`avatar.*` 或 `image.*`；
3. 与 JSON 文件或角色名称同名的图片；
4. 同目录只有一张支持的图片时使用该图片。

封面支持 PNG、JPG、JPEG、WEBP。自动匹配失败的角色会标记为“待修正”，请将封面按 `cover.png` 等支持的名称放入对应角色目录后，清空列表并重新选择导入目录。

## 登录与安全

- 可以使用管理员邮箱验证码登录，也可以直接填写已有的管理员 Token。
- 邮箱登录成功后，Token 会自动填入同一个输入框，并先验证管理员权限。
- Token 按操作要求明文显示，使用时请避免屏幕共享或让无关人员看到窗口。
- Token 只保存在当前 Python 进程内，不写入文件或系统配置。
- 切换测试/生产环境时会清空验证码、登录挑战和 Token，防止跨环境误用。
- 生产环境开始导入前会再次弹窗确认。
- 日志不记录 Token、对象存储签名和完整上传策略。

## 失败与重试

- 批次按顺序逐个导入，某一个角色失败不会阻断后续角色。
- 创建角色失败但封面已登记时，工具在本次运行内保留 `asset_id`；点击“重试失败项”不会重复上传封面。
- 关闭工具后不会持久化 `asset_id`。若创建失败后关闭工具，对象存储中可能保留未被角色引用的媒体资源，需要按后台媒体清理策略处理。
- 角色名称由 `data.name` 决定。若环境中已存在同名角色，后端唯一性校验会拒绝导入，工具不会覆盖原角色。
