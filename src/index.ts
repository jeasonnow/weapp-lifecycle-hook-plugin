/*
 * @Description: 复写微信小程序中的 Component 和 Page,用于做生命周期劫持
 * @version:
 * @Author: guyifeng
 * @Date: 2020-08-17 08:14:53
 * @LastEditors: guyifeng
 * @LastEditTime: 2020-08-26 17:46:14
 */
import { runFunctionWithAop } from './helpers';
// 微信原始Page方法
declare let Page: any;
// 微信原始Component
declare let Component: any;

// 如果后续想要增加生命周期的拦截，扩展该枚举。
export const ProxyLifecycle = {
  ON_READY: 'onReady',
  ON_SHOW: 'onShow',
  ON_HIDE: 'onHide',
  ON_LOAD: 'onLoad',
  ON_UNLOAD: 'onUnload',
  CREATED: 'created',
  ATTACHED: 'attached',
  READY: 'ready',
  MOVED: 'moved',
  DETACHED: 'detached',
  SHOW: 'show',
  HIDE: 'hide',
  RESIZE: 'resize',
};

interface IOverrideWechatPageInitOptions {
  __route__?: string;
  __isPage__?: boolean;
  [key: string]: any;
}

type WeappLifecycleHook = (options: IOverrideWechatPageInitOptions) => void;

function getWxPage(): any {
  return Page;
}

function overrideWxPage(newPage: any): void {
  Page = newPage;
}

function getWxComponent(): any {
  return Component;
}

function overrideWxComponent(newComponent: any): void {
  Component = newComponent;
}

// Page生命周期
const lifecycleMap = {
  page: [
    ProxyLifecycle.ON_READY,
    ProxyLifecycle.ON_HIDE,
    ProxyLifecycle.ON_LOAD,
    ProxyLifecycle.ON_SHOW,
    ProxyLifecycle.ON_UNLOAD,
  ],
  component: [
    ProxyLifecycle.READY,
    ProxyLifecycle.ATTACHED,
    ProxyLifecycle.CREATED,
    ProxyLifecycle.DETACHED,
    ProxyLifecycle.MOVED,
  ],
  pageLifetimes: [ProxyLifecycle.SHOW, ProxyLifecycle.HIDE, ProxyLifecycle.RESIZE],
};

type Modes = keyof typeof lifecycleMap | '';

// 针对Component的pageLifeTimes做的针对处理

let singleInstance = null as OverrideWechatPage;

class OverrideWechatPage {
  private readonly wechatOriginalPage: any;

  private readonly wechatOriginalComponent: any;

  private readonly pages: string[];

  public lifecycleHooks: Record<string, WeappLifecycleHook[]>;

  public constructor(pages: string[]) {
    this.initLifecycleHooks();
    this.pages = pages;
    this.wechatOriginalPage = getWxPage();
    this.wechatOriginalComponent = getWxComponent();
  }

  // 初始化所有生命周期的钩子函数
  private initLifecycleHooks(): void {
    this.lifecycleHooks = Object.keys(ProxyLifecycle).reduce((res, cur: keyof typeof ProxyLifecycle) => {
      res[ProxyLifecycle[cur]] = [] as WeappLifecycleHook[];
      return res;
    }, {} as Record<string, WeappLifecycleHook[]>);
  }

  /**
   * 重写options
   * @param lifecycle 需要被重写的生命周期
   * @param hooks 为生命周期添加的钩子函数
   * @param optionsKey 需要被重写的optionsKey，仅用于 lifetime 模式
   * @param options 需要被重写的配置项
   * @returns {IOverrideWechatPageInitOptions} 被重写的options
   */
  private static wrapLifecycleOptions = (
    lifecycle: string,
    hooks: WeappLifecycleHook[],
    optionsKey = '',
    options: IOverrideWechatPageInitOptions,
  ): IOverrideWechatPageInitOptions => {
    let currentOptions = { ...options };
    const originalMethod = optionsKey ? (currentOptions[optionsKey] || {})[lifecycle] : currentOptions[lifecycle];
    const runLifecycleHooks = (): void => {
      hooks.forEach((hook) => {
        if (currentOptions.__isPage__) {
          hook(currentOptions);
        }
      });
    };
    const warpMethod = runFunctionWithAop([runLifecycleHooks], originalMethod);

    currentOptions = optionsKey
      ? {
          ...currentOptions,
          [optionsKey]: {
            ...options[optionsKey],
            ...(currentOptions[optionsKey] || {}),
            [lifecycle]: warpMethod,
          },
        }
      : {
          ...currentOptions,
          [lifecycle]: warpMethod,
        };

    return currentOptions;
  };

