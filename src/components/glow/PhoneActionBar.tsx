import { Button } from "./Button";

/**
 * Phone only (< 640px): Add payment and Add expense, pinned to the bottom with
 * the safe-area inset. Hidden while a sheet is open (docs/03). Whoever renders
 * the page gives it room, e.g. `pb-[calc(88px+env(safe-area-inset-bottom))]`.
 */
export function PhoneActionBar({
  hidden = false,
  onAddPayment,
  onAddExpense
}: {
  hidden?: boolean;
  onAddPayment: () => void;
  onAddExpense: () => void;
}) {
  if (hidden) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2.5 bg-gradient-to-t from-bg from-70% to-transparent px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 sm:hidden">
      <Button variant="secondary" size={52} onClick={onAddPayment} className="flex-1">
        Add payment
      </Button>
      <Button size={52} onClick={onAddExpense} className="flex-1">
        Add expense
      </Button>
    </div>
  );
}
