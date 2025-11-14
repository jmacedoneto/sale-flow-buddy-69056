import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const Pending = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-6xl">⏳</div>
          <CardTitle className="text-2xl">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-base mt-2">
            Seu cadastro foi realizado com sucesso!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Seu acesso está pendente de aprovação pelo administrador master do sistema.
          </p>
          <p className="text-sm text-muted-foreground">
            Entre em contato com:{" "}
            <a 
              href="mailto:jmacedoneto1989@gmail.com" 
              className="text-primary hover:underline font-medium"
            >
              jmacedoneto1989@gmail.com
            </a>
          </p>
          <div className="pt-4 space-y-2">
            <Button 
              onClick={logout} 
              variant="outline" 
              className="w-full"
            >
              Sair
            </Button>
            <Button 
              onClick={() => window.location.href = '/auth'} 
              variant="ghost" 
              className="w-full"
            >
              Voltar para Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pending;
