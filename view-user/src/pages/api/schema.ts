//スキーマの定義
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

//ビンゴ番号の削除(delete)
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
      created_at
      id
      imageId
      isWon
      nameEn
      nameJp
      updated_at
      prize_image {
        bucketName
        fimeName
        created_at
        fimeType
        id
        updated_at
      }
    }
  }
`;

// ビンゴ景品の削除(delete) returnで返したimageIdを画像削除に使う
export const bingoPrizeDelet = gql`
  mutation MyMutation {
    delete_bingo_prize_by_pk($id: Int!) {
      imageId
    }
  }
`;

//ビンゴ景品の継続取得(Subscription)
export const bingoPrizeSubscriptionExisting = gql`
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
    $image: String!
    $nameJp: String!
    $nameEn: string!
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
    update_bingo_prize_by_pk(
      pk_columns: { id: $id }
      _set: { isWon: $eisWon }
    ) {
      id
      name
      isWon
      imageId
      nameJp
      nameEn
    }
  }
`;

// 画像の追加(post)
export const prizeImageCreate = gql`
  mutaiton MyMutation($bucketName: string!, $fileName: string!, $fileType: string!) {
    insert_prize_image_one(object: {bucketName: $bucketName, fimeName: $fileName, fimeType: $fileType})
  } {
    returing {
      id
    }
  }
`;

// idとprizeIdの紐づけ
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

// 画像の更新(update)
export const prizeImageUpdate = gql`
  mutation MyMutation {
    update_prize_image_by_pk(
    pk_columns: { $id: Int! }
    _set: { fileName: $fileName, bucketName: $bucketName, fileType: $fileType}
    ) {
      fimeName
      bucketName
      fimeType
      updated_at
      id
    }
  }
`;

// 画像の削除(delete)
export const prizeImageDelete = gql`
  mutation MyMutation {
    delete_prize_image_by_pk($id: Int!) {
      id
    }
  }
`;
