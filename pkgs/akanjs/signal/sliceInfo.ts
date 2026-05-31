import type { Cls, PromiseOrObject } from "akanjs/base";
import type {
  BaseInsight,
  BaseObject,
  ConstantFieldTypeInput,
  DocumentModel,
  FieldToValue,
  ParamFieldType,
  PlainTypeToFieldType,
  PurifiedModel,
  QueryOf,
} from "akanjs/constant";
import type { ExtractSort, FilterCls, FilterInstance } from "akanjs/document";
import type { ServiceModel } from "akanjs/service";
import {
  type ArgInfo,
  type EndpointArgProps,
  EndpointInfo,
  type InternalArgInfo,
  type InternalArgProps,
} from "./endpointInfo";
import type { InternalArgCls } from "./internalArg";
import type { SignalOption } from "./types";

export class SliceInfo<
  RefName extends string = string,
  Input = any,
  Full = any,
  Light = any,
  Insight = any,
  Filter extends FilterInstance = any,
  Srvs extends { [key: string]: any } = { [key: string]: any },
  ArgNames extends string[] = any,
  Args extends any[] = any,
  InternalArgs extends any[] = any,
  ServerArgs extends any[] = any,
> {
  readonly refName: RefName;
  readonly input: Cls<Input>;
  readonly full: Cls<Full>;
  readonly light: Cls<Light>;
  readonly insight: Cls<Insight>;
  readonly filter: FilterCls<Filter>;
  readonly argNames: ArgNames = [] as unknown as ArgNames;
  readonly args: ArgInfo<EndpointArgProps<boolean>>[] = [];
  readonly internalArgs: InternalArgInfo<boolean>[] = [];
  readonly signalOption: SignalOption;
  execFn: ((...args: [...ServerArgs, ...InternalArgs]) => QueryOf<DocumentModel<Full>>) | null = null;

  constructor(
    refName: RefName,
    input: Cls<Input>,
    full: Cls<Full>,
    light: Cls<Light>,
    insight: Cls<Insight>,
    filter: FilterCls<Filter>,
    signalOption: SignalOption = {},
  ) {
    this.refName = refName;
    this.input = input;
    this.full = full;
    this.light = light;
    this.insight = insight;
    this.filter = filter;
    this.signalOption = signalOption;
  }
  param<
    ArgName extends string,
    Arg extends ParamFieldType,
    _ClientArg = FieldToValue<Arg>,
    _ServerArg = DocumentModel<_ClientArg>,
  >(name: ArgName, arg: Arg, option?: Omit<EndpointArgProps, "nullable">) {
    if (this.execFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable) throw new Error("Last argument is nullable");
    this.argNames.push(name);
    this.args.push(EndpointInfo.getArgInfo("param", name, arg, option));
    return this as unknown as SliceInfo<
      RefName,
      Input,
      Full,
      Light,
      Insight,
      Filter,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg: _ClientArg],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg]
    >;
  }
  body<
    ArgName extends string,
    ExplicitType = unknown,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    Optional extends boolean = false,
    _ArgType = unknown extends ExplicitType ? FieldToValue<Arg> : ExplicitType,
    _ClientArg = PurifiedModel<_ArgType>,
    _ServerArg = DocumentModel<_ArgType>,
  >(name: ArgName, arg: Arg, option?: EndpointArgProps<Optional>) {
    if (this.execFn) throw new Error("Query function is already set");
    else if (this.args.at(-1)?.option?.nullable) throw new Error("Last argument is nullable");
    this.argNames.push(name);
    this.args.push(EndpointInfo.getArgInfo("body", name, arg, option));
    return this as unknown as SliceInfo<
      RefName,
      Input,
      Full,
      Light,
      Insight,
      Filter,
      Srvs,
      [...ArgNames, ArgName],
      Optional extends true ? [...Args, arg?: _ClientArg | null] : [...Args, arg: _ClientArg],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg | (Optional extends true ? undefined : never)]
    >;
  }
  search<
    ArgName extends string,
    ExplicitType = unknown,
    Arg extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    _ArgType = unknown extends ExplicitType ? FieldToValue<Arg> : ExplicitType,
    _ClientArg = PurifiedModel<_ArgType>,
    _ServerArg = DocumentModel<_ArgType>,
  >(name: ArgName, arg: Arg, option?: Omit<EndpointArgProps, "nullable">) {
    if (this.execFn) throw new Error("Query function is already set");
    this.argNames.push(name);
    this.args.push(EndpointInfo.getArgInfo("search", name, arg, { ...option, nullable: true }));
    return this as unknown as SliceInfo<
      RefName,
      Input,
      Full,
      Light,
      Insight,
      Filter,
      Srvs,
      [...ArgNames, ArgName],
      [...Args, arg?: _ClientArg | null],
      InternalArgs,
      [...ServerArgs, arg: _ServerArg | undefined]
    >;
  }
  with<ArgType, Optional extends boolean = false>(
    argRef: InternalArgCls<ArgType>,
    option?: InternalArgProps<Optional>,
  ) {
    if (this.execFn) throw new Error("Query function is already set");
    this.internalArgs.push({ argRef, option });
    return this as unknown as SliceInfo<
      RefName,
      Input,
      Full,
      Light,
      Insight,
      Filter,
      Srvs,
      ArgNames,
      Args,
      [...InternalArgs, arg: NonNullable<ArgType> | (Optional extends true ? null : never)],
      ServerArgs
    >;
  }
  exec(
    query: (
      this: {
        [K in keyof Srvs as K extends string ? Uncapitalize<K> : never]: Srvs[K];
      },
      ...args: [...ServerArgs, ...InternalArgs]
    ) => PromiseOrObject<QueryOf<DocumentModel<Full>>>,
  ) {
    if (this.execFn) throw new Error("Query function is already set");
    this.execFn = query;
    return this;
  }
}

