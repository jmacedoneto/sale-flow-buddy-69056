import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LayoutDashboard, Eye, EyeOff, Loader2 } from "lucide-react";

const Auth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome }
          }
        });

        if (error) throw error;

        if (data.user) {
          const { error: insertError } = await supabase
            .from('users_crm')
            .insert({
              id: data.user.id,
              email,
              nome: nome || email.split('@')[0],
              role: 'agent',
              ativo: true,
              approved: false
            });

          if (insertError) {
            console.error('Error inserting user:', insertError);
          }

          toast.success('Cadastro realizado! Aguardando aprovação do administrador.');
          navigate('/pending');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        if (data.session) {
          toast.success('Login realizado com sucesso!');
          navigate('/');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Erro ao realizar autenticação');
      toast.error(err.message || 'Erro ao realizar autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto">
            <div className="h-14 w-14 mx-auto rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <LayoutDashboard className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Gestão APVS
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              IGUATEMI
            </CardDescription>
          </div>
          <div className="pt-2">
            <h2 className="text-lg font-semibold">
              {isSignup ? 'Criar Conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignup ? 'Preencha os dados para criar sua conta' : 'Entre com suas credenciais'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="bg-background/50 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                isSignup ? 'Criar Conta' : 'Entrar'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
              }}
              className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              disabled={loading}
            >
              {isSignup ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
