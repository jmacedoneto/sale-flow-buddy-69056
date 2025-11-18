import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKanbanColors } from "@/hooks/useKanbanColors";
import { Loader2 } from "lucide-react";

export const AbaKanbanColors = () => {
  const { colors, updateColor, isUpdating } = useKanbanColors();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cores do Kanban de Atividades</CardTitle>
        <CardDescription>
          Personalize as cores das colunas do Kanban de atividades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna Hoje */}
          <div className="space-y-2">
            <Label htmlFor="cor-hoje">Coluna "Hoje"</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="cor-hoje"
                type="color"
                value={colors.hoje}
                onChange={(e) => updateColor({ coluna: 'hoje', cor: e.target.value })}
                className="h-12 w-20 cursor-pointer"
                disabled={isUpdating}
              />
              <div
                className="flex-1 h-12 rounded-md border"
                style={{ backgroundColor: colors.hoje }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Atividades programadas para hoje
            </p>
          </div>

          {/* Coluna Amanhã */}
          <div className="space-y-2">
            <Label htmlFor="cor-amanha">Coluna "Amanhã"</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="cor-amanha"
                type="color"
                value={colors.amanha}
                onChange={(e) => updateColor({ coluna: 'amanha', cor: e.target.value })}
                className="h-12 w-20 cursor-pointer"
                disabled={isUpdating}
              />
              <div
                className="flex-1 h-12 rounded-md border"
                style={{ backgroundColor: colors.amanha }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Atividades programadas para amanhã
            </p>
          </div>

          {/* Coluna Próxima Semana */}
          <div className="space-y-2">
            <Label htmlFor="cor-proxima">Coluna "Próximos 7 Dias"</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="cor-proxima"
                type="color"
                value={colors.proxima}
                onChange={(e) => updateColor({ coluna: 'proxima', cor: e.target.value })}
                className="h-12 w-20 cursor-pointer"
                disabled={isUpdating}
              />
              <div
                className="flex-1 h-12 rounded-md border"
                style={{ backgroundColor: colors.proxima }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Atividades dos próximos 7 dias
            </p>
          </div>
        </div>

        {isUpdating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando cores...
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            💡 As cores são salvas automaticamente e aplicadas tanto no Kanban de Atividades quanto no Pipeline principal.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
