import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  timestamptz: { input: any; output: any };
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type BooleanComparisonExp = {
  _eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  _gt?: InputMaybe<Scalars["Boolean"]["input"]>;
  _gte?: InputMaybe<Scalars["Boolean"]["input"]>;
  _in?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  _isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lte?: InputMaybe<Scalars["Boolean"]["input"]>;
  _neq?: InputMaybe<Scalars["Boolean"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
};

/** ordering argument of a cursor */
export enum CursorOrdering {
  /** ascending ordering of the cursor */
  asc = "ASC",
  /** descending ordering of the cursor */
  desc = "DESC",
}

/** MinIOに保存された画像データのリンクを管理するテーブル */
export type Images = {
  __typename?: "Images";
  bucketName: Scalars["String"]["output"];
  createdAt: Scalars["timestamptz"]["output"];
  fileName: Scalars["String"]["output"];
  fileType: Scalars["String"]["output"];
  id: Scalars["Int"]["output"];
  updatedAt: Scalars["timestamptz"]["output"];
};

/** aggregated selection of "images" */
export type ImagesAggregate = {
  __typename?: "ImagesAggregate";
  aggregate?: Maybe<ImagesAggregateFields>;
  nodes: Array<Images>;
};

/** aggregate fields of "images" */
export type ImagesAggregateFields = {
  __typename?: "ImagesAggregateFields";
  avg?: Maybe<ImagesAvgFields>;
  count: Scalars["Int"]["output"];
  max?: Maybe<ImagesMaxFields>;
  min?: Maybe<ImagesMinFields>;
  stddev?: Maybe<ImagesStddevFields>;
  stddevPop?: Maybe<ImagesStddevPopFields>;
  stddevSamp?: Maybe<ImagesStddevSampFields>;
  sum?: Maybe<ImagesSumFields>;
  varPop?: Maybe<ImagesVarPopFields>;
  varSamp?: Maybe<ImagesVarSampFields>;
  variance?: Maybe<ImagesVarianceFields>;
};

/** aggregate fields of "images" */
export type ImagesAggregateFieldsCountArgs = {
  columns?: InputMaybe<Array<ImagesSelectColumn>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** aggregate avg on columns */
export type ImagesAvgFields = {
  __typename?: "ImagesAvgFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** Boolean expression to filter rows from the table "images". All fields are combined with a logical 'AND'. */
export type ImagesBoolExp = {
  _and?: InputMaybe<Array<ImagesBoolExp>>;
  _not?: InputMaybe<ImagesBoolExp>;
  _or?: InputMaybe<Array<ImagesBoolExp>>;
  bucketName?: InputMaybe<StringComparisonExp>;
  createdAt?: InputMaybe<TimestamptzComparisonExp>;
  fileName?: InputMaybe<StringComparisonExp>;
  fileType?: InputMaybe<StringComparisonExp>;
  id?: InputMaybe<IntComparisonExp>;
  updatedAt?: InputMaybe<TimestamptzComparisonExp>;
};

/** unique or primary key constraints on table "images" */
export enum ImagesConstraint {
  /** unique or primary key constraint on columns "id" */
  imagesPkey = "images_pkey",
}

/** input type for incrementing numeric columns in table "images" */
export type ImagesIncInput = {
  id?: InputMaybe<Scalars["Int"]["input"]>;
};

/** input type for inserting data into table "images" */
export type ImagesInsertInput = {
  bucketName?: InputMaybe<Scalars["String"]["input"]>;
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  fileName?: InputMaybe<Scalars["String"]["input"]>;
  fileType?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  updatedAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate max on columns */
export type ImagesMaxFields = {
  __typename?: "ImagesMaxFields";
  bucketName?: Maybe<Scalars["String"]["output"]>;
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  fileName?: Maybe<Scalars["String"]["output"]>;
  fileType?: Maybe<Scalars["String"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  updatedAt?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** aggregate min on columns */
export type ImagesMinFields = {
  __typename?: "ImagesMinFields";
  bucketName?: Maybe<Scalars["String"]["output"]>;
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  fileName?: Maybe<Scalars["String"]["output"]>;
  fileType?: Maybe<Scalars["String"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  updatedAt?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** response of any mutation on the table "images" */
export type ImagesMutationResponse = {
  __typename?: "ImagesMutationResponse";
  /** number of rows affected by the mutation */
  affectedRows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Images>;
};

/** input type for inserting object relation for remote table "images" */
export type ImagesObjRelInsertInput = {
  data: ImagesInsertInput;
  /** upsert condition */
  onConflict?: InputMaybe<ImagesOnConflict>;
};

/** on_conflict condition type for table "images" */
export type ImagesOnConflict = {
  constraint: ImagesConstraint;
  updateColumns?: Array<ImagesUpdateColumn>;
  where?: InputMaybe<ImagesBoolExp>;
};

/** Ordering options when selecting data from "images". */
export type ImagesOrderBy = {
  bucketName?: InputMaybe<OrderBy>;
  createdAt?: InputMaybe<OrderBy>;
  fileName?: InputMaybe<OrderBy>;
  fileType?: InputMaybe<OrderBy>;
  id?: InputMaybe<OrderBy>;
  updatedAt?: InputMaybe<OrderBy>;
};

/** primary key columns input for table: images */
export type ImagesPkColumnsInput = {
  id: Scalars["Int"]["input"];
};

/** select columns of table "images" */
export enum ImagesSelectColumn {
  /** column name */
  bucketName = "bucketName",
  /** column name */
  createdAt = "createdAt",
  /** column name */
  fileName = "fileName",
  /** column name */
  fileType = "fileType",
  /** column name */
  id = "id",
  /** column name */
  updatedAt = "updatedAt",
}

/** input type for updating data in table "images" */
export type ImagesSetInput = {
  bucketName?: InputMaybe<Scalars["String"]["input"]>;
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  fileName?: InputMaybe<Scalars["String"]["input"]>;
  fileType?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  updatedAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate stddev on columns */
export type ImagesStddevFields = {
  __typename?: "ImagesStddevFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevPop on columns */
export type ImagesStddevPopFields = {
  __typename?: "ImagesStddevPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevSamp on columns */
export type ImagesStddevSampFields = {
  __typename?: "ImagesStddevSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** Streaming cursor of the table "images" */
export type ImagesStreamCursorInput = {
  /** Stream column input with initial value */
  initialValue: ImagesStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type ImagesStreamCursorValueInput = {
  bucketName?: InputMaybe<Scalars["String"]["input"]>;
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  fileName?: InputMaybe<Scalars["String"]["input"]>;
  fileType?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  updatedAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate sum on columns */
export type ImagesSumFields = {
  __typename?: "ImagesSumFields";
  id?: Maybe<Scalars["Int"]["output"]>;
};

/** update columns of table "images" */
export enum ImagesUpdateColumn {
  /** column name */
  bucketName = "bucketName",
  /** column name */
  createdAt = "createdAt",
  /** column name */
  fileName = "fileName",
  /** column name */
  fileType = "fileType",
  /** column name */
  id = "id",
  /** column name */
  updatedAt = "updatedAt",
}

export type ImagesUpdates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<ImagesIncInput>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<ImagesSetInput>;
  /** filter the rows which have to be updated */
  where: ImagesBoolExp;
};

/** aggregate varPop on columns */
export type ImagesVarPopFields = {
  __typename?: "ImagesVarPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate varSamp on columns */
export type ImagesVarSampFields = {
  __typename?: "ImagesVarSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate variance on columns */
export type ImagesVarianceFields = {
  __typename?: "ImagesVarianceFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type IntComparisonExp = {
  _eq?: InputMaybe<Scalars["Int"]["input"]>;
  _gt?: InputMaybe<Scalars["Int"]["input"]>;
  _gte?: InputMaybe<Scalars["Int"]["input"]>;
  _in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  _isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["Int"]["input"]>;
  _lte?: InputMaybe<Scalars["Int"]["input"]>;
  _neq?: InputMaybe<Scalars["Int"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

/** ビンゴの出た数字を記録 */
export type Numbers = {
  __typename?: "Numbers";
  createdAt: Scalars["timestamptz"]["output"];
  id: Scalars["Int"]["output"];
  /** ビンゴの数値データ */
  number: Scalars["Int"]["output"];
  updatedAt: Scalars["timestamptz"]["output"];
};

/** aggregated selection of "numbers" */
export type NumbersAggregate = {
  __typename?: "NumbersAggregate";
  aggregate?: Maybe<NumbersAggregateFields>;
  nodes: Array<Numbers>;
};

/** aggregate fields of "numbers" */
export type NumbersAggregateFields = {
  __typename?: "NumbersAggregateFields";
  avg?: Maybe<NumbersAvgFields>;
  count: Scalars["Int"]["output"];
  max?: Maybe<NumbersMaxFields>;
  min?: Maybe<NumbersMinFields>;
  stddev?: Maybe<NumbersStddevFields>;
  stddevPop?: Maybe<NumbersStddevPopFields>;
  stddevSamp?: Maybe<NumbersStddevSampFields>;
  sum?: Maybe<NumbersSumFields>;
  varPop?: Maybe<NumbersVarPopFields>;
  varSamp?: Maybe<NumbersVarSampFields>;
  variance?: Maybe<NumbersVarianceFields>;
};

/** aggregate fields of "numbers" */
export type NumbersAggregateFieldsCountArgs = {
  columns?: InputMaybe<Array<NumbersSelectColumn>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** aggregate avg on columns */
export type NumbersAvgFields = {
  __typename?: "NumbersAvgFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Float"]["output"]>;
};

/** Boolean expression to filter rows from the table "numbers". All fields are combined with a logical 'AND'. */
export type NumbersBoolExp = {
  _and?: InputMaybe<Array<NumbersBoolExp>>;
  _not?: InputMaybe<NumbersBoolExp>;
  _or?: InputMaybe<Array<NumbersBoolExp>>;
  createdAt?: InputMaybe<TimestamptzComparisonExp>;
  id?: InputMaybe<IntComparisonExp>;
  number?: InputMaybe<IntComparisonExp>;
  updatedAt?: InputMaybe<TimestamptzComparisonExp>;
};

/** unique or primary key constraints on table "numbers" */
export enum NumbersConstraint {
  /** unique or primary key constraint on columns "id" */
  numbersPkey = "numbers_pkey",
}

/** input type for incrementing numeric columns in table "numbers" */
export type NumbersIncInput = {
  id?: InputMaybe<Scalars["Int"]["input"]>;
  /** ビンゴの数値データ */
  number?: InputMaybe<Scalars["Int"]["input"]>;
};

/** input type for inserting data into table "numbers" */
export type NumbersInsertInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  /** ビンゴの数値データ */
  number?: InputMaybe<Scalars["Int"]["input"]>;
  updatedAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate max on columns */
export type NumbersMaxFields = {
  __typename?: "NumbersMaxFields";
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Int"]["output"]>;
  updatedAt?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** aggregate min on columns */
export type NumbersMinFields = {
  __typename?: "NumbersMinFields";
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Int"]["output"]>;
  updatedAt?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** response of any mutation on the table "numbers" */
export type NumbersMutationResponse = {
  __typename?: "NumbersMutationResponse";
  /** number of rows affected by the mutation */
  affectedRows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Numbers>;
};

/** on_conflict condition type for table "numbers" */
export type NumbersOnConflict = {
  constraint: NumbersConstraint;
  updateColumns?: Array<NumbersUpdateColumn>;
  where?: InputMaybe<NumbersBoolExp>;
};

/** Ordering options when selecting data from "numbers". */
export type NumbersOrderBy = {
  createdAt?: InputMaybe<OrderBy>;
  id?: InputMaybe<OrderBy>;
  number?: InputMaybe<OrderBy>;
  updatedAt?: InputMaybe<OrderBy>;
};

/** primary key columns input for table: numbers */
export type NumbersPkColumnsInput = {
  id: Scalars["Int"]["input"];
};

/** select columns of table "numbers" */
export enum NumbersSelectColumn {
  /** column name */
  createdAt = "createdAt",
  /** column name */
  id = "id",
  /** column name */
  number = "number",
  /** column name */
  updatedAt = "updatedAt",
}

/** input type for updating data in table "numbers" */
export type NumbersSetInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  /** ビンゴの数値データ */
  number?: InputMaybe<Scalars["Int"]["input"]>;
  updatedAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate stddev on columns */
export type NumbersStddevFields = {
  __typename?: "NumbersStddevFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevPop on columns */
export type NumbersStddevPopFields = {
  __typename?: "NumbersStddevPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevSamp on columns */
export type NumbersStddevSampFields = {
  __typename?: "NumbersStddevSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Float"]["output"]>;
};

/** Streaming cursor of the table "numbers" */
export type NumbersStreamCursorInput = {
  /** Stream column input with initial value */
  initialValue: NumbersStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type NumbersStreamCursorValueInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  /** ビンゴの数値データ */
  number?: InputMaybe<Scalars["Int"]["input"]>;
  updatedAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate sum on columns */
export type NumbersSumFields = {
  __typename?: "NumbersSumFields";
  id?: Maybe<Scalars["Int"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Int"]["output"]>;
};

/** update columns of table "numbers" */
export enum NumbersUpdateColumn {
  /** column name */
  createdAt = "createdAt",
  /** column name */
  id = "id",
  /** column name */
  number = "number",
  /** column name */
  updatedAt = "updatedAt",
}

export type NumbersUpdates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<NumbersIncInput>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<NumbersSetInput>;
  /** filter the rows which have to be updated */
  where: NumbersBoolExp;
};

/** aggregate varPop on columns */
export type NumbersVarPopFields = {
  __typename?: "NumbersVarPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate varSamp on columns */
export type NumbersVarSampFields = {
  __typename?: "NumbersVarSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate variance on columns */
export type NumbersVarianceFields = {
  __typename?: "NumbersVarianceFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** ビンゴの数値データ */
  number?: Maybe<Scalars["Float"]["output"]>;
};

/** column ordering options */
export enum OrderBy {
  /** in ascending order, nulls last */
  asc = "ASC",
  /** in ascending order, nulls first */
  ascNullsFirst = "ASC_NULLS_FIRST",
  /** in ascending order, nulls last */
  ascNullsLast = "ASC_NULLS_LAST",
  /** in descending order, nulls first */
  desc = "DESC",
  /** in descending order, nulls first */
  descNullsFirst = "DESC_NULLS_FIRST",
  /** in descending order, nulls last */
  descNullsLast = "DESC_NULLS_LAST",
}

/** ビンゴの景品データを格納 */
export type Prizes = {
  __typename?: "Prizes";
  createdAt: Scalars["timestamptz"]["output"];
  id: Scalars["Int"]["output"];
  /** An object relationship */
  image: Images;
  /** imagesのidが入る */
  imageId: Scalars["Int"]["output"];
  /** 当選した景品はTrueになる */
  isWon: Scalars["Boolean"]["output"];
  /** 景品の英語名 */
  nameEn?: Maybe<Scalars["String"]["output"]>;
  /** 景品の日本語名 */
  nameJp: Scalars["String"]["output"];
  updatedAt: Scalars["timestamptz"]["output"];
};

/** aggregated selection of "prizes" */
export type PrizesAggregate = {
  __typename?: "PrizesAggregate";
  aggregate?: Maybe<PrizesAggregateFields>;
  nodes: Array<Prizes>;
};

/** aggregate fields of "prizes" */
export type PrizesAggregateFields = {
  __typename?: "PrizesAggregateFields";
  avg?: Maybe<PrizesAvgFields>;
  count: Scalars["Int"]["output"];
  max?: Maybe<PrizesMaxFields>;
  min?: Maybe<PrizesMinFields>;
  stddev?: Maybe<PrizesStddevFields>;
  stddevPop?: Maybe<PrizesStddevPopFields>;
  stddevSamp?: Maybe<PrizesStddevSampFields>;
  sum?: Maybe<PrizesSumFields>;
  varPop?: Maybe<PrizesVarPopFields>;
  varSamp?: Maybe<PrizesVarSampFields>;
  variance?: Maybe<PrizesVarianceFields>;
};

/** aggregate fields of "prizes" */
export type PrizesAggregateFieldsCountArgs = {
  columns?: InputMaybe<Array<PrizesSelectColumn>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** aggregate avg on columns */
export type PrizesAvgFields = {
  __typename?: "PrizesAvgFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Float"]["output"]>;
};

/** Boolean expression to filter rows from the table "prizes". All fields are combined with a logical 'AND'. */
export type PrizesBoolExp = {
  _and?: InputMaybe<Array<PrizesBoolExp>>;
  _not?: InputMaybe<PrizesBoolExp>;
  _or?: InputMaybe<Array<PrizesBoolExp>>;
  createdAt?: InputMaybe<TimestamptzComparisonExp>;
  id?: InputMaybe<IntComparisonExp>;
  image?: InputMaybe<ImagesBoolExp>;
  imageId?: InputMaybe<IntComparisonExp>;
  isWon?: InputMaybe<BooleanComparisonExp>;
  nameEn?: InputMaybe<StringComparisonExp>;
  nameJp?: InputMaybe<StringComparisonExp>;
  updatedAt?: InputMaybe<TimestamptzComparisonExp>;
};

/** unique or primary key constraints on table "prizes" */
export enum PrizesConstraint {
  /** unique or primary key constraint on columns "id" */
  prizesPkey = "prizes_pkey",
}

/** input type for incrementing numeric columns in table "prizes" */
export type PrizesIncInput = {
  id?: InputMaybe<Scalars["Int"]["input"]>;
  /** imagesのidが入る */
  imageId?: InputMaybe<Scalars["Int"]["input"]>;
};

/** input type for inserting data into table "prizes" */
export type PrizesInsertInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  image?: InputMaybe<ImagesObjRelInsertInput>;
  /** imagesのidが入る */
  imageId?: InputMaybe<Scalars["Int"]["input"]>;
  /** 当選した景品はTrueになる */
  isWon?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** 景品の英語名 */
  nameEn?: InputMaybe<Scalars["String"]["input"]>;
  /** 景品の日本語名 */
  nameJp?: InputMaybe<Scalars["String"]["input"]>;
  updatedAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate max on columns */
export type PrizesMaxFields = {
  __typename?: "PrizesMaxFields";
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Int"]["output"]>;
  /** 景品の英語名 */
  nameEn?: Maybe<Scalars["String"]["output"]>;
  /** 景品の日本語名 */
  nameJp?: Maybe<Scalars["String"]["output"]>;
  updatedAt?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** aggregate min on columns */
export type PrizesMinFields = {
  __typename?: "PrizesMinFields";
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Int"]["output"]>;
  /** 景品の英語名 */
  nameEn?: Maybe<Scalars["String"]["output"]>;
  /** 景品の日本語名 */
  nameJp?: Maybe<Scalars["String"]["output"]>;
  updatedAt?: Maybe<Scalars["timestamptz"]["output"]>;
};

/** response of any mutation on the table "prizes" */
export type PrizesMutationResponse = {
  __typename?: "PrizesMutationResponse";
  /** number of rows affected by the mutation */
  affectedRows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<Prizes>;
};

/** on_conflict condition type for table "prizes" */
export type PrizesOnConflict = {
  constraint: PrizesConstraint;
  updateColumns?: Array<PrizesUpdateColumn>;
  where?: InputMaybe<PrizesBoolExp>;
};

/** Ordering options when selecting data from "prizes". */
export type PrizesOrderBy = {
  createdAt?: InputMaybe<OrderBy>;
  id?: InputMaybe<OrderBy>;
  image?: InputMaybe<ImagesOrderBy>;
  imageId?: InputMaybe<OrderBy>;
  isWon?: InputMaybe<OrderBy>;
  nameEn?: InputMaybe<OrderBy>;
  nameJp?: InputMaybe<OrderBy>;
  updatedAt?: InputMaybe<OrderBy>;
};

/** primary key columns input for table: prizes */
export type PrizesPkColumnsInput = {
  id: Scalars["Int"]["input"];
};

/** select columns of table "prizes" */
export enum PrizesSelectColumn {
  /** column name */
  createdAt = "createdAt",
  /** column name */
  id = "id",
  /** column name */
  imageId = "imageId",
  /** column name */
  isWon = "isWon",
  /** column name */
  nameEn = "nameEn",
  /** column name */
  nameJp = "nameJp",
  /** column name */
  updatedAt = "updatedAt",
}

/** input type for updating data in table "prizes" */
export type PrizesSetInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  /** imagesのidが入る */
  imageId?: InputMaybe<Scalars["Int"]["input"]>;
  /** 当選した景品はTrueになる */
  isWon?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** 景品の英語名 */
  nameEn?: InputMaybe<Scalars["String"]["input"]>;
  /** 景品の日本語名 */
  nameJp?: InputMaybe<Scalars["String"]["input"]>;
  updatedAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate stddev on columns */
export type PrizesStddevFields = {
  __typename?: "PrizesStddevFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevPop on columns */
export type PrizesStddevPopFields = {
  __typename?: "PrizesStddevPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevSamp on columns */
export type PrizesStddevSampFields = {
  __typename?: "PrizesStddevSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Float"]["output"]>;
};

/** Streaming cursor of the table "prizes" */
export type PrizesStreamCursorInput = {
  /** Stream column input with initial value */
  initialValue: PrizesStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type PrizesStreamCursorValueInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  /** imagesのidが入る */
  imageId?: InputMaybe<Scalars["Int"]["input"]>;
  /** 当選した景品はTrueになる */
  isWon?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** 景品の英語名 */
  nameEn?: InputMaybe<Scalars["String"]["input"]>;
  /** 景品の日本語名 */
  nameJp?: InputMaybe<Scalars["String"]["input"]>;
  updatedAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
};

/** aggregate sum on columns */
export type PrizesSumFields = {
  __typename?: "PrizesSumFields";
  id?: Maybe<Scalars["Int"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Int"]["output"]>;
};

/** update columns of table "prizes" */
export enum PrizesUpdateColumn {
  /** column name */
  createdAt = "createdAt",
  /** column name */
  id = "id",
  /** column name */
  imageId = "imageId",
  /** column name */
  isWon = "isWon",
  /** column name */
  nameEn = "nameEn",
  /** column name */
  nameJp = "nameJp",
  /** column name */
  updatedAt = "updatedAt",
}

export type PrizesUpdates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<PrizesIncInput>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<PrizesSetInput>;
  /** filter the rows which have to be updated */
  where: PrizesBoolExp;
};

/** aggregate varPop on columns */
export type PrizesVarPopFields = {
  __typename?: "PrizesVarPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate varSamp on columns */
export type PrizesVarSampFields = {
  __typename?: "PrizesVarSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate variance on columns */
export type PrizesVarianceFields = {
  __typename?: "PrizesVarianceFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  /** imagesのidが入る */
  imageId?: Maybe<Scalars["Float"]["output"]>;
};

/** リーチ数を記録するテーブル */
export type ReachLogs = {
  __typename?: "ReachLogs";
  createdAt: Scalars["timestamptz"]["output"];
  id: Scalars["Int"]["output"];
  reachNum: Scalars["Int"]["output"];
  status: Scalars["Boolean"]["output"];
};

/** aggregated selection of "reach_logs" */
export type ReachLogsAggregate = {
  __typename?: "ReachLogsAggregate";
  aggregate?: Maybe<ReachLogsAggregateFields>;
  nodes: Array<ReachLogs>;
};

/** aggregate fields of "reach_logs" */
export type ReachLogsAggregateFields = {
  __typename?: "ReachLogsAggregateFields";
  avg?: Maybe<ReachLogsAvgFields>;
  count: Scalars["Int"]["output"];
  max?: Maybe<ReachLogsMaxFields>;
  min?: Maybe<ReachLogsMinFields>;
  stddev?: Maybe<ReachLogsStddevFields>;
  stddevPop?: Maybe<ReachLogsStddevPopFields>;
  stddevSamp?: Maybe<ReachLogsStddevSampFields>;
  sum?: Maybe<ReachLogsSumFields>;
  varPop?: Maybe<ReachLogsVarPopFields>;
  varSamp?: Maybe<ReachLogsVarSampFields>;
  variance?: Maybe<ReachLogsVarianceFields>;
};

/** aggregate fields of "reach_logs" */
export type ReachLogsAggregateFieldsCountArgs = {
  columns?: InputMaybe<Array<ReachLogsSelectColumn>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** aggregate avg on columns */
export type ReachLogsAvgFields = {
  __typename?: "ReachLogsAvgFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  reachNum?: Maybe<Scalars["Float"]["output"]>;
};

/** Boolean expression to filter rows from the table "reach_logs". All fields are combined with a logical 'AND'. */
export type ReachLogsBoolExp = {
  _and?: InputMaybe<Array<ReachLogsBoolExp>>;
  _not?: InputMaybe<ReachLogsBoolExp>;
  _or?: InputMaybe<Array<ReachLogsBoolExp>>;
  createdAt?: InputMaybe<TimestamptzComparisonExp>;
  id?: InputMaybe<IntComparisonExp>;
  reachNum?: InputMaybe<IntComparisonExp>;
  status?: InputMaybe<BooleanComparisonExp>;
};

/** unique or primary key constraints on table "reach_logs" */
export enum ReachLogsConstraint {
  /** unique or primary key constraint on columns "id" */
  reachLogPkey = "reach_log_pkey",
}

/** input type for incrementing numeric columns in table "reach_logs" */
export type ReachLogsIncInput = {
  id?: InputMaybe<Scalars["Int"]["input"]>;
  reachNum?: InputMaybe<Scalars["Int"]["input"]>;
};

/** input type for inserting data into table "reach_logs" */
export type ReachLogsInsertInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  reachNum?: InputMaybe<Scalars["Int"]["input"]>;
  status?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** aggregate max on columns */
export type ReachLogsMaxFields = {
  __typename?: "ReachLogsMaxFields";
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  reachNum?: Maybe<Scalars["Int"]["output"]>;
};

/** aggregate min on columns */
export type ReachLogsMinFields = {
  __typename?: "ReachLogsMinFields";
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  reachNum?: Maybe<Scalars["Int"]["output"]>;
};

/** response of any mutation on the table "reach_logs" */
export type ReachLogsMutationResponse = {
  __typename?: "ReachLogsMutationResponse";
  /** number of rows affected by the mutation */
  affectedRows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<ReachLogs>;
};

/** on_conflict condition type for table "reach_logs" */
export type ReachLogsOnConflict = {
  constraint: ReachLogsConstraint;
  updateColumns?: Array<ReachLogsUpdateColumn>;
  where?: InputMaybe<ReachLogsBoolExp>;
};

/** Ordering options when selecting data from "reach_logs". */
export type ReachLogsOrderBy = {
  createdAt?: InputMaybe<OrderBy>;
  id?: InputMaybe<OrderBy>;
  reachNum?: InputMaybe<OrderBy>;
  status?: InputMaybe<OrderBy>;
};

/** primary key columns input for table: reach_logs */
export type ReachLogsPkColumnsInput = {
  id: Scalars["Int"]["input"];
};

/** select columns of table "reach_logs" */
export enum ReachLogsSelectColumn {
  /** column name */
  createdAt = "createdAt",
  /** column name */
  id = "id",
  /** column name */
  reachNum = "reachNum",
  /** column name */
  status = "status",
}

/** input type for updating data in table "reach_logs" */
export type ReachLogsSetInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  reachNum?: InputMaybe<Scalars["Int"]["input"]>;
  status?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** aggregate stddev on columns */
export type ReachLogsStddevFields = {
  __typename?: "ReachLogsStddevFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  reachNum?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevPop on columns */
export type ReachLogsStddevPopFields = {
  __typename?: "ReachLogsStddevPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  reachNum?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevSamp on columns */
export type ReachLogsStddevSampFields = {
  __typename?: "ReachLogsStddevSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  reachNum?: Maybe<Scalars["Float"]["output"]>;
};

/** Streaming cursor of the table "reach_logs" */
export type ReachLogsStreamCursorInput = {
  /** Stream column input with initial value */
  initialValue: ReachLogsStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type ReachLogsStreamCursorValueInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  reachNum?: InputMaybe<Scalars["Int"]["input"]>;
  status?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** aggregate sum on columns */
export type ReachLogsSumFields = {
  __typename?: "ReachLogsSumFields";
  id?: Maybe<Scalars["Int"]["output"]>;
  reachNum?: Maybe<Scalars["Int"]["output"]>;
};

/** update columns of table "reach_logs" */
export enum ReachLogsUpdateColumn {
  /** column name */
  createdAt = "createdAt",
  /** column name */
  id = "id",
  /** column name */
  reachNum = "reachNum",
  /** column name */
  status = "status",
}

export type ReachLogsUpdates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<ReachLogsIncInput>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<ReachLogsSetInput>;
  /** filter the rows which have to be updated */
  where: ReachLogsBoolExp;
};

/** aggregate varPop on columns */
export type ReachLogsVarPopFields = {
  __typename?: "ReachLogsVarPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  reachNum?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate varSamp on columns */
export type ReachLogsVarSampFields = {
  __typename?: "ReachLogsVarSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  reachNum?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate variance on columns */
export type ReachLogsVarianceFields = {
  __typename?: "ReachLogsVarianceFields";
  id?: Maybe<Scalars["Float"]["output"]>;
  reachNum?: Maybe<Scalars["Float"]["output"]>;
};

/** スタンプを降らせるためのAPI */
export type StampTriggers = {
  __typename?: "StampTriggers";
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  id: Scalars["Int"]["output"];
  name: Scalars["String"]["output"];
};

/** aggregated selection of "stamp_triggers" */
export type StampTriggersAggregate = {
  __typename?: "StampTriggersAggregate";
  aggregate?: Maybe<StampTriggersAggregateFields>;
  nodes: Array<StampTriggers>;
};

/** aggregate fields of "stamp_triggers" */
export type StampTriggersAggregateFields = {
  __typename?: "StampTriggersAggregateFields";
  avg?: Maybe<StampTriggersAvgFields>;
  count: Scalars["Int"]["output"];
  max?: Maybe<StampTriggersMaxFields>;
  min?: Maybe<StampTriggersMinFields>;
  stddev?: Maybe<StampTriggersStddevFields>;
  stddevPop?: Maybe<StampTriggersStddevPopFields>;
  stddevSamp?: Maybe<StampTriggersStddevSampFields>;
  sum?: Maybe<StampTriggersSumFields>;
  varPop?: Maybe<StampTriggersVarPopFields>;
  varSamp?: Maybe<StampTriggersVarSampFields>;
  variance?: Maybe<StampTriggersVarianceFields>;
};

/** aggregate fields of "stamp_triggers" */
export type StampTriggersAggregateFieldsCountArgs = {
  columns?: InputMaybe<Array<StampTriggersSelectColumn>>;
  distinct?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** aggregate avg on columns */
export type StampTriggersAvgFields = {
  __typename?: "StampTriggersAvgFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** Boolean expression to filter rows from the table "stamp_triggers". All fields are combined with a logical 'AND'. */
export type StampTriggersBoolExp = {
  _and?: InputMaybe<Array<StampTriggersBoolExp>>;
  _not?: InputMaybe<StampTriggersBoolExp>;
  _or?: InputMaybe<Array<StampTriggersBoolExp>>;
  createdAt?: InputMaybe<TimestamptzComparisonExp>;
  id?: InputMaybe<IntComparisonExp>;
  name?: InputMaybe<StringComparisonExp>;
};

/** unique or primary key constraints on table "stamp_triggers" */
export enum StampTriggersConstraint {
  /** unique or primary key constraint on columns "name" */
  stampTriggersNameKey = "stamp_triggers_name_key",
  /** unique or primary key constraint on columns "id" */
  stampTriggersPkey = "stamp_triggers_pkey",
}

/** input type for incrementing numeric columns in table "stamp_triggers" */
export type StampTriggersIncInput = {
  id?: InputMaybe<Scalars["Int"]["input"]>;
};

/** input type for inserting data into table "stamp_triggers" */
export type StampTriggersInsertInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
};

/** aggregate max on columns */
export type StampTriggersMaxFields = {
  __typename?: "StampTriggersMaxFields";
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
};

/** aggregate min on columns */
export type StampTriggersMinFields = {
  __typename?: "StampTriggersMinFields";
  createdAt?: Maybe<Scalars["timestamptz"]["output"]>;
  id?: Maybe<Scalars["Int"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
};

/** response of any mutation on the table "stamp_triggers" */
export type StampTriggersMutationResponse = {
  __typename?: "StampTriggersMutationResponse";
  /** number of rows affected by the mutation */
  affectedRows: Scalars["Int"]["output"];
  /** data from the rows affected by the mutation */
  returning: Array<StampTriggers>;
};

/** on_conflict condition type for table "stamp_triggers" */
export type StampTriggersOnConflict = {
  constraint: StampTriggersConstraint;
  updateColumns?: Array<StampTriggersUpdateColumn>;
  where?: InputMaybe<StampTriggersBoolExp>;
};

/** Ordering options when selecting data from "stamp_triggers". */
export type StampTriggersOrderBy = {
  createdAt?: InputMaybe<OrderBy>;
  id?: InputMaybe<OrderBy>;
  name?: InputMaybe<OrderBy>;
};

/** primary key columns input for table: stamp_triggers */
export type StampTriggersPkColumnsInput = {
  id: Scalars["Int"]["input"];
};

/** select columns of table "stamp_triggers" */
export enum StampTriggersSelectColumn {
  /** column name */
  createdAt = "createdAt",
  /** column name */
  id = "id",
  /** column name */
  name = "name",
}

/** input type for updating data in table "stamp_triggers" */
export type StampTriggersSetInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
};

/** aggregate stddev on columns */
export type StampTriggersStddevFields = {
  __typename?: "StampTriggersStddevFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevPop on columns */
export type StampTriggersStddevPopFields = {
  __typename?: "StampTriggersStddevPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate stddevSamp on columns */
export type StampTriggersStddevSampFields = {
  __typename?: "StampTriggersStddevSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** Streaming cursor of the table "stamp_triggers" */
export type StampTriggersStreamCursorInput = {
  /** Stream column input with initial value */
  initialValue: StampTriggersStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type StampTriggersStreamCursorValueInput = {
  createdAt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  id?: InputMaybe<Scalars["Int"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
};

/** aggregate sum on columns */
export type StampTriggersSumFields = {
  __typename?: "StampTriggersSumFields";
  id?: Maybe<Scalars["Int"]["output"]>;
};

/** update columns of table "stamp_triggers" */
export enum StampTriggersUpdateColumn {
  /** column name */
  createdAt = "createdAt",
  /** column name */
  id = "id",
  /** column name */
  name = "name",
}

export type StampTriggersUpdates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<StampTriggersIncInput>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<StampTriggersSetInput>;
  /** filter the rows which have to be updated */
  where: StampTriggersBoolExp;
};

/** aggregate varPop on columns */
export type StampTriggersVarPopFields = {
  __typename?: "StampTriggersVarPopFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate varSamp on columns */
export type StampTriggersVarSampFields = {
  __typename?: "StampTriggersVarSampFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** aggregate variance on columns */
export type StampTriggersVarianceFields = {
  __typename?: "StampTriggersVarianceFields";
  id?: Maybe<Scalars["Float"]["output"]>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type StringComparisonExp = {
  _eq?: InputMaybe<Scalars["String"]["input"]>;
  _gt?: InputMaybe<Scalars["String"]["input"]>;
  _gte?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars["String"]["input"]>;
  _in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars["String"]["input"]>;
  _isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars["String"]["input"]>;
  _lt?: InputMaybe<Scalars["String"]["input"]>;
  _lte?: InputMaybe<Scalars["String"]["input"]>;
  _neq?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars["String"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars["String"]["input"]>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars["String"]["input"]>;
};

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type TimestamptzComparisonExp = {
  _eq?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _gt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _gte?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _in?: InputMaybe<Array<Scalars["timestamptz"]["input"]>>;
  _isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _lte?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _neq?: InputMaybe<Scalars["timestamptz"]["input"]>;
  _nin?: InputMaybe<Array<Scalars["timestamptz"]["input"]>>;
};

/** mutation root */
export type MutationRoot = {
  __typename?: "mutation_root";
  /** execute VOLATILE function "decrement_latest_reach_log" which returns "reach_logs" */
  decrementLatestReachLog: Array<ReachLogs>;
  /** delete data from the table: "images" */
  deleteImages?: Maybe<ImagesMutationResponse>;
  /** delete single row from the table: "images" */
  deleteImagesByPk?: Maybe<Images>;
  /** delete data from the table: "numbers" */
  deleteNumbers?: Maybe<NumbersMutationResponse>;
  /** delete single row from the table: "numbers" */
  deleteNumbersByPk?: Maybe<Numbers>;
  /** delete data from the table: "prizes" */
  deletePrizes?: Maybe<PrizesMutationResponse>;
  /** delete single row from the table: "prizes" */
  deletePrizesByPk?: Maybe<Prizes>;
  /** delete data from the table: "reach_logs" */
  deleteReachLogs?: Maybe<ReachLogsMutationResponse>;
  /** delete single row from the table: "reach_logs" */
  deleteReachLogsByPk?: Maybe<ReachLogs>;
  /** delete data from the table: "stamp_triggers" */
  deleteStampTriggers?: Maybe<StampTriggersMutationResponse>;
  /** delete single row from the table: "stamp_triggers" */
  deleteStampTriggersByPk?: Maybe<StampTriggers>;
  /** execute VOLATILE function "increment_latest_reach_log" which returns "reach_logs" */
  incrementLatestReachLog: Array<ReachLogs>;
  /** insert data into the table: "images" */
  insertImages?: Maybe<ImagesMutationResponse>;
  /** insert a single row into the table: "images" */
  insertImagesOne?: Maybe<Images>;
  /** insert data into the table: "numbers" */
  insertNumbers?: Maybe<NumbersMutationResponse>;
  /** insert a single row into the table: "numbers" */
  insertNumbersOne?: Maybe<Numbers>;
  /** insert data into the table: "prizes" */
  insertPrizes?: Maybe<PrizesMutationResponse>;
  /** insert a single row into the table: "prizes" */
  insertPrizesOne?: Maybe<Prizes>;
  /** insert data into the table: "reach_logs" */
  insertReachLogs?: Maybe<ReachLogsMutationResponse>;
  /** insert a single row into the table: "reach_logs" */
  insertReachLogsOne?: Maybe<ReachLogs>;
  /** insert data into the table: "stamp_triggers" */
  insertStampTriggers?: Maybe<StampTriggersMutationResponse>;
  /** insert a single row into the table: "stamp_triggers" */
  insertStampTriggersOne?: Maybe<StampTriggers>;
  /** update data of the table: "images" */
  updateImages?: Maybe<ImagesMutationResponse>;
  /** update single row of the table: "images" */
  updateImagesByPk?: Maybe<Images>;
  /** update multiples rows of table: "images" */
  updateImagesMany?: Maybe<Array<Maybe<ImagesMutationResponse>>>;
  /** update data of the table: "numbers" */
  updateNumbers?: Maybe<NumbersMutationResponse>;
  /** update single row of the table: "numbers" */
  updateNumbersByPk?: Maybe<Numbers>;
  /** update multiples rows of table: "numbers" */
  updateNumbersMany?: Maybe<Array<Maybe<NumbersMutationResponse>>>;
  /** update data of the table: "prizes" */
  updatePrizes?: Maybe<PrizesMutationResponse>;
  /** update single row of the table: "prizes" */
  updatePrizesByPk?: Maybe<Prizes>;
  /** update multiples rows of table: "prizes" */
  updatePrizesMany?: Maybe<Array<Maybe<PrizesMutationResponse>>>;
  /** update data of the table: "reach_logs" */
  updateReachLogs?: Maybe<ReachLogsMutationResponse>;
  /** update single row of the table: "reach_logs" */
  updateReachLogsByPk?: Maybe<ReachLogs>;
  /** update multiples rows of table: "reach_logs" */
  updateReachLogsMany?: Maybe<Array<Maybe<ReachLogsMutationResponse>>>;
  /** update data of the table: "stamp_triggers" */
  updateStampTriggers?: Maybe<StampTriggersMutationResponse>;
  /** update single row of the table: "stamp_triggers" */
  updateStampTriggersByPk?: Maybe<StampTriggers>;
  /** update multiples rows of table: "stamp_triggers" */
  updateStampTriggersMany?: Maybe<Array<Maybe<StampTriggersMutationResponse>>>;
};

/** mutation root */
export type MutationRootDecrementLatestReachLogArgs = {
  distinctOn?: InputMaybe<Array<ReachLogsSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ReachLogsOrderBy>>;
  where?: InputMaybe<ReachLogsBoolExp>;
};

/** mutation root */
export type MutationRootDeleteImagesArgs = {
  where: ImagesBoolExp;
};

/** mutation root */
export type MutationRootDeleteImagesByPkArgs = {
  id: Scalars["Int"]["input"];
};

/** mutation root */
export type MutationRootDeleteNumbersArgs = {
  where: NumbersBoolExp;
};

/** mutation root */
export type MutationRootDeleteNumbersByPkArgs = {
  id: Scalars["Int"]["input"];
};

/** mutation root */
export type MutationRootDeletePrizesArgs = {
  where: PrizesBoolExp;
};

/** mutation root */
export type MutationRootDeletePrizesByPkArgs = {
  id: Scalars["Int"]["input"];
};

/** mutation root */
export type MutationRootDeleteReachLogsArgs = {
  where: ReachLogsBoolExp;
};

/** mutation root */
export type MutationRootDeleteReachLogsByPkArgs = {
  id: Scalars["Int"]["input"];
};

/** mutation root */
export type MutationRootDeleteStampTriggersArgs = {
  where: StampTriggersBoolExp;
};

/** mutation root */
export type MutationRootDeleteStampTriggersByPkArgs = {
  id: Scalars["Int"]["input"];
};

/** mutation root */
export type MutationRootIncrementLatestReachLogArgs = {
  distinctOn?: InputMaybe<Array<ReachLogsSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ReachLogsOrderBy>>;
  where?: InputMaybe<ReachLogsBoolExp>;
};

/** mutation root */
export type MutationRootInsertImagesArgs = {
  objects: Array<ImagesInsertInput>;
  onConflict?: InputMaybe<ImagesOnConflict>;
};

/** mutation root */
export type MutationRootInsertImagesOneArgs = {
  object: ImagesInsertInput;
  onConflict?: InputMaybe<ImagesOnConflict>;
};

/** mutation root */
export type MutationRootInsertNumbersArgs = {
  objects: Array<NumbersInsertInput>;
  onConflict?: InputMaybe<NumbersOnConflict>;
};

/** mutation root */
export type MutationRootInsertNumbersOneArgs = {
  object: NumbersInsertInput;
  onConflict?: InputMaybe<NumbersOnConflict>;
};

/** mutation root */
export type MutationRootInsertPrizesArgs = {
  objects: Array<PrizesInsertInput>;
  onConflict?: InputMaybe<PrizesOnConflict>;
};

/** mutation root */
export type MutationRootInsertPrizesOneArgs = {
  object: PrizesInsertInput;
  onConflict?: InputMaybe<PrizesOnConflict>;
};

/** mutation root */
export type MutationRootInsertReachLogsArgs = {
  objects: Array<ReachLogsInsertInput>;
  onConflict?: InputMaybe<ReachLogsOnConflict>;
};

/** mutation root */
export type MutationRootInsertReachLogsOneArgs = {
  object: ReachLogsInsertInput;
  onConflict?: InputMaybe<ReachLogsOnConflict>;
};

/** mutation root */
export type MutationRootInsertStampTriggersArgs = {
  objects: Array<StampTriggersInsertInput>;
  onConflict?: InputMaybe<StampTriggersOnConflict>;
};

/** mutation root */
export type MutationRootInsertStampTriggersOneArgs = {
  object: StampTriggersInsertInput;
  onConflict?: InputMaybe<StampTriggersOnConflict>;
};

/** mutation root */
export type MutationRootUpdateImagesArgs = {
  _inc?: InputMaybe<ImagesIncInput>;
  _set?: InputMaybe<ImagesSetInput>;
  where: ImagesBoolExp;
};

/** mutation root */
export type MutationRootUpdateImagesByPkArgs = {
  _inc?: InputMaybe<ImagesIncInput>;
  _set?: InputMaybe<ImagesSetInput>;
  pkColumns: ImagesPkColumnsInput;
};

/** mutation root */
export type MutationRootUpdateImagesManyArgs = {
  updates: Array<ImagesUpdates>;
};

/** mutation root */
export type MutationRootUpdateNumbersArgs = {
  _inc?: InputMaybe<NumbersIncInput>;
  _set?: InputMaybe<NumbersSetInput>;
  where: NumbersBoolExp;
};

/** mutation root */
export type MutationRootUpdateNumbersByPkArgs = {
  _inc?: InputMaybe<NumbersIncInput>;
  _set?: InputMaybe<NumbersSetInput>;
  pkColumns: NumbersPkColumnsInput;
};

/** mutation root */
export type MutationRootUpdateNumbersManyArgs = {
  updates: Array<NumbersUpdates>;
};

/** mutation root */
export type MutationRootUpdatePrizesArgs = {
  _inc?: InputMaybe<PrizesIncInput>;
  _set?: InputMaybe<PrizesSetInput>;
  where: PrizesBoolExp;
};

/** mutation root */
export type MutationRootUpdatePrizesByPkArgs = {
  _inc?: InputMaybe<PrizesIncInput>;
  _set?: InputMaybe<PrizesSetInput>;
  pkColumns: PrizesPkColumnsInput;
};

/** mutation root */
export type MutationRootUpdatePrizesManyArgs = {
  updates: Array<PrizesUpdates>;
};

/** mutation root */
export type MutationRootUpdateReachLogsArgs = {
  _inc?: InputMaybe<ReachLogsIncInput>;
  _set?: InputMaybe<ReachLogsSetInput>;
  where: ReachLogsBoolExp;
};

/** mutation root */
export type MutationRootUpdateReachLogsByPkArgs = {
  _inc?: InputMaybe<ReachLogsIncInput>;
  _set?: InputMaybe<ReachLogsSetInput>;
  pkColumns: ReachLogsPkColumnsInput;
};

/** mutation root */
export type MutationRootUpdateReachLogsManyArgs = {
  updates: Array<ReachLogsUpdates>;
};

/** mutation root */
export type MutationRootUpdateStampTriggersArgs = {
  _inc?: InputMaybe<StampTriggersIncInput>;
  _set?: InputMaybe<StampTriggersSetInput>;
  where: StampTriggersBoolExp;
};

/** mutation root */
export type MutationRootUpdateStampTriggersByPkArgs = {
  _inc?: InputMaybe<StampTriggersIncInput>;
  _set?: InputMaybe<StampTriggersSetInput>;
  pkColumns: StampTriggersPkColumnsInput;
};

/** mutation root */
export type MutationRootUpdateStampTriggersManyArgs = {
  updates: Array<StampTriggersUpdates>;
};

export type QueryRoot = {
  __typename?: "query_root";
  /** fetch data from the table: "images" */
  images: Array<Images>;
  /** fetch aggregated fields from the table: "images" */
  imagesAggregate: ImagesAggregate;
  /** fetch data from the table: "images" using primary key columns */
  imagesByPk?: Maybe<Images>;
  /** fetch data from the table: "numbers" */
  numbers: Array<Numbers>;
  /** fetch aggregated fields from the table: "numbers" */
  numbersAggregate: NumbersAggregate;
  /** fetch data from the table: "numbers" using primary key columns */
  numbersByPk?: Maybe<Numbers>;
  /** fetch data from the table: "prizes" */
  prizes: Array<Prizes>;
  /** fetch aggregated fields from the table: "prizes" */
  prizesAggregate: PrizesAggregate;
  /** fetch data from the table: "prizes" using primary key columns */
  prizesByPk?: Maybe<Prizes>;
  /** fetch data from the table: "reach_logs" */
  reachLogs: Array<ReachLogs>;
  /** fetch aggregated fields from the table: "reach_logs" */
  reachLogsAggregate: ReachLogsAggregate;
  /** fetch data from the table: "reach_logs" using primary key columns */
  reachLogsByPk?: Maybe<ReachLogs>;
  /** fetch data from the table: "stamp_triggers" */
  stampTriggers: Array<StampTriggers>;
  /** fetch aggregated fields from the table: "stamp_triggers" */
  stampTriggersAggregate: StampTriggersAggregate;
  /** fetch data from the table: "stamp_triggers" using primary key columns */
  stampTriggersByPk?: Maybe<StampTriggers>;
};

export type QueryRootImagesArgs = {
  distinctOn?: InputMaybe<Array<ImagesSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ImagesOrderBy>>;
  where?: InputMaybe<ImagesBoolExp>;
};

export type QueryRootImagesAggregateArgs = {
  distinctOn?: InputMaybe<Array<ImagesSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ImagesOrderBy>>;
  where?: InputMaybe<ImagesBoolExp>;
};

export type QueryRootImagesByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type QueryRootNumbersArgs = {
  distinctOn?: InputMaybe<Array<NumbersSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<NumbersOrderBy>>;
  where?: InputMaybe<NumbersBoolExp>;
};

export type QueryRootNumbersAggregateArgs = {
  distinctOn?: InputMaybe<Array<NumbersSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<NumbersOrderBy>>;
  where?: InputMaybe<NumbersBoolExp>;
};

export type QueryRootNumbersByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type QueryRootPrizesArgs = {
  distinctOn?: InputMaybe<Array<PrizesSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PrizesOrderBy>>;
  where?: InputMaybe<PrizesBoolExp>;
};

export type QueryRootPrizesAggregateArgs = {
  distinctOn?: InputMaybe<Array<PrizesSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PrizesOrderBy>>;
  where?: InputMaybe<PrizesBoolExp>;
};

export type QueryRootPrizesByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type QueryRootReachLogsArgs = {
  distinctOn?: InputMaybe<Array<ReachLogsSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ReachLogsOrderBy>>;
  where?: InputMaybe<ReachLogsBoolExp>;
};

export type QueryRootReachLogsAggregateArgs = {
  distinctOn?: InputMaybe<Array<ReachLogsSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ReachLogsOrderBy>>;
  where?: InputMaybe<ReachLogsBoolExp>;
};

export type QueryRootReachLogsByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type QueryRootStampTriggersArgs = {
  distinctOn?: InputMaybe<Array<StampTriggersSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<StampTriggersOrderBy>>;
  where?: InputMaybe<StampTriggersBoolExp>;
};

export type QueryRootStampTriggersAggregateArgs = {
  distinctOn?: InputMaybe<Array<StampTriggersSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<StampTriggersOrderBy>>;
  where?: InputMaybe<StampTriggersBoolExp>;
};

export type QueryRootStampTriggersByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type SubscriptionRoot = {
  __typename?: "subscription_root";
  /** fetch data from the table: "images" */
  images: Array<Images>;
  /** fetch aggregated fields from the table: "images" */
  imagesAggregate: ImagesAggregate;
  /** fetch data from the table: "images" using primary key columns */
  imagesByPk?: Maybe<Images>;
  /** fetch data from the table in a streaming manner: "images" */
  imagesStream: Array<Images>;
  /** fetch data from the table: "numbers" */
  numbers: Array<Numbers>;
  /** fetch aggregated fields from the table: "numbers" */
  numbersAggregate: NumbersAggregate;
  /** fetch data from the table: "numbers" using primary key columns */
  numbersByPk?: Maybe<Numbers>;
  /** fetch data from the table in a streaming manner: "numbers" */
  numbersStream: Array<Numbers>;
  /** fetch data from the table: "prizes" */
  prizes: Array<Prizes>;
  /** fetch aggregated fields from the table: "prizes" */
  prizesAggregate: PrizesAggregate;
  /** fetch data from the table: "prizes" using primary key columns */
  prizesByPk?: Maybe<Prizes>;
  /** fetch data from the table in a streaming manner: "prizes" */
  prizesStream: Array<Prizes>;
  /** fetch data from the table: "reach_logs" */
  reachLogs: Array<ReachLogs>;
  /** fetch aggregated fields from the table: "reach_logs" */
  reachLogsAggregate: ReachLogsAggregate;
  /** fetch data from the table: "reach_logs" using primary key columns */
  reachLogsByPk?: Maybe<ReachLogs>;
  /** fetch data from the table in a streaming manner: "reach_logs" */
  reachLogsStream: Array<ReachLogs>;
  /** fetch data from the table: "stamp_triggers" */
  stampTriggers: Array<StampTriggers>;
  /** fetch aggregated fields from the table: "stamp_triggers" */
  stampTriggersAggregate: StampTriggersAggregate;
  /** fetch data from the table: "stamp_triggers" using primary key columns */
  stampTriggersByPk?: Maybe<StampTriggers>;
  /** fetch data from the table in a streaming manner: "stamp_triggers" */
  stampTriggersStream: Array<StampTriggers>;
};

export type SubscriptionRootImagesArgs = {
  distinctOn?: InputMaybe<Array<ImagesSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ImagesOrderBy>>;
  where?: InputMaybe<ImagesBoolExp>;
};

export type SubscriptionRootImagesAggregateArgs = {
  distinctOn?: InputMaybe<Array<ImagesSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ImagesOrderBy>>;
  where?: InputMaybe<ImagesBoolExp>;
};

export type SubscriptionRootImagesByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type SubscriptionRootImagesStreamArgs = {
  batchSize: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<ImagesStreamCursorInput>>;
  where?: InputMaybe<ImagesBoolExp>;
};

export type SubscriptionRootNumbersArgs = {
  distinctOn?: InputMaybe<Array<NumbersSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<NumbersOrderBy>>;
  where?: InputMaybe<NumbersBoolExp>;
};

export type SubscriptionRootNumbersAggregateArgs = {
  distinctOn?: InputMaybe<Array<NumbersSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<NumbersOrderBy>>;
  where?: InputMaybe<NumbersBoolExp>;
};

export type SubscriptionRootNumbersByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type SubscriptionRootNumbersStreamArgs = {
  batchSize: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<NumbersStreamCursorInput>>;
  where?: InputMaybe<NumbersBoolExp>;
};

export type SubscriptionRootPrizesArgs = {
  distinctOn?: InputMaybe<Array<PrizesSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PrizesOrderBy>>;
  where?: InputMaybe<PrizesBoolExp>;
};

export type SubscriptionRootPrizesAggregateArgs = {
  distinctOn?: InputMaybe<Array<PrizesSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PrizesOrderBy>>;
  where?: InputMaybe<PrizesBoolExp>;
};

export type SubscriptionRootPrizesByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type SubscriptionRootPrizesStreamArgs = {
  batchSize: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<PrizesStreamCursorInput>>;
  where?: InputMaybe<PrizesBoolExp>;
};

export type SubscriptionRootReachLogsArgs = {
  distinctOn?: InputMaybe<Array<ReachLogsSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ReachLogsOrderBy>>;
  where?: InputMaybe<ReachLogsBoolExp>;
};

export type SubscriptionRootReachLogsAggregateArgs = {
  distinctOn?: InputMaybe<Array<ReachLogsSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ReachLogsOrderBy>>;
  where?: InputMaybe<ReachLogsBoolExp>;
};

export type SubscriptionRootReachLogsByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type SubscriptionRootReachLogsStreamArgs = {
  batchSize: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<ReachLogsStreamCursorInput>>;
  where?: InputMaybe<ReachLogsBoolExp>;
};

export type SubscriptionRootStampTriggersArgs = {
  distinctOn?: InputMaybe<Array<StampTriggersSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<StampTriggersOrderBy>>;
  where?: InputMaybe<StampTriggersBoolExp>;
};

export type SubscriptionRootStampTriggersAggregateArgs = {
  distinctOn?: InputMaybe<Array<StampTriggersSelectColumn>>;
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<StampTriggersOrderBy>>;
  where?: InputMaybe<StampTriggersBoolExp>;
};

export type SubscriptionRootStampTriggersByPkArgs = {
  id: Scalars["Int"]["input"];
};

export type SubscriptionRootStampTriggersStreamArgs = {
  batchSize: Scalars["Int"]["input"];
  cursor: Array<InputMaybe<StampTriggersStreamCursorInput>>;
  where?: InputMaybe<StampTriggersBoolExp>;
};

export type CreateOneImageMutationVariables = Exact<{
  bucketName: Scalars["String"]["input"];
  fileName: Scalars["String"]["input"];
  fileType: Scalars["String"]["input"];
}>;

export type CreateOneImageMutation = {
  __typename?: "mutation_root";
  insertImagesOne?: { __typename?: "Images"; id: number } | null;
};

export type RelateOneImageToPrizeMutationVariables = Exact<{
  imageId: Scalars["Int"]["input"];
  id: Scalars["Int"]["input"];
}>;

export type RelateOneImageToPrizeMutation = {
  __typename?: "mutation_root";
  updatePrizesByPk?: {
    __typename?: "Prizes";
    id: number;
    imageId: number;
  } | null;
};

export type UpdateOneImageMutationVariables = Exact<{
  id: Scalars["Int"]["input"];
  bucketName: Scalars["String"]["input"];
  fileName: Scalars["String"]["input"];
  fileType: Scalars["String"]["input"];
}>;

export type UpdateOneImageMutation = {
  __typename?: "mutation_root";
  updateImagesByPk?: {
    __typename?: "Images";
    id: number;
    bucketName: string;
    fileName: string;
    fileType: string;
    updatedAt: any;
  } | null;
};

export type DeleteOneImageMutationVariables = Exact<{
  id: Scalars["Int"]["input"];
}>;

export type DeleteOneImageMutation = {
  __typename?: "mutation_root";
  deleteImagesByPk?: { __typename?: "Images"; id: number } | null;
};

export type GetListNumbersQueryVariables = Exact<{ [key: string]: never }>;

export type GetListNumbersQuery = {
  __typename?: "query_root";
  numbers: Array<{
    __typename?: "Numbers";
    id: number;
    number: number;
    createdAt: any;
    updatedAt: any;
  }>;
};

export type CreateOneNumberMutationVariables = Exact<{
  number: Scalars["Int"]["input"];
}>;

export type CreateOneNumberMutation = {
  __typename?: "mutation_root";
  insertNumbersOne?: { __typename?: "Numbers"; id: number } | null;
};

export type DeleteOneNumberMutationVariables = Exact<{
  number: Scalars["Int"]["input"];
}>;

export type DeleteOneNumberMutation = {
  __typename?: "mutation_root";
  deleteNumbers?: {
    __typename?: "NumbersMutationResponse";
    affectedRows: number;
  } | null;
};

export type SubscribeListNumbersSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeListNumbersSubscription = {
  __typename?: "subscription_root";
  numbers: Array<{
    __typename?: "Numbers";
    id: number;
    number: number;
    createdAt: any;
    updatedAt: any;
  }>;
};

export type GetListPrizesQueryVariables = Exact<{ [key: string]: never }>;

export type GetListPrizesQuery = {
  __typename?: "query_root";
  prizes: Array<{
    __typename?: "Prizes";
    id: number;
    isWon: boolean;
    nameJp: string;
    nameEn?: string | null;
    createdAt: any;
    updatedAt: any;
    image: {
      __typename?: "Images";
      id: number;
      bucketName: string;
      fileName: string;
      fileType: string;
      createdAt: any;
      updatedAt: any;
    };
  }>;
};

export type DeleteOnePrizeMutationVariables = Exact<{
  id: Scalars["Int"]["input"];
}>;

export type DeleteOnePrizeMutation = {
  __typename?: "mutation_root";
  deletePrizesByPk?: { __typename?: "Prizes"; imageId: number } | null;
};

export type SubscribeListPrizesIsWonSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeListPrizesIsWonSubscription = {
  __typename?: "subscription_root";
  prizes: Array<{
    __typename?: "Prizes";
    id: number;
    isWon: boolean;
    createdAt: any;
    updatedAt: any;
  }>;
};

export type CreateOnePrizeMutationVariables = Exact<{
  isWon: Scalars["Boolean"]["input"];
  imageId: Scalars["Int"]["input"];
  nameJp: Scalars["String"]["input"];
  nameEn: Scalars["String"]["input"];
}>;

export type CreateOnePrizeMutation = {
  __typename?: "mutation_root";
  insertPrizes?: {
    __typename?: "PrizesMutationResponse";
    returning: Array<{
      __typename?: "Prizes";
      id: number;
      isWon: boolean;
      imageId: number;
      nameJp: string;
      nameEn?: string | null;
    }>;
  } | null;
};

export type UpdateOnePrizeIsWonMutationVariables = Exact<{
  id: Scalars["Int"]["input"];
  isWon: Scalars["Boolean"]["input"];
}>;

export type UpdateOnePrizeIsWonMutation = {
  __typename?: "mutation_root";
  updatePrizesByPk?: {
    __typename?: "Prizes";
    id: number;
    isWon: boolean;
  } | null;
};

export type GetOneLatestReachLogQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetOneLatestReachLogQuery = {
  __typename?: "query_root";
  reachLogs: Array<{ __typename?: "ReachLogs"; reachNum: number }>;
};

export type SubscribeOneLatestReachlogSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeOneLatestReachlogSubscription = {
  __typename?: "subscription_root";
  reachLogs: Array<{ __typename?: "ReachLogs"; reachNum: number }>;
};

export type GetListReachLogsAfterTimestampQueryVariables = Exact<{
  timestamp: Scalars["timestamptz"]["input"];
}>;

export type GetListReachLogsAfterTimestampQuery = {
  __typename?: "query_root";
  reachLogs: Array<{
    __typename?: "ReachLogs";
    id: number;
    status: boolean;
    createdAt: any;
    reachNum: number;
  }>;
};

export type CreateOneReachRecordMutationVariables = Exact<{
  status: Scalars["Boolean"]["input"];
  reachNum: Scalars["Int"]["input"];
}>;

export type CreateOneReachRecordMutation = {
  __typename?: "mutation_root";
  insertReachLogsOne?: {
    __typename?: "ReachLogs";
    id: number;
    status: boolean;
    createdAt: any;
    reachNum: number;
  } | null;
};

export type IncrementReachNumMutationVariables = Exact<{
  [key: string]: never;
}>;

export type IncrementReachNumMutation = {
  __typename?: "mutation_root";
  incrementLatestReachLog: Array<{
    __typename?: "ReachLogs";
    id: number;
    status: boolean;
    createdAt: any;
    reachNum: number;
  }>;
};

export type DecrementReachNumMutationVariables = Exact<{
  [key: string]: never;
}>;

export type DecrementReachNumMutation = {
  __typename?: "mutation_root";
  decrementLatestReachLog: Array<{
    __typename?: "ReachLogs";
    id: number;
    status: boolean;
    createdAt: any;
    reachNum: number;
  }>;
};

export const CreateOneImageDocument = gql`
  mutation CreateOneImage(
    $bucketName: String!
    $fileName: String!
    $fileType: String!
  ) {
    insertImagesOne(
      object: {
        bucketName: $bucketName
        fileName: $fileName
        fileType: $fileType
      }
    ) {
      id
    }
  }
`;
export type CreateOneImageMutationFn = Apollo.MutationFunction<
  CreateOneImageMutation,
  CreateOneImageMutationVariables
>;
export type CreateOneImageMutationResult =
  Apollo.MutationResult<CreateOneImageMutation>;
export type CreateOneImageMutationOptions = Apollo.BaseMutationOptions<
  CreateOneImageMutation,
  CreateOneImageMutationVariables
>;
export const RelateOneImageToPrizeDocument = gql`
  mutation RelateOneImageToPrize($imageId: Int!, $id: Int!) {
    updatePrizesByPk(pkColumns: { id: $id }, _set: { imageId: $imageId }) {
      id
      imageId
    }
  }
`;
export type RelateOneImageToPrizeMutationFn = Apollo.MutationFunction<
  RelateOneImageToPrizeMutation,
  RelateOneImageToPrizeMutationVariables
>;
export type RelateOneImageToPrizeMutationResult =
  Apollo.MutationResult<RelateOneImageToPrizeMutation>;
export type RelateOneImageToPrizeMutationOptions = Apollo.BaseMutationOptions<
  RelateOneImageToPrizeMutation,
  RelateOneImageToPrizeMutationVariables
>;
export const UpdateOneImageDocument = gql`
  mutation UpdateOneImage(
    $id: Int!
    $bucketName: String!
    $fileName: String!
    $fileType: String!
  ) {
    updateImagesByPk(
      pkColumns: { id: $id }
      _set: {
        bucketName: $bucketName
        fileName: $fileName
        fileType: $fileType
      }
    ) {
      id
      bucketName
      fileName
      fileType
      updatedAt
    }
  }
`;
export type UpdateOneImageMutationFn = Apollo.MutationFunction<
  UpdateOneImageMutation,
  UpdateOneImageMutationVariables
>;
export type UpdateOneImageMutationResult =
  Apollo.MutationResult<UpdateOneImageMutation>;
export type UpdateOneImageMutationOptions = Apollo.BaseMutationOptions<
  UpdateOneImageMutation,
  UpdateOneImageMutationVariables
>;
export const DeleteOneImageDocument = gql`
  mutation DeleteOneImage($id: Int!) {
    deleteImagesByPk(id: $id) {
      id
    }
  }
`;
export type DeleteOneImageMutationFn = Apollo.MutationFunction<
  DeleteOneImageMutation,
  DeleteOneImageMutationVariables
>;
export type DeleteOneImageMutationResult =
  Apollo.MutationResult<DeleteOneImageMutation>;
export type DeleteOneImageMutationOptions = Apollo.BaseMutationOptions<
  DeleteOneImageMutation,
  DeleteOneImageMutationVariables
>;
export const GetListNumbersDocument = gql`
  query GetListNumbers {
    numbers {
      id
      number
      createdAt
      updatedAt
    }
  }
`;
export type GetListNumbersQueryResult = Apollo.QueryResult<
  GetListNumbersQuery,
  GetListNumbersQueryVariables
>;
export const CreateOneNumberDocument = gql`
  mutation CreateOneNumber($number: Int!) {
    insertNumbersOne(object: { number: $number }) {
      id
    }
  }
`;
export type CreateOneNumberMutationFn = Apollo.MutationFunction<
  CreateOneNumberMutation,
  CreateOneNumberMutationVariables
>;
export type CreateOneNumberMutationResult =
  Apollo.MutationResult<CreateOneNumberMutation>;
export type CreateOneNumberMutationOptions = Apollo.BaseMutationOptions<
  CreateOneNumberMutation,
  CreateOneNumberMutationVariables
>;
export const DeleteOneNumberDocument = gql`
  mutation DeleteOneNumber($number: Int!) {
    deleteNumbers(where: { number: { _eq: $number } }) {
      affectedRows
    }
  }
`;
export type DeleteOneNumberMutationFn = Apollo.MutationFunction<
  DeleteOneNumberMutation,
  DeleteOneNumberMutationVariables
>;
export type DeleteOneNumberMutationResult =
  Apollo.MutationResult<DeleteOneNumberMutation>;
export type DeleteOneNumberMutationOptions = Apollo.BaseMutationOptions<
  DeleteOneNumberMutation,
  DeleteOneNumberMutationVariables
>;
export const SubscribeListNumbersDocument = gql`
  subscription SubscribeListNumbers {
    numbers {
      id
      number
      createdAt
      updatedAt
    }
  }
`;
export type SubscribeListNumbersSubscriptionResult =
  Apollo.SubscriptionResult<SubscribeListNumbersSubscription>;
export const GetListPrizesDocument = gql`
  query GetListPrizes {
    prizes {
      id
      isWon
      nameJp
      nameEn
      createdAt
      updatedAt
      image {
        id
        bucketName
        fileName
        fileType
        createdAt
        updatedAt
      }
    }
  }
`;
export type GetListPrizesQueryResult = Apollo.QueryResult<
  GetListPrizesQuery,
  GetListPrizesQueryVariables
>;
export const DeleteOnePrizeDocument = gql`
  mutation DeleteOnePrize($id: Int!) {
    deletePrizesByPk(id: $id) {
      imageId
    }
  }
`;
export type DeleteOnePrizeMutationFn = Apollo.MutationFunction<
  DeleteOnePrizeMutation,
  DeleteOnePrizeMutationVariables
>;
export type DeleteOnePrizeMutationResult =
  Apollo.MutationResult<DeleteOnePrizeMutation>;
export type DeleteOnePrizeMutationOptions = Apollo.BaseMutationOptions<
  DeleteOnePrizeMutation,
  DeleteOnePrizeMutationVariables
>;
export const SubscribeListPrizesIsWonDocument = gql`
  subscription SubscribeListPrizesIsWon {
    prizes {
      id
      isWon
      createdAt
      updatedAt
    }
  }
`;
export type SubscribeListPrizesIsWonSubscriptionResult =
  Apollo.SubscriptionResult<SubscribeListPrizesIsWonSubscription>;
export const CreateOnePrizeDocument = gql`
  mutation CreateOnePrize(
    $isWon: Boolean!
    $imageId: Int!
    $nameJp: String!
    $nameEn: String!
  ) {
    insertPrizes(
      objects: {
        isWon: $isWon
        imageId: $imageId
        nameJp: $nameJp
        nameEn: $nameEn
      }
    ) {
      returning {
        id
        isWon
        imageId
        nameJp
        nameEn
      }
    }
  }
`;
export type CreateOnePrizeMutationFn = Apollo.MutationFunction<
  CreateOnePrizeMutation,
  CreateOnePrizeMutationVariables
>;
export type CreateOnePrizeMutationResult =
  Apollo.MutationResult<CreateOnePrizeMutation>;
export type CreateOnePrizeMutationOptions = Apollo.BaseMutationOptions<
  CreateOnePrizeMutation,
  CreateOnePrizeMutationVariables
>;
export const UpdateOnePrizeIsWonDocument = gql`
  mutation UpdateOnePrizeIsWon($id: Int!, $isWon: Boolean!) {
    updatePrizesByPk(pkColumns: { id: $id }, _set: { isWon: $isWon }) {
      id
      isWon
    }
  }
`;
export type UpdateOnePrizeIsWonMutationFn = Apollo.MutationFunction<
  UpdateOnePrizeIsWonMutation,
  UpdateOnePrizeIsWonMutationVariables
>;
export type UpdateOnePrizeIsWonMutationResult =
  Apollo.MutationResult<UpdateOnePrizeIsWonMutation>;
export type UpdateOnePrizeIsWonMutationOptions = Apollo.BaseMutationOptions<
  UpdateOnePrizeIsWonMutation,
  UpdateOnePrizeIsWonMutationVariables
>;
export const GetOneLatestReachLogDocument = gql`
  query GetOneLatestReachLog {
    reachLogs(orderBy: { createdAt: DESC }, limit: 1) {
      reachNum
    }
  }
`;
export type GetOneLatestReachLogQueryResult = Apollo.QueryResult<
  GetOneLatestReachLogQuery,
  GetOneLatestReachLogQueryVariables
>;
export const SubscribeOneLatestReachlogDocument = gql`
  subscription SubscribeOneLatestReachlog {
    reachLogs(orderBy: { createdAt: DESC }, limit: 1) {
      reachNum
    }
  }
`;
export type SubscribeOneLatestReachlogSubscriptionResult =
  Apollo.SubscriptionResult<SubscribeOneLatestReachlogSubscription>;
export const GetListReachLogsAfterTimestampDocument = gql`
  query GetListReachLogsAfterTimestamp($timestamp: timestamptz!) {
    reachLogs(
      where: { createdAt: { _gt: $timestamp } }
      orderBy: { createdAt: ASC }
    ) {
      id
      status
      createdAt
      reachNum
    }
  }
`;
export type GetListReachLogsAfterTimestampQueryResult = Apollo.QueryResult<
  GetListReachLogsAfterTimestampQuery,
  GetListReachLogsAfterTimestampQueryVariables
>;
export const CreateOneReachRecordDocument = gql`
  mutation CreateOneReachRecord($status: Boolean!, $reachNum: Int!) {
    insertReachLogsOne(
      object: { status: $status, reachNum: $reachNum, createdAt: "now()" }
    ) {
      id
      status
      createdAt
      reachNum
    }
  }
`;
export type CreateOneReachRecordMutationFn = Apollo.MutationFunction<
  CreateOneReachRecordMutation,
  CreateOneReachRecordMutationVariables
>;
export type CreateOneReachRecordMutationResult =
  Apollo.MutationResult<CreateOneReachRecordMutation>;
export type CreateOneReachRecordMutationOptions = Apollo.BaseMutationOptions<
  CreateOneReachRecordMutation,
  CreateOneReachRecordMutationVariables
>;
export const IncrementReachNumDocument = gql`
  mutation IncrementReachNum {
    incrementLatestReachLog {
      id
      status
      createdAt
      reachNum
    }
  }
`;
export type IncrementReachNumMutationFn = Apollo.MutationFunction<
  IncrementReachNumMutation,
  IncrementReachNumMutationVariables
>;
export type IncrementReachNumMutationResult =
  Apollo.MutationResult<IncrementReachNumMutation>;
export type IncrementReachNumMutationOptions = Apollo.BaseMutationOptions<
  IncrementReachNumMutation,
  IncrementReachNumMutationVariables
>;
export const DecrementReachNumDocument = gql`
  mutation DecrementReachNum {
    decrementLatestReachLog {
      id
      status
      createdAt
      reachNum
    }
  }
`;
export type DecrementReachNumMutationFn = Apollo.MutationFunction<
  DecrementReachNumMutation,
  DecrementReachNumMutationVariables
>;
export type DecrementReachNumMutationResult =
  Apollo.MutationResult<DecrementReachNumMutation>;
export type DecrementReachNumMutationOptions = Apollo.BaseMutationOptions<
  DecrementReachNumMutation,
  DecrementReachNumMutationVariables
>;
