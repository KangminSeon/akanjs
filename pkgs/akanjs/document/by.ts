import { type Cls, FIELD_META, type MergeAllActionTypes, type UnCls } from "akanjs/base";
import { applyMixins } from "akanjs/common";
import {
  type BaseObject,
  type ConstantCls,
  ConstantRegistry,
  type DocumentModel,
  type FieldObject,
} from "akanjs/constant";

export type DatabaseCls<Schema = any> = Cls<Schema, { refName: string; [FIELD_META]: FieldObject }>;

export interface DefaultDocMtds<TDocument> {
  refresh(): Promise<this>;
  isModified(field?: keyof TDocument & string): boolean;
  set(data: Partial<TDocument>): this;
  save(): Promise<this>;
  toJSON(): DocumentModel<TDocument>;
  toObject(): DocumentModel<TDocument>;
}
type HydratedDocumentWithId<TDocument> = TDocument & { id: string } & DefaultDocMtds<TDocument>;
export type Doc<M = any> = HydratedDocumentWithId<DocumentModel<M>>;

export const by = <
  ModelCls,
  AddDbModels extends DatabaseCls[],
  _DocModel = UnCls<ModelCls> extends BaseObject ? Doc<UnCls<ModelCls>> : DocumentModel<UnCls<ModelCls>>,
>(
  modelRef: ModelCls,
  ...addRefs: AddDbModels
): DatabaseCls<MergeAllActionTypes<AddDbModels, keyof _DocModel & string> & _DocModel> => {
  const refName = ConstantRegistry.getRefName(modelRef as Cls);
  const databaseCls = class DatabaseCls {
    static refName = refName;
    static [FIELD_META] = (modelRef as ConstantCls)[FIELD_META];
  };
  applyMixins(databaseCls as Cls, addRefs);
  return databaseCls as any;
};
