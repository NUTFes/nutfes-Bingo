import { gql } from "@apollo/client";

//ビンゴ番号の取得(Get)
export const bingoNumberGet = gql`
  query MyQuery {
    bingo_number {
      created_at
      id
      number
      updated_at
    }
  }
`;

//ビンゴ番号の追加(Create)
export const bingoNumberCreate = gql`
  mutation MyMutation($number: Int!) {
    insert_bingo_number_one(object: { number: $number }) {
      id
    }
  }
`;

//ビンゴ番号の削除(Delete)
export const bingoNumberDelete = gql`
  mutation MyMutation($number: Int!) {
    delete_bingo_number(where: { number: { _eq: $number } }) {
      affected_rows
    }
  }
`;

//ビンゴ番号の継続取得(Subscription)
export const bingoNumberSubscription = gql`
  subscription MySubscription {
    bingo_number {
      created_at
      id
      number
      updated_at
    }
  }
`;

//ビンゴ景品の取得(Get)
export const bingoPrizeGet = gql`
  query MyQuery {
    bingo_prize {
      id
      nameJp
      nameEn
      isWon
      imageId
      created_at
      updated_at
      prize_image {
        id
        bucketName
        fileName
        fileType
        created_at
        updated_at
      }
    }
  }
`;

//ビンゴ景品の削除(Delete)
export const bingoPrizeDelete = gql`
  mutation MyMutation($id: Int!) {
    delete_bingo_prize_by_pk(id: $id) {
      imageId
    }
  }
`;

//ビンゴ景品の継続取得(Subscription)
export const bingoPrizeSubscriptionIsWon = gql`
  subscription MySubscription {
    bingo_prize {
      created_at
      isWon
      id
      updated_at
    }
  }
`;

//ビンゴ景品の追加(Create)
export const bingoPrizeCreate = gql`
  mutation MyMutation(
    $isWon: Boolean!
    $imageId: Int!
    $nameJp: String!
    $nameEn: String!
  ) {
    insert_bingo_prize(
      objects: {
        isWon: $isWon
        imageId: $imageId
        nameJp: $nameJp
        nameEn: $nameEn
      }
    ) {
      returning {
        isWon
        id
        imageId
        nameJp
        nameEn
      }
    }
  }
`;

//ビンゴ景品の画像追加(Create)
export const bingoPrizeCreateImage = gql`
  mutation MyMutation($image: String!) {
    insert_bingo_prize_one(object: { image: $image }) {
      id
    }
  }
`;

//ビンゴ景品の当選確認(Update)
export const bingoPrizeUpdateIsWon = gql`
  mutation UpdateBingoPrize($id: Int!, $isWon: Boolean!) {
    update_bingo_prize_by_pk(pk_columns: { id: $id }, _set: { isWon: $isWon }) {
      id
      isWon
    }
  }
`;

//画像の追加(Post)
export const prizeImageCreate = gql`
  mutation MyMutation(
    $bucketName: String!
    $fileName: String!
    $fileType: String!
  ) {
    insert_prize_image_one(
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

//idとprizeIdの紐づけ
export const bingoPrizeToPrizeImage = gql`
  mutation UpdateBingoPrize($imageId: Int!, $id: Int!) {
    update_bingo_prize_by_pk(
      pk_columns: { id: $id }
      _set: { imageId: $imageId }
    ) {
      id
      imageId
    }
  }
`;

//画像の更新(Update)
export const prizeImageUpdate = gql`
  mutation MyMutation(
    $id: Int!
    $fileName: String!
    $bucketName: String!
    $fileType: String!
  ) {
    update_prize_image_by_pk(
      pk_columns: { id: $id }
      _set: {
        fileName: $fileName
        bucketName: $bucketName
        fileType: $fileType
      }
    ) {
      fileName
      bucketName
      fileType
      updated_at
      id
    }
  }
`;

//画像の削除(Delete)
export const prizeImageDelete = gql`
  mutation MyMutation($id: Int!) {
    delete_prize_image_by_pk(id: $id) {
      id
    }
  }
`;

export const GetCounterValue = gql`
  query GetCounterById($id: Int!) {
    page_counter(where: { id: { _eq: $id } }) {
      id
      counter
    }
  }
`;

export const SetCounterValue = gql`
  mutation UpdateCounter($id: Int!, $newCounterValue: Int!) {
    update_page_counter_by_pk(
      pk_columns: { id: $id }
      _set: { counter: $newCounterValue }
    ) {
      id
      counter
    }
  }
`;

export const UpsertPageCounter = gql`
  mutation UpsertPageCounter($id: Int!, $counter: Int!) {
    insert_page_counter(
      objects: { id: $id, counter: $counter }
      on_conflict: { constraint: page_counter_pkey, update_columns: counter }
    ) {
      affected_rows
    }
  }
`;
