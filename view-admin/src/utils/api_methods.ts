// import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
// import { createClient } from "graphql-ws";
// import { GraphQLWsLink } from "@apollo/client/link/subscriptions";

// // GraphQLクエリを実行
// export async function getBingoNumber(): Promise<BingoNumber[]> {
//   try {
//     const response = await client.query({
//       query: ,
//     });
//     return response.data.bingo_number;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return [];
//   }


// export async function createBingoNumber(data: number): Promise<BingoNumber[]> {
//   try {
//     const response = await client.mutate({
//       mutation: ,
//       variables: { data },
//     });
//     return response.data.insert_bingo_number_one;
//   } catch (error) {
//     console.error("Error creating bingo number:", error);
//     return [];
//   }
// }

// export async function deleteBingoNumber(data: number): Promise<BingoNumber[]> {
//   try {
//     const response = await client.mutate({
//       mutation: ,
//       variables: { data },
//     });
//     return response.data.delete_bingo_number;
//   } catch (error) {
//     console.error("Error deleteing bingo number:", error);
//     return [];
//   }
// }
// export async function createBingoPrize(image: string): Promise<string> {
//   try {
//     const response = await client.mutate({
//       mutation: ,
//       variables: { image },
//     });
//     return response.data.insert_bingo_prize_one;
//   } catch (error) {
//     console.error("Error creating bingo_prize image:", error);
//     return "";
//   }
// }

// export async function subscriptionBingoPrize(): Promise<BingoPrize[]> {
//   try {
//     const response = await client.subscribe({
//       query: ,
//     });
//     return new Promise<BingoPrize[]>((resolve, reject) => {
//       response.subscribe({
//         next: (response) => resolve(response.data.bingo_prize),
//         error: (error) => {
//           console.error("Subscription error:", error);
//           reject(error);
//         },
//       });
//     });
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return [];
//   }
// }

// // GraphQLクエリを実行
// export async function getBingoPrize(): Promise<BingoPrize[]> {
//   try {
//     const response = await client.query({
//       query: ,
//     });
//     return response.data.bingo_prize;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return [];
//   }
// }

// export async function postBingoPrize(
//   existing: boolean,
//   image: string,
//   name: string,
// ): Promise<BingoPrize[]> {
//   try {
//     const response = await client.mutate({
//       mutation: ,
//       variables: { existing, image, name },
//     });
//     return response.data.insert_bingo_prize;
//   } catch (error) {
//     console.error("Error creating bingo prize:", error);
//     return [];
//   }
// }

// export async function updatePrizeExisting(
//   id: number,
//   newExistingValue: boolean,
// ): Promise<BingoPrize | null> {
//   try {
//     const response = await client.mutate({
//       mutation: ,
//       variables: { id, existing: newExistingValue },
//     });

//     return response.data.update_bingo_prize_by_pk;
//   } catch (error) {
//     console.error("Error updating bingo prize:", error);
//     return null;
//   }
// }
