import { CSSProperties } from "react";
import {
  UNSTABLE_ToastRegion as ToastRegion,
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastContent as ToastContent,
  ToastProps,
  Button,
  Text,
} from "react-aria-components";
import { XIcon } from "lucide-react";
import { composeTailwindRenderProps } from "@/utils/react-aria-utils";
import { queue, MyToastContent } from "./toastQueue";

export function MyToastRegion() {
  return (
    <ToastRegion
      queue={queue}
      className="fixed bottom-4 right-4 flex flex-col-reverse gap-2 rounded-lg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
    >
      {({ toast }) => (
        <MyToast toast={toast}>
          <ToastContent className="flex flex-col flex-1 min-w-0">
            <Text slot="title" className="font-semibold text-white text-sm">
              {toast.content.title}
            </Text>
            {toast.content.description && (
              <Text slot="description" className="text-xs text-white">
                {toast.content.description}
              </Text>
            )}
          </ToastContent>
          <Button
            slot="close"
            aria-label="Close"
            className="flex flex-none appearance-none size-8 rounded-sm bg-transparent border-none text-white p-0 outline-none hover:bg-white/10 pressed:bg-white/15 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 items-center justify-center [-webkit-tap-highlight-color:transparent]"
          >
            <XIcon className="size-4" />
          </Button>
        </MyToast>
      )}
    </ToastRegion>
  );
}

function MyToast(props: ToastProps<MyToastContent>) {
  return (
    <Toast
      {...props}
      style={{ viewTransitionName: props.toast.key } as CSSProperties}
      className={composeTailwindRenderProps(
        props.className,
        "flex items-center gap-4 bg-blue-600 px-4 py-3 rounded-lg outline-none forced-colors:outline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 [view-transition-class:toast] font-sans min-w-75 max-w-sm",
      )}
    />
  );
}
