# 控制投入研究 · 公开进度

公开页面：<https://psychelzh.github.io/control-effort-progress/>

独立页面仓库：<https://github.com/psychelzh/control-effort-progress>

本页整理本地项目的核心流程和任务进度，不复制项目原仓库的历史、申请书、量表、个体筛查、访谈或参与者数据。项目以 2027 年申报项目为口径；目录名称中的“2026”不代表资助年度。提交、立项与伦理状态需依据实际凭据核实。

## 更新日常进度

最方便的方法是在页面点击“维护进度”，登录有写权限的 GitHub 账号，编辑 `site/data/progress.json` 并提交到 `main`。

1. 找到 `tasks` 内对应任务，更新 `status`、`next` 和 `evidence`。已有任务的 `id` 保持不变。
2. 根据实际变化更新 `project.phase`、`focusTitle`、`focusLabel`、`focusSteps` 与 `statusNote`。
3. 更新 `project.updatedAt`（页面整理日期）和 `project.evidenceAsOf`（实际核实到的日期）。不要用页面更新日期替代材料核实日期。
4. 在 `updates` 顶部增加一条实际变化记录。仅写公开的任务级进展。
5. 提交后到仓库 Actions 查看自动校验和部署结果；部署成功后刷新页面。

状态值：

| 值 | 页面名称 | 用法 |
| --- | --- | --- |
| `done` | 已完成 | 有实际交付物或执行证据支持 |
| `doing` | 进行中 | 已确认正在执行 |
| `blocked` | 待落实 | 必要启动条件尚未满足 |
| `unverified` | 待核实 | 执行情况缺少充分记录 |
| `todo` | 待开始 | 已排入流程，尚未开展 |

示例（仅说明更新格式，不表示该事项已完成）：

```json
{
  "status": "doing",
  "next": "补齐尚未通过的关键功能测试。",
  "evidence": "YYYY-MM-DD已核查任务版本和内部测试记录。"
}
```

任务计数不是项目完成百分比。任务的 `dependsOn` 引用其他任务 ID；标记完成前先核查前置条件。`gates` 引用任务状态，随任务数据自动更新；`milestones` 始终为拟定安排。

## 本地维护与验证

本地项目中的 `progress-site` 是首次发布的源文件副本；**线上最新版本以独立 GitHub 仓库为准**。如果已在 GitHub 编辑，请先在独立检出中 `git pull --ff-only`，不要直接用旧副本覆盖。

推荐在 OneDrive 外检出和维护独立页面仓库，例如：

```powershell
$progressCheckout = Join-Path $env:USERPROFILE '.codex\cache\sichuan-nsf-progress\checkout'
gh repo clone psychelzh/control-effort-progress $progressCheckout
Set-Location -LiteralPath $progressCheckout
node scripts/check.mjs
node --check site/app.js
python -m http.server 8767 --bind 127.0.0.1 --directory site
```

打开 <http://127.0.0.1:8767/> 预览。提交并推送 `main` 后自动部署；没有构建依赖和访问者登录要求。页面为共享只读视图，访客筛选不会改变公开进度；维护操作由 GitHub 仓库写权限控制。

## 发布范围与校验

GitHub Actions 仅上传 `site/`，包含 HTML、CSS、JavaScript、图标、`.nojekyll` 和精简进度 JSON。`scripts/check.mjs` 校验状态、ID、日期、材料依据、依赖引用、依赖环、完成任务的前置状态、静态文件白名单及常见敏感字段。新增公开内容仍需由维护者核对。

部署配置使用 GitHub 官方 Pages 工作流：<https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>。