export const buildSlice =
  <
    T extends string,
    Input extends Cls<any>,
    Full extends BaseObject,
    Light extends BaseObject,
    Insight extends BaseInsight,
    Filter extends FilterInstance,
    SrvModule extends ServiceModel,
  >(
    refName: T,
    input: Cls<Input>,
    full: Cls<Full>,
    light: Cls<Light>,
    insight: Cls<Insight>,
    filter: FilterCls<Filter>,
  ) =>
  (signalOption?: SignalOption) =>
    new SliceInfo<T, Input, Full, Light, Insight, Filter, SrvModule["srvMap"], [], [], [], []>(
      refName,
      input,
      full,
      light,
      insight,
      filter,
      signalOption,
    );

// --- Accessors ---
// Named projections for SliceInfo's 11 generics. Use these to avoid repeating
// 11-slot `extends SliceInfo<any, any, ..., infer X, any, any>` patterns.
export type SliceInfoRefName<S> =
  S extends SliceInfo<infer R, any, any, any, any, any, any, any, any, any, any> ? R : never;
export type SliceInfoInput<S> =
  S extends SliceInfo<any, infer I, any, any, any, any, any, any, any, any, any> ? I : never;
export type SliceInfoFull<S> =
  S extends SliceInfo<any, any, infer F, any, any, any, any, any, any, any, any> ? F : never;
export type SliceInfoLight<S> =
  S extends SliceInfo<any, any, any, infer L, any, any, any, any, any, any, any> ? L : never;
export type SliceInfoInsight<S> =
  S extends SliceInfo<any, any, any, any, infer I, any, any, any, any, any, any> ? I : never;
export type SliceInfoFilter<S> =
  S extends SliceInfo<any, any, any, any, any, infer F, any, any, any, any, any> ? F : never;
export type SliceInfoSrvs<S> =
  S extends SliceInfo<any, any, any, any, any, any, infer S2, any, any, any, any> ? S2 : never;
export type SliceInfoArgNames<S> =
  S extends SliceInfo<any, any, any, any, any, any, any, infer N, any, any, any> ? N : never;
export type SliceInfoArgs<S> =
  S extends SliceInfo<any, any, any, any, any, any, any, any, infer A, any, any> ? A : never;
export type SliceInfoInternalArgs<S> =
  S extends SliceInfo<any, any, any, any, any, any, any, any, any, infer I, any> ? I : never;
export type SliceInfoServerArgs<S> =
  S extends SliceInfo<any, any, any, any, any, any, any, any, any, any, infer S2> ? S2 : never;

export type SliceBuilder<
  SrvModule extends ServiceModel,
  _Input = NonNullable<SrvModule["cnst"]>["_Input"],
  _Full = NonNullable<SrvModule["cnst"]>["_Full"],
  _Light = NonNullable<SrvModule["cnst"]>["_Light"],
  _Insight = NonNullable<SrvModule["cnst"]>["_Insight"],
  _Filter extends FilterInstance = NonNullable<SrvModule["db"]>["_Filter"],
  _Sort = ExtractSort<_Filter>,
> = (
  init: (
    signalOption?: SignalOption,
  ) => SliceInfo<
    SrvModule["srv"]["refName"],
    _Input,
    _Full,
    _Light,
    _Insight,
    _Filter,
    SrvModule["srvMap"],
    [],
    [],
    [],
    []
  >,
) => {
  [key: string]: SliceInfo<SrvModule["srv"]["refName"], _Input, _Full, _Light, _Insight, _Filter, SrvModule["srvMap"]>;
};
