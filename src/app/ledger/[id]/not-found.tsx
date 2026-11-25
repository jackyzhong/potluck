import Link from "next/link";
import {
  STATUS_BUTTON_PRIMARY,
  STATUS_BUTTON_SECONDARY,
  StatusCardPage
} from "@/src/components/glow/StatusCardPage";

export default function LedgerNotFound() {
  return (
    <StatusCardPage
      title="We can't find that group"
      body="The link may be incomplete, or the group may have been deleted. Ask whoever shared it to send the link again."
      actions={
        <>
          <Link href="/" className={STATUS_BUTTON_SECONDARY}>
            Go to home
          </Link>
          <Link href="/create-group" className={STATUS_BUTTON_PRIMARY}>
            Create a group
          </Link>
        </>
      }
    />
  );
}
