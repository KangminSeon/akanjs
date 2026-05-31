import type { ConstantModel } from "akanjs/constant";
import type { SerializedSignal, SerializedSlice, SliceCls } from "akanjs/signal";
import type { FetchProxy } from "../client";

export type ClientSlice = {
  refName: string;
  sliceName: string;
  serializedSlice: SerializedSlice;
};

export type ClientSignal<
  RefName extends string = string,
  SlceCls extends SliceCls = SliceCls,
  Cnst extends ConstantModel = ConstantModel,
> = {
  refName: RefName;
  _slice: SlceCls;
  cnst: Cnst;
  fetch: FetchProxy<any>;
  slices: ClientSlice[];
  serializedSignal: SerializedSignal;
};
