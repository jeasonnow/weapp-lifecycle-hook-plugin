<!--
 * @Description:
 * @version:
 * @Author: guyifeng
 * @Date: 2020-08-19 17:58:52
 * @LastEditors: guyifeng
 * @LastEditTime: 2020-08-26 16:47:37
-->

# `weapp-lifecycle-hook-plugin`

---

Taro 微信小程序全局生命周期钩子拦截插件 @teana/weapp-lifecycle-hook-plugin

- 提供 `setupLifecycleListeners` 用于全局代理指定微信小程序生命周期
- 提供 `OverrideWechatPage` 类用于为小程序指定生命周期添加监听

## Installation

```js
yarn add @teana/weapp-lifecycle-hook-plugin
```

## Usage

> 因为 Taro 打包时统一处理所有组件，所以为了正确区分包装的组件是否为页面，会在所有 options 中额外暴露一个参数 `__isPage__` 用于区分

```ts
import OverrideWechatPage, { setupLifecycleListeners, ProxyLifecycle } from '{{ packageName }}';

// 供 setupLifecycleListeners 使用的 hook 函数，接受一个参数，为当前组件/页面的options
function simpleReportGoPage(options: any): void {
  console.log('goPage', options);
}

// setupListeners
class App extends Component {
  constructor(props) {
    super(props);
  }

  componentWillMount() {
    // ...
    // 手动创建的实例和使用 setupLifecycleListeners 创建的实例不是同一个，所以需要销毁时需要单独对其进行销毁
    // 直接调用实例方式
    const instance = new OverrideWechatPage(this.config.pages);
    // 直接调用实例上的 addListener 方法在全局增加监听函数，可链式调用
    instance.addLifecycleListener(ProxyLifecycle.SHOW, simpleReportGoPage);
    // setupListeners 的使用
    setupLifecycleListeners(ProxyLifecycle.SHOW, [simpleReportGoPage], this.config.pages);
    // ...
  }

  // ...
}
```

## API

> 在 Taro 中使用时请注意需要在 App 的 `componentWillMount` 中处理，保证能获取到完整的路由表。

### setupLifecycleListeners(lifecycle, hooks, pages)

```ts
interface IOverrideWechatPageInitOptions {
  __route__?: string;
  __isPage__?: boolean;
  [key: string]: any;
}

type WeappLifecycleHook = (options: IOverrideWechatPageInitOptions) => void;
```

Params

| Name      | Type                 | Default | Description                           |
| --------- | -------------------- | ------- | ------------------------------------- |
| lifecycle | string               | -       | 需要挂载钩子函数的生命周期            |
| hooks     | WeappLifecycleHook[] | []      | 需要绑定的钩子函数                    |
| pages     | String[]             | []      | 当前的路由表，用于区分页面是否为 Page |

Return

`Function`，该`Function` 用于重置被代理的`Page` `Component` 方法。

```ts
const unListen = setupLifecycleListeners(lifecycle, hooks, pages);

unListen();
```

### OverrideWechatPage.addListener(lifecycleOrLifeTime, hook)

Params

| Name                 | Type                   | Default | Description                |
| -------------------- | ---------------------- | ------- | -------------------------- |
| lifecycleOrLifeTimes | string                 | -       | 需要挂载钩子函数的生命周期 |
| hook                 | OverrideWechatPageHook | -       | 全局的钩子函数             |

Return `OverrideWechatPage` 实例，供链式调用

## 可以使用的生命周期

可以直接从库中导出 `ProxyLifecycle` 直接调用

```ts
export const ProxyLifecycle = {
  // Page生命周期
  ON_READY: 'onReady',
  ON_SHOW: 'onShow',
  ON_HIDE: 'onHide',
  ON_LOAD: 'onLoad',
  ON_UNLOAD: 'onUnload',
  // Component生命周期
  CREATED: 'created',
  ATTACHED: 'attached',
  READY: 'ready',
  MOVED: 'moved',
  DETACHED: 'detached',
  SHOW: 'show',
  HIDE: 'hide',
  RESIZE: 'resize',
};
```
