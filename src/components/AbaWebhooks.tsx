import { FormNovoWebhook } from "./FormNovoWebhook";
import { ListaWebhooks } from "./ListaWebhooks";

export const AbaWebhooks = () => {
  return (
    <div className="space-y-6">
      <FormNovoWebhook />
      <ListaWebhooks />
    </div>
  );
};
