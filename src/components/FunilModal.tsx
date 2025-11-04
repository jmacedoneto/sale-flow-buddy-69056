import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useCreateFunil, useUpdateFunil } from "@/hooks/useFunis";
import type { Funil } from "@/types/database";
import { funilSchema } from "@/lib/validationSchemas";

interface FunilModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funil?: Funil | null;
}

export const FunilModal = ({ open, onOpenChange, funil }: FunilModalProps) => {
  const [nome, setNome] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const createFunil = useCreateFunil();
  const updateFunil = useUpdateFunil();

  const isEditMode = !!funil;

  useEffect(() => {
    if (funil) {
      setNome(funil.nome || "");
    } else {
      setNome("");
    }
    setErrors({});
  }, [funil, open]);

  const handleSave = () => {
    try {
      const validated = funilSchema.parse({ nome });

      if (isEditMode && funil) {
        updateFunil.mutate({
          id: funil.id,
          nome: validated.nome,
        });
      } else {
        createFunil.mutate({
          nome: validated.nome,
        });
      }

      setNome("");
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const zodError = error as any;
        const fieldErrors: { [key: string]: string } = {};
        zodError.errors?.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Funil" : "Novo Funil"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Atualize as informações do funil" : "Crie um novo funil de vendas"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">
              Nome do Funil <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Vendas de Produtos"
              className={errors.nome ? "border-destructive" : ""}
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="gap-2"
            disabled={createFunil.isPending || updateFunil.isPending}
          >
            {isEditMode ? (
              <>
                <Save className="h-4 w-4" />
                Salvar
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Criar Funil
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
