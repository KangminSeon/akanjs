import { type Cls, LOADER_META, type MergeAllActionTypes, type PromiseOrObject } from "akanjs/base";
import { applyMixins } from "akanjs/common";
import type { ConstantModel, DocumentModel, FieldObject, QueryOf } from "akanjs/constant";
import type { ExtractQuery, ExtractSort, FilterCls, FilterInstance, SchemaOf } from ".";
import type { DatabaseInstance } from "./database";
import type { DocumentUpdate, DocumentUpdateOptions } from "./documentQuery";
import { type LoaderBuilder, type ModelCls, makeLoaderBuilder } from "./loaderInfo";

export type CRUDEventType = "create" | "update" | "remove";
export type SaveEventType = "save" | CRUDEventType;

interface DefaultMdlStats<
  TDocument,
  TSchema,
  _Partial extends Partial<TSchema> = Partial<TSchema>,
  _FilterQuery extends QueryOf<TSchema> = QueryOf<TSchema>,
  _Projection extends Partial<Record<keyof TSchema, boolean>> = Partial<Record<keyof TSchema, boolean>>,
> {
  pickOneAndWrite: (query: _FilterQuery, rawData: _Partial) => Promise<TDocument>;
  pickAndWrite: (docId: string, rawData: _Partial) => Promise<TDocument>;
  pickOne: (query: _FilterQuery, projection?: _Projection) => Promise<TDocument>;
  pickById: (docId: string | undefined, projection?: _Projection) => Promise<TDocument>;
  sample: (query: _FilterQuery, size?: number) => Promise<TDocument[]>;
  sampleOne: (query: _FilterQuery) => Promise<TDocument | null>;
  preSaveListenerSet: Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>;
  postSaveListenerSet: Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>;
  preCreateListenerSet: Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>;
  postCreateListenerSet: Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>;
  preUpdateListenerSet: Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>;
  postUpdateListenerSet: Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>;
  preRemoveListenerSet: Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>;
  postRemoveListenerSet: Set<(doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>>;
  listenPre: (
    eventType: SaveEventType,
    listener: (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>,
  ) => () => void;
  listenPost: (
    eventType: SaveEventType,
    listener: (doc: TDocument, type: CRUDEventType) => PromiseOrObject<void>,
  ) => () => void;
}
export interface UpdateResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedId?: string | null;
}
export interface BulkWriteOperation<Raw> {
  updateOne: {
    filter: QueryOf<DocumentModel<Raw>>;
    update: DocumentUpdate;
    upsert?: boolean;
  };
}
type FindManyChain<Doc> = Promise<Doc[]> & {
  sort(sort: Record<string, 1 | -1>): FindManyChain<Doc>;
  skip(skip: number): FindManyChain<Doc>;
  limit(limit: number): FindManyChain<Doc>;
  select(projection?: unknown): FindManyChain<Doc>;
};
type FindOneChain<Doc> = Promise<Doc | null> & {
  sort(sort: Record<string, 1 | -1>): FindOneChain<Doc>;
  skip(skip: number): FindOneChain<Doc>;
  select(projection?: unknown): FindOneChain<Doc>;
};
export type Mdl<Doc, Raw> = DefaultMdlStats<Doc, DocumentModel<Raw>> & {
  refName: string;
  new (data: Partial<DocumentModel<Raw>>): Doc;
  find(query: QueryOf<DocumentModel<Raw>>, projection?: Partial<Record<keyof Raw, boolean>>): FindManyChain<Doc>;
  findOne(query: QueryOf<DocumentModel<Raw>>, projection?: Partial<Record<keyof Raw, boolean>>): FindOneChain<Doc>;
  findById(id: string | undefined, projection?: Partial<Record<keyof Raw, boolean>>): Promise<Doc | null>;
  countDocuments(query: QueryOf<DocumentModel<Raw>>): Promise<number>;
  exists(query: QueryOf<DocumentModel<Raw>>): Promise<string | null>;
  updateOne(
    query: QueryOf<DocumentModel<Raw>>,
    update: DocumentUpdate,
    options?: DocumentUpdateOptions,
  ): Promise<UpdateResult>;
  updateMany(query: QueryOf<DocumentModel<Raw>>, update: DocumentUpdate): Promise<UpdateResult>;
  deleteMany(query: QueryOf<DocumentModel<Raw>>): Promise<UpdateResult>;
  bulkWrite(operations: BulkWriteOperation<Raw>[]): Promise<UpdateResult>;
};

export const into = <
  Doc,
  Filter extends FilterInstance,
  T extends string,
  Input,
  Obj,
  Full,
  Light,
  Insight,
  FullFieldObj extends FieldObject,
  AddDbModels extends ModelCls[],
  _CapitalizedRefName extends string,
  _Default,
  _DefaultInput,
  _DefaultState,
  _DefaultStateInput,
  _DefaultInsight,
  _PurifiedInput,
  _Doc,
  _DocInput,
  _QueryOfDoc,
  _Query = ExtractQuery<Filter>,
  _Sort = ExtractSort<Filter>,
  _DatabaseModel = DatabaseInstance<
    T,
    _DocInput,
    Doc,
    Full,
    Insight,
    Filter,
    _CapitalizedRefName,
    _QueryOfDoc,
    _Query,
    _Sort
  >,
  _LoaderBuilder extends LoaderBuilder<_Doc> = LoaderBuilder<_Doc>,
>(
  docRef: Cls<Doc>,
  filterRef: FilterCls<Filter>,
  cnst: ConstantModel<
    T,
    Input,
    Obj,
    Full,
    Light,
    Insight,
    FullFieldObj,
    _CapitalizedRefName,
    _Default,
    _DefaultInput,
    _DefaultState,
    _DefaultStateInput,
    _DefaultInsight,
    _PurifiedInput,
    _Doc,
    _DocInput,
    _QueryOfDoc
  >,
  loaderBuilder: _LoaderBuilder,
  ...addMdls: [...AddDbModels]
): ModelCls<
  MergeAllActionTypes<AddDbModels, keyof _DatabaseModel & string> & _DatabaseModel,
  ReturnType<_LoaderBuilder>
> => {
  const loaderInfoMap = loaderBuilder(makeLoaderBuilder());
  const libsOnSchemaFns = addMdls.map((mdl) => mdl._onSchema);
  const DefaultModel = Object.assign(class DefaultModel {}, {
    [LOADER_META]: Object.assign({}, ...addMdls.map((mdl) => mdl[LOADER_META]), loaderInfoMap),
    _onSchema(schema: SchemaOf) {
      //
    },
    _libsOnSchema(schema: SchemaOf) {
      libsOnSchemaFns.map((libsOnSchema) => libsOnSchema(schema));
    },
  });
  applyMixins(DefaultModel, addMdls);
  addMdls.forEach((mdl) => {
    Object.entries(Object.getOwnPropertyDescriptors(mdl)).forEach(([name, descriptor]) => {
      if (["length", "name", "prototype"].includes(name)) return;
      Object.defineProperty(DefaultModel, name, { ...descriptor, configurable: true });
    });
  });
  return DefaultModel as unknown as ModelCls<
    MergeAllActionTypes<AddDbModels, keyof _DatabaseModel & string> & _DatabaseModel,
    ReturnType<_LoaderBuilder>
  >;
};
