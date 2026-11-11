import { useBusiness } from "@/components/business/BusinessContext";
import { PageHead } from "@/components/ui/bits";
import { ColorTheory } from "./ColorTheory";

/** Color tab: color wheel and color theory basics for hair, tattoo, makeup and nail artists. */
export function ColorView() {
  const { profile } = useBusiness();
  return (
    <>
      <PageHead
        title="Color"
        lead="The color wheel and color theory basics: what cancels what, and why."
      />
      <ColorTheory businessType={profile.businessType} />
    </>
  );
}
