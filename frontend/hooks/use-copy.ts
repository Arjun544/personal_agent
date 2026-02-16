import * as React from "react"
import { toast } from "sonner"

export function useCopy(timeout = 2000) {
    const [isCopied, setIsCopied] = React.useState(false)

    const copyToClipboard = React.useCallback(
        (value: string) => {
            if (typeof window === "undefined" || !navigator.clipboard?.writeText) {
                return
            }

            if (!value) {
                return
            }

            navigator.clipboard.writeText(value).then(() => {
                setIsCopied(true)

                toast.success("Copied to clipboard")

                setTimeout(() => {
                    setIsCopied(false)
                }, timeout)
            })
        },
        [timeout]
    )

    return { isCopied, copyToClipboard }
}