  /**
   * 为对应的生命周期重写options
   * @param proxyLifecycleOrTime 需要拦截的生命周期
   * @param optionsKey 需要重写的 optionsKey，此处用于 lifetime 模式
   * @param options 需要被重写的 options
   * @returns {IOverrideWechatPageInitOptions} 被重写的options
   */
  private findHooksAndWrap = (
    proxyLifecycleOrTime: string,
    optionsKey = '',
    options: IOverrideWechatPageInitOptions,
  ): IOverrideWechatPageInitOptions => {
    let processedOptions = { ...options };
    const hooks = this.lifecycleHooks[proxyLifecycleOrTime];
    processedOptions = OverrideWechatPage.wrapLifecycleOptions(proxyLifecycleOrTime, hooks, optionsKey, options);

    return processedOptions;
  };

  /**
   * 根据需要被包装的生命周期获取当前的 wrapMode，用来进行不同的包装操作
   * @param lifetimeOrLifecycle 需要被包装的生命周期
   * @returns {Modes} mode
   */
  public checkMode(lifetimeOrLifecycle: string): Modes {
    return (Object.keys(lifecycleMap).find((mode: keyof typeof lifecycleMap) =>
      lifecycleMap[mode].includes(lifetimeOrLifecycle),
    ) || '') as Modes;
  }

  /**
   * 为指定声明周期增加监听回调
   * @param lifeTimeOrLifecycle 需要被拦截的 api
   * @param listener 监听触发生命周期的回调函数，接受当前页面的options作为参数
   * @returns {OverrideWechatPage} 返回当前实例，可链式调用继续监听
   */
  public addLifecycleListener(lifeTimeOrLifecycle: string, listener: WeappLifecycleHook): OverrideWechatPage {
    // 针对指定周期定义Hooks
    this.lifecycleHooks[lifeTimeOrLifecycle].push(listener);
    const _Page = this.wechatOriginalPage;
    const _Component = this.wechatOriginalComponent;
    const routes = this.pages;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const wrapMode = this.checkMode(lifeTimeOrLifecycle);
    const componentNeedWrap = ['component', 'pageLifetimes'].includes(wrapMode);

    if (!wrapMode) {
      throw new Error('请使用目前ProxyLifecycle中存在的生命周期');
    }

    const wrapper = function wrapFunc(options: IOverrideWechatPageInitOptions): string | void {
      const optionsKey = wrapMode === 'pageLifetimes' ? 'pageLifetimes' : '';
      // eslint-disable-next-line no-param-reassign
      options = self.findHooksAndWrap(lifeTimeOrLifecycle, optionsKey, options);

      const res = componentNeedWrap ? _Component(options) : _Page(options);

      options.__router__ = (wrapper as any).__route__ = res;
      options.__isPage__ = routes.some((item) => res.startsWith(item));

      return res;
    };

    (wrapper as any).__route__ = '';
    (wrapper as any).__isPage__ = false;

    if (componentNeedWrap) {
      overrideWxComponent(wrapper);
    } else {
      overrideWxPage(wrapper);
    }
    return this;
  }

  public destroy = (): void => {
    overrideWxComponent(this.wechatOriginalComponent);
    overrideWxPage(this.wechatOriginalPage);
    this.initLifecycleHooks();
  };
}

export default OverrideWechatPage;

export function setupLifecycleListeners(
  lifecycle: string,
  hooks: WeappLifecycleHook[],
  pages: string[] = [],
): Function {
  if (!singleInstance) {
    singleInstance = new OverrideWechatPage(pages);
  }
  hooks.forEach((hook) => singleInstance.addLifecycleListener(lifecycle, hook));
  return singleInstance.destroy;
}
