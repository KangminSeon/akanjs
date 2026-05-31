import type { EnumInstance, PrimitiveScalar } from "akanjs/base";
import type { ConstantFieldTypeInput, PlainTypeToFieldType } from "akanjs/constant";

// not implemented
export type StateType = "normal" | "storage" | "cookie" | "param" | "searchParam";

export interface StateProps<FieldValue = any, MapValue = any, Nullable extends boolean = false> {
  nullable: Nullable;
  default?: FieldValue | ((doc: { id: string }) => FieldValue);
  enum?: EnumInstance;
  of?: MapValue; // for Map type fields
}

export class StateInfo<
  Type extends StateType = StateType,
  Value extends ConstantFieldTypeInput = any,
  MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
  Nullable extends boolean = boolean,
> {
  readonly type: Type;
  readonly value: Value;
  readonly option: StateProps<Value, MapValue, Nullable>;
  constructor(type: Type, value: Value, option?: StateProps<Value, MapValue, Nullable>) {
    this.type = type;
    this.value = value;
    this.option = option ?? ({} as StateProps<Value, MapValue, Nullable>);
  }
}

export const buildState = {
  storage: <
    ExplicitType,
    Value extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
    Nullable extends boolean = false,
  >(
    value: Value,
    option?: StateProps<Value, MapValue, Nullable>,
  ) => new StateInfo<"storage", Value, MapValue, Nullable>("storage", value, option),
  cookie: <
    ExplicitType,
    Value extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
    Nullable extends boolean = false,
  >(
    value: Value,
    option?: StateProps<Value, MapValue, Nullable>,
  ) => new StateInfo<"cookie", Value, MapValue, Nullable>("cookie", value, option),
  param: <
    ExplicitType,
    Value extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
    Nullable extends boolean = false,
  >(
    value: Value,
    option?: StateProps<Value, MapValue, Nullable>,
  ) => new StateInfo<"param", Value, MapValue, Nullable>("param", value, option),
  searchParam: <
    ExplicitType,
    Value extends ConstantFieldTypeInput = PlainTypeToFieldType<ExplicitType>,
    MapValue = Value extends MapConstructor ? typeof PrimitiveScalar : never,
    Nullable extends boolean = false,
  >(
    value: Value,
    option?: StateProps<Value, MapValue, Nullable>,
  ) => new StateInfo<"searchParam", Value, MapValue, Nullable>("searchParam", value, option),
};
