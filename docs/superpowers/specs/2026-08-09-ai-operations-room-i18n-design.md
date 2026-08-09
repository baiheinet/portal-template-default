# AI Operations Room 中文本地化设计

## 目标

将 AI Operations Room 的用户可见文案接入现有 `starter` 语言资源，支持 `en-US` 和 `zh-CN`，中文模式下不再混杂英文界面、任务步骤、工具流、审批、错误和结果文案。

## 范围

- 使用现有 `src/locales/index.ts` 注册机制，不新增 namespace 或依赖。
- 在 `src/locales/en-US.ts` 和 `src/locales/zh-CN.ts` 增加 Operations Room 共享 key。
- `src/pages/showcase/index.tsx`、`operations-room.tsx`、`mission.ts` 的用户可见文本改为通过翻译函数或本地化数据工厂获取。
- 保留客户名、记录 ID、金额、文件名和工具标识等数据格式；业务状态机和执行器接口不变。
- 英文作为默认源语言，中文提供完整对应翻译。

## 文案分组

- Showcase 模式切换与 Overview 入口
- Operations Room 标题、任务输入、计划按钮和状态
- 五步任务计划与工具名称
- 上下文面板和权限范围
- 工具执行流、引用、审计和 Demo 标识
- 审批、拒绝、重试、跳过、人工接管和重置
- 完成、阻断、失败和空状态

## 验证标准

- `zh-CN` 资源包含所有新增 Operations Room key。
- Operations Room 不再直接渲染主要英文 UI 文案。
- `en-US` 和 `zh-CN` 资源 key 集合一致。
- TypeScript、语言资源回归检查和生产构建通过。
- 不修改状态机逻辑、基础 UI 组件或用户已有未提交改动。
