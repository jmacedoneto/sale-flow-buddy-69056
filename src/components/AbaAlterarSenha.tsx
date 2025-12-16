import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Eye, EyeOff } from "lucide-react";

export const AbaAlterarSenha = () => {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  const handleSave = async () => {
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-6 w-6" />
          Alterar Senha
        </h2>
        <p className="text-muted-foreground">
          Atualize sua senha de acesso ao sistema
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Nova Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha. Ela deve ter pelo menos 6 caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="novaSenha">Nova Senha</Label>
            <div className="relative">
              <Input
                id="novaSenha"
                type={showNovaSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNovaSenha(!showNovaSenha)}
              >
                {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmarSenha"
                type={showConfirmarSenha ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="••••••••"
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
              >
                {showConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || !novaSenha || !confirmarSenha}
            className="w-full"
          >
            <Key className="h-4 w-4 mr-2" />
            {isSaving ? "Alterando..." : "Alterar Senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
