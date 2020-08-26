/*
 * @Description:
 * @version:
 * @Author: guyifeng
 * @Date: 2020-08-26 09:54:07
 * @LastEditors: guyifeng
 * @LastEditTime: 2020-08-26 16:55:24
 */

export function runFunctionWithAop(
  [beforeFunc = (): void => undefined, afterFunc = (): void => undefined],
  originalFunc: Function,
): Function {
  return function wrappedFunc(...args): void {
    beforeFunc && beforeFunc();
    originalFunc && originalFunc.call(this, ...args);
    afterFunc && afterFunc();
  };
}
