import { Any, type Assign, type Cls, type MergeAllKeyOfObjects, SLICE_META } from "akanjs/base";
import { applyMixins } from "akanjs/common";
import type { DocumentModel, QueryOf } from "akanjs/constant";
import type { FilterInstance } from "akanjs/document";
import { type Adaptor, type AdaptorCls, dangerouslyAdapt, type ServiceModel } from "akanjs/service";
import type { Guard, GuardCls } from "./guard";
import { buildSlice, type SliceBuilder, type SliceInfo } from "./sliceInfo";

export interface Slice extends Adaptor {}

export type SliceCls<
  SrvModule extends ServiceModel = ServiceModel,
  SliceInfoObj extends { [key: string]: SliceInfo } = { [key: string]: SliceInfo },
> = AdaptorCls & {
  baseName: SrvModule["srv"]["refName"];
  srv: SrvModule;
  [SLICE_META]: SliceInfoObj;
  getGuards: GuardCls[];
  cruGuards: GuardCls[];
};

interface RootSliceOption {
  guards?: {
    root?: Cls<Guard> | Cls<Guard>[];
    get?: Cls<Guard> | Cls<Guard>[];
    cru?: Cls<Guard> | Cls<Guard>[];
  };
  prefix?: string;
}

type ExtendSliceInfoObj<
  SrvModule extends ServiceModel,
  LibSlices extends SliceCls[],
  _Input = NonNullable<SrvModule["cnst"]>["_Input"],
  _Full = NonNullable<SrvModule["cnst"]>["_Full"],
  _Light = NonNullable<SrvModule["cnst"]>["_Light"],
  _Insight = NonNullable<SrvModule["cnst"]>["_Insight"],
  _Filter extends FilterInstance = any,
  _Merged = MergeAllKeyOfObjects<LibSlices, typeof SLICE_META>,
> = {
  [K in keyof _Merged]: _Merged[K] extends SliceInfo<
    any,
    any,
    any,
    any,
    any,
    any,
    infer Srvs,
    infer ArgNames,
    infer Args,
    infer InternalArgs,
    infer ServerArgs
  >
    ? SliceInfo<
        SrvModule["srv"]["refName"],
        _Input,
        _Full,
        _Light,
        _Insight,
        _Filter,
        Srvs,
        ArgNames,
        Args,
        InternalArgs,
        ServerArgs
      >
    : never;
};

/** Builds database-backed slice APIs for list, insight, init, view, edit, create, update, and remove flows. */
export function slice<
  SrvModule extends ServiceModel,
  BuildSlice extends SliceBuilder<SrvModule>,
  LibSlices extends SliceCls[],
  _Input = NonNullable<SrvModule["cnst"]>["_Input"],
  _Full = NonNullable<SrvModule["cnst"]>["_Full"],
  _Light = NonNullable<SrvModule["cnst"]>["_Light"],
  _Insight = NonNullable<SrvModule["cnst"]>["_Insight"],
  _Filter extends FilterInstance = NonNullable<SrvModule["db"]>["_Filter"],
  _Query = QueryOf<DocumentModel<_Full>>,
>(
  srv: SrvModule,
  option: RootSliceOption,
  sliceBuilder: BuildSlice,
  ...libSlices: LibSlices
): SliceCls<
  SrvModule,
  Assign<
    ReturnType<BuildSlice>,
    LibSlices extends []
      ? {
          [""]: SliceInfo<
            SrvModule["srv"]["refName"],
            _Input,
            _Full,
            _Light,
            _Insight,
            _Filter,
            SrvModule["srvMap"],
            ["query"],
            [_Query],
            [],
            [_Query]
          >;
        }
      : ExtendSliceInfoObj<SrvModule, LibSlices>
  >
> {
  if (!srv.cnst || !srv.db) throw new Error("cnst and db are required");
  const init = buildSlice(
    srv.srv.refName,
    srv.cnst.input,
    srv.cnst.full,
    srv.cnst.light,
    srv.cnst.insight,
    srv.db.filter,
  );
  const rootGuards = option.guards?.root
    ? Array.isArray(option.guards.root)
      ? option.guards.root
      : [option.guards.root]
    : [];
  const getGuards = option.guards?.get
    ? Array.isArray(option.guards.get)
      ? option.guards.get
      : [option.guards.get]
    : [];
  const cruGuards = option.guards?.cru
    ? Array.isArray(option.guards.cru)
      ? option.guards.cru
      : [option.guards.cru]
    : [];
  const srvKeys = [
    ...new Set([...Object.keys(srv.srvMap), ...libSlices.flatMap((libSlice) => Object.keys(libSlice.srv.srvMap))]),
  ];
  const sliceCls = class Slice extends dangerouslyAdapt(`${srv.srv.refName}Slice`, ({ service }) => ({
    ...Object.fromEntries(srvKeys.map((srvRefName) => [srvRefName, service()])),
  })) {
    static baseName = srv.srv.refName;
    static srv = srv;
    static getGuards = getGuards;
    static cruGuards = cruGuards;
    static [SLICE_META] = Object.assign(
      {
        [""]: init({ guards: rootGuards })
          .search<"query", object>("query", Any)
          .exec((query) => query ?? {}),
      },
      sliceBuilder(init),
    );
  };
  libSlices.forEach((libSlice) => {
    Object.assign(sliceCls[SLICE_META], libSlice[SLICE_META]);
    Object.assign(sliceCls.srv.srvMap, libSlice.srv.srvMap);
  });
  applyMixins(sliceCls, libSlices);
  return sliceCls as any;
}
