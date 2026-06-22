import { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components";

export interface MyToastContent {
  title: string;
  description?: string;
}

export const queue = new ToastQueue<MyToastContent>({});
