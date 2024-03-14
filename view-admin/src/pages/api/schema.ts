//スキーマの定義
import { gql } from "@apollo/client";

//ビンゴ番号の取得(Get)
export const bingoNumberGet = gql`
  query MyQuery {
    bingo_number {
      data
      id
    }
  }
`;

//ビンゴ番号の追加(Create)
export const bingoNumberCreate = gql`
  mutation MyMutation($data: Int!) {
    insert_bingo_number_one(object: { data: $data }) {
      id
    }
  }
`;

//ビンゴ番号の削除(delete)
export const bingoNumberDelete = gql`
  mutation MyMutation($data: Int!) {
    delete_bingo_number(where: { data: { _eq: $data } }) {
      affected_rows
    }
  }
`;

//ビンゴ番号の継続取得(Subscription)
export const bingoNumberSubscription = gql`
  subscription MySubscription {
    bingo_number {
      data
      id
    }
  }
`;

//ビンゴ景品の取得(Get)
export const bingoPrizeGet = gql`
  query MyQuery {
    bingo_prize {
      image
      existing
      name
      id
    }
  }
`;

//ビンゴ景品の継続取得(Subscription)
export const bingoPrizeSubscriptionExisting = gql`
  subscription MySubscription {
    bingo_prize {
      existing
      id
    }
  }
`;

//ビンゴ景品の追加(Create)
export const bingoPrizeCreate = gql`
  mutation MyMutation($existing: Boolean!, $image: String!, $name: String!) {
    insert_bingo_prize(
      objects: { existing: $existing, image: $image, name: $name }
    ) {
      returning {
        existing
        id
        image
        name
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
export const bingoPrizeUpdateExisiting = gql`
  mutation UpdateBingoPrize($id: Int!, $existing: Boolean!) {
    update_bingo_prize_by_pk(
      pk_columns: { id: $id }
      _set: { existing: $existing }
    ) {
      id
      name
      existing
      image
    }
  }
`;
