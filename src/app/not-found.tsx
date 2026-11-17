import Link from "next/link";
import {
  STATUS_BUTTON_PRIMARY,
  STATUS_BUTTON_SECONDARY,
  StatusCardPage
} from "@/src/components/glow/StatusCardPage";

export default function RootNotFound() {
  return (
    <StatusCardPage
      title="We can't find that page"
      body="The link may be incomplete, or the page may have moved. Head back home or start a new group."
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
