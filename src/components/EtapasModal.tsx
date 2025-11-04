import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, GripVertical, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { etapaSchema } from "@/lib/validationSchemas";
import type { EtapaFormData } from "@/lib/validationSchemas";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useCreateEtapa,
  useUpdateEtapa,
  useDeleteEtapa,
  useReorderEtapas,
} from "@/hooks/useFunis";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EtapasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funilId: string | null;
  etapas?: any[];
}

interface SortableEtapaItemProps {
  etapa: any;
  onEdit: (etapa: any) => void;
  onDelete: (etapa: any) => void;
}

function SortableEtapaItem({ etapa, onEdit, onDelete }: SortableEtapaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: etapa.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-1">
        <p className="font-medium text-foreground">{etapa.nome}</p>
        <p className="text-xs text-muted-foreground">Ordem: {etapa.ordem}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          <DropdownMenuItem onClick={() => onEdit(etapa)} className="gap-2 cursor-pointer">
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(etapa)}
            className="gap-2 text-destructive cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function EtapasModal({ open, onOpenChange, funilId, etapas = [] }: EtapasModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<any | null>(null);
  const [deletingEtapa, setDeletingEtapa] = useState<any | null>(null);
  const [orderedEtapas, setOrderedEtapas] = useState<any[]>(etapas);

  const createEtapa = useCreateEtapa();
  const updateEtapa = useUpdateEtapa();
  const deleteEtapa = useDeleteEtapa();
  const reorderEtapas = useReorderEtapas();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EtapaFormData>({
    resolver: zodResolver(etapaSchema),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update ordered etapas when etapas prop changes
  useState(() => {
    setOrderedEtapas(etapas);
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedEtapas((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Atualizar ordem no backend
        const updates = newOrder.map((etapa, index) => ({
          id: etapa.id,
          ordem: index + 1,
        }));
        
        reorderEtapas.mutate({ updates });
        
        return newOrder;
      });
    }
  };

  const onSubmit = (data: EtapaFormData) => {
    if (!funilId) return;

    if (editingEtapa) {
      updateEtapa.mutate(
        { id: editingEtapa.id, nome: data.nome },
        {
          onSuccess: () => {
            setEditingEtapa(null);
            reset();
          },
        }
      );
    } else {
      const maxOrdem = orderedEtapas.length > 0 
        ? Math.max(...orderedEtapas.map(e => e.ordem)) 
        : 0;
      
      createEtapa.mutate(
        { funilId, nome: data.nome, ordem: maxOrdem + 1 },
        {
          onSuccess: () => {
            setIsCreating(false);
            reset();
          },
        }
      );
    }
  };

  const handleEdit = (etapa: any) => {
    setEditingEtapa(etapa);
    reset({ nome: etapa.nome });
    setIsCreating(true);
  };

  const handleCancelEdit = () => {
    setEditingEtapa(null);
    setIsCreating(false);
    reset();
  };

  const handleDeleteClick = (etapa: any) => {
    setDeletingEtapa(etapa);
  };

  const confirmDelete = () => {
    if (!deletingEtapa) return;

    deleteEtapa.mutate(deletingEtapa.id, {
      onSuccess: () => {
        setDeletingEtapa(null);
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Etapas</DialogTitle>
            <DialogDescription>
              Crie, edite, reordene ou exclua etapas do funil
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Create/Edit Form */}
            {isCreating && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome da Etapa <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nome"
                    {...register("nome")}
                    placeholder="Ex: Primeiro Contato"
                    className="bg-background"
                  />
                  {errors.nome && (
                    <p className="text-sm text-destructive">{errors.nome.message}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createEtapa.isPending || updateEtapa.isPending}
                    className="gap-2"
                  >
                    {(createEtapa.isPending || updateEtapa.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {editingEtapa ? "Atualizar" : "Criar"} Etapa
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {!isCreating && (
              <Button onClick={() => setIsCreating(true)} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Nova Etapa
              </Button>
            )}

            {/* Etapas List with Drag and Drop */}
            {orderedEtapas.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Arraste para reordenar as etapas
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedEtapas.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {orderedEtapas.map((etapa) => (
                        <SortableEtapaItem
                          key={etapa.id}
                          etapa={etapa}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma etapa criada ainda
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingEtapa} onOpenChange={() => setDeletingEtapa(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a etapa "{deletingEtapa?.nome}"?
              {deleteEtapa.error?.message.includes("cards associados") && (
                <span className="block mt-2 text-destructive font-medium">
                  Esta etapa não pode ser deletada pois possui cards associados.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteEtapa.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEtapa.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
