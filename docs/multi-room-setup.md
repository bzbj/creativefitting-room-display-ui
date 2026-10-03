# 每个会议室绑定一块屏

所有会议屏使用同一份网页。每块屏通过固定的 `room` 编号选择自己的房间；CA1 集中读取飞书，分别发布每个房间的匿名快照。

| 屏幕绑定 | Fully 的 Start URL |
| --- | --- |
| 1 号会议室 | `https://lab.linjunkai.com/meeting-room-display/?room=1` |
| 2 号会议室 | `https://lab.linjunkai.com/meeting-room-display/?room=2` |
| 7 号会议室 | `https://lab.linjunkai.com/meeting-room-display/?room=7` |

编号是显示系统的稳定编号，不是飞书内部 ID。安装时在 Fully 的 **Web Content Settings → Start URL** 中填入对应链接，再打开 Start URL。每块屏只显示一个房间，没有轮播或自动切换。未带 `room` 的原链接仍默认显示 1 号房间，兼容已有 Acer 设置。

**当前只激活 1 号 WALLE 测试房间。** 2／7 号链接用于说明后续配置方式；配置完成前显示“状态未知 / 请检查会议室链接”。新办公室的名称／ID 尚未确定，不自动公开其他旧办公室房间。

## 后端增加或移除房间

部署维护者在 CA1 私有 `/etc/meeting-room-display-sync/rooms.json` 中维护列表。下列内容是占位示例，不能直接用于生产：

```json
{
  "rooms": [
    {"number": 1, "name": "示例会议室 A", "room_id": "<FEISHU_ROOM_ID_A>", "fallback_capacity": 6},
    {"number": 2, "name": "示例会议室 B", "room_id": "<FEISHU_ROOM_ID_B>", "fallback_capacity": 8},
    {"number": 7, "name": "示例会议室 C", "room_id": "<FEISHU_ROOM_ID_C>", "fallback_capacity": 4}
  ]
}
```

编号必须是唯一正整数，飞书 room ID 也必须唯一；列表没有写死“两间房”的限制。ID 和名称均须与飞书资源匹配。调整列表顺序不会改变编号；删除房间后，不要把其他房间重新编号。更换房间身份时同步核验对应实体屏。

配置后在 CA1 运行 `systemctl start meeting-room-display-sync.service`，检查日志以及 `/meeting-room-display/api/room/<编号>` 的名称／新鲜度，再逐一对照飞书已知预约与门牌。后端每五分钟读取全部已配置房间，自动续期令牌，无需 Mac 或 AI。一间房的忙闲读取失败不会改变其他房间的数据。

删除条目后，下一次成功加载配置的同步会移除其旧快照；原屏幕链接收到 404 并显示未知。合法的 `{"rooms": []}` 会停用全部房间快照，且不调用飞书。真实房间 ID、App Secret、令牌和预约样本不能放入公共 Git／网页。

## 前端协作约定

- `?room=N` 优先于旧本机 `/room/N` 路径及模板默认值。空值、非正整数、重复 `room` 参数、超出 JavaScript 安全整数范围的值均显示未知，绝不回退到 1 号。
- 前端读取同源 `/meeting-room-display/api/room/N`，每约十五秒取快照。JSON 结构不变，预约继续显示“已预约”。新建／取消预约通常等待下一次后端同步；已知预约的开始／结束由前端时钟计算。
- 本地用 `http://127.0.0.1:8767/preview/available/?room=2` 等链接设计。mock 支持多个编号，均为虚构数据。同时验证 `/preview/unknown/?room=2`、`?room=0` 和未配置房间的 404 行为。
- 保持 Acer 竖屏规范、Dotted-i 品牌和各状态的文字／颜色。不要把调试选房控件放到墙屏主界面。统一前端更新可供所有房间使用；已打开的旧 HTML 需刷新一次才能加载新代码。

```sh
python3 scripts/build.py
python3 -m unittest discover -s tests -v
node --check src/app.js
node --test tests/test_room_selection.cjs
```

## 预览参考

以下是桌面浏览器在 **602×962 CSS px 暂定竖屏画布**上的虚构数据截图，不代表 Acer 真机测量或最终验收。

| 2 号虚构会议室 | 错误链接 |
| --- | --- |
| ![虚构的 2 号会议室](multi-room-previews/room-2.png) | ![错误链接保持未知](multi-room-previews/invalid-link.png) |
