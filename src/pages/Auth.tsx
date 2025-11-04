import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const Auth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
          // Inserir em users_crm com aprovação pendente
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            {isSignup ? '📝 Criar Conta' : '🔐 Login'}
          </h1>
          <p className="text-muted-foreground">
            {isSignup ? 'Crie sua conta no CRM Lovable' : 'Acesse sua conta do CRM Lovable'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '⏳ Processando...' : isSignup ? '✨ Criar Conta' : '🚀 Entrar'}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            className="text-sm text-primary hover:underline"
            disabled={loading}
          >
            {isSignup ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
          </button>
        </div>

        {!isSignup && (
          <div className="text-center text-sm text-muted-foreground">
            <p>Demo: admin@crm.local / qualquer senha</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;