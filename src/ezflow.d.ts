import { ReactElement } from "react";

declare module ezflow {
  export interface IActionResult {
    action: IAction;
    payload: any;
    result: any;
  }

  export interface ITask<T> extends Promise<T> {
    cancel();
    result: T;
    async: boolean;
  }

  export interface IPromiseMap {
    [key: string]: any;
  }

  export interface IRaceResult {
    $key: string;
    [key: string]: any;
  }

  export interface IAllResult {
    [key: string]: any;
  }

  export interface IActionContext {
    dispatch: IDispatch;
    dispatchOnce: IDispatch;
    every(
      actions: IAction | IAction[] | Function | Function[],
      listener: IAction | Function,
      payload?: any
    );
    latest(
      actions: IAction | IAction[] | Function | Function[],
      listener: IAction | Function,
      payload?: any
    );
    throttle(
      actions: IAction | IAction[] | Function | Function[],
      ms: number,
      listener: IAction | Function,
      payload?: any
    );
    debounce(
      actions: IAction | IAction[] | Function | Function[],
      ms: number,
      listener: IAction | Function,
      payload?: any
    );
    lazy(...actions: IAction[] | Function[]): IAction;
    action(actions: IAction | IAction[]): Promise<IActionResult>;
    race(map: IPromiseMap): Promise<IRaceResult>;
    all(map: IPromiseMap): Promise<IAllResult>;
    select: IGetState<any>;
    delay(ms: number, value?: any): Promise<any>;
    flow(...flows: Function[]): any;
    reducer(prop: string, reducer: IReducer<any>): IStore<any>;
    reducer(
      reducers: IReducer<any>[] | IReducerMap | IReducer<any>
    ): IStore<any>;
  }
  export interface IAction {
    (context: IActionContext, payload?: any): any;
  }
  export interface IProviderProps<T> {
    store: IStore<T>;
  }
  export interface IReducer<T> {
    (state: T, params?: IReducerParams): T;
  }
  export interface IReducerMap {
    [key: string]: IReducer<any>;
  }
  export interface IStateSelector<T, U> {
    (state: T): U;
  }
  export interface IDispatch {
    (action: IAction | Function, payload?: any): ITask<any>;
  }
  export interface IGetState<T> {
    (): T;
    (selector: string): any;
    <U>(selector: IStateSelector<T, U>): U;
    <U>(selectors: Function[]): any[];
  }
  export interface IDispatcher {
    (payload?: any): any;
  }
  export interface IReducerParams {
    action: Function;
    payload: any;
    result: any;
    error: any;
    target: any;
  }
  export interface IActionMap {
    [key: string]: Function;
  }
  export interface IDispatcherMap {
    [key: string]: IDispatcher;
  }
  export interface IStore<T> {
    dispatch: IDispatch;
    dispatchOnce: IDispatch;
    getState: IGetState<T>;
    flow(...flows: Function[]): any;
    reducer(prop: string, reducer: IReducer<any>): IStore<T>;
    reducer(reducers: IReducer<T>[] | IReducerMap | IReducer<T>): IStore<T>;
    updater(branch: string): IStateBranchUpdater;
  }
  export function delay<T>(ms: number, value?: T): Promise<T>;

  /**
   * This action will be dispatched once async action dispatched
   * So developers can handle loading state of async action
   * Example:
   * const AsyncAction = async () => {
   *     return asyncActionResult;
   * }
   *
   * dispatch(AsyncAction, asyncActionPayload)
   *
   * reducer(state, \{ action: Loading, target: AsyncAction, payload: asyncActionPayload })
   * reducer(state, \{ action: AsyncAction, payload: asyncActionPayload, result: asyncActionResult })
   *
   * @constructor
   */
  export function Loading(): any;

  /**
   * This action will be dispatched once async action failed
   */
  export function Failure(): any;

  /**
   * This error will be thrown once a async task is cancelled
   */
  export class CancelError {}
  /**
   * Composes single-argument functions from right to left. The rightmost
   * function can take multiple arguments as it provides the signature for the
   * resulting composite function.
   *
   * @param funcs The functions to compose.
   * @returns A function obtained by composing the argument functions from right
   *   to left. For example, `compose(f, g, h)` is identical to doing
   *   `(...args) => f(g(h(...args)))`.
   */
  export function compose(...funcs: Function[]);
  export function createDefaultStore<T>(reducer?: IReducer<T>): IStore<T>;
  export function getDefaultStore(): IStore<any>;
  export function combineReducers(reducerMap: IReducerMap): IReducer<any>;
  export function createStore<T>(reducer?: IReducer<T>): IStore<T>;
  export function Provider<T>(props: IProviderProps<T>): ReactElement;
  export function useFlow(...flows: Function[]);
  export function useStore(): IStore<any>;
  export function useDispatch(): IDispatch;
  export function useDispatcher(action: Function): IDispatcher;
  export function useDispatcher(actions: Function[]): IDispatcher[];
  export function useDispatcher(actions: IActionMap): IDispatcherMap;
  export function useSelector(
    selectors: string | IStateSelector<any, any> | Function
  ): any;
  export function useSelector(
    selectors: string[] | IStateSelector<any, any>[] | Function[]
  ): any[];

  export interface IConnectSpecs {
    select?:
      | Function
      | {
          [key: string]: IStateSelector<any, any>;
        };
    dispatch?: Function | IDispatcherMap;
    flow?: Function | Function[];
    reducer?: IReducer<any> | [string, IReducer<any>] | IReducer<any>[];
  }
  export interface IContainer {
    (comp: any): Function;
  }
  export function connect(specs: IConnectSpecs): IContainer;

  export interface IStateBranchUpdater {
    (prop: any, value: any): IStateBranchUpdater;
    (props: any): IStateBranchUpdater;
    (batch: (updater: IStateBranchUpdater) => any): IStateBranchUpdater;
  }

  export function createSelector(...funcs: Function[]): Function;

  /**
   * create a new function that wraps lazy import functions
   * @param funcs
   */
  export function lazy(...funcs: Function[]): Function;
}
